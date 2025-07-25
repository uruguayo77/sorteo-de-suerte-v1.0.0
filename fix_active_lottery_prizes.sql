-- =============================================
-- ИСПРАВЛЕНИЕ ТАБЛИЦЫ ACTIVE_LOTTERY
-- =============================================
-- Выполните этот SQL в Supabase SQL Editor

-- 1. Проверяем текущую структуру
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'active_lottery'
ORDER BY ordinal_position;

-- 2. Добавляем новые поля для призов, если их нет
ALTER TABLE active_lottery 
ADD COLUMN IF NOT EXISTS prize_description TEXT,
ADD COLUMN IF NOT EXISTS prize_image_1 TEXT,
ADD COLUMN IF NOT EXISTS prize_image_2 TEXT,
ADD COLUMN IF NOT EXISTS prize_image_3 TEXT;

-- 3. Обновляем существующие записи
UPDATE active_lottery 
SET 
  prize_description = CASE 
    WHEN prize_description IS NULL OR prize_description = '' THEN
      CASE 
        WHEN prize_amount IS NOT NULL THEN 'Premio especial de $' || prize_amount::text || ' USD'
        ELSE 'Premio especial'
      END
    ELSE prize_description
  END
WHERE prize_description IS NULL OR prize_description = '';

-- 4. Удаляем старое поле prize_amount
ALTER TABLE active_lottery DROP COLUMN IF EXISTS prize_amount CASCADE;

-- 5. Устанавливаем NOT NULL для prize_description
ALTER TABLE active_lottery ALTER COLUMN prize_description SET NOT NULL;
ALTER TABLE active_lottery ALTER COLUMN prize_description SET DEFAULT 'Premio especial';

-- 6. Пересоздаем view для active_lottery
CREATE OR REPLACE VIEW v_active_lottery_full AS
SELECT 
  id,
  lottery_number,
  name,
  prize_description,
  prize_image_1,
  prize_image_2,
  prize_image_3,
  start_time,
  end_time,
  duration_minutes,
  is_active,
  is_paused,
  is_completed,
  winner_number,
  selected_numbers,
  created_at,
  updated_at
FROM active_lottery;

-- 7. Добавляем комментарии
COMMENT ON COLUMN active_lottery.prize_description IS 'Описание приза активной лотереи';
COMMENT ON COLUMN active_lottery.prize_image_1 IS 'URL первого изображения приза';
COMMENT ON COLUMN active_lottery.prize_image_2 IS 'URL второго изображения приза';
COMMENT ON COLUMN active_lottery.prize_image_3 IS 'URL третьего изображения приза';

-- 8. Показываем результат
SELECT 
  name,
  prize_description,
  is_active,
  created_at
FROM active_lottery 
ORDER BY created_at DESC;

COMMIT; 