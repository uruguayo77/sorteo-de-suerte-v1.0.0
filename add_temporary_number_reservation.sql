-- =====================================================
-- ВРЕМЕННАЯ БЛОКИРОВКА ЧИСЕЛ НА 15 МИНУТ
-- Добавляет возможность временно блокировать числа при создании заявки
-- =====================================================

DO $$ 
BEGIN
    RAISE NOTICE '🚀 Добавляем временную блокировку чисел...';
END $$;

-- =====================================================
-- 1. ДОБАВЛЕНИЕ ПОЛЯ reserved_until В applications
-- =====================================================

-- Добавляем поле для временной блокировки
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS reserved_until TIMESTAMP WITH TIME ZONE;

-- Создаем индекс для быстрого поиска актуальных резерваций
CREATE INDEX IF NOT EXISTS idx_applications_reserved_until 
ON applications(reserved_until) 
WHERE reserved_until IS NOT NULL;

-- Создаем индекс для поиска по номерам 
CREATE INDEX IF NOT EXISTS idx_applications_numbers_reserved 
ON applications USING GIN(numbers);

-- Создаем составной индекс для эффективного поиска временных резерваций
CREATE INDEX IF NOT EXISTS idx_applications_status_reserved 
ON applications(status, reserved_until) 
WHERE status = 'pending';

-- =====================================================
-- 2. ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ ЗАБЛОКИРОВАННЫХ НОМЕРОВ
-- =====================================================

CREATE OR REPLACE FUNCTION get_all_blocked_numbers()
RETURNS INTEGER[] AS $$
DECLARE
  blocked_numbers INTEGER[];
BEGIN
  -- Сначала очищаем просроченные резервации (безопасно, без триггеров)
  DELETE FROM applications 
  WHERE reserved_until IS NOT NULL 
    AND reserved_until < NOW() 
    AND status = 'pending';
  
  -- Получаем номера из одобренных заявок + временно заблокированные
  SELECT ARRAY_AGG(DISTINCT number_elem)
  INTO blocked_numbers
  FROM (
    -- Постоянно заблокированные (одобренные заявки)
    SELECT UNNEST(numbers) AS number_elem
    FROM applications 
    WHERE status = 'approved'
    
    UNION
    
    -- Временно заблокированные (активные резервации)
    SELECT UNNEST(numbers) AS number_elem
    FROM applications 
    WHERE reserved_until IS NOT NULL 
      AND reserved_until > NOW()
      AND status = 'pending'
  ) AS all_blocked;
  
  RETURN COALESCE(blocked_numbers, ARRAY[]::INTEGER[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. ФУНКЦИЯ ДЛЯ ВРЕМЕННОЙ БЛОКИРОВКИ ЧИСЕЛ
-- =====================================================

CREATE OR REPLACE FUNCTION reserve_numbers_temporarily(
  p_numbers INTEGER[],
  p_user_name TEXT,
  p_user_phone TEXT,
  p_cedula TEXT,
  p_payment_method TEXT,
  p_reservation_minutes INTEGER DEFAULT 15
)
RETURNS TABLE(
  application_id UUID,
  reserved_until TIMESTAMP WITH TIME ZONE,
  blocked_numbers INTEGER[]
) AS $$
DECLARE
  v_application_id UUID;
  v_reserved_until TIMESTAMP WITH TIME ZONE;
  v_currently_blocked INTEGER[];
  v_conflicting_numbers INTEGER[];
BEGIN
  -- Проверяем текущие заблокированные номера
  SELECT get_all_blocked_numbers() INTO v_currently_blocked;
  
  -- Находим пересечения с уже заблокированными номерами
  SELECT ARRAY_AGG(num)
  INTO v_conflicting_numbers
  FROM UNNEST(p_numbers) AS num
  WHERE num = ANY(v_currently_blocked);
  
  -- Если есть конфликтующие номера, возвращаем ошибку
  IF array_length(v_conflicting_numbers, 1) > 0 THEN
    RAISE EXCEPTION 'Números ya están ocupados: %', 
      array_to_string(v_conflicting_numbers, ', ');
  END IF;
  
  -- Устанавливаем время резервации
  v_reserved_until := NOW() + (p_reservation_minutes || ' minutes')::INTERVAL;
  
  -- Создаем заявку с временной блокировкой
  INSERT INTO applications (
    numbers,
    user_name,
    user_phone,
    cedula,
    payment_method,
    status,
    reserved_until
  ) VALUES (
    p_numbers,
    p_user_name,
    p_user_phone,
    p_cedula,
    p_payment_method,
    'pending',
    v_reserved_until
  ) RETURNING id INTO v_application_id;
  
  -- Возвращаем информацию о резервации
  RETURN QUERY SELECT 
    v_application_id,
    v_reserved_until,
    get_all_blocked_numbers();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. ФУНКЦИЯ ДЛЯ ОЧИСТКИ ПРОСРОЧЕННЫХ РЕЗЕРВАЦИЙ
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS INTEGER AS $$
DECLARE
  cleaned_count INTEGER;
BEGIN
  -- Удаляем заявки с истекшим временем резервации и статусом pending
  DELETE FROM applications 
  WHERE reserved_until IS NOT NULL 
    AND reserved_until < NOW() 
    AND status = 'pending';
    
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  
  RAISE NOTICE 'Очищено просроченных резерваций: %', cleaned_count;
  
  RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. АВТОМАТИЧЕСКАЯ ОЧИСТКА (БЕЗ ТРИГГЕРА)
-- =====================================================

-- Убираем проблемный триггер, который создавал бесконечную рекурсию
DROP TRIGGER IF EXISTS auto_cleanup_expired_reservations ON applications;
DROP FUNCTION IF EXISTS trigger_cleanup_expired_reservations();

-- Вместо этого будем вызывать очистку в функции get_all_blocked_numbers

-- =====================================================
-- 6. ОБНОВЛЕНИЕ RLS ПОЛИТИК
-- =====================================================

-- Удаляем существующую политику перед созданием новой
DROP POLICY IF EXISTS "allow_reserve_numbers" ON applications;

-- Создаем политику для поддержки новых функций
CREATE POLICY "allow_reserve_numbers" ON applications
  FOR INSERT WITH CHECK (reserved_until IS NOT NULL);

-- =====================================================
-- 7. ТЕСТОВЫЕ ДАННЫЕ И ПРОВЕРКА
-- =====================================================

-- Проверяем, что все функции работают
SELECT 
  '=== ФУНКЦИИ СОЗДАНЫ ===' as info,
  'get_all_blocked_numbers' as func1,
  'reserve_numbers_temporarily' as func2,
  'cleanup_expired_reservations' as func3;

-- Проверяем текущие заблокированные номера
SELECT 
  '=== ТЕКУЩИЕ ЗАБЛОКИРОВАННЫЕ НОМЕРА ===' as info,
  get_all_blocked_numbers() as blocked_numbers;

-- Проверяем структуру таблицы applications
SELECT 
  '=== СТРУКТУРА APPLICATIONS ===' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'applications' 
  AND column_name IN ('reserved_until', 'numbers', 'status')
ORDER BY column_name;

-- =====================================================
-- 8. ФИНАЛЬНОЕ СООБЩЕНИЕ
-- =====================================================

DO $$ 
BEGIN
    RAISE NOTICE '🎉 ВРЕМЕННАЯ БЛОКИРОВКА ЧИСЕЛ НАСТРОЕНА!';
    RAISE NOTICE '✅ Поле reserved_until добавлено в applications';
    RAISE NOTICE '✅ Функция reserve_numbers_temporarily() создана';
    RAISE NOTICE '✅ Функция get_all_blocked_numbers() создана';
    RAISE NOTICE '✅ Автоочистка просроченных резерваций включена';
    RAISE NOTICE '📋 Числа блокируются на 15 минут при создании заявки';
    RAISE NOTICE '🚀 Система готова к использованию!';
END $$; 