# 🔐 Создание отдельной ссылки для админ-панели

## Способ 1: Поддомен (Рекомендуется)

### Шаг 1: Настройка в Vercel
1. Откройте проект на vercel.com
2. Перейдите в **Settings → Domains**
3. Нажмите **Add Domain**
4. Добавьте: `admin.yourdomain.com` (замените на ваш домен)

### Шаг 2: Настройка DNS в jino.ru
В панели управления jino.ru добавьте DNS запись:
```
Type: CNAME
Name: admin
Value: cname.vercel-dns.com
```

### Шаг 3: Настройка переадресации
Файл `vercel.json` уже настроен для:
- Автоматического перенаправления `/admin` → `/admin/login`
- Скрытия админ-панели от поисковых систем
- Правильной маршрутизации

## Способ 2: Отдельный проект Vercel

### Шаг 1: Форк репозитория для админки
1. Создайте новый репозиторий на GitHub
2. Скопируйте туда только админ-часть проекта
3. Измените маршруты в `main.tsx`

### Шаг 2: Создание отдельного проекта
1. В Vercel нажмите **New Project**
2. Выберите новый репозиторий
3. Назовите проект: `your-project-admin`
4. Добавьте те же переменные окружения

### Шаг 3: Настройка домена
Добавьте домен: `admin.yourdomain.com`

## Способ 3: Защищенная ссылка

### Шаг 1: Создание секретного пути
Вместо `/admin` использовать `/secret-admin-panel-xyz123`

### Шаг 2: Обновление маршрутов
Изменить в `src/main.tsx`:
```tsx
// Заменить
{ path: "/admin", element: <AdminLogin /> }
{ path: "/admin/login", element: <AdminLogin /> }
{ path: "/admin/panel", element: <Admin /> }

// На
{ path: "/secret-admin-panel-xyz123", element: <AdminLogin /> }
{ path: "/secret-admin-panel-xyz123/login", element: <AdminLogin /> }
{ path: "/secret-admin-panel-xyz123/panel", element: <Admin /> }
```

## Способ 4: IP-ограничения (Vercel Pro)

Если у вас Vercel Pro, можно ограничить доступ по IP:

### В `vercel.json`:
```json
{
  "functions": {
    "app/admin/**": {
      "source": "**",
      "destination": "/api/admin-auth"
    }
  }
}
```

## Рекомендация

**Для начала используйте Способ 1 (поддомен):**
- Профессионально выглядит
- Легко настраивается  
- Хорошая безопасность
- Не влияет на основной сайт

**Ссылки будут:**
- Основной сайт: `https://yourdomain.com`
- Админ-панель: `https://admin.yourdomain.com`

## Дополнительная безопасность

### 1. Добавить базовую аутентификацию
В `vercel.json` можно добавить:
```json
{
  "functions": {
    "app/admin/**": {
      "source": "**", 
      "headers": {
        "Authorization": "Basic your_encoded_credentials"
      }
    }
  }
}
```

### 2. Ограничение по времени
Настроить автоматический выход из админки через X минут.

### 3. Логирование входов
Добавить запись всех попыток входа в админ-панель. 