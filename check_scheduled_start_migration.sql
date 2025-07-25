-- Проверка состояния миграции отложенного запуска
-- Выполните этот скрипт, чтобы проверить текущее состояние

-- 1. Проверяем существование колонки scheduled_start_time
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'lottery_draws' 
    AND column_name = 'scheduled_start_time';

-- 2. Проверяем существование функций
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_name IN ('auto_start_scheduled_draws', 'validate_scheduled_start_time', 'get_scheduled_draws_with_timer')
    AND routine_schema = 'public';

-- 3. Проверяем существование триггеров
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_validate_scheduled_start_time';

-- 4. Проверяем существование представления
SELECT 
    table_name,
    view_definition
FROM information_schema.views 
WHERE table_name = 'v_lottery_draws_full';

-- 5. Проверяем индексы
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'lottery_draws' 
    AND indexname LIKE '%scheduled%';

-- 6. Показываем структуру таблицы lottery_draws (замена для \d)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'lottery_draws' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 7. Если колонка уже существует, показываем данные с отложенным запуском
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lottery_draws' AND column_name = 'scheduled_start_time'
    ) THEN
        RAISE NOTICE 'Колонка scheduled_start_time уже существует';
        
        -- Показать розыгрыши с отложенным запуском
        PERFORM 1; -- Заглушка, так как в DO блоке нельзя использовать SELECT напрямую
    ELSE
        RAISE NOTICE 'Колонка scheduled_start_time НЕ существует - нужно выполнить миграцию';
    END IF;
END $$;

-- 8. Показать статистику только если колонка существует
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lottery_draws' AND column_name = 'scheduled_start_time'
    ) THEN
        RAISE NOTICE '=== СТАТИСТИКА РОЗЫГРЫШЕЙ ===';
        
        -- Используем EXECUTE для динамического SQL
        PERFORM * FROM (
            SELECT 
                'Обычные запланированные розыгрыши' as type,
                COUNT(*) as count
            FROM lottery_draws
            WHERE status = 'scheduled' AND scheduled_start_time IS NULL
            UNION ALL
            SELECT 
                'Розыгрыши с отложенным запуском',
                COUNT(*)
            FROM lottery_draws
            WHERE status = 'scheduled' AND scheduled_start_time IS NOT NULL
            UNION ALL
            SELECT 
                'Активные розыгрыши',
                COUNT(*)
            FROM lottery_draws
            WHERE status = 'active'
        ) stats;
        
    ELSE
        RAISE NOTICE 'Колонка scheduled_start_time НЕ существует - выполните сначала add_scheduled_start_time.sql';
        
        -- Базовая статистика без scheduled_start_time
        PERFORM * FROM (
            SELECT 
                'Все запланированные розыгрыши' as type,
                COUNT(*) as count
            FROM lottery_draws
            WHERE status = 'scheduled'
            UNION ALL
            SELECT 
                'Активные розыгрыши',
                COUNT(*)
            FROM lottery_draws
            WHERE status = 'active'
        ) basic_stats;
    END IF;
END $$;

-- 9. Показываем базовую статистику всех розыгрышей (всегда работает)
SELECT 
    'ОБЩАЯ СТАТИСТИКА' as info,
    COUNT(*) as total_draws,
    COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
    COUNT(CASE WHEN status = 'finished' THEN 1 END) as finished,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
FROM lottery_draws; 