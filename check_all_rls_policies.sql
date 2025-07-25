-- =====================================================
-- ДИАГНОСТИКА ВСЕХ RLS ПОЛИТИК В БАЗЕ ДАННЫХ
-- Поможет найти таблицы с проблемами доступа
-- =====================================================

-- 1. Проверяем все таблицы с включенным RLS
SELECT 
    '🔒 ТАБЛИЦЫ С RLS' as info,
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ RLS включен'
        ELSE '❌ RLS отключен'
    END as status
FROM pg_tables pt
JOIN pg_class pc ON pt.tablename = pc.relname
WHERE pc.relrowsecurity = true
ORDER BY schemaname, tablename;

-- 2. Показываем все активные политики
SELECT 
    '📋 АКТИВНЫЕ ПОЛИТИКИ' as info,
    schemaname,
    tablename,
    policyname,
    cmd as operation,
    roles,
    CASE 
        WHEN permissive = 'PERMISSIVE' THEN '✅ Разрешающая'
        ELSE '🚫 Ограничивающая'
    END as policy_type
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Проверяем таблицы БЕЗ политик (могут вызывать ошибки 406)
WITH rls_tables AS (
    SELECT pt.tablename
    FROM pg_tables pt
    JOIN pg_class pc ON pt.tablename = pc.relname
    WHERE pc.relrowsecurity = true AND pt.schemaname = 'public'
),
tables_with_policies AS (
    SELECT DISTINCT tablename
    FROM pg_policies 
    WHERE schemaname = 'public'
)
SELECT 
    '⚠️ ТАБЛИЦЫ БЕЗ ПОЛИТИК (ВОЗМОЖНЫЕ ОШИБКИ 406)' as warning,
    rt.tablename,
    '❌ Нет политик доступа' as issue
FROM rls_tables rt
LEFT JOIN tables_with_policies twp ON rt.tablename = twp.tablename
WHERE twp.tablename IS NULL;

-- 4. Проверяем основные таблицы приложения
SELECT 
    '🎯 СТАТУС ОСНОВНЫХ ТАБЛИЦ' as info,
    table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = t.table_name
        ) THEN '✅ Существует'
        ELSE '❌ Не найдена'
    END as exists_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_tables pt
            JOIN pg_class pc ON pt.tablename = pc.relname
            WHERE pt.tablename = t.table_name AND pc.relrowsecurity = true
        ) THEN '🔒 RLS включен'
        ELSE '🔓 RLS отключен'
    END as rls_status,
    COALESCE(
        (SELECT COUNT(*) FROM pg_policies WHERE tablename = t.table_name),
        0
    ) as policies_count
FROM (VALUES 
    ('lottery_draws'),
    ('active_lottery'), 
    ('lottery_settings'),
    ('number_reservations'),
    ('applications'),
    ('lottery_history'),
    ('currency_settings')
) AS t(table_name);

-- 5. Тестируем доступ к каждой таблице
DO $$
DECLARE
    table_name TEXT;
    result_count INTEGER;
    error_text TEXT;
BEGIN
    RAISE NOTICE '🧪 ТЕСТИРОВАНИЕ ДОСТУПА К ТАБЛИЦАМ:';
    
    FOR table_name IN 
        SELECT t FROM unnest(ARRAY[
            'lottery_draws', 
            'active_lottery', 
            'lottery_settings', 
            'number_reservations', 
            'applications',
            'currency_settings'
        ]) AS t
    LOOP
        BEGIN
            EXECUTE format('SELECT COUNT(*) FROM %I', table_name) INTO result_count;
            RAISE NOTICE '✅ %: доступна (% записей)', table_name, result_count;
        EXCEPTION WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS error_text = MESSAGE_TEXT;
            RAISE NOTICE '❌ %: ОШИБКА - %', table_name, error_text;
        END;
    END LOOP;
END $$;

-- 6. Рекомендации по исправлению
SELECT 
    '💡 РЕКОМЕНДАЦИИ' as info,
    recommendation
FROM (VALUES 
    ('1. Если есть таблицы без политик - выполните fix_active_lottery_rls_406.sql'),
    ('2. Для валютной системы - выполните add_bolivar_currency_system.sql'),
    ('3. Для отложенного запуска (опционально) - выполните add_scheduled_start_time.sql'),
    ('4. Проверьте переменные окружения VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY')
) AS r(recommendation);

-- 7. Показываем переменные Supabase (если доступны)
SELECT 
    '🔧 ПРОВЕРКА НАСТРОЕК' as info,
    'Убедитесь что в .env.local настроены:' as note,
    'VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY' as required_vars; 