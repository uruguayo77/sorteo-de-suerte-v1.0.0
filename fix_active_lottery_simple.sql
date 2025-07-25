-- =====================================================
-- БЫСТРОЕ ИСПРАВЛЕНИЕ ОШИБКИ 406 для active_lottery
-- Упрощенная версия без сложной диагностики
-- =====================================================

-- 1. Создаем таблицу если её нет
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

-- 2. Добавляем prize_description если её нет
ALTER TABLE active_lottery ADD COLUMN IF NOT EXISTS prize_description TEXT;

-- 3. Включаем RLS
ALTER TABLE active_lottery ENABLE ROW LEVEL SECURITY;

-- 4. Удаляем все старые политики
DROP POLICY IF EXISTS "Cualquiera puede ver lotería activa" ON active_lottery;
DROP POLICY IF EXISTS "Todos pueden ver sorteos activos" ON active_lottery;
DROP POLICY IF EXISTS "Solo administradores pueden modificar sorteos activos" ON active_lottery;
DROP POLICY IF EXISTS "public_lottery_read" ON active_lottery;
DROP POLICY IF EXISTS "admin_lottery_all" ON active_lottery;
DROP POLICY IF EXISTS "anon_read_active_lottery" ON active_lottery;
DROP POLICY IF EXISTS "service_role_all_active_lottery" ON active_lottery;

-- 5. Создаем новые простые политики
CREATE POLICY "anon_read_active_lottery" ON active_lottery
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "service_role_all_active_lottery" ON active_lottery
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. Добавляем тестовые данные если таблица пустая
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
  'Sorteo de Prueba',
  'Premio de prueba - iPhone 15 Pro Max',
  NOW(),
  NOW() + INTERVAL '24 hours',
  1440,
  TRUE
WHERE NOT EXISTS (SELECT 1 FROM active_lottery LIMIT 1);

-- 7. Проверяем результат
SELECT 
  'РЕЗУЛЬТАТ ИСПРАВЛЕНИЯ' as info,
  COUNT(*) as total_records,
  COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_records
FROM active_lottery;

-- 8. Простая проверка RLS политик
SELECT 
  'ПРОВЕРКА ПОЛИТИК' as info,
  COUNT(*) as policies_count
FROM pg_policies 
WHERE tablename = 'active_lottery'; 