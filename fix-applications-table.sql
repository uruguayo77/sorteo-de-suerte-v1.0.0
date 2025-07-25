-- ================================
-- ИСПРАВЛЕНИЕ: Создание таблицы applications
-- ================================

-- 1. Создание таблицы applications (которая используется в коде но отсутствует в БД)
CREATE TABLE IF NOT EXISTS applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numbers INTEGER[] NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  user_phone VARCHAR(20) NOT NULL,
  cedula VARCHAR(50) NOT NULL,
  payment_method VARCHAR(100) NOT NULL,
  payment_proof_url TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Создание индексов для оптимизации
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_numbers ON applications USING GIN(numbers);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at);
CREATE INDEX IF NOT EXISTS idx_applications_user_phone ON applications(user_phone);

-- 3. Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Триггер для таблицы applications
DROP TRIGGER IF EXISTS update_applications_updated_at ON applications;
CREATE TRIGGER update_applications_updated_at 
    BEFORE UPDATE ON applications 
    FOR EACH ROW EXECUTE FUNCTION update_applications_updated_at();

-- 5. Настройка Row Level Security (RLS)
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики если они есть
DROP POLICY IF EXISTS "Anyone can create applications" ON applications;
DROP POLICY IF EXISTS "Anyone can view applications" ON applications;
DROP POLICY IF EXISTS "Only admins can update applications" ON applications;

-- Создаем новые политики
CREATE POLICY "Anyone can create applications" ON applications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view applications" ON applications
  FOR SELECT USING (true);

CREATE POLICY "Only admins can update applications" ON applications
  FOR UPDATE USING (auth.role() = 'service_role');

-- 6. Включаем реал-тайм для таблицы
ALTER PUBLICATION supabase_realtime ADD TABLE applications;

-- 7. Функция для получения заявок с определенным статусом
CREATE OR REPLACE FUNCTION get_applications_by_status(status_filter TEXT)
RETURNS TABLE(
  id UUID,
  numbers INTEGER[],
  user_name VARCHAR(255),
  user_phone VARCHAR(20),
  cedula VARCHAR(50),
  payment_method VARCHAR(100),
  payment_proof_url TEXT,
  status VARCHAR(50),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.numbers,
    a.user_name,
    a.user_phone,
    a.cedula,
    a.payment_method,
    a.payment_proof_url,
    a.status,
    a.admin_notes,
    a.created_at
  FROM applications a
  WHERE a.status = status_filter
  ORDER BY a.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Функция для получения заблокированных номеров из заявок
CREATE OR REPLACE FUNCTION get_blocked_numbers_from_applications()
RETURNS INTEGER[] AS $$
DECLARE
  blocked_numbers INTEGER[];
BEGIN
  SELECT ARRAY_AGG(DISTINCT number_elem)
  INTO blocked_numbers
  FROM applications a,
       UNNEST(a.numbers) AS number_elem
  WHERE a.status = 'approved';
  
  RETURN COALESCE(blocked_numbers, ARRAY[]::INTEGER[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Функция для обновления статуса заявки (для админа)
CREATE OR REPLACE FUNCTION update_application_status(
  application_id_input UUID,
  new_status TEXT,
  admin_notes_input TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE applications 
  SET 
    status = new_status,
    admin_notes = COALESCE(admin_notes_input, admin_notes),
    updated_at = NOW()
  WHERE id = application_id_input;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- МИГРАЦИЯ ДАННЫХ (если нужно)
-- ================================

-- 10. Функция для миграции данных из number_reservations в applications (опционально)
CREATE OR REPLACE FUNCTION migrate_reservations_to_applications()
RETURNS BOOLEAN AS $$
DECLARE
  reservation RECORD;
BEGIN
  FOR reservation IN 
    SELECT * FROM number_reservations 
    WHERE status = 'confirmed'
  LOOP
    INSERT INTO applications (
      numbers,
      user_name,
      user_phone,
      cedula,
      payment_method,
      status,
      created_at
    ) VALUES (
      ARRAY[reservation.number],
      reservation.user_name,
      reservation.user_phone,
      'MIGRATED', -- Placeholder для cedula
      reservation.payment_method,
      'approved',
      reservation.created_at
    );
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ
-- ================================

/*
-- Создать новую заявку:
INSERT INTO applications (numbers, user_name, user_phone, cedula, payment_method)
VALUES (ARRAY[1, 5, 10], 'Juan Pérez', '+584141234567', 'V-12345678', 'pago-movil');

-- Получить заявки по статусу:
SELECT * FROM get_applications_by_status('pending');

-- Обновить статус заявки:
SELECT update_application_status(
  'uuid-заявки',
  'approved',
  'Documento verificado correctamente'
);

-- Получить заблокированные номера:
SELECT get_blocked_numbers_from_applications();

-- Миграция данных (выполнить один раз если нужно):
-- SELECT migrate_reservations_to_applications();
*/

-- ================================
-- ПРОВЕРКА СОЗДАНИЯ
-- ================================

-- Проверяем что таблица создалась успешно
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'applications') THEN
    RAISE NOTICE '✅ Таблица applications успешно создана';
  ELSE
    RAISE EXCEPTION '❌ Ошибка создания таблицы applications';
  END IF;
END $$;

SELECT '🎉 Таблица applications настроена и готова к использованию!' as message; 