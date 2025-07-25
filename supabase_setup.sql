-- Настройка базы данных для Reserva tu Suerte
-- Выполните этот SQL скрипт в SQL Editor вашего проекта Supabase

-- 1. Создание таблицы number_reservations
CREATE TABLE IF NOT EXISTS number_reservations (
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
CREATE INDEX IF NOT EXISTS idx_number_reservations_number ON number_reservations(number);
CREATE INDEX IF NOT EXISTS idx_number_reservations_status ON number_reservations(status);
CREATE INDEX IF NOT EXISTS idx_number_reservations_created_at ON number_reservations(created_at);

-- 2. Создание таблицы winners
CREATE TABLE IF NOT EXISTS winners (
  id BIGSERIAL PRIMARY KEY,
  number INTEGER NOT NULL REFERENCES number_reservations(number),
  user_name TEXT NOT NULL,
  user_phone TEXT NOT NULL,
  prize_amount TEXT NOT NULL,
  claimed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_winners_number ON winners(number);
CREATE INDEX IF NOT EXISTS idx_winners_claimed ON winners(claimed);
CREATE INDEX IF NOT EXISTS idx_winners_created_at ON winners(created_at);

-- 3. Создание таблицы lottery_history с номерами розыгрышей
CREATE TABLE IF NOT EXISTS lottery_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lottery_number SERIAL,
  name TEXT NOT NULL,
  prize_amount TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  planned_duration_minutes INTEGER NOT NULL,
  actual_duration_minutes INTEGER NOT NULL,
  winner_number INTEGER,
  status TEXT NOT NULL CHECK (status IN ('completed', 'cancelled', 'no_winner')),
  total_participants INTEGER DEFAULT 0,
  participant_numbers INTEGER[] DEFAULT '{}',
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для таблицы lottery_history
CREATE INDEX IF NOT EXISTS idx_lottery_history_number ON lottery_history(lottery_number);
CREATE INDEX IF NOT EXISTS idx_lottery_history_status ON lottery_history(status);
CREATE INDEX IF NOT EXISTS idx_lottery_history_created_at ON lottery_history(created_at);

-- 4. Создание таблицы active_lottery с номерами розыгрышей
CREATE TABLE IF NOT EXISTS active_lottery (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lottery_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  prize_amount TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_paused BOOLEAN DEFAULT false,
  is_completed BOOLEAN DEFAULT false,
  winner_number INTEGER,
  selected_numbers INTEGER[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для таблицы active_lottery
CREATE INDEX IF NOT EXISTS idx_active_lottery_number ON active_lottery(lottery_number);
CREATE INDEX IF NOT EXISTS idx_active_lottery_active ON active_lottery(is_active);
CREATE INDEX IF NOT EXISTS idx_active_lottery_created_at ON active_lottery(created_at);

-- ОБНОВЛЕНИЕ СУЩЕСТВУЮЩИХ ТАБЛИЦ: Добавление поля lottery_number
-- Выполните эти команды ТОЛЬКО если таблицы уже существуют без поля lottery_number

-- Добавляем поле lottery_number в lottery_history (если не существует)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'lottery_history' AND column_name = 'lottery_number') THEN
        ALTER TABLE lottery_history ADD COLUMN lottery_number SERIAL;
        CREATE INDEX IF NOT EXISTS idx_lottery_history_number ON lottery_history(lottery_number);
    END IF;
END $$;

-- Добавляем поле lottery_number в active_lottery (если не существует)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'active_lottery' AND column_name = 'lottery_number') THEN
        ALTER TABLE active_lottery ADD COLUMN lottery_number INTEGER;
        -- Обновляем существующие записи
        UPDATE active_lottery SET lottery_number = 1 WHERE lottery_number IS NULL;
        ALTER TABLE active_lottery ALTER COLUMN lottery_number SET NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_active_lottery_number ON active_lottery(lottery_number);
    END IF;
END $$;

-- 3. Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. Триггер для таблицы number_reservations
DROP TRIGGER IF EXISTS update_number_reservations_updated_at ON number_reservations;
CREATE TRIGGER update_number_reservations_updated_at 
    BEFORE UPDATE ON number_reservations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Настройка Row Level Security (RLS)

-- Для таблицы number_reservations
ALTER TABLE number_reservations ENABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики если они есть
DROP POLICY IF EXISTS "Anyone can view confirmed reservations" ON number_reservations;
DROP POLICY IF EXISTS "Anyone can create reservations" ON number_reservations;
DROP POLICY IF EXISTS "Only admins can update reservations" ON number_reservations;

-- Создаем новые политики
CREATE POLICY "Anyone can view confirmed reservations" ON number_reservations
  FOR SELECT USING (status = 'confirmed');

CREATE POLICY "Anyone can create reservations" ON number_reservations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Only admins can update reservations" ON number_reservations
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Для таблицы winners
ALTER TABLE winners ENABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики если они есть
DROP POLICY IF EXISTS "Anyone can view winners" ON winners;
DROP POLICY IF EXISTS "Only admins can create winners" ON winners;

-- Создаем новые политики
CREATE POLICY "Anyone can view winners" ON winners
  FOR SELECT USING (true);

CREATE POLICY "Only admins can create winners" ON winners
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 6. Включаем реал-тайм для таблиц (опционально)
ALTER PUBLICATION supabase_realtime ADD TABLE number_reservations;
ALTER PUBLICATION supabase_realtime ADD TABLE winners;

-- 7. Тестовые данные (опционально - удалите если не нужны)
INSERT INTO number_reservations (number, user_name, user_phone, payment_method, payment_details, status) 
VALUES 
  (3, 'Juan Pérez', '+584141234567', 'pago-movil', 'Banco de Venezuela', 'confirmed'),
  (7, 'María García', '+584141234568', 'binance', 'USDT', 'confirmed'),
  (15, 'Carlos López', '+584141234569', 'bybit', 'BTC', 'confirmed'),
  (23, 'Ana Rodríguez', '+584141234570', 'pago-movil', 'Banesco', 'confirmed'),
  (42, 'Luis Martínez', '+584141234571', 'binance', 'USDT', 'confirmed')
ON CONFLICT (number) DO NOTHING;

-- Сообщение об успешном выполнении
SELECT 'База данных настроена успешно!' as message; 