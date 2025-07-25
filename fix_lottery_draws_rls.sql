-- =====================================================
-- ИСПРАВЛЕНИЕ RLS ПОЛИТИК ДЛЯ lottery_draws
-- Решает ошибку: 42501 new row violates row-level security policy
-- =====================================================

-- Проверяем текущее состояние таблицы lottery_draws
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  CASE WHEN rowsecurity THEN '✅ RLS включен' ELSE '❌ RLS отключен' END as rls_status
FROM pg_tables 
WHERE tablename = 'lottery_draws';

-- Проверяем существующие политики
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  permissive,
  roles
FROM pg_policies 
WHERE tablename = 'lottery_draws'
ORDER BY policyname;

-- Отключаем RLS временно для исправления
ALTER TABLE lottery_draws DISABLE ROW LEVEL SECURITY;

-- Удаляем все существующие политики для lottery_draws
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'lottery_draws'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON lottery_draws', policy_record.policyname);
    END LOOP;
END $$;

-- Включаем RLS обратно
ALTER TABLE lottery_draws ENABLE ROW LEVEL SECURITY;

-- Создаем новые, простые политики для lottery_draws
-- Политика для чтения (SELECT) - для всех ролей
CREATE POLICY "anon_read_lottery_draws" ON lottery_draws
  FOR SELECT TO anon, authenticated USING (true);

-- Политика для всех операций (INSERT, UPDATE, DELETE) - для service_role
CREATE POLICY "service_role_all_lottery_draws" ON lottery_draws
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Политика для создания (INSERT) - для authenticated пользователей
CREATE POLICY "authenticated_insert_lottery_draws" ON lottery_draws
  FOR INSERT TO authenticated WITH CHECK (true);

-- Политика для обновления (UPDATE) - для authenticated пользователей  
CREATE POLICY "authenticated_update_lottery_draws" ON lottery_draws
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Проверяем результат
SELECT 
  '=== РЕЗУЛЬТАТ ИСПРАВЛЕНИЯ ===' as info;

-- Проверяем состояние RLS
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  CASE WHEN rowsecurity THEN '✅ RLS включен' ELSE '❌ RLS отключен' END as rls_status
FROM pg_tables 
WHERE tablename = 'lottery_draws';

-- Проверяем новые политики
SELECT 
  '=== НОВЫЕ ПОЛИТИКИ ===' as info,
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE tablename = 'lottery_draws'
ORDER BY policyname;

-- Тестируем создание записи (раскомментируйте для теста)
/*
INSERT INTO lottery_draws (
  draw_name, 
  draw_date, 
  prize_description,
  number_price_usd,
  number_price_bs,
  usd_to_bs_rate,
  status
) VALUES (
  'Тест RLS исправление', 
  NOW() + INTERVAL '1 day',
  'Тестовый приз для проверки RLS',
  1.00,
  162.95,
  162.95,
  'scheduled'
);
*/

SELECT '🎉 RLS политики для lottery_draws исправлены!' as result; 