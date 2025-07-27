-- =====================================================
-- ИТОГОВОЕ ИСПРАВЛЕНИЕ ОШИБКИ 406 для active_lottery
-- Исправляет RLS политики для корректной работы
-- =====================================================

-- 1. Создаем таблицу active_lottery если не существует
CREATE TABLE IF NOT EXISTS active_lottery (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lottery_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  prize_amount TEXT,
  prize_description TEXT,
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

-- 2. Добавляем недостающие столбцы если их нет
DO $$
BEGIN
  -- Добавляем prize_description если её нет
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'active_lottery' AND column_name = 'prize_description'
  ) THEN
    ALTER TABLE active_lottery ADD COLUMN prize_description TEXT;
  END IF;
END $$;

-- 3. Включаем RLS
ALTER TABLE active_lottery ENABLE ROW LEVEL SECURITY;

-- 4. Удаляем ВСЕ существующие политики для чистоты
DROP POLICY IF EXISTS "Cualquiera puede ver lotería activa" ON active_lottery;
DROP POLICY IF EXISTS "Todos pueden ver sorteos activos" ON active_lottery;
DROP POLICY IF EXISTS "Solo administradores pueden modificar sorteos activos" ON active_lottery;
DROP POLICY IF EXISTS "public_lottery_read" ON active_lottery;
DROP POLICY IF EXISTS "admin_lottery_all" ON active_lottery;
DROP POLICY IF EXISTS "anon_read_active_lottery" ON active_lottery;
DROP POLICY IF EXISTS "service_role_all_active_lottery" ON active_lottery;
DROP POLICY IF EXISTS "allow_all_read_active_lottery" ON active_lottery;

-- 5. Создаем правильные политики

-- Политика для публичного чтения (любой может читать активные лотереи)
CREATE POLICY "anon_read_active_lottery" ON active_lottery
  FOR SELECT 
  TO anon, authenticated 
  USING (true);

-- Политика для всех операций через service_role (для админов и системы)
CREATE POLICY "service_role_all_active_lottery" ON active_lottery
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- 6. Добавляем тестовые данные если таблица пуста
INSERT INTO active_lottery (
  lottery_number, 
  name, 
  prize_description, 
  start_time, 
  end_time, 
  duration_minutes, 
  is_active
) 
SELECT 
  1, 
  'Sorteo Activo', 
  'Premio Principal', 
  NOW(), 
  NOW() + INTERVAL '7 days', 
  10080, -- 7 дней в минутах
  TRUE
WHERE NOT EXISTS (SELECT 1 FROM active_lottery WHERE is_active = true);

-- 7. Проверяем результат
SELECT 
  'active_lottery' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE is_active = true) as active_records,
  'RLS включен, политики созданы' as status
FROM active_lottery;

-- 8. Показываем созданные политики
SELECT 
  policyname as policy_name,
  cmd as command,
  permissive,
  roles,
  qual as using_expression
FROM pg_policies 
WHERE tablename = 'active_lottery' 
  AND schemaname = 'public';

COMMIT; 