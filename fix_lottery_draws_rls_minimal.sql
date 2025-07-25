-- =====================================================
-- МИНИМАЛЬНОЕ ИСПРАВЛЕНИЕ RLS ДЛЯ lottery_draws
-- Решает ошибку: 42501 new row violates row-level security policy
-- =====================================================

-- Отключаем RLS временно
ALTER TABLE lottery_draws DISABLE ROW LEVEL SECURITY;

-- Удаляем все политики
DROP POLICY IF EXISTS "anon_read_lottery_draws" ON lottery_draws;
DROP POLICY IF EXISTS "service_role_all_lottery_draws" ON lottery_draws;
DROP POLICY IF EXISTS "authenticated_insert_lottery_draws" ON lottery_draws;
DROP POLICY IF EXISTS "authenticated_update_lottery_draws" ON lottery_draws;

-- Включаем RLS
ALTER TABLE lottery_draws ENABLE ROW LEVEL SECURITY;

-- Создаем простые политики
CREATE POLICY "anon_read_lottery_draws" ON lottery_draws
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "service_role_all_lottery_draws" ON lottery_draws
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_insert_lottery_draws" ON lottery_draws
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated_update_lottery_draws" ON lottery_draws
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true); 