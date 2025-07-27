-- =====================================================
-- ПОЛНОЕ ИСПРАВЛЕНИЕ ОШИБКИ 400 ПРИ СОЗДАНИИ РОЗЫГРЫШЕЙ
-- =====================================================
-- Выполните этот SQL в Supabase SQL Editor

BEGIN;

-- 1. Исправляем поле draw_date - добавляем значение по умолчанию
ALTER TABLE lottery_draws ALTER COLUMN draw_date SET DEFAULT NOW();

-- 2. Добавляем недостающие поля
ALTER TABLE lottery_draws 
ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS number_price_bs DECIMAL(10,2) DEFAULT 162.95,
ADD COLUMN IF NOT EXISTS number_price_usd DECIMAL(10,2) DEFAULT 1.00,
ADD COLUMN IF NOT EXISTS usd_to_bs_rate DECIMAL(10,2) DEFAULT 162.95,
ADD COLUMN IF NOT EXISTS scheduled_start_time TIMESTAMP WITH TIME ZONE;

-- 3. Добавляем поля для призов, если их нет
ALTER TABLE lottery_draws 
ADD COLUMN IF NOT EXISTS prize_description TEXT DEFAULT 'Premio especial',
ADD COLUMN IF NOT EXISTS prize_image_1 TEXT,
ADD COLUMN IF NOT EXISTS prize_image_2 TEXT,
ADD COLUMN IF NOT EXISTS prize_image_3 TEXT;

-- 4. Устанавливаем NOT NULL для обязательных полей
ALTER TABLE lottery_draws ALTER COLUMN prize_description SET NOT NULL;

-- 5. Создаем индексы для новых полей
CREATE INDEX IF NOT EXISTS idx_lottery_draws_end_date ON lottery_draws(end_date);
CREATE INDEX IF NOT EXISTS idx_lottery_draws_duration ON lottery_draws(duration_minutes);
CREATE INDEX IF NOT EXISTS idx_lottery_draws_scheduled_start ON lottery_draws(scheduled_start_time, status) 
WHERE status = 'scheduled' AND scheduled_start_time IS NOT NULL;

-- 6. Обновляем функцию create_lottery_draw
CREATE OR REPLACE FUNCTION create_lottery_draw(
  draw_name_input TEXT,
  draw_date_input TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date_input TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  duration_minutes_input INTEGER DEFAULT NULL,
  prize_description_input TEXT DEFAULT 'Premio especial',
  prize_image_1_input TEXT DEFAULT NULL,
  prize_image_2_input TEXT DEFAULT NULL,
  prize_image_3_input TEXT DEFAULT NULL,
  number_price_bs_input DECIMAL DEFAULT 162.95,
  number_price_usd_input DECIMAL DEFAULT 1.00,
  usd_to_bs_rate_input DECIMAL DEFAULT 162.95,
  scheduled_start_time_input TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_by_input UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_draw_id UUID;
BEGIN
  INSERT INTO lottery_draws (
    draw_name, 
    draw_date, 
    end_date,
    duration_minutes,
    prize_description,
    prize_image_1,
    prize_image_2,
    prize_image_3,
    number_price_bs,
    number_price_usd,
    usd_to_bs_rate,
    scheduled_start_time,
    created_by, 
    status
  )
  VALUES (
    draw_name_input,
    COALESCE(draw_date_input, NOW()),
    end_date_input,
    duration_minutes_input,
    prize_description_input,
    prize_image_1_input,
    prize_image_2_input,
    prize_image_3_input,
    number_price_bs_input,
    number_price_usd_input,
    usd_to_bs_rate_input,
    scheduled_start_time_input,
    created_by_input,
    'scheduled'
  )
  RETURNING id INTO new_draw_id;

  RETURN new_draw_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Обновляем представление v_lottery_draws_full
DROP VIEW IF EXISTS v_lottery_draws_full CASCADE;

CREATE OR REPLACE VIEW v_lottery_draws_full AS
SELECT 
  ld.id,
  ld.draw_name,
  ld.draw_date,
  ld.end_date,
  ld.duration_minutes,
  ld.status,
  ld.winner_number,
  ld.winner_name,
  ld.winner_cedula,
  ld.prize_description,
  ld.prize_image_1,
  ld.prize_image_2,
  ld.prize_image_3,
  ld.scheduled_start_time,
  ld.number_price_bs,
  ld.number_price_usd,
  ld.usd_to_bs_rate,
  ld.created_by,
  ld.created_at,
  ld.updated_at,
  CASE 
    WHEN ld.status = 'scheduled' AND ld.scheduled_start_time IS NOT NULL THEN
      EXTRACT(EPOCH FROM (ld.scheduled_start_time - NOW()))::INTEGER
    ELSE NULL
  END as seconds_until_start,
  CASE 
    WHEN ld.status = 'scheduled' AND ld.scheduled_start_time IS NOT NULL THEN
      ld.scheduled_start_time > NOW()
    ELSE NULL
  END as is_waiting_to_start,
  CONCAT(ld.number_price_bs, ' Bs') as price_bs_formatted,
  CONCAT('$', ld.number_price_usd) as price_usd_formatted,
  CONCAT('1 USD = ', ld.usd_to_bs_rate, ' Bs') as exchange_rate_formatted
FROM lottery_draws ld
ORDER BY ld.created_at DESC;

-- 8. Проверяем и исправляем RLS политики
DO $$
BEGIN
  -- Проверяем, включен ли RLS
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'lottery_draws' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE lottery_draws ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Удаляем старые политики
DROP POLICY IF EXISTS "anon_read_lottery_draws" ON lottery_draws;
DROP POLICY IF EXISTS "service_role_all_lottery_draws" ON lottery_draws;

-- Создаем новые политики
CREATE POLICY "anon_read_lottery_draws" ON lottery_draws
  FOR SELECT USING (true);

CREATE POLICY "service_role_all_lottery_draws" ON lottery_draws
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 9. Создаем функцию для автоматической нумерации розыгрышей
CREATE OR REPLACE FUNCTION auto_number_lottery_draw()
RETURNS TRIGGER AS $$
BEGIN
  -- Если название не начинается с #, добавляем номер
  IF NEW.draw_name !~ '^#\d+' THEN
    NEW.draw_name := '#' || (
      SELECT COALESCE(MAX(
        CASE 
          WHEN draw_name ~ '^#(\d+)' 
          THEN (regexp_match(draw_name, '^#(\d+)'))[1]::integer
          ELSE 0
        END
      ), 0) + 1
      FROM lottery_draws
    ) || ' - ' || NEW.draw_name;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер для автоматической нумерации
DROP TRIGGER IF EXISTS trigger_auto_number_lottery_draw ON lottery_draws;
CREATE TRIGGER trigger_auto_number_lottery_draw
  BEFORE INSERT ON lottery_draws
  FOR EACH ROW
  EXECUTE FUNCTION auto_number_lottery_draw();

-- 10. Показываем результат
SELECT 
  '✅ Миграция завершена успешно' as status,
  COUNT(*) as total_draws
FROM lottery_draws;

COMMIT; 