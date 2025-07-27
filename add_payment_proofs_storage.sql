-- =============================================
-- МИГРАЦИЯ: ДОБАВЛЕНИЕ STORAGE ДЛЯ КОМПРОБАНТЕ
-- =============================================
-- Выполните этот SQL в Supabase SQL Editor

-- 1. Создаем bucket для компробанте (подтверждений оплаты)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs', 
  'payment-proofs', 
  true, 
  10485760, -- 10MB лимит
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- 2. Политики для компробанте

-- Публичный просмотр компробанте (для администраторов)
CREATE POLICY "Публичный просмотр компробанте payment-proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-proofs');

-- Разрешаем загрузку компробанте всем пользователям
CREATE POLICY "Пользователи могут загружать компробанте payment-proofs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payment-proofs');

-- Разрешаем удаление компробанте администраторам
CREATE POLICY "Админы могут удалять компробанте payment-proofs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'payment-proofs' AND
  auth.role() = 'authenticated'
);

-- 3. Проверяем созданный bucket
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'payment-proofs';

-- 4. Проверяем политики
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'objects' 
  AND schemaname = 'storage' 
  AND policyname LIKE '%payment-proofs%';

COMMIT; 