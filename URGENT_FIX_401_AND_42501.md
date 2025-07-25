# 🚨 СРОЧНОЕ ИСПРАВЛЕНИЕ: 401 Unauthorized + 42501 RLS

## ❌ **КРИТИЧЕСКИЕ ОШИБКИ:**
- **401 (Unauthorized)** - отсутствует файл `.env.local` с ключами Supabase
- **42501 (RLS Violation)** - заблокированные RLS политики в базе данных

## 🎯 **ПОШАГОВОЕ РЕШЕНИЕ:**

### **ШАГ 1: Создайте файл .env.local**

**В корне проекта** (рядом с `package.json`) создайте файл `.env.local`:

```env
VITE_SUPABASE_URL=https://yetjflxjxujdhemailxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlldGpmbHhqeHVqZGhlbWFpbHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMjgyODAsImV4cCI6MjA2ODkwNDI4MH0.9NPUrz0RvqPyzcVsEMBp3f213kFZIbJfvmwE_0CtCPo
```

**⚠️ Важно:**
- Создайте файл `.env.local` точно в корне проекта
- Скопируйте ключи ТОЧНО как указано выше
- НЕ добавляйте кавычки вокруг значений

### **ШАГ 2: Выполните SQL исправление**

1. **Откройте Supabase Dashboard:** [app.supabase.com](https://app.supabase.com)
2. **Войдите в проект** `yetjflxjxujdhemailxx`
3. **Найдите "SQL Editor"** в левом меню
4. **Скопируйте и вставьте** весь код из файла `fix_unauthorized_and_rls_complete.sql`
5. **Нажмите "RUN"** или "Execute"
6. **Дождитесь** сообщения об успешном выполнении

### **ШАГ 3: Перезапустите приложение**

```bash
# Остановите приложение (Ctrl+C в терминале)
# Затем запустите заново:
npm run dev
```

## ✅ **ПРОВЕРКА УСПЕХА:**

После выполнения всех шагов:

1. **Ошибка 401 Unauthorized должна исчезнуть**
2. **Ошибка 42501 RLS должна исчезнуть**
3. **Создание розыгрышей должно работать**
4. **Красное уведомление в интерфейсе должно пропасть**

## 🔧 **ЕСЛИ ВСЕ ЕЩЕ НЕ РАБОТАЕТ:**

### Проверьте файл .env.local:
```bash
# В терминале выполните:
cat .env.local
```
Должно показать ваши ключи Supabase.

### Проверьте SQL выполнение:
В Supabase SQL Editor должно быть сообщение:
```
✅ TODAS LAS CORRECCIONES COMPLETADAS!
```

## 🚨 **КРИТИЧНО:**
**БЕЗ выполнения ОБОИХ шагов приложение НЕ будет работать!**

1. **Файл .env.local** - обязателен для подключения к Supabase
2. **SQL исправление** - обязательно для RLS политик

## 📞 **ЭКСТРЕННАЯ ПОМОЩЬ:**

Если проблемы продолжаются, предоставьте:
1. Содержимое файла `.env.local`
2. Результат выполнения SQL скрипта
3. Текст новых ошибок в консоли 