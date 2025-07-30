-- ================================
-- МИГРАЦИЯ: Система QR кодов для верификации заявок
-- ================================

-- 1. Добавляем поля для QR кодов в таблицу applications
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS qr_code_token VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS qr_generated_at TIMESTAMP WITH TIME ZONE;

-- 2. Создание таблицы для логирования проверок QR кодов
CREATE TABLE IF NOT EXISTS qr_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  qr_token VARCHAR(255) NOT NULL,
  verification_ip INET,
  user_agent TEXT,
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_qr_verifications_application 
    FOREIGN KEY (application_id) REFERENCES applications(id)
);

-- 3. Создание индексов для оптимизации
CREATE INDEX IF NOT EXISTS idx_applications_qr_token ON applications(qr_code_token);
CREATE INDEX IF NOT EXISTS idx_qr_verifications_token ON qr_verifications(qr_token);
CREATE INDEX IF NOT EXISTS idx_qr_verifications_application ON qr_verifications(application_id);
CREATE INDEX IF NOT EXISTS idx_qr_verifications_verified_at ON qr_verifications(verified_at);

-- 4. Функция для генерации уникального QR токена
CREATE OR REPLACE FUNCTION generate_qr_token()
RETURNS VARCHAR(255) AS $$
DECLARE
  token_length INTEGER := 32;
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result VARCHAR(255) := '';
  i INTEGER;
  random_index INTEGER;
BEGIN
  -- Генерируем случайную строку
  FOR i IN 1..token_length LOOP
    random_index := floor(random() * length(chars) + 1);
    result := result || substr(chars, random_index, 1);
  END LOOP;
  
  -- Добавляем timestamp для уникальности
  result := result || '_' || extract(epoch from now())::bigint::text;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 5. Функция для создания QR токена при создании заявки
CREATE OR REPLACE FUNCTION create_qr_token_for_application(application_id_input UUID)
RETURNS VARCHAR(255) AS $$
DECLARE
  new_token VARCHAR(255);
  token_exists BOOLEAN;
BEGIN
  -- Генерируем уникальный токен
  LOOP
    new_token := generate_qr_token();
    
    -- Проверяем уникальность токена
    SELECT EXISTS(SELECT 1 FROM applications WHERE qr_code_token = new_token) INTO token_exists;
    
    -- Если токен уникальный, выходим из цикла
    IF NOT token_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  -- Обновляем заявку с новым токеном
  UPDATE applications 
  SET 
    qr_code_token = new_token,
    qr_generated_at = NOW()
  WHERE id = application_id_input;
  
  RETURN new_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Функция для получения данных заявки по QR токену
CREATE OR REPLACE FUNCTION get_application_by_qr_token(token_input VARCHAR(255))
RETURNS TABLE(
  id UUID,
  numbers INTEGER[],
  user_name TEXT,
  user_phone TEXT,
  cedula TEXT,
  payment_method TEXT,
  payment_proof_url TEXT,
  status TEXT,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  qr_generated_at TIMESTAMP WITH TIME ZONE,
  draw_name TEXT,
  draw_status TEXT,
  is_winner BOOLEAN,
  winner_number INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.numbers,
    a.user_name,
    a.user_phone,
    a.cedula,
    a.payment_method,
    a.payment_proof_url,
    a.status,
    a.admin_notes,
    a.created_at,
    a.updated_at,
    a.qr_generated_at,
    ld.draw_name,
    ld.status as draw_status,
    CASE 
      WHEN ld.winner_number = ANY(a.numbers) AND ld.status = 'finished' AND a.status = 'approved' 
      THEN true 
      ELSE false 
    END as is_winner,
    ld.winner_number
  FROM applications a
  LEFT JOIN lottery_draws ld ON ld.status IN ('active', 'finished')
  WHERE a.qr_code_token = token_input
  ORDER BY ld.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Функция для логирования проверки QR кода
CREATE OR REPLACE FUNCTION log_qr_verification(
  application_id_input UUID,
  token_input VARCHAR(255),
  ip_input INET DEFAULT NULL,
  user_agent_input TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  verification_id UUID;
BEGIN
  INSERT INTO qr_verifications (
    application_id,
    qr_token,
    verification_ip,
    user_agent
  ) VALUES (
    application_id_input,
    token_input,
    ip_input,
    user_agent_input
  ) RETURNING id INTO verification_id;
  
  RETURN verification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Настройка Row Level Security для новой таблицы
ALTER TABLE qr_verifications ENABLE ROW LEVEL SECURITY;

-- Политики для qr_verifications
CREATE POLICY "Anyone can create verification logs" ON qr_verifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Only service role can read verification logs" ON qr_verifications
  FOR SELECT USING (auth.role() = 'service_role');

-- 9. Включаем реалтайм для новой таблицы
ALTER PUBLICATION supabase_realtime ADD TABLE qr_verifications;

-- 10. Триггер для автоматического создания QR токена при создании заявки
CREATE OR REPLACE FUNCTION auto_create_qr_token()
RETURNS TRIGGER AS $$
BEGIN
  -- Создаем QR токен только для новых заявок
  IF TG_OP = 'INSERT' THEN
    NEW.qr_code_token := generate_qr_token();
    NEW.qr_generated_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Удаляем триггер если существует и создаем новый
DROP TRIGGER IF EXISTS trigger_auto_create_qr_token ON applications;
CREATE TRIGGER trigger_auto_create_qr_token
  BEFORE INSERT ON applications
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_qr_token();

-- ================================
-- ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ
-- ================================

/*
-- Создать QR токен для существующей заявки:
SELECT create_qr_token_for_application('your-application-id-here');

-- Получить данные заявки по QR токену:
SELECT * FROM get_application_by_qr_token('your-qr-token-here');

-- Логировать проверку QR кода:
SELECT log_qr_verification(
  'application-id',
  'qr-token', 
  '192.168.1.1'::INET,
  'Mozilla/5.0...'
);
*/

-- Сообщение об успешном выполнении
DO $$
BEGIN
  RAISE NOTICE '✅ QR Code System Migration completed successfully!';
  RAISE NOTICE '📱 Applications table extended with QR fields';
  RAISE NOTICE '🔍 QR verifications table created';
  RAISE NOTICE '🔧 Functions and triggers set up';
  RAISE NOTICE '🛡️  Security policies configured';
END $$; 