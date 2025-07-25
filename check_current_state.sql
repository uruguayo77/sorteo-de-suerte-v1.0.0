-- =============================================
-- ДИАГНОСТИКА ТЕКУЩЕГО СОСТОЯНИЯ ТАБЛИЦ
-- =============================================
-- Выполните этот SQL в Supabase SQL Editor для диагностики

-- 1. Проверяем структуру таблицы lottery_draws
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default,
  character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'lottery_draws'
ORDER BY ordinal_position;

-- 2. Проверяем существующие данные в lottery_draws
SELECT 
  COUNT(*) as total_draws,
  COUNT(CASE WHEN draw_name ~ '^#\d+' THEN 1 END) as draws_with_numbers,
  COUNT(CASE WHEN prize_description IS NOT NULL THEN 1 END) as draws_with_description
FROM lottery_draws;

-- 3. Показываем первые 5 записей
SELECT 
  draw_name,
  status,
  COALESCE(prize_description, 'Sin descripción') as prize_info,
  created_at
FROM lottery_draws 
ORDER BY created_at DESC 
LIMIT 5;

-- 4. Проверяем, есть ли view
SELECT 
  table_name,
  table_type 
FROM information_schema.tables 
WHERE table_name LIKE '%lottery%' 
  AND table_schema = 'public'
ORDER BY table_name;

-- 5. Проверяем триггеры
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'lottery_draws';

-- 6. Проверяем функции
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_name LIKE '%lottery%' 
  AND routine_schema = 'public'; 