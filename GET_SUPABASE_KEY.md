# Получение анонимного ключа Supabase

## Шаг 1: Войдите в Supabase Dashboard
1. Откройте https://supabase.com/dashboard
2. Войдите в свой аккаунт
3. Выберите проект `yetjflxjxujdhemailxx`

## Шаг 2: Найдите API ключи
1. В левом меню нажмите **Settings** (шестеренка)
2. Выберите **API**
3. В разделе **Project API keys** найдите:
   - **Project URL**: `https://yetjflxjxujdhemailxx.supabase.co`
   - **anon public key**: (начинается с `eyJ...`)

## Шаг 3: Скопируйте анонимный ключ
- Скопируйте **anon public key** (это длинная строка, начинающаяся с `eyJ`)
- **НЕ копируйте service_role key** - он предназначен только для серверной части

## Шаг 4: Создайте файл .env.local
В корне проекта создайте файл `.env.local` с содержимым:

```env
VITE_SUPABASE_URL=https://yetjflxjxujdhemailxx.supabase.co
VITE_SUPABASE_ANON_KEY=ваш_анонимный_ключ_здесь
```

**Пример:**
```env
VITE_SUPABASE_URL=https://yetjflxjxujdhemailxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlldGpmbHhqeHVqZGhlbWFpbHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMjgyMDA4NTQsImV4cCI6MjA2ODkwNDQwMDg1NH0.example
```

## Шаг 5: Перезапустите приложение
После создания файла `.env.local` перезапустите приложение:

```bash
npm run dev
```

## Проверка
Если все настроено правильно, ошибка "supabaseKey is required" должна исчезнуть. 