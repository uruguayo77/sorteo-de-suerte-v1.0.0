-- =============================================
-- ПОШАГОВОЕ ИСПРАВЛЕНИЕ СИСТЕМЫ РОЗЫГРЫШЕЙ
-- =============================================
-- Выполните этот SQL в Supabase SQL Editor по частям

-- ЧАСТЬ 1: Диагностика
-- =====================

-- Проверяем текущие данные
SELECT 
  id, 
  draw_name, 
  status, 
  COALESCE(prize_description, 'Sin descripción') as current_prize,
  created_at
FROM lottery_draws 
ORDER BY created_at DESC 
LIMIT 10;

-- ЧАСТЬ 2: Подготовка
-- ====================

-- Создаем резервную копию
CREATE TABLE IF NOT EXISTS lottery_draws_backup AS 
SELECT * FROM lottery_draws;

-- Удаляем старые views
DROP VIEW IF EXISTS v_lottery_draws_full CASCADE;

-- ЧАСТЬ 3: Добавление новых колонок
-- =================================

-- Добавляем колонки для призов, если их нет
ALTER TABLE lottery_draws 
ADD COLUMN IF NOT EXISTS prize_description TEXT DEFAULT 'Premio especial';

ALTER TABLE lottery_draws 
ADD COLUMN IF NOT EXISTS prize_image_1 TEXT;

ALTER TABLE lottery_draws 
ADD COLUMN IF NOT EXISTS prize_image_2 TEXT;

ALTER TABLE lottery_draws 
ADD COLUMN IF NOT EXISTS prize_image_3 TEXT;

-- ЧАСТЬ 4: Исправление описаний призов
-- ===================================

-- Устанавливаем базовое описание для пустых полей
UPDATE lottery_draws 
SET prize_description = 'Premio especial'
WHERE prize_description IS NULL OR prize_description = '';

-- ЧАСТЬ 5: Исправление названий (простой способ)
-- ==============================================

-- Создаем временную таблицу с номерами
CREATE TEMP TABLE temp_draw_numbers AS
SELECT 
  id,
  draw_name,
  ROW_NUMBER() OVER (ORDER BY created_at) as new_number
FROM lottery_draws
WHERE draw_name !~ '^#\d+';

-- Обновляем названия по одной записи
UPDATE lottery_draws 
SET draw_name = '#' || temp_draw_numbers.new_number || ' - ' || lottery_draws.draw_name
FROM temp_draw_numbers
WHERE lottery_draws.id = temp_draw_numbers.id;

-- Удаляем временную таблицу
DROP TABLE temp_draw_numbers;

-- ЧАСТЬ 6: Настройка колонок
-- =========================

-- Устанавливаем NOT NULL для prize_description
ALTER TABLE lottery_draws ALTER COLUMN prize_description SET NOT NULL;
ALTER TABLE lottery_draws ALTER COLUMN prize_description SET DEFAULT 'Premio especial';

-- ЧАСТЬ 7: Удаление старых колонок (если нужно)
-- ============================================

-- Безопасно удаляем prize_amount, если существует
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lottery_draws' AND column_name = 'prize_amount'
  ) THEN
    ALTER TABLE lottery_draws DROP COLUMN prize_amount CASCADE;
    RAISE NOTICE 'Колонка prize_amount удалена';
  ELSE
    RAISE NOTICE 'Колонка prize_amount уже не существует';
  END IF;
END $$;

-- ЧАСТЬ 8: Создание индексов
-- =========================

CREATE INDEX IF NOT EXISTS idx_lottery_draws_draw_name ON lottery_draws(draw_name);
CREATE INDEX IF NOT EXISTS idx_lottery_draws_status_date ON lottery_draws(status, draw_date);

-- ЧАСТЬ 9: Создание триггера для автонумерации
-- ===========================================

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

-- Создаем триггер
DROP TRIGGER IF EXISTS trigger_auto_number_lottery_draw ON lottery_draws;
CREATE TRIGGER trigger_auto_number_lottery_draw
  BEFORE INSERT ON lottery_draws
  FOR EACH ROW
  EXECUTE FUNCTION auto_number_lottery_draw();

-- ЧАСТЬ 10: Создание view
-- =====================

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
  -- Извлекаем номер розыгрыша
  CASE 
    WHEN draw_name ~ '^#(\d+)' 
    THEN (regexp_match(draw_name, '^#(\d+)'))[1]::integer
    ELSE NULL
  END as draw_number
FROM lottery_draws;

-- ЧАСТЬ 11: Добавление комментариев
-- ================================

COMMENT ON COLUMN lottery_draws.prize_description IS 'Описание приза (любой текст)';
COMMENT ON COLUMN lottery_draws.prize_image_1 IS 'URL первого изображения приза';
COMMENT ON COLUMN lottery_draws.prize_image_2 IS 'URL второго изображения приза';
COMMENT ON COLUMN lottery_draws.prize_image_3 IS 'URL третьего изображения приза';

-- ЧАСТЬ 12: Проверка результатов
-- =============================

-- Показываем результат
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

-- Статистика
SELECT 
  status,
  COUNT(*) as count
FROM lottery_draws 
GROUP BY status
ORDER BY count DESC;

-- Проверка нумерации
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