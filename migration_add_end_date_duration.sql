-- Миграция для добавления полей end_date и duration_minutes
-- Добавляем поля для управления временем окончания и продолжительностью розыгрышей

-- 1. Добавляем поле end_date (время окончания розыгрыша)
ALTER TABLE lottery_draws 
ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE;

-- 2. Добавляем поле duration_minutes (продолжительность в минутах)
ALTER TABLE lottery_draws 
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

-- 3. Добавляем поле number_price_bs (цена номера в боливарах)
ALTER TABLE lottery_draws 
ADD COLUMN IF NOT EXISTS number_price_bs DECIMAL(10,2) DEFAULT 162.95;

-- 4. Добавляем поле number_price_usd (цена номера в долларах)
ALTER TABLE lottery_draws 
ADD COLUMN IF NOT EXISTS number_price_usd DECIMAL(10,2) DEFAULT 1.00;

-- 5. Добавляем поле usd_to_bs_rate (курс обмена)
ALTER TABLE lottery_draws 
ADD COLUMN IF NOT EXISTS usd_to_bs_rate DECIMAL(10,2) DEFAULT 162.95;

-- 6. Создаем индексы для новых полей
CREATE INDEX IF NOT EXISTS idx_lottery_draws_end_date ON lottery_draws(end_date);
CREATE INDEX IF NOT EXISTS idx_lottery_draws_duration ON lottery_draws(duration_minutes);

-- 7. Обновляем функцию create_lottery_draw для поддержки новых полей
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
    created_by_input,
    'scheduled'
  )
  RETURNING id INTO new_draw_id;

  RETURN new_draw_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Обновляем представление v_lottery_draws_full для включения новых полей
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