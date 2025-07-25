-- ================================
-- ПОЛИТИКИ УДАЛЕНИЯ РОЗЫГРЫШЕЙ
-- ================================

-- 1. Политика удаления для таблицы lottery_draws
-- Разрешает удаление розыгрышей только администраторам через service_role
DROP POLICY IF EXISTS "Solo administradores pueden eliminar sorteos" ON lottery_draws;
CREATE POLICY "Solo administradores pueden eliminar sorteos" ON lottery_draws
  FOR DELETE
  USING (auth.role() = 'service_role');

-- 2. Политика удаления для таблицы active_lottery
-- Сначала включаем RLS для active_lottery (если не включен)
ALTER TABLE active_lottery ENABLE ROW LEVEL SECURITY;

-- Политика для чтения (необходима для работы компонентов)
DROP POLICY IF EXISTS "Todos pueden ver sorteos activos" ON active_lottery;
CREATE POLICY "Todos pueden ver sorteos activos" ON active_lottery
  FOR SELECT
  USING (true);

-- Политика для создания/обновления (только через service_role)
DROP POLICY IF EXISTS "Solo administradores pueden modificar sorteos activos" ON active_lottery;
CREATE POLICY "Solo administradores pueden modificar sorteos activos" ON active_lottery
  FOR ALL
  USING (auth.role() = 'service_role');

-- Политика удаления для active_lottery
DROP POLICY IF EXISTS "Solo administradores pueden eliminar sorteos activos" ON active_lottery;
CREATE POLICY "Solo administradores pueden eliminar sorteos activos" ON active_lottery
  FOR DELETE
  USING (auth.role() = 'service_role');

-- 3. Политики для таблицы lottery_history (если нужно удаление из истории)
-- Включаем RLS для lottery_history (если не включен)
ALTER TABLE lottery_history ENABLE ROW LEVEL SECURITY;

-- Политика для чтения истории
DROP POLICY IF EXISTS "Todos pueden ver historial de sorteos" ON lottery_history;
CREATE POLICY "Todos pueden ver historial de sorteos" ON lottery_history
  FOR SELECT
  USING (true);

-- Политика для создания записей в истории
DROP POLICY IF EXISTS "Solo sistema puede crear historial" ON lottery_history;
CREATE POLICY "Solo sistema puede crear historial" ON lottery_history
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Политика для обновления истории
DROP POLICY IF EXISTS "Solo administradores pueden modificar historial" ON lottery_history;
CREATE POLICY "Solo administradores pueden modificar historial" ON lottery_history
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- Политика удаления для истории
DROP POLICY IF EXISTS "Solo administradores pueden eliminar historial" ON lottery_history;
CREATE POLICY "Solo administradores pueden eliminar historial" ON lottery_history
  FOR DELETE
  USING (auth.role() = 'service_role');

-- ================================
-- ФУНКЦИЯ ДЛЯ БЕЗОПАСНОГО УДАЛЕНИЯ
-- ================================

-- 4. Функция для удаления розыгрыша с проверками безопасности
CREATE OR REPLACE FUNCTION delete_lottery_draw_safe(
  draw_id_input UUID,
  admin_id_input UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  draw_status TEXT;
  admin_role TEXT;
BEGIN
  -- Проверяем права администратора (если указан)
  IF admin_id_input IS NOT NULL THEN
    SELECT role INTO admin_role 
    FROM administrators 
    WHERE id = admin_id_input AND is_active = true;
    
    IF admin_role IS NULL THEN
      RAISE EXCEPTION 'Administrador no válido o inactivo';
    END IF;
  END IF;

  -- Проверяем статус розыгрыша
  SELECT status INTO draw_status 
  FROM lottery_draws 
  WHERE id = draw_id_input;
  
  IF draw_status IS NULL THEN
    RAISE EXCEPTION 'Sorteo no encontrado';
  END IF;
  
  -- Не разрешаем удалять активные розыгрыши
  IF draw_status = 'active' THEN
    RAISE EXCEPTION 'No se puede eliminar un sorteo activo. Primero detenga el sorteo.';
  END IF;

  -- Удаляем розыгрыш
  DELETE FROM lottery_draws WHERE id = draw_id_input;
  
  -- Логируем действие
  INSERT INTO lottery_settings (setting_key, setting_value, description, updated_by)
  VALUES (
    'delete_log_' || EXTRACT(EPOCH FROM NOW())::TEXT,
    'Sorteo eliminado: ' || draw_id_input::TEXT,
    'Eliminación de sorteo por administrador: ' || COALESCE(admin_id_input::TEXT, 'system'),
    admin_id_input
  );
  
  RETURN TRUE;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error al eliminar sorteo: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Función para удаления активного розыгрыша
CREATE OR REPLACE FUNCTION delete_active_lottery_safe(
  active_id_input UUID DEFAULT NULL,
  admin_id_input UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  admin_role TEXT;
  lottery_name TEXT;
BEGIN
  -- Проверяем права администратора (если указан)
  IF admin_id_input IS NOT NULL THEN
    SELECT role INTO admin_role 
    FROM administrators 
    WHERE id = admin_id_input AND is_active = true;
    
    IF admin_role IS NULL THEN
      RAISE EXCEPTION 'Administrador no válido o inactivo';
    END IF;
  END IF;

  -- Получаем название розыгрыша для логирования
  IF active_id_input IS NOT NULL THEN
    SELECT name INTO lottery_name 
    FROM active_lottery 
    WHERE id = active_id_input;
  ELSE
    -- Если не указан ID, удаляем текущий активный
    SELECT name INTO lottery_name 
    FROM active_lottery 
    WHERE is_active = true 
    LIMIT 1;
  END IF;

  -- Удаляем активный розыгрыш
  IF active_id_input IS NOT NULL THEN
    DELETE FROM active_lottery WHERE id = active_id_input;
  ELSE
    DELETE FROM active_lottery WHERE is_active = true;
  END IF;
  
  -- Логируем действие
  INSERT INTO lottery_settings (setting_key, setting_value, description, updated_by)
  VALUES (
    'delete_active_log_' || EXTRACT(EPOCH FROM NOW())::TEXT,
    'Sorteo activo eliminado: ' || COALESCE(lottery_name, 'unknown'),
    'Eliminación de sorteo activo por administrador: ' || COALESCE(admin_id_input::TEXT, 'system'),
    admin_id_input
  );
  
  RETURN TRUE;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error al eliminar sorteo activo: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ
-- ================================

/*
-- Удалить конкретный розыгрыш (безопасно):
SELECT delete_lottery_draw_safe(
  'uuid-del-sorteo',
  (SELECT id FROM administrators WHERE email = 'admin@example.com')
);

-- Удалить текущий активный розыгрыш:
SELECT delete_active_lottery_safe(
  NULL,
  (SELECT id FROM administrators WHERE email = 'admin@example.com')
);

-- Удалить конкретный активный розыгрыш:
SELECT delete_active_lottery_safe(
  'uuid-del-sorteo-activo',
  (SELECT id FROM administrators WHERE email = 'admin@example.com')
);

-- Прямое удаление через SQL (только с service_role):
DELETE FROM lottery_draws WHERE id = 'uuid-del-sorteo';
DELETE FROM active_lottery WHERE id = 'uuid-del-sorteo-activo';
*/

-- ================================
-- ВАЖНЫЕ ЗАМЕЧАНИЯ
-- ================================

/*
БЕЗОПАСНОСТЬ:
- Все политики удаления требуют роль 'service_role'
- Функции безопасного удаления включают дополнительные проверки
- Все действия удаления логируются в lottery_settings
- Нельзя удалить активный розыгрыш без его остановки

ИСПОЛЬЗОВАНИЕ В ПРИЛОЖЕНИИ:
- Используйте Supabase Service Key для операций удаления
- Всегда проверяйте статус розыгрыша перед удалением
- Рекомендуется использовать функции delete_*_safe() вместо прямого DELETE

ВОССТАНОВЛЕНИЕ:
- Удаленные розыгрыши нельзя восстановить
- Рассмотрите возможность добавления поля 'deleted' вместо физического удаления
- Регулярно создавайте резервные копии базы данных
*/ 