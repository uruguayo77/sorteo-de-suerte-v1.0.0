-- ==============================================
-- ИСПРАВЛЕНИЕ RLS ПОЛИТИК И НАСТРОЕК ЛОТЕРЕИ
-- ==============================================
-- Выполните этот SQL в Supabase SQL Editor

-- 0. Создаем недостающие таблицы, если они не существуют
-- Таблица lottery_settings
CREATE TABLE IF NOT EXISTS lottery_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица active_lottery
CREATE TABLE IF NOT EXISTS active_lottery (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lottery_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  prize_amount TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  is_paused BOOLEAN DEFAULT FALSE,
  is_completed BOOLEAN DEFAULT FALSE,
  winner_number INTEGER,
  selected_numbers INTEGER[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица number_reservations
CREATE TABLE IF NOT EXISTS number_reservations (
  id BIGSERIAL PRIMARY KEY,
  number INTEGER NOT NULL,
  user_name TEXT NOT NULL,
  user_phone TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  payment_details TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  application_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица applications
CREATE TABLE IF NOT EXISTS applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numbers INTEGER[] NOT NULL,
  user_name TEXT NOT NULL,
  user_phone TEXT NOT NULL,
  cedula TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  payment_proof_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаем индексы
CREATE INDEX IF NOT EXISTS idx_lottery_settings_key ON lottery_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_active_lottery_active ON active_lottery(is_active);
CREATE INDEX IF NOT EXISTS idx_number_reservations_number ON number_reservations(number);
CREATE INDEX IF NOT EXISTS idx_number_reservations_status ON number_reservations(status);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

-- 1. Обновляем RLS политику для lottery_settings, чтобы разрешить чтение основных настроек
DROP POLICY IF EXISTS "Cualquiera puede ver configuraciones públicas" ON lottery_settings;
CREATE POLICY "Cualquiera puede ver configuraciones públicas" ON lottery_settings
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR setting_key IN (
      'company_name', 
      'support_email', 
      'max_numbers', 
      'min_numbers', 
      'draw_duration_minutes',
      'default_duration_minutes',
      'ticket_price',
      'max_selections_per_user',
      'lottery_status',
      'current_lottery_id',
      'auto_draw_enabled',
      'winner_announcement_delay'
    )
  );

-- 2. Добавляем недостающие настройки лотереи
INSERT INTO lottery_settings (setting_key, setting_value, description) VALUES
('max_numbers', '100', 'Максимальное количество номеров в лотерее')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description;

INSERT INTO lottery_settings (setting_key, setting_value, description) VALUES
('min_numbers', '1', 'Минимальное количество номеров в лотерее')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description;

INSERT INTO lottery_settings (setting_key, setting_value, description) VALUES
('draw_duration_minutes', '60', 'Продолжительность розыгрыша в минутах')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description;

INSERT INTO lottery_settings (setting_key, setting_value, description) VALUES
('default_duration_minutes', '60', 'Стандартная продолжительность розыгрыша в минутах')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description;

INSERT INTO lottery_settings (setting_key, setting_value, description) VALUES
('ticket_price', '10.00', 'Цена билета в долларах')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description;

INSERT INTO lottery_settings (setting_key, setting_value, description) VALUES
('max_selections_per_user', '5', 'Максимальное количество номеров для одного пользователя')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description;

INSERT INTO lottery_settings (setting_key, setting_value, description) VALUES
('company_name', 'Reserva tu Suerte', 'Название компании')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description;

INSERT INTO lottery_settings (setting_key, setting_value, description) VALUES
('support_email', 'support@reservatusuerte.com', 'Email службы поддержки')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description;

INSERT INTO lottery_settings (setting_key, setting_value, description) VALUES
('lottery_status', 'active', 'Статус системы лотереи')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description;

INSERT INTO lottery_settings (setting_key, setting_value, description) VALUES
('auto_draw_enabled', 'true', 'Автоматический розыгрыш включен')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description;

INSERT INTO lottery_settings (setting_key, setting_value, description) VALUES
('winner_announcement_delay', '5', 'Задержка объявления победителя в минутах')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description;

-- 3. Исправляем RLS политики для active_lottery
-- Сначала проверяем, существует ли таблица active_lottery
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'active_lottery') THEN
    -- Включаем RLS если еще не включен
    ALTER TABLE active_lottery ENABLE ROW LEVEL SECURITY;
    
    -- Удаляем ВСЕ возможные политики (включая обрезанные имена)
    DROP POLICY IF EXISTS "Cualquiera puede ver lotería activa" ON active_lottery;
    DROP POLICY IF EXISTS "Todos pueden ver sorteos activos" ON active_lottery;
    DROP POLICY IF EXISTS "Solo administradores pueden modificar sorteos activos" ON active_lottery;
    DROP POLICY IF EXISTS "Публичный доступ к активным лотереям" ON active_lottery;
    DROP POLICY IF EXISTS "Публичный доступ к активным лотер" ON active_lottery;
    DROP POLICY IF EXISTS "Администраторы могут управлять лотереями" ON active_lottery;
    DROP POLICY IF EXISTS "Администраторы могут управлять лотер" ON active_lottery;
    DROP POLICY IF EXISTS "public_lottery_read" ON active_lottery;
    DROP POLICY IF EXISTS "admin_lottery_all" ON active_lottery;
    
    -- Создаем новые политики с короткими именами
    CREATE POLICY "public_lottery_read" ON active_lottery
      FOR SELECT
      USING (true); -- Разрешаем всем читать активные лотереи
      
    CREATE POLICY "admin_lottery_all" ON active_lottery
      FOR ALL
      USING (auth.role() = 'service_role');
      
    RAISE NOTICE 'RLS политики для active_lottery обновлены';
  ELSE
    RAISE NOTICE 'Таблица active_lottery не найдена';
  END IF;
END $$;

-- 4. Исправляем RLS политики для других таблиц
-- Для таблицы number_reservations
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'number_reservations') THEN
    ALTER TABLE number_reservations ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Публичный доступ к резервациям" ON number_reservations;
    DROP POLICY IF EXISTS "public_reservations_read" ON number_reservations;
    DROP POLICY IF EXISTS "admin_reservations_all" ON number_reservations;
    CREATE POLICY "public_reservations_read" ON number_reservations
      FOR SELECT
      USING (true);

    CREATE POLICY "admin_reservations_all" ON number_reservations
      FOR ALL
      USING (auth.role() = 'service_role');
      
    RAISE NOTICE 'RLS политики для number_reservations обновлены';
  END IF;
END $$;

-- Для таблицы applications - временно отключаем RLS для диагностики
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'applications') THEN
    -- Временно отключаем RLS для диагностики ошибки 500
    ALTER TABLE applications DISABLE ROW LEVEL SECURITY;
    
    RAISE NOTICE 'RLS для applications временно отключен для диагностики';
  END IF;
END $$;

-- 5. Проверяем результат
SELECT 
  setting_key, 
  setting_value, 
  description 
FROM lottery_settings 
WHERE setting_key LIKE '%numbers%' OR setting_key LIKE '%duration%' OR setting_key LIKE '%price%' OR setting_key LIKE '%status%'
ORDER BY setting_key;

-- 6. Проверяем активные лотереи и создаем тестовую запись
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'active_lottery') THEN
    RAISE NOTICE 'Проверяем active_lottery...';
    
    -- Создаем тестовую активную лотерею, если нет ни одной активной
    IF NOT EXISTS (SELECT 1 FROM active_lottery WHERE is_active = true) THEN
      INSERT INTO active_lottery (
        lottery_number,
        name,
        prize_amount,
        start_time,
        end_time,
        duration_minutes,
        is_active
      ) VALUES (
        1,
        'Лотерея тест',
        '500.00',
        NOW(),
        NOW() + INTERVAL '1 hour',
        60,
        true
      );
      RAISE NOTICE 'Создана тестовая активная лотерея';
    END IF;
    
    RAISE NOTICE 'Таблица active_lottery доступна. Активных лотерей: %', (SELECT COUNT(*) FROM active_lottery WHERE is_active = true);
  END IF;
END $$;

-- 7. Диагностика и исправление таблицы applications
DO $$
BEGIN
  -- Проверяем структуру таблицы applications
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'applications') THEN
    RAISE NOTICE 'Таблица applications найдена, проверяем структуру...';
    
    -- Удаляем потенциально проблемные ограничения
    BEGIN
      ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check;
      RAISE NOTICE 'Удалено ограничение applications_status_check';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Ограничение applications_status_check не найдено или не удалось удалить: %', SQLERRM;
    END;
    
    -- Пересоздаем ограничение с более мягкими условиями
    BEGIN
      ALTER TABLE applications ADD CONSTRAINT applications_status_check 
        CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'processing'));
      RAISE NOTICE 'Добавлено новое ограничение applications_status_check';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Не удалось добавить ограничение: %', SQLERRM;
    END;
    
    -- Проверяем количество записей
    PERFORM COUNT(*) FROM applications;
    RAISE NOTICE 'Таблица applications содержит % записей', (SELECT COUNT(*) FROM applications);
    
    -- Создаем тестовую запись, если таблица пуста
    IF (SELECT COUNT(*) FROM applications) = 0 THEN
      BEGIN
        INSERT INTO applications (
          numbers, 
          user_name, 
          user_phone, 
          cedula, 
          payment_method, 
          status
        ) VALUES (
          ARRAY[1, 2, 3], 
          'Test User', 
          '+123456789', 
          '12345678', 
          'test_payment', 
          'pending'
        );
        RAISE NOTICE 'Создана тестовая запись в applications';
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Ошибка создания тестовой записи: %', SQLERRM;
      END;
    END IF;
    
  ELSE
    RAISE NOTICE 'Таблица applications не найдена!';
  END IF;
END $$;

-- 8. Финальная проверка доступности всех таблиц
SELECT 'lottery_settings' as table_name, COUNT(*) as records FROM lottery_settings
UNION ALL
SELECT 'active_lottery' as table_name, COUNT(*) as records FROM active_lottery
UNION ALL  
SELECT 'number_reservations' as table_name, COUNT(*) as records FROM number_reservations
UNION ALL
SELECT 'applications' as table_name, COUNT(*) as records FROM applications; 