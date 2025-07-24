# Настройка Supabase для Reserva tu Suerte

## 1. Создание базы данных в Supabase

### Таблица: number_reservations
```sql
CREATE TABLE number_reservations (
  id BIGSERIAL PRIMARY KEY,
  number INTEGER NOT NULL UNIQUE,
  user_name TEXT NOT NULL,
  user_phone TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  payment_details TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для оптимизации
CREATE INDEX idx_number_reservations_number ON number_reservations(number);
CREATE INDEX idx_number_reservations_status ON number_reservations(status);
CREATE INDEX idx_number_reservations_created_at ON number_reservations(created_at);
```

### Таблица: winners
```sql
CREATE TABLE winners (
  id BIGSERIAL PRIMARY KEY,
  number INTEGER NOT NULL REFERENCES number_reservations(number),
  user_name TEXT NOT NULL,
  user_phone TEXT NOT NULL,
  prize_amount TEXT NOT NULL,
  claimed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для оптимизации
CREATE INDEX idx_winners_number ON winners(number);
CREATE INDEX idx_winners_claimed ON winners(claimed);
CREATE INDEX idx_winners_created_at ON winners(created_at);
```

## 2. Настройка Row Level Security (RLS)

### Для таблицы number_reservations
```sql
-- Включаем RLS
ALTER TABLE number_reservations ENABLE ROW LEVEL SECURITY;

-- Политика для чтения (все могут видеть подтвержденные резервации)
CREATE POLICY "Anyone can view confirmed reservations" ON number_reservations
  FOR SELECT USING (status = 'confirmed');

-- Политика для создания (все могут создавать резервации)
CREATE POLICY "Anyone can create reservations" ON number_reservations
  FOR INSERT WITH CHECK (true);

-- Политика для обновления (только админы)
CREATE POLICY "Only admins can update reservations" ON number_reservations
  FOR UPDATE USING (auth.role() = 'authenticated');
```

### Для таблицы winners
```sql
-- Включаем RLS
ALTER TABLE winners ENABLE ROW LEVEL SECURITY;

-- Политика для чтения (все могут видеть победителей)
CREATE POLICY "Anyone can view winners" ON winners
  FOR SELECT USING (true);

-- Политика для создания (только админы)
CREATE POLICY "Only admins can create winners" ON winners
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

## 3. Настройка переменных окружения

Создайте файл `.env.local` в корне проекта:

```env
VITE_SUPABASE_URL=https://yetjflxjxujdhemailxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

Замените `your_supabase_anon_key_here` на ваш реальный анонимный ключ из настроек проекта Supabase.

## 4. Функции для автоматического обновления updated_at

```sql
-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для таблицы number_reservations
CREATE TRIGGER update_number_reservations_updated_at 
    BEFORE UPDATE ON number_reservations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 5. Проверка настройки

После настройки базы данных приложение должно:

1. ✅ Отображать занятые номера в реальном времени
2. ✅ Создавать новые резервации
3. ✅ Показывать статистику
4. ✅ Отображать последних победителей
5. ✅ Обновлять данные автоматически

## 6. Дополнительные настройки (опционально)

### Реал-тайм подписки
Для включения реал-тайм обновлений добавьте в Supabase:

```sql
-- Включаем реал-тайм для таблиц
ALTER PUBLICATION supabase_realtime ADD TABLE number_reservations;
ALTER PUBLICATION supabase_realtime ADD TABLE winners;
```

### Автоматические уведомления
Можно настроить webhooks для отправки уведомлений при создании резерваций или победителей. 