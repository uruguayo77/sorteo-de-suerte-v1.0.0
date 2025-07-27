# 🚀 Инструкция по развертыванию на jino.ru

## ⚡ СРОЧНО: Исправление ошибки Vercel

Если вы получили ошибку: `VITE_SUPABASE_URL is required`, выполните следующие шаги:

### 1. Настройка переменных в Vercel Dashboard:
1. Откройте ваш проект на vercel.com
2. Перейдите в **Settings → Environment Variables**
3. Нажмите **Add New**
4. Добавьте эти переменные:

```
Name: VITE_SUPABASE_URL
Value: https://yetjflxjxujdhemailxx.supabase.co
Environment: Production, Preview, Development

Name: VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlldGpmbHhqeHVqZGhlbWFpbHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMjgyODAsImV4cCI6MjA2ODkwNDI4MH0.9NPUrz0RvqPyzcVsEMBp3f213kFZIbJfvmwE_0CtCPo
Environment: Production, Preview, Development
```

### 2. Пересборка проекта:
После добавления переменных:
1. Перейдите в **Deployments**
2. Нажмите **⋯** (три точки) рядом с последним деплоем
3. Выберите **Redeploy**
4. Подтвердите **Redeploy**

---

## 🔐 Настройка отдельной ссылки для админ-панели

### Быстрая настройка поддомена:
1. В Vercel: **Settings → Domains → Add Domain**
2. Добавьте: `admin.yourdomain.com`
3. В jino.ru добавьте CNAME запись: `admin` → `cname.vercel-dns.com`
4. Готово! Админ-панель будет на `https://admin.yourdomain.com`

**📖 Подробная инструкция:** `admin-deployment-guide.md`

---

## Способ 1: Статический хостинг (Рекомендуется)

### Шаг 1: Подготовка файлов
1. Скопируйте содержимое папки `dist/` 
2. Добавьте файл `.htaccess` в корень
3. Убедитесь что есть файл `index.html`

### Шаг 2: Загрузка на jino.ru
1. Войдите в панель управления jino.ru
2. Перейдите в "Файл-менеджер" или используйте FTP
3. Загрузите все файлы из папки `dist/` в корень сайта
4. Загрузите файл `.htaccess`

### Шаг 3: Настройка домена
1. В панели jino.ru настройте основной домен
2. Включите SSL сертификат
3. Настройте перенаправление с www на без www (или наоборот)

## Способ 2: Через Vercel (Бесплатно)

### Подключение домена к Vercel:
1. Зарегистрируйтесь на vercel.com
2. Подключите GitHub репозиторий
3. Добавьте ваш домен в настройках Vercel
4. В DNS настройках jino.ru добавьте записи:
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   
   Type: A
   Name: @
   Value: 76.76.19.61
   ```

## Переменные окружения

### Для Vercel:
Добавьте в Settings → Environment Variables:
```
VITE_SUPABASE_URL=https://yetjflxjxujdhemailxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlldGpmbHhqeHVqZGhlbWFpbHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMjgyODAsImV4cCI6MjA2ODkwNDI4MH0.9NPUrz0RvqPyzcVsEMBp3f213kFZIbJfvmwE_0CtCPo
```

### Для локальной разработки:
Создайте файл `.env.local` в корне проекта с тем же содержимым.

## Файлы для загрузки

Обязательные файлы из папки `dist/`:
- `index.html`
- `assets/` (папка со стилями и скриптами)
- `.htaccess` (для Apache)

## Проверка работы

После загрузки:
1. Откройте ваш домен
2. Проверьте работу всех страниц
3. Убедитесь что админ-панель доступна по /admin
4. Проверьте подключение к Supabase

## Поддержка

При возникновении проблем:
1. Проверьте логи в панели jino.ru
2. Убедитесь что все файлы загружены
3. Проверьте настройки DNS

## Решение частых проблем

### Ошибка VITE_SUPABASE_URL is required:
1. Проверьте переменные окружения в Vercel
2. Пересоберите проект (Redeploy)
3. Убедитесь что переменные добавлены для всех сред

### Страницы возвращают 404:
1. Проверьте что файл `.htaccess` загружен
2. Убедитесь что настроена маршрутизация SPA
3. Проверьте настройки веб-сервера 