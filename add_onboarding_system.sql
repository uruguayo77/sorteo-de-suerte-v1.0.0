-- =====================================================
-- МИГРАЦИЯ: СИСТЕМА ОНБОРДИНГА
-- Создание таблицы конфигурации и настройка storage
-- =====================================================

-- 1. Создаем таблицу конфигурации онбординга
CREATE TABLE IF NOT EXISTS onboarding_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Bienvenido al Sorteo',
  description TEXT DEFAULT 'Participa en nuestro sorteo y gana increíbles premios',
  is_enabled BOOLEAN DEFAULT true,
  button_text TEXT DEFAULT 'Continuar',
  show_on_every_visit BOOLEAN DEFAULT false,
  media_type TEXT CHECK (media_type IN ('image', 'video')) DEFAULT 'image',
  media_url TEXT,
  media_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Создаем bucket для медиафайлов онбординга
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'onboarding-media', 
  'onboarding-media', 
  true, 
  52428800, -- 50MB лимит
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/mov']
) ON CONFLICT (id) DO NOTHING;

-- 3. RLS политики для onboarding_config

-- Включаем RLS
ALTER TABLE onboarding_config ENABLE ROW LEVEL SECURITY;

-- Политика для публичного чтения конфигурации
CREATE POLICY "Публичное чтение конфигурации онбординга"
ON onboarding_config FOR SELECT
TO anon, authenticated
USING (is_enabled = true);

-- Политика для админов (все операции)
CREATE POLICY "Админы управляют онбордингом"
ON onboarding_config FOR ALL
TO authenticated
USING (auth.role() = 'authenticated');

-- 4. RLS политики для storage bucket onboarding-media

-- Публичный просмотр медиафайлов
CREATE POLICY "Публичный просмотр медиа онбординга"
ON storage.objects FOR SELECT
USING (bucket_id = 'onboarding-media');

-- Загрузка медиа для аутентифицированных пользователей (админов)
CREATE POLICY "Админы загружают медиа онбординга"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'onboarding-media' AND
  auth.role() = 'authenticated'
);

-- Удаление медиа для администраторов
CREATE POLICY "Админы удаляют медиа онбординга"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'onboarding-media' AND
  auth.role() = 'authenticated'
);

-- 5. Добавляем начальную конфигурацию
INSERT INTO onboarding_config (
  title,
  description,
  is_enabled,
  button_text,
  show_on_every_visit,
  media_type
) VALUES (
  'Bienvenido al Sorteo de Suerte',
  'Participa en nuestro emocionante sorteo y gana increíbles premios. Selecciona tu número de la suerte del 1 al 100.',
  true,
  'Continuar',
  false,
  'image'
) ON CONFLICT (id) DO NOTHING;

-- 6. Проверяем созданную таблицу
SELECT 
  id,
  title,
  is_enabled,
  media_type,
  created_at
FROM onboarding_config;

-- 7. Проверяем bucket
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'onboarding-media';

-- 8. Проверяем политики
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE tablename = 'onboarding_config' 
  AND schemaname = 'public';

COMMIT; 