-- Проверка состояния миграции отложенного запуска (ИСПРАВЛЕННАЯ ВЕРСИЯ)
-- Выполните этот скрипт, чтобы проверить текущее состояние

-- 1. Проверяем существование колонки scheduled_start_time
SELECT 
    'ПРОВЕРКА КОЛОНКИ scheduled_start_time' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'lottery_draws' AND column_name = 'scheduled_start_time'
        ) THEN '✅ СУЩЕСТВУЕТ'
        ELSE '❌ НЕ СУЩЕСТВУЕТ - выполните add_scheduled_start_time.sql'
    END as status;

-- 2. Проверяем существование функций
SELECT 
    'ПРОВЕРКА ФУНКЦИЙ' as check_type,
    routine_name,
    routine_type,
    CASE 
        WHEN routine_name IS NOT NULL THEN '✅ СУЩЕСТВУЕТ'
        ELSE '❌ НЕ СУЩЕСТВУЕТ'
    END as status
FROM (
    VALUES 
        ('auto_start_scheduled_draws'),
        ('validate_scheduled_start_time'),
        ('get_scheduled_draws_with_timer')
) AS expected_functions(func_name)
LEFT JOIN information_schema.routines r ON (
    r.routine_name = expected_functions.func_name 
    AND r.routine_schema = 'public'
);

-- 3. Проверяем существование триггеров
SELECT 
    'ПРОВЕРКА ТРИГГЕРОВ' as check_type,
    'trigger_validate_scheduled_start_time' as trigger_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.triggers 
            WHERE trigger_name = 'trigger_validate_scheduled_start_time'
        ) THEN '✅ СУЩЕСТВУЕТ'
        ELSE '❌ НЕ СУЩЕСТВУЕТ'
    END as status;

-- 4. Проверяем существование представления v_lottery_draws_full
SELECT 
    'ПРОВЕРКА ПРЕДСТАВЛЕНИЯ' as check_type,
    'v_lottery_draws_full' as view_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.views 
            WHERE table_name = 'v_lottery_draws_full'
        ) THEN '✅ СУЩЕСТВУЕТ'
        ELSE '❌ НЕ СУЩЕСТВУЕТ'
    END as status;

-- 5. Проверяем индексы
SELECT 
    'ПРОВЕРКА ИНДЕКСОВ' as check_type,
    indexname,
    CASE 
        WHEN indexname IS NOT NULL THEN '✅ СУЩЕСТВУЕТ'
        ELSE '❌ НЕ СУЩЕСТВУЕТ'
    END as status
FROM pg_indexes 
WHERE tablename = 'lottery_draws' 
    AND indexname LIKE '%scheduled%'
UNION ALL
SELECT 
    'ПРОВЕРКА ИНДЕКСОВ' as check_type,
    'idx_lottery_draws_scheduled_start' as indexname,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'lottery_draws' AND indexname = 'idx_lottery_draws_scheduled_start'
        ) THEN '✅ СУЩЕСТВУЕТ'
        ELSE '❌ НЕ СУЩЕСТВУЕТ'
    END as status;

-- 6. Показываем структуру таблицы lottery_draws
SELECT 
    'СТРУКТУРА ТАБЛИЦЫ lottery_draws' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'lottery_draws' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 7. Проверяем состояние миграции
SELECT 
    'РЕЗУЛЬТАТ ПРОВЕРКИ' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'lottery_draws' AND column_name = 'scheduled_start_time'
        ) THEN 
            CASE 
                WHEN EXISTS (
                    SELECT 1 FROM information_schema.routines 
                    WHERE routine_name = 'auto_start_scheduled_draws' AND routine_schema = 'public'
                ) THEN '🎉 МИГРАЦИЯ ОТЛОЖЕННОГО ЗАПУСКА ЗАВЕРШЕНА'
                ELSE '⚠️ КОЛОНКА ЕСТЬ, НО ФУНКЦИИ НЕ НАЙДЕНЫ'
            END
        ELSE '❌ МИГРАЦИЯ НЕ ВЫПОЛНЕНА - запустите add_scheduled_start_time.sql'
    END as status;

-- 8. Показываем общую статистику розыгрышей (всегда работает)
SELECT 
    'ОБЩАЯ СТАТИСТИКА РОЗЫГРЫШЕЙ' as info,
    COUNT(*) as total_draws,
    COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
    COUNT(CASE WHEN status = 'finished' THEN 1 END) as finished,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
FROM lottery_draws;

-- 9. Показываем детальную статистику только если колонка scheduled_start_time существует
SELECT 
    'ДЕТАЛЬНАЯ СТАТИСТИКА' as info,
    'Проверьте результат выше - если миграция не выполнена, эта секция будет пустой' as note
WHERE EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lottery_draws' AND column_name = 'scheduled_start_time'
);

-- Этот запрос выполнится только если колонка существует
SELECT 
    'ДЕТАЛЬНАЯ СТАТИСТИКА ОТЛОЖЕННОГО ЗАПУСКА' as info,
    type,
    count
FROM (
    SELECT 
        'Обычные запланированные розыгрыши' as type,
        COUNT(*) as count
    FROM lottery_draws
    WHERE status = 'scheduled' AND scheduled_start_time IS NULL
    UNION ALL
    SELECT 
        'Розыгрыши с отложенным запуском' as type,
        COUNT(*) as count
    FROM lottery_draws
    WHERE status = 'scheduled' AND scheduled_start_time IS NOT NULL
    UNION ALL
    SELECT 
        'Розыгрыши готовые к запуску' as type,
        COUNT(*) as count
    FROM lottery_draws
    WHERE status = 'scheduled' 
        AND scheduled_start_time IS NOT NULL 
        AND scheduled_start_time <= NOW()
) stats
WHERE EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lottery_draws' AND column_name = 'scheduled_start_time'
); 