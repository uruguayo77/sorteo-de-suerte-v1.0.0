-- =====================================================
-- МИНИМАЛЬНОЕ ИСПРАВЛЕНИЕ ОШИБКИ 406 для active_lottery
-- Только основные команды без проверок
-- =====================================================

-- Создаем таблицу
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

-- Включаем RLS
ALTER TABLE active_lottery ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики
DROP POLICY IF EXISTS "anon_read_active_lottery" ON active_lottery;
DROP POLICY IF EXISTS "service_role_all_active_lottery" ON active_lottery;

-- Создаем новые политики
CREATE POLICY "anon_read_active_lottery" ON active_lottery
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "service_role_all_active_lottery" ON active_lottery
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Добавляем тестовую запись
INSERT INTO active_lottery (
  lottery_number, name, prize_description, 
  start_time, end_time, duration_minutes, is_active
) 
SELECT 1, 'Sorteo de Prueba', 'Premio de prueba', 
       NOW(), NOW() + INTERVAL '24 hours', 1440, TRUE
WHERE NOT EXISTS (SELECT 1 FROM active_lottery LIMIT 1); 