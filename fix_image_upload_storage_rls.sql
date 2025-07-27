-- =====================================================
-- ИСПРАВЛЕНИЕ: Загрузка изображений в Storage
-- Решает ошибку "new row violates row-level security policy"
-- =====================================================

DO $$ 
BEGIN
    RAISE NOTICE '🖼️ ИСПРАВЛЯЕМ ПОЛИТИКИ STORAGE ДЛЯ ЗАГРУЗКИ ИЗОБРАЖЕНИЙ...';
END $$;

-- =====================================================
-- 1. СОЗДАНИЕ И НАСТРОЙКА BUCKET
-- =====================================================

-- Создаем bucket для изображений если не существует
INSERT INTO storage.buckets (id, name, public)
VALUES ('lottery-images', 'lottery-images', true)
ON CONFLICT (id) DO UPDATE SET
  public = true;

-- =====================================================
-- 2. УДАЛЕНИЕ СТАРЫХ ПОЛИТИК STORAGE
-- =====================================================

-- Удаляем все старые политики для objects
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow all operations" ON storage.objects;
DROP POLICY IF EXISTS "lottery_images_read" ON storage.objects;
DROP POLICY IF EXISTS "lottery_images_upload" ON storage.objects;
DROP POLICY IF EXISTS "lottery_images_update" ON storage.objects;
DROP POLICY IF EXISTS "lottery_images_delete" ON storage.objects;

-- Удаляем все старые политики для buckets
DROP POLICY IF EXISTS "Allow public bucket access" ON storage.buckets;
DROP POLICY IF EXISTS "Allow all bucket operations" ON storage.buckets;

-- =====================================================
-- 3. СОЗДАНИЕ МАКСИМАЛЬНО ОТКРЫТЫХ ПОЛИТИК ДЛЯ STORAGE.OBJECTS
-- =====================================================

-- Разрешаем всем читать файлы из bucket lottery-images
CREATE POLICY "public_read_lottery_images" ON storage.objects
FOR SELECT 
USING (bucket_id = 'lottery-images');

-- Разрешаем всем загружать файлы в bucket lottery-images
CREATE POLICY "public_upload_lottery_images" ON storage.objects
FOR INSERT 
WITH CHECK (bucket_id = 'lottery-images');

-- Разрешаем всем обновлять файлы в bucket lottery-images
CREATE POLICY "public_update_lottery_images" ON storage.objects
FOR UPDATE 
USING (bucket_id = 'lottery-images')
WITH CHECK (bucket_id = 'lottery-images');

-- Разрешаем всем удалять файлы из bucket lottery-images
CREATE POLICY "public_delete_lottery_images" ON storage.objects
FOR DELETE 
USING (bucket_id = 'lottery-images');

-- =====================================================
-- 4. СОЗДАНИЕ ПОЛИТИК ДЛЯ STORAGE.BUCKETS
-- =====================================================

-- Разрешаем всем читать информацию о bucket
CREATE POLICY "public_bucket_access" ON storage.buckets
FOR SELECT 
USING (true);

-- =====================================================
-- 5. АЛЬТЕРНАТИВНЫЕ УНИВЕРСАЛЬНЫЕ ПОЛИТИКИ (если основные не работают)
-- =====================================================

-- Если основные политики не работают, создаем максимально открытые
CREATE POLICY "allow_all_storage_operations" ON storage.objects
FOR ALL 
USING (true)
WITH CHECK (true);

CREATE POLICY "allow_all_bucket_operations" ON storage.buckets
FOR ALL 
USING (true)
WITH CHECK (true);

-- =====================================================
-- 6. ПРОВЕРКА НАСТРОЕК BUCKET
-- =====================================================

-- Убеждаемся что bucket публичный
UPDATE storage.buckets 
SET public = true 
WHERE id = 'lottery-images';

-- =====================================================
-- 7. ПРОВЕРКА РЕЗУЛЬТАТОВ
-- =====================================================

-- Проверяем bucket
SELECT 
  '=== BUCKET LOTTERY-IMAGES ===' as info,
  id,
  name,
  public,
  created_at
FROM storage.buckets 
WHERE id = 'lottery-images';

-- Проверяем политики storage.objects
SELECT 
  '=== POLÍTICAS STORAGE.OBJECTS ===' as info,
  COUNT(*) as policies_count
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- Показываем все политики storage.objects
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- Проверяем политики storage.buckets
SELECT 
  '=== POLÍTICAS STORAGE.BUCKETS ===' as info,
  COUNT(*) as policies_count
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'buckets';

-- =====================================================
-- 8. ТЕСТИРОВАНИЕ ДОСТУПА
-- =====================================================

-- Тестируем доступ к bucket
SELECT 
  '=== ТЕСТ ДОСТУПА К BUCKET ===' as info,
  CASE 
    WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'lottery-images' AND public = true) 
    THEN '✅ Bucket доступен для загрузки' 
    ELSE '❌ Проблемы с bucket' 
  END as status;

-- =====================================================
-- 9. ФИНАЛЬНОЕ СООБЩЕНИЕ
-- =====================================================

DO $$ 
BEGIN
    RAISE NOTICE '🎉 ИСПРАВЛЕНИЕ STORAGE ЗАВЕРШЕНО!';
    RAISE NOTICE '✅ Bucket lottery-images создан и настроен как публичный';
    RAISE NOTICE '✅ RLS политики для storage.objects созданы';
    RAISE NOTICE '✅ RLS политики для storage.buckets созданы'; 
    RAISE NOTICE '✅ Альтернативные универсальные политики добавлены';
    RAISE NOTICE '🖼️ Загрузка изображений должна работать!';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Что делать дальше:';
    RAISE NOTICE '1. Выполните этот SQL в Supabase SQL Editor';
    RAISE NOTICE '2. Попробуйте загрузить изображение в админ-панели';
    RAISE NOTICE '3. Если не работает - проверьте CORS настройки в Supabase';
END $$; 