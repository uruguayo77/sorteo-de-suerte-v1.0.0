-- =====================================================
-- ФУНКЦИЯ ДЛЯ ОТМЕНЫ ВРЕМЕННОЙ РЕЗЕРВАЦИИ
-- Позволяет пользователю отменить свою активную резервацию чисел
-- =====================================================

CREATE OR REPLACE FUNCTION cancel_temporary_reservation(
  p_application_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  freed_numbers INTEGER[]
) AS $$
DECLARE
  v_freed_numbers INTEGER[];
  v_reservation_exists BOOLEAN := FALSE;
BEGIN
  -- Проверяем, существует ли резервация и она активна
  SELECT 
    EXISTS(
      SELECT 1 FROM applications 
      WHERE id = p_application_id 
        AND reserved_until IS NOT NULL 
        AND reserved_until > NOW()
        AND status = 'pending'
    ) INTO v_reservation_exists;
  
  -- Если резервация не найдена или неактивна
  IF NOT v_reservation_exists THEN
    RETURN QUERY SELECT 
      FALSE,
      'Reservación no encontrada o ya expirada'::TEXT,
      ARRAY[]::INTEGER[];
    RETURN;
  END IF;
  
  -- Получаем номера из резервации перед удалением
  SELECT numbers INTO v_freed_numbers
  FROM applications 
  WHERE id = p_application_id;
  
  -- Удаляем временную резервацию
  DELETE FROM applications 
  WHERE id = p_application_id 
    AND reserved_until IS NOT NULL 
    AND status = 'pending';
  
  -- Возвращаем результат
  RETURN QUERY SELECT 
    TRUE,
    'Reservación cancelada exitosamente'::TEXT,
    COALESCE(v_freed_numbers, ARRAY[]::INTEGER[]);
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создаем политику для отмены резервации
DROP POLICY IF EXISTS "allow_cancel_reservation" ON applications;
CREATE POLICY "allow_cancel_reservation" ON applications
  FOR DELETE USING (reserved_until IS NOT NULL AND status = 'pending');

-- Тестируем функцию
SELECT 
  '=== ФУНКЦИЯ ОТМЕНЫ РЕЗЕРВАЦИИ СОЗДАНА ===' as info,
  'cancel_temporary_reservation' as function_name;

DO $$ 
BEGIN
    RAISE NOTICE '✅ Функция cancel_temporary_reservation() создана!';
    RAISE NOTICE '✅ Политика allow_cancel_reservation создана!';
    RAISE NOTICE '🚀 Пользователи могут отменять свои резервации!';
END $$; 