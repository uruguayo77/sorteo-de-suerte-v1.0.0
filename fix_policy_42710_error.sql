-- =====================================================
-- ИСПРАВЛЕНИЕ ОШИБКИ 42710: Policy already exists
-- Удаляет и пересоздает политику allow_reserve_numbers
-- =====================================================

DO $$ 
BEGIN
    RAISE NOTICE '🚨 ИСПРАВЛЯЕМ ОШИБКУ 42710: Policy already exists...';
END $$;

-- Удаляем существующую политику
DROP POLICY IF EXISTS "allow_reserve_numbers" ON applications;

-- Создаем политику заново
CREATE POLICY "allow_reserve_numbers" ON applications
  FOR INSERT WITH CHECK (reserved_until IS NOT NULL);

-- Проверяем результат
SELECT 
  '=== СТАТУС ПОЛИТИКИ ===' as info,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'applications' 
  AND policyname = 'allow_reserve_numbers';

DO $$ 
BEGIN
    RAISE NOTICE '✅ Ошибка 42710 исправлена!';
    RAISE NOTICE '✅ Политика allow_reserve_numbers пересоздана';
    RAISE NOTICE '🚀 Теперь можно продолжить с основным скриптом!';
END $$; 