-- =========================================
-- АКТУАЛИЗАЦИЯ СИСТЕМЫ ПРИЗОВ ЛОТЕРЕИ
-- =========================================
-- Выполните этот SQL в Supabase SQL Editor

-- 0. Сначала удаляем зависимые объекты (views)
DROP VIEW IF EXISTS v_active_lottery_full CASCADE;
DROP VIEW IF EXISTS v_lottery_draws_full CASCADE;
DROP VIEW IF EXISTS v_lottery_history_full CASCADE;

-- 1. Добавляем новые поля для призов (сначала добавляем, потом удаляем старые)
ALTER TABLE lottery_draws 
ADD COLUMN IF NOT EXISTS prize_description TEXT NOT NULL DEFAULT 'Premio especial',
ADD COLUMN IF NOT EXISTS prize_image_1 TEXT,
ADD COLUMN IF NOT EXISTS prize_image_2 TEXT,
ADD COLUMN IF NOT EXISTS prize_image_3 TEXT;

ALTER TABLE active_lottery 
ADD COLUMN IF NOT EXISTS prize_description TEXT NOT NULL DEFAULT 'Premio especial',
ADD COLUMN IF NOT EXISTS prize_image_1 TEXT,
ADD COLUMN IF NOT EXISTS prize_image_2 TEXT,
ADD COLUMN IF NOT EXISTS prize_image_3 TEXT;

ALTER TABLE lottery_history 
ADD COLUMN IF NOT EXISTS prize_description TEXT NOT NULL DEFAULT 'Premio especial',
ADD COLUMN IF NOT EXISTS prize_image_1 TEXT,
ADD COLUMN IF NOT EXISTS prize_image_2 TEXT,
ADD COLUMN IF NOT EXISTS prize_image_3 TEXT;

-- 2. Actualizamos registros existentes ANTES de удаления старых колонок
-- Сохраняем значения из prize_amount в новом поле prize_description
UPDATE lottery_draws 
SET prize_description = 'Premio especial de $' || COALESCE(prize_amount::text, '500') || ' USD'
WHERE prize_description = 'Premio especial' AND prize_amount IS NOT NULL;

UPDATE active_lottery 
SET prize_description = 'Premio especial de $' || COALESCE(prize_amount::text, '500') || ' USD'
WHERE prize_description = 'Premio especial' AND prize_amount IS NOT NULL;

-- Для lottery_history проверяем тип колонки и обновляем соответственно
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lottery_history' 
    AND column_name = 'prize_amount'
  ) THEN
    UPDATE lottery_history 
    SET prize_description = 'Premio especial de $' || COALESCE(prize_amount::text, '500') || ' USD'
    WHERE prize_description = 'Premio especial' AND prize_amount IS NOT NULL;
  END IF;
END $$;

-- 3. Теперь удаляем старые колонки prize_amount
ALTER TABLE lottery_draws DROP COLUMN IF EXISTS prize_amount CASCADE;
ALTER TABLE active_lottery DROP COLUMN IF EXISTS prize_amount CASCADE;
ALTER TABLE lottery_history DROP COLUMN IF EXISTS prize_amount CASCADE;

-- 4. Создаем комментарии для документации
COMMENT ON COLUMN lottery_draws.prize_description IS 'Descripción del premio (texto libre)';
COMMENT ON COLUMN lottery_draws.prize_image_1 IS 'URL de la primera imagen del premio';
COMMENT ON COLUMN lottery_draws.prize_image_2 IS 'URL de la segunda imagen del premio';
COMMENT ON COLUMN lottery_draws.prize_image_3 IS 'URL de la tercera imagen del premio';

COMMENT ON COLUMN active_lottery.prize_description IS 'Descripción del premio (texto libre)';
COMMENT ON COLUMN active_lottery.prize_image_1 IS 'URL de la primera imagen del premio';
COMMENT ON COLUMN active_lottery.prize_image_2 IS 'URL de la segunda imagen del premio';
COMMENT ON COLUMN active_lottery.prize_image_3 IS 'URL de la tercera imagen del premio';

COMMENT ON COLUMN lottery_history.prize_description IS 'Descripción del premio (texto libre)';
COMMENT ON COLUMN lottery_history.prize_image_1 IS 'URL de la primera imagen del premio';
COMMENT ON COLUMN lottery_history.prize_image_2 IS 'URL de la segunda imagen del premio';
COMMENT ON COLUMN lottery_history.prize_image_3 IS 'URL de la tercera imagen del premio';

-- 5. Creamos función para validar URLs de imágenes (opcional)
CREATE OR REPLACE FUNCTION validate_image_url(url TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Validar que la URL tenga un formato básico de imagen
  IF url IS NULL OR url = '' THEN
    RETURN TRUE; -- Permitir URLs vacías
  END IF;
  
  -- Verificar que termine en una extensión de imagen común
  IF url ~* '\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$' THEN
    RETURN TRUE;
  END IF;
  
  -- Verificar que sea una URL válida
  IF url ~* '^https?://.*' THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- 6. Añadimos constraints para validar URLs de imágenes (opcional)
ALTER TABLE lottery_draws 
ADD CONSTRAINT check_prize_image_1_url CHECK (validate_image_url(prize_image_1)),
ADD CONSTRAINT check_prize_image_2_url CHECK (validate_image_url(prize_image_2)),
ADD CONSTRAINT check_prize_image_3_url CHECK (validate_image_url(prize_image_3));

ALTER TABLE active_lottery 
ADD CONSTRAINT check_active_prize_image_1_url CHECK (validate_image_url(prize_image_1)),
ADD CONSTRAINT check_active_prize_image_2_url CHECK (validate_image_url(prize_image_2)),
ADD CONSTRAINT check_active_prize_image_3_url CHECK (validate_image_url(prize_image_3));

ALTER TABLE lottery_history 
ADD CONSTRAINT check_history_prize_image_1_url CHECK (validate_image_url(prize_image_1)),
ADD CONSTRAINT check_history_prize_image_2_url CHECK (validate_image_url(prize_image_2)),
ADD CONSTRAINT check_history_prize_image_3_url CHECK (validate_image_url(prize_image_3));

-- 7. Verificamos los cambios
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'lottery_draws' 
  AND column_name IN ('prize_description', 'prize_image_1', 'prize_image_2', 'prize_image_3')
ORDER BY ordinal_position;

-- 8. Пересоздаем views с новой структурой
-- View для активных лотерей
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

-- View для розыгрышей
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
  updated_at
FROM lottery_draws;

-- View для истории лотерей (если существует)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lottery_history') THEN
    EXECUTE '
    CREATE OR REPLACE VIEW v_lottery_history_full AS
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
      planned_duration_minutes,
      actual_duration_minutes,
      winner_number,
      status,
      total_participants,
      participant_numbers,
      reason,
      created_at,
      updated_at
    FROM lottery_history';
  END IF;
END $$;

-- 9. Verificamos la estructura de lottery_draws y añadimos columnas si faltan
DO $$
BEGIN
  -- Verificamos si existen las columnas necesarias en lottery_draws
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lottery_draws' AND column_name = 'prize_description'
  ) THEN
    ALTER TABLE lottery_draws 
    ADD COLUMN prize_description TEXT NOT NULL DEFAULT 'Premio especial',
    ADD COLUMN prize_image_1 TEXT,
    ADD COLUMN prize_image_2 TEXT,
    ADD COLUMN prize_image_3 TEXT;
    
    RAISE NOTICE 'Añadidas columnas de premio a lottery_draws';
  END IF;
END $$;

-- 10. Añadimos datos de ejemplo para probar (opcional)
INSERT INTO lottery_draws (
  draw_name, 
  draw_date, 
  status, 
  prize_description,
  prize_image_1,
  created_by
) VALUES (
  '#1 - Sorteo de Prueba',
  NOW() + INTERVAL '7 days',
  'scheduled',
  'iPhone 15 Pro Max + AirPods Pro + Funda Premium',
  'https://example.com/iphone15.jpg',
  'admin'
) ON CONFLICT DO NOTHING;

-- 11. Mostramos ejemplo de datos actualizados
SELECT 
  draw_name,
  prize_description,
  prize_image_1,
  status,
  created_at
FROM lottery_draws 
ORDER BY created_at DESC 
LIMIT 5; 