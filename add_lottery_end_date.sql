-- =====================================================
-- ДОБАВЛЕНИЕ ВРЕМЕНИ ОКОНЧАНИЯ РОЗЫГРЫШЕЙ
-- Добавляет поле end_date для установки времени завершения
-- =====================================================

DO $$ 
BEGIN
    RAISE NOTICE '⏰ ДОБАВЛЯЕМ ВРЕМЯ ОКОНЧАНИЯ РОЗЫГРЫШЕЙ...';
END $$;

-- =====================================================
-- 1. ДОБАВЛЕНИЕ ПОЛЯ END_DATE
-- =====================================================

-- Добавляем поле для времени окончания розыгрыша
ALTER TABLE lottery_draws 
ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE;

-- Добавляем поле для продолжительности в минутах (альтернативный способ)
ALTER TABLE lottery_draws 
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

-- =====================================================
-- 2. ОБНОВЛЕНИЕ СУЩЕСТВУЮЩИХ ЗАПИСЕЙ
-- =====================================================

-- Устанавливаем время окончания для существующих розыгрышей
-- По умолчанию: розыгрыш длится 24 часа
UPDATE lottery_draws 
SET 
  end_date = draw_date + INTERVAL '24 hours',
  duration_minutes = 1440  -- 24 часа = 1440 минут
WHERE end_date IS NULL;

-- =====================================================
-- 3. ДОБАВЛЕНИЕ КОММЕНТАРИЕВ К ПОЛЯМ
-- =====================================================

COMMENT ON COLUMN lottery_draws.end_date IS 'Дата и время окончания розыгрыша';
COMMENT ON COLUMN lottery_draws.duration_minutes IS 'Продолжительность розыгрыша в минутах';

-- =====================================================
-- 4. СОЗДАНИЕ ФУНКЦИИ ДЛЯ АВТОМАТИЧЕСКОГО РАСЧЕТА
-- =====================================================

-- Функция для автоматического расчета end_date на основе draw_date и duration_minutes
CREATE OR REPLACE FUNCTION calculate_end_date()
RETURNS TRIGGER AS $$
BEGIN
    -- Если указана продолжительность, рассчитываем end_date
    IF NEW.duration_minutes IS NOT NULL AND NEW.draw_date IS NOT NULL THEN
        NEW.end_date := NEW.draw_date + (NEW.duration_minutes || ' minutes')::INTERVAL;
    END IF;
    
    -- Если указан end_date, рассчитываем duration_minutes
    IF NEW.end_date IS NOT NULL AND NEW.draw_date IS NOT NULL AND NEW.duration_minutes IS NULL THEN
        NEW.duration_minutes := EXTRACT(EPOCH FROM (NEW.end_date - NEW.draw_date)) / 60;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. СОЗДАНИЕ ТРИГГЕРА
-- =====================================================

-- Удаляем старый триггер если существует
DROP TRIGGER IF EXISTS trigger_calculate_end_date ON lottery_draws;

-- Создаем триггер для автоматического расчета
CREATE TRIGGER trigger_calculate_end_date
    BEFORE INSERT OR UPDATE ON lottery_draws
    FOR EACH ROW
    EXECUTE FUNCTION calculate_end_date();

-- =====================================================
-- 6. СОЗДАНИЕ ИНДЕКСОВ ДЛЯ ПРОИЗВОДИТЕЛЬНОСТИ
-- =====================================================

-- Индекс для быстрого поиска активных розыгрышей
CREATE INDEX IF NOT EXISTS idx_lottery_draws_date_range 
ON lottery_draws (draw_date, end_date) 
WHERE status IN ('active', 'scheduled');

-- Индекс для поиска завершенных розыгрышей
CREATE INDEX IF NOT EXISTS idx_lottery_draws_end_date 
ON lottery_draws (end_date) 
WHERE status = 'active';

-- =====================================================
-- 7. СОЗДАНИЕ ФУНКЦИИ ДЛЯ ПРОВЕРКИ СТАТУСА
-- =====================================================

-- Функция для автоматического обновления статуса на основе времени
CREATE OR REPLACE FUNCTION update_lottery_status()
RETURNS void AS $$
BEGIN
    -- Активируем запланированные розыгрыши, время которых пришло
    UPDATE lottery_draws 
    SET status = 'active'
    WHERE status = 'scheduled' 
      AND draw_date <= NOW()
      AND end_date > NOW();
    
    -- Завершаем активные розыгрыши, время которых истекло
    UPDATE lottery_draws 
    SET status = 'finished'
    WHERE status = 'active' 
      AND end_date <= NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ
-- =====================================================

-- Пример: Создание розыгрыша с продолжительностью
/*
INSERT INTO lottery_draws (
    draw_name, 
    draw_date, 
    duration_minutes,  -- 3 дня = 4320 минут
    prize_description,
    number_price_usd,
    number_price_bs
) VALUES (
    '#2 - Sorteo de 3 días',
    '2025-01-15 14:00:00+00',
    4320,  -- 3 дня
    'iPhone 15 Pro Max',
    2.00,
    320.00
);
*/

-- Пример: Создание розыгрыша с конкретным временем окончания
/*
INSERT INTO lottery_draws (
    draw_name, 
    draw_date, 
    end_date,
    prize_description,
    number_price_usd,
    number_price_bs
) VALUES (
    '#3 - Sorteo hasta Año Nuevo',
    '2025-01-15 14:00:00+00',
    '2025-01-01 00:00:00+00',
    'Viaje a Miami',
    5.00,
    800.00
);
*/

-- =====================================================
-- 9. ПРОВЕРКА РЕЗУЛЬТАТОВ
-- =====================================================

-- Проверяем добавленные поля
SELECT 
  '=== NUEVOS CAMPOS ===' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'lottery_draws' 
  AND column_name IN ('end_date', 'duration_minutes');

-- Проверяем функции
SELECT 
  '=== FUNCIONES CREADAS ===' as info,
  proname as function_name,
  prosrc as function_body
FROM pg_proc 
WHERE proname IN ('calculate_end_date', 'update_lottery_status');

-- Проверяем триггеры
SELECT 
  '=== TRIGGERS ===' as info,
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_calculate_end_date';

-- Проверяем индексы
SELECT 
  '=== ÍNDICES ===' as info,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'lottery_draws' 
  AND indexname LIKE 'idx_lottery_draws_%';

-- =====================================================
-- 10. ФИНАЛЬНОЕ СООБЩЕНИЕ
-- =====================================================

DO $$ 
BEGIN
    RAISE NOTICE '🎉 МИГРАЦИЯ ВРЕМЕНИ ОКОНЧАНИЯ ЗАВЕРШЕНА!';
    RAISE NOTICE '✅ Поле end_date добавлено для точного времени завершения';
    RAISE NOTICE '✅ Поле duration_minutes для продолжительности в минутах';
    RAISE NOTICE '✅ Автоматический расчет между end_date и duration_minutes';
    RAISE NOTICE '✅ Триггер для синхронизации полей создан';
    RAISE NOTICE '✅ Функция для обновления статуса создана';
    RAISE NOTICE '✅ Индексы для производительности добавлены';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Что делать дальше:';
    RAISE NOTICE '1. Выполните этот SQL в Supabase SQL Editor';
    RAISE NOTICE '2. Обновите интерфейс для добавления полей окончания';
    RAISE NOTICE '3. Можете использовать функцию update_lottery_status() для автоматического управления статусами';
END $$; 