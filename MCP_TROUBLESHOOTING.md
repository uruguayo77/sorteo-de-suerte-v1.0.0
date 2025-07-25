# 🔧 Устранение неполадок MCP Supabase

## 🚨 **Проблема: MCP Server показывает "Disabled"**

Вижу что в панели MCP Tools ваш Supabase MCP Server отключен. Давайте исправим это:

### 📊 **Возможные причины:**

1. **Неправильная команда запуска** (Windows специфичные проблемы)
2. **Проблемы с токеном доступа**
3. **Неправильный project-ref**
4. **Пакет @supabase/mcp-server-supabase не установлен**

---

## 🛠️ **Шаги устранения неполадок:**

### **Шаг 1: Попробуйте упрощенную конфигурацию**

Замените вашу текущую конфигурацию на эту:

```json
{
  "mcpServers": {
    "supabase-debug": {
      "command": "npx",
      "args": [
        "@supabase/mcp-server-supabase@latest",
        "--project-ref=yetjflxjxujdhemailxx",
        "--read-only"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "sbp_0e51d7ffced0d731afe6a65999f77a3bddcc63d3",
        "DEBUG": "mcp:*"
      }
    }
  }
}
```

### **Шаг 2: Проверьте доступность пакета**

Выполните в терминале:
```bash
npx @supabase/mcp-server-supabase@latest --help
```

### **Шаг 3: Проверьте токен доступа**

1. Зайдите в ваш проект Supabase
2. Идите в Settings → API  
3. Убедитесь что `sbp_0e51d7ffced0d731afe6a65999f77a3bddcc63d3` это правильный **service_role** ключ

### **Шаг 4: Альтернативная конфигурация для Windows**

Если проблемы продолжаются, попробуйте:

```json
{
  "mcpServers": {
    "supabase-win": {
      "command": "powershell",
      "args": [
        "-Command",
        "npx @supabase/mcp-server-supabase@latest --project-ref=yetjflxjxujdhemailxx --read-only"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "sbp_0e51d7ffced0d731afe6a65999f77a3bddcc63d3"
      }
    }
  }
}
```

### **Шаг 5: Проверьте логи Cursor**

1. Откройте **Command Palette** (`Ctrl+Shift+P`)
2. Введите **"MCP"** 
3. Найдите команду **"MCP: Show Logs"**
4. Посмотрите ошибки в логах

---

## 🔍 **Диагностические команды:**

### Проверка подключения к Supabase:
```bash
curl -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlldGpmbHhqeHVqZGhlbWFpbHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMjgyODAsImV4cCI6MjA2ODkwNDI4MH0.9NPUrz0RvqPyzcVsEMBp3f213kFZIbJfvmwE_0CtCPo" https://yetjflxjxujdhemailxx.supabase.co/rest/v1/
```

### Проверка токена:
```bash
curl -H "Authorization: Bearer sbp_0e51d7ffced0d731afe6a65999f77a3bddcc63d3" https://api.supabase.com/v1/projects
```

---

## ⚡ **Быстрое решение:**

1. **Удалите** текущие записи "Supabase MCP Server" из настроек
2. **Добавьте** новую конфигурацию `supabase-debug` из файла `debug-mcp-supabase.json`
3. **Перезапустите** Cursor
4. **Проверьте** статус в MCP Tools

---

## 📝 **Частые ошибки:**

| Ошибка | Причина | Решение |
|--------|---------|---------|
| `Command not found` | npx не установлен | Установите Node.js |
| `Invalid token` | Неправильный токен | Проверьте service_role ключ |
| `Project not found` | Неправильный project-ref | Проверьте URL проекта |
| `Permission denied` | RLS блокирует доступ | Используйте service_role ключ |

---

## 🆘 **Если ничего не помогает:**

1. Попробуйте **полностью удалить** все Supabase MCP конфигурации
2. **Перезапустите** Cursor
3. **Добавьте** только одну простую конфигурацию
4. **Проверьте** что у вас установлен Node.js 18+

Сообщите мне результат после выполнения этих шагов! 