-- =============================================
-- УПРОЩЕННОЕ ИСПРАВЛЕНИЕ СИСТЕМЫ РОЗЫГРЫШЕЙ
-- =============================================
-- Выполните этот SQL в Supabase SQL Editor

-- 1. Проверяем текущие данные (без prize_amount)
SELECT 
  id, 
  draw_name, 
  status, 
  COALESCE(prize_description, 'Sin descripción') as prize_description,
  created_at
FROM lottery_draws 
ORDER BY created_at DESC 
LIMIT 10;

-- 2. Создаем резервную копию данных
CREATE TABLE IF NOT EXISTS lottery_draws_backup AS 
SELECT * FROM lottery_draws;

-- 3. Удаляем зависимые объекты
DROP VIEW IF EXISTS v_lottery_draws_full CASCADE;

-- 4. Добавляем новые поля, если их нет
ALTER TABLE lottery_draws 
ADD COLUMN IF NOT EXISTS prize_description TEXT DEFAULT 'Premio especial',
ADD COLUMN IF NOT EXISTS prize_image_1 TEXT,
ADD COLUMN IF NOT EXISTS prize_image_2 TEXT,
ADD COLUMN IF NOT EXISTS prize_image_3 TEXT;

-- 5. Безопасно удаляем старую колонку prize_amount, если она существует
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lottery_draws' AND column_name = 'prize_amount'
  ) THEN
    -- Сначала перенесем данные из prize_amount в prize_description
    UPDATE lottery_draws 
    SET prize_description = 'Premio especial de $' || COALESCE(prize_amount::text, '500') || ' USD'
    WHERE (prize_description IS NULL OR prize_description = '' OR prize_description = 'Premio especial')
      AND prize_amount IS NOT NULL;
    
    -- Теперь удаляем колонку
    ALTER TABLE lottery_draws DROP COLUMN prize_amount CASCADE;
    
    RAISE NOTICE 'Колонка prize_amount удалена и данные перенесены в prize_description';
  ELSE
    RAISE NOTICE 'Колонка prize_amount уже не существует';
  END IF;
END $$;

-- 6. Обновляем названия розыгрышей с правильной нумерацией
WITH numbered_draws AS (
  SELECT 
    id,
    draw_name,
    prize_description,
    ROW_NUMBER() OVER (ORDER BY created_at) as draw_number
  FROM lottery_draws
  WHERE draw_name !~ '^#\d+' OR prize_description IS NULL OR prize_description = ''
)
UPDATE lottery_draws 
SET 
  draw_name = CASE 
    WHEN lottery_draws.draw_name ~ '^#\d+' THEN lottery_draws.draw_name
    ELSE '#' || numbered_draws.draw_number || ' - ' || lottery_draws.draw_name
  END,
  prize_description = CASE 
    WHEN lottery_draws.prize_description IS NULL OR lottery_draws.prize_description = '' THEN 'Premio especial'
    ELSE lottery_draws.prize_description
  END
FROM numbered_draws
WHERE lottery_draws.id = numbered_draws.id;

-- 7. Устанавливаем NOT NULL для prize_description
ALTER TABLE lottery_draws ALTER COLUMN prize_description SET NOT NULL;
ALTER TABLE lottery_draws ALTER COLUMN prize_description SET DEFAULT 'Premio especial';

-- 8. Создаем улучшенные индексы
CREATE INDEX IF NOT EXISTS idx_lottery_draws_draw_name ON lottery_draws(draw_name);
CREATE INDEX IF NOT EXISTS idx_lottery_draws_status_date ON lottery_draws(status, draw_date);

-- 9. Создаем функцию для автоматической нумерации новых розыгрышей
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
  
  -- Устанавливаем описание приза по умолчанию, если не указано
  IF NEW.prize_description IS NULL OR NEW.prize_description = '' THEN
    NEW.prize_description := 'Premio especial';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Создаем триггер для автоматической нумерации
DROP TRIGGER IF EXISTS trigger_auto_number_lottery_draw ON lottery_draws;
CREATE TRIGGER trigger_auto_number_lottery_draw
  BEFORE INSERT ON lottery_draws
  FOR EACH ROW
  EXECUTE FUNCTION auto_number_lottery_draw();

-- 11. Пересоздаем view
CREATE OR REPLACE VIEW v_lottery_draws_full AS
SELECT 
  id,
  draw_name,
  draw_date,
  status,
  winner_number,
  winner_name,
  winner_cedula,
  prize_description,
  prize_image_1,
  prize_image_2,
  prize_image_3,
  created_by,
  created_at,
  updated_at,
  -- Извлекаем номер розыгрыша для удобства
  CASE 
    WHEN draw_name ~ '^#(\d+)' 
    THEN (regexp_match(draw_name, '^#(\d+)'))[1]::integer
    ELSE NULL
  END as draw_number
FROM lottery_draws;

-- 12. Добавляем комментарии
COMMENT ON COLUMN lottery_draws.prize_description IS 'Описание приза (любой текст)';
COMMENT ON COLUMN lottery_draws.prize_image_1 IS 'URL первого изображения приза';
COMMENT ON COLUMN lottery_draws.prize_image_2 IS 'URL второго изображения приза';
COMMENT ON COLUMN lottery_draws.prize_image_3 IS 'URL третьего изображения приза';

-- 13. Показываем результат обновления
SELECT 
  draw_name,
  status,
  prize_description,
  winner_number,
  winner_name,
  created_at
FROM lottery_draws 
ORDER BY created_at DESC 
LIMIT 10;

-- 14. Показываем статистику
SELECT 
  status,
  COUNT(*) as count,
  'Total: ' || COUNT(*) as info
FROM lottery_draws 
GROUP BY status
ORDER BY count DESC;

-- 15. Проверяем корректность нумерации
SELECT 
  draw_name,
  CASE 
    WHEN draw_name ~ '^#(\d+)' 
    THEN (regexp_match(draw_name, '^#(\d+)'))[1]::integer
    ELSE NULL
  END as extracted_number,
  created_at
FROM lottery_draws 
ORDER BY created_at;

COMMIT; 