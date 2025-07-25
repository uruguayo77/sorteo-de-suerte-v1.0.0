# Настройка MCP Supabase Сервера

## 🔧 Конфигурация MCP

Добавьте следующую конфигурацию в ваш файл настроек MCP (обычно в Cursor):

```json
{
  "mcpServers": {
    "supabase": {
      "command": "cmd",
      "args": [
        "/c",
        "npx",
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--read-only",
        "--project-ref=yetjflxjxujdhemailxx"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "sbp_0e51d7ffced0d731afe6a65999f77a3bddcc63d3"
      }
    }
  }
}
```

## 🔑 Переменные окружения

Добавьте в ваш `.env.local` файл:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://yetjflxjxujdhemailxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlldGpmbHhqeHVqZGhlbWFpbHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMjgyODAsImV4cCI6MjA2ODkwNDI4MH0.9NPUrz0RvqPyzcVsEMBp3f213kFZIbJfvmwE_0CtCPo

# MCP Supabase Server Configuration
SUPABASE_ACCESS_TOKEN=sbp_0e51d7ffced0d731afe6a65999f77a3bddcc63d3
SUPABASE_PROJECT_REF=yetjflxjxujdhemailxx
```

## 📋 Информация о проекте

- **Project URL**: https://yetjflxjxujdhemailxx.supabase.co
- **Project Ref**: yetjflxjxujdhemailxx
- **Access Token**: sbp_0e51d7ffced0d731afe6a65999f77a3bddcc63d3
- **Anon Key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

## 🚀 Запуск MCP сервера

1. Перезапустите Cursor после добавления конфигурации MCP
2. MCP сервер Supabase должен автоматически запуститься
3. Проверьте в логах Cursor наличие подключения к Supabase MCP

## 🔧 Возможные команды MCP Supabase

После настройки вы сможете использовать:

- Просмотр схемы базы данных
- Выполнение SQL запросов (только чтение)
- Просмотр таблиц и их структуры
- Анализ индексов и связей
- Проверка RLS политик

## ⚠️ Важные замечания

- Сервер настроен в режиме `--read-only` для безопасности
- Используется Personal Access Token для авторизации
- Project Ref извлечен из URL проекта

## 🐛 Устранение неполадок

Если MCP сервер не запускается:

1. Проверьте правильность Project Ref
2. Убедитесь что Access Token действителен
3. Проверьте подключение к интернету
4. Перезапустите Cursor

## 📚 Дополнительная информация

- [Документация Supabase MCP](https://github.com/supabase/mcp-server-supabase)
- [Документация Model Context Protocol](https://modelcontextprotocol.io/) 