-- =====================================================
-- ИСПРАВЛЕНИЕ ОШИБКИ 406 (Not Acceptable) 
-- Таблица: active_lottery
-- =====================================================

BEGIN;

-- 1. Проверяем существование таблицы active_lottery
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'active_lottery') THEN
    RAISE NOTICE 'Таблица active_lottery не существует. Создаём...';
    
    -- Создаём таблицу active_lottery если её нет
    CREATE TABLE active_lottery (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      lottery_number INTEGER NOT NULL,
      name TEXT NOT NULL,
      prize_amount TEXT,
      prize_description TEXT, -- Новое поле для описания приза
      start_time TIMESTAMP WITH TIME ZONE NOT NULL,
      end_time TIMESTAMP WITH TIME ZONE NOT NULL,
      duration_minutes INTEGER NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      is_paused BOOLEAN DEFAULT FALSE,
      is_completed BOOLEAN DEFAULT FALSE,
      winner_number INTEGER,
      selected_numbers INTEGER[] DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Создаём индексы
    CREATE INDEX IF NOT EXISTS idx_active_lottery_number ON active_lottery(lottery_number);
    CREATE INDEX IF NOT EXISTS idx_active_lottery_active ON active_lottery(is_active);
    CREATE INDEX IF NOT EXISTS idx_active_lottery_created_at ON active_lottery(created_at);
    
    RAISE NOTICE '✅ Таблица active_lottery создана';
  ELSE
    RAISE NOTICE 'ℹ️ Таблица active_lottery уже существует';
  END IF;
END $$;

-- 2. Добавляем недостающие колонки если нужно
DO $$
BEGIN
  -- Добавляем prize_description если её нет
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'active_lottery' AND column_name = 'prize_description'
  ) THEN
    ALTER TABLE active_lottery ADD COLUMN prize_description TEXT;
    RAISE NOTICE '✅ Колонка prize_description добавлена';
  END IF;
END $$;

-- 3. Включаем RLS
ALTER TABLE active_lottery ENABLE ROW LEVEL SECURITY;

-- 4. Удаляем ВСЕ существующие политики (чтобы избежать конфликтов)
DROP POLICY IF EXISTS "Cualquiera puede ver lotería activa" ON active_lottery;
DROP POLICY IF EXISTS "Todos pueden ver sorteos activos" ON active_lottery;
DROP POLICY IF EXISTS "Solo administradores pueden modificar sorteos activos" ON active_lottery;
DROP POLICY IF EXISTS "public_lottery_read" ON active_lottery;
DROP POLICY IF EXISTS "admin_lottery_all" ON active_lottery;
DROP POLICY IF EXISTS "anon_read_active_lottery" ON active_lottery;
DROP POLICY IF EXISTS "service_role_all_active_lottery" ON active_lottery;

-- 5. Создаём простые и понятные политики
-- Политика для чтения (любой может читать активные лотереи)
CREATE POLICY "anon_read_active_lottery" ON active_lottery
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Политика для всех операций через service_role (админ функции)
CREATE POLICY "service_role_all_active_lottery" ON active_lottery
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. Проверяем результат
SELECT 
  'active_lottery' as table_name,
  pc.relrowsecurity as rls_enabled,
  CASE 
    WHEN pc.relrowsecurity THEN '✅ RLS включен'
    ELSE '❌ RLS отключен'
  END as rls_status
FROM pg_tables pt
JOIN pg_class pc ON pt.tablename = pc.relname
WHERE pt.tablename = 'active_lottery' AND pt.schemaname = 'public';

-- 7. Показываем активные политики
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'active_lottery';

-- 8. Вставляем тестовые данные если таблица пустая
INSERT INTO active_lottery (
  lottery_number, 
  name, 
  prize_description, 
  start_time, 
  end_time, 
  duration_minutes,
  is_active
) 
SELECT 
  1,
  'Sorteo de Prueba',
  'Premio de prueba - iPhone 15 Pro',
  NOW(),
  NOW() + INTERVAL '24 hours',
  1440,
  TRUE
WHERE NOT EXISTS (SELECT 1 FROM active_lottery LIMIT 1);

-- 9. Тестируем доступ
SELECT 
  'ТЕСТ ДОСТУПА' as test_type,
  COUNT(*) as total_records,
  COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_records
FROM active_lottery;

-- 10. Финальная проверка
SELECT 
  '🎯 РЕЗУЛЬТАТ ИСПРАВЛЕНИЯ' as status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM active_lottery) THEN '✅ Таблица доступна и содержит данные'
    ELSE '⚠️ Таблица пустая, но доступна'
  END as result;

-- 11. Финальное сообщение
DO $$
BEGIN
  RAISE NOTICE '🔧 Скрипт завершён. Ошибка 406 должна быть исправлена.';
  RAISE NOTICE '📋 Проверьте результат выше - если есть данные в active_lottery, то всё работает корректно.';
END $$;

COMMIT; 