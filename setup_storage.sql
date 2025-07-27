-- =============================================
-- НАСТРОЙКА SUPABASE STORAGE ДЛЯ ИЗОБРАЖЕНИЙ И ДОКУМЕНТОВ
-- =============================================
-- Выполните этот SQL в Supabase SQL Editor

-- 1. Создаем bucket для изображений розыгрышей
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lottery-images', 
  'lottery-images', 
  true, 
  5242880, -- 5MB лимит
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- 1a. Создаем bucket для компробанте (подтверждений оплаты)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs', 
  'payment-proofs', 
  true, 
  10485760, -- 10MB лимит
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- 2. Настройка RLS политик для bucket
CREATE POLICY "Публичный просмотр изображений lottery-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'lottery-images');

-- 3. Разрешаем загрузку изображений администраторам
CREATE POLICY "Админы могут загружать изображения lottery-images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'lottery-images' AND
  auth.role() = 'authenticated'
);

-- 4. Разрешаем удаление изображений администраторам
CREATE POLICY "Админы могут удалять изображения lottery-images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'lottery-images' AND
  auth.role() = 'authenticated'
);

-- 5. Разрешаем обновление изображений администраторам
CREATE POLICY "Админы могут обновлять изображения lottery-images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'lottery-images' AND
  auth.role() = 'authenticated'
);

-- === ПОЛИТИКИ ДЛЯ КОМПРОБАНТЕ ===

-- 6. Публичный просмотр компробанте (для администраторов)
CREATE POLICY "Публичный просмотр компробанте payment-proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-proofs');

-- 7. Разрешаем загрузку компробанте всем пользователям
CREATE POLICY "Пользователи могут загружать компробанте payment-proofs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payment-proofs');

-- 8. Разрешаем удаление компробанте администраторам
CREATE POLICY "Админы могут удалять компробанте payment-proofs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'payment-proofs' AND
  auth.role() = 'authenticated'
);

-- 9. Проверяем созданные buckets
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id IN ('lottery-images', 'payment-proofs');

-- 7. Проверяем политики
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage';

COMMIT; 