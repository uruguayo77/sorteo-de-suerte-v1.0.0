-- Миграция для обновления поля draw_date
-- Добавляем значение по умолчанию NOW() для поля draw_date

-- 1. Сначала удаляем ограничение NOT NULL
ALTER TABLE lottery_draws ALTER COLUMN draw_date DROP NOT NULL;

-- 2. Добавляем значение по умолчанию
ALTER TABLE lottery_draws ALTER COLUMN draw_date SET DEFAULT NOW();

-- 3. Обновляем существующие записи, где draw_date IS NULL
UPDATE lottery_draws SET draw_date = NOW() WHERE draw_date IS NULL;

-- 4. Восстанавливаем ограничение NOT NULL
ALTER TABLE lottery_draws ALTER COLUMN draw_date SET NOT NULL;

-- 5. Обновляем функцию create_lottery_draw для работы с новым значением по умолчанию
CREATE OR REPLACE FUNCTION create_lottery_draw(
  draw_name_input TEXT,
  draw_date_input TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  prize_amount_input DECIMAL DEFAULT 500.00,
  created_by_input UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_draw_id UUID;
BEGIN
  INSERT INTO lottery_draws (draw_name, draw_date, prize_amount, created_by, status)
  VALUES (
    draw_name_input,
    COALESCE(draw_date_input, NOW()),
    prize_amount_input,
    created_by_input,
    'scheduled'
  )
  RETURNING id INTO new_draw_id;

  RETURN new_draw_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 