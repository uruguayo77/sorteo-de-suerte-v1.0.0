-- =====================================================
-- КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Stack Overflow в триггере
-- Удаляет проблемный триггер, вызывающий бесконечную рекурсию
-- =====================================================

DO $$ 
BEGIN
    RAISE NOTICE '🚨 ИСПРАВЛЯЕМ КРИТИЧЕСКУЮ ОШИБКУ: Stack Overflow...';
END $$;

-- Удаляем проблемный триггер и функцию
DROP TRIGGER IF EXISTS auto_cleanup_expired_reservations ON applications;
DROP FUNCTION IF EXISTS trigger_cleanup_expired_reservations();

-- Удаляем существующую политику перед созданием новой (избегаем ошибку 42710)
DROP POLICY IF EXISTS "allow_reserve_numbers" ON applications;

-- Обновляем функцию get_all_blocked_numbers для автоочистки
CREATE OR REPLACE FUNCTION get_all_blocked_numbers()
RETURNS INTEGER[] AS $$
DECLARE
  blocked_numbers INTEGER[];
BEGIN
  -- Сначала очищаем просроченные резервации (безопасно, без триггеров)
  DELETE FROM applications 
  WHERE reserved_until IS NOT NULL 
    AND reserved_until < NOW() 
    AND status = 'pending';
  
  -- Получаем номера из одобренных заявок + временно заблокированные
  SELECT ARRAY_AGG(DISTINCT number_elem)
  INTO blocked_numbers
  FROM (
    -- Постоянно заблокированные (одобренные заявки)
    SELECT UNNEST(numbers) AS number_elem
    FROM applications 
    WHERE status = 'approved'
    
    UNION
    
    -- Временно заблокированные (активные резервации)
    SELECT UNNEST(numbers) AS number_elem
    FROM applications 
    WHERE reserved_until IS NOT NULL 
      AND reserved_until > NOW()
      AND status = 'pending'
  ) AS all_blocked;
  
  RETURN COALESCE(blocked_numbers, ARRAY[]::INTEGER[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Проверяем, что триггер удален
SELECT 
  '=== СТАТУС ТРИГГЕРОВ ===' as info,
  COUNT(*) as trigger_count
FROM information_schema.triggers 
WHERE trigger_name = 'auto_cleanup_expired_reservations';

-- Создаем необходимую политику для временной резервации
CREATE POLICY "allow_reserve_numbers" ON applications
  FOR INSERT WITH CHECK (reserved_until IS NOT NULL);

-- Тестируем функцию
SELECT 
  '=== ТЕСТ ФУНКЦИИ ===' as info,
  get_all_blocked_numbers() as blocked_numbers;

DO $$ 
BEGIN
    RAISE NOTICE '✅ Критическая ошибка исправлена!';
    RAISE NOTICE '✅ Проблемный триггер удален';
    RAISE NOTICE '✅ Функция get_all_blocked_numbers обновлена';
    RAISE NOTICE '✅ RLS политика allow_reserve_numbers создана';
    RAISE NOTICE '🚀 Система снова работает!';
END $$; 