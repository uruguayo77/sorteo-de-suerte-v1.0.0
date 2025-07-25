-- =====================================================
-- ИСПРАВЛЕНИЕ ПОЛЯ created_by В lottery_draws
-- Убираем обязательность UUID для created_by или устанавливаем DEFAULT
-- =====================================================

-- Проверяем текущее состояние колонки created_by
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'lottery_draws' 
  AND column_name = 'created_by';

-- Вариант 1: Сделать поле created_by необязательным
ALTER TABLE lottery_draws 
ALTER COLUMN created_by DROP NOT NULL;

-- Вариант 2: Установить DEFAULT значение для created_by (пример UUID)
-- ALTER TABLE lottery_draws 
-- ALTER COLUMN created_by SET DEFAULT '00000000-0000-0000-0000-000000000000';

-- Вариант 3: Изменить тип на TEXT если не нужен UUID
-- ALTER TABLE lottery_draws 
-- ALTER COLUMN created_by TYPE TEXT;

-- Проверяем результат
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'lottery_draws' 
  AND column_name = 'created_by';

-- Тестируем создание записи без created_by
-- Этот INSERT должен работать после исправления
/*
INSERT INTO lottery_draws (
  draw_name, 
  draw_date, 
  prize_description,
  number_price_usd,
  number_price_bs,
  usd_to_bs_rate
) VALUES (
  'Тестовый розыгрыш', 
  NOW() + INTERVAL '1 day',
  'Тестовый приз',
  1.00,
  162.95,
  162.95
);
*/ 