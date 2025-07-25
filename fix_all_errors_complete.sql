-- =====================================================
-- ПОЛНОЕ ИСПРАВЛЕНИЕ ВСЕХ ОШИБОК СИСТЕМЫ
-- Исправляет: 406, 42501, 22P02 - все критические проблемы за один раз
-- =====================================================

DO $$ 
BEGIN
    RAISE NOTICE '🚀 Начинаем полное исправление системы...';
END $$;

-- =====================================================
-- 1. ИСПРАВЛЕНИЕ ACTIVE_LOTTERY (Ошибка 406)
-- =====================================================

DO $$ 
BEGIN
    RAISE NOTICE '📊 Исправляем таблицу active_lottery...';
END $$;

-- Создаем таблицу active_lottery если не существует
CREATE TABLE IF NOT EXISTS active_lottery (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lottery_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  prize_amount TEXT,
  prize_description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  duration_minutes INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  is_paused BOOLEAN DEFAULT FALSE,
  is_completed BOOLEAN DEFAULT FALSE,
  winner_number INTEGER,
  selected_numbers INTEGER[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Включаем RLS для active_lottery
ALTER TABLE active_lottery ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики active_lottery
DROP POLICY IF EXISTS "anon_read_active_lottery" ON active_lottery;
DROP POLICY IF EXISTS "service_role_all_active_lottery" ON active_lottery;

-- Создаем новые политики active_lottery
CREATE POLICY "anon_read_active_lottery" ON active_lottery
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "service_role_all_active_lottery" ON active_lottery
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =====================================================
-- 2. ИСПРАВЛЕНИЕ LOTTERY_DRAWS (Ошибка 42501)
-- =====================================================

DO $$ 
BEGIN
    RAISE NOTICE '🎯 Исправляем RLS политики lottery_draws...';
END $$;

-- Временно отключаем RLS для lottery_draws
ALTER TABLE lottery_draws DISABLE ROW LEVEL SECURITY;

-- Удаляем все старые политики lottery_draws
DROP POLICY IF EXISTS "anon_read_lottery_draws" ON lottery_draws;
DROP POLICY IF EXISTS "service_role_all_lottery_draws" ON lottery_draws;
DROP POLICY IF EXISTS "authenticated_insert_lottery_draws" ON lottery_draws;
DROP POLICY IF EXISTS "authenticated_update_lottery_draws" ON lottery_draws;

-- Включаем RLS обратно
ALTER TABLE lottery_draws ENABLE ROW LEVEL SECURITY;

-- Создаем новые политики lottery_draws
CREATE POLICY "anon_read_lottery_draws" ON lottery_draws
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "service_role_all_lottery_draws" ON lottery_draws
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_insert_lottery_draws" ON lottery_draws
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated_update_lottery_draws" ON lottery_draws
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- =====================================================
-- 3. ИСПРАВЛЕНИЕ CREATED_BY UUID (Ошибка 22P02)
-- =====================================================

DO $$ 
BEGIN
    RAISE NOTICE '🔧 Исправляем поле created_by в lottery_draws...';
END $$;

-- Проверяем и исправляем поле created_by
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lottery_draws' 
        AND column_name = 'created_by'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE lottery_draws ALTER COLUMN created_by DROP NOT NULL;
        RAISE NOTICE '✅ Поле created_by сделано необязательным';
    END IF;
END $$;

-- =====================================================
-- 4. ДОБАВЛЕНИЕ ТЕСТОВЫХ ДАННЫХ
-- =====================================================

DO $$ 
BEGIN
    RAISE NOTICE '📝 Добавляем тестовые данные...';
END $$;

-- Добавляем тестовую запись в active_lottery если таблица пуста
INSERT INTO active_lottery (
  lottery_number, name, prize_description, 
  start_time, end_time, duration_minutes, is_active
) 
SELECT 1, 'Sorteo de Prueba Completo', 'Premio de prueba después de corrección completa', 
       NOW(), NOW() + INTERVAL '24 hours', 1440, TRUE
WHERE NOT EXISTS (SELECT 1 FROM active_lottery LIMIT 1);

-- =====================================================
-- 5. ПРОВЕРКА РЕЗУЛЬТАТОВ
-- =====================================================

DO $$ 
BEGIN
    RAISE NOTICE '🔍 Проверяем результаты исправления...';
END $$;

-- Проверяем состояние active_lottery
SELECT 
  '=== ACTIVE_LOTTERY ===' as info,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE is_active = true) as active_records
FROM active_lottery;

-- Проверяем RLS политики active_lottery
SELECT 
  '=== ПОЛИТИКИ ACTIVE_LOTTERY ===' as info,
  COUNT(*) as policies_count
FROM pg_policies 
WHERE tablename = 'active_lottery';

-- Проверяем RLS политики lottery_draws  
SELECT 
  '=== ПОЛИТИКИ LOTTERY_DRAWS ===' as info,
  COUNT(*) as policies_count
FROM pg_policies 
WHERE tablename = 'lottery_draws';

-- Проверяем поле created_by
SELECT 
  '=== ПОЛЕ CREATED_BY ===' as info,
  is_nullable,
  CASE WHEN is_nullable = 'YES' THEN '✅ Поле необязательное' 
       ELSE '❌ Поле обязательное' END as status
FROM information_schema.columns 
WHERE table_name = 'lottery_draws' 
  AND column_name = 'created_by';

-- =====================================================
-- 6. ФИНАЛЬНОЕ СООБЩЕНИЕ
-- =====================================================

DO $$ 
BEGIN
    RAISE NOTICE '🎉 ИСПРАВЛЕНИЕ ЗАВЕРШЕНО УСПЕШНО!';
    RAISE NOTICE '✅ active_lottery: RLS политики исправлены';
    RAISE NOTICE '✅ lottery_draws: RLS политики исправлены'; 
    RAISE NOTICE '✅ created_by: поле сделано необязательным';
    RAISE NOTICE '🚀 Система готова к работе!';
END $$; 