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