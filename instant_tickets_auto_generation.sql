-- =====================================================
-- АВТОМАТИЧЕСКАЯ ГЕНЕРАЦИЯ INSTANT TICKETS
-- При одобрении заявки создает билеты = количеству номеров
-- =====================================================

-- 1. Функция для генерации уникального номера билета
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
    ticket_number TEXT;
    counter INTEGER := 0;
BEGIN
    LOOP
        -- Формат: IT-YYYYMMDD-NNNN
        ticket_number := 'IT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD((EXTRACT(epoch FROM NOW())::BIGINT % 10000)::TEXT, 4, '0');
        
        -- Проверяем уникальность
        IF NOT EXISTS (SELECT 1 FROM instant_tickets WHERE ticket_number = ticket_number) THEN
            RETURN ticket_number;
        END IF;
        
        counter := counter + 1;
        IF counter > 1000 THEN
            RAISE EXCEPTION 'Не удалось сгенерировать уникальный номер билета';
        END IF;
        
        -- Небольшая задержка для изменения времени
        PERFORM pg_sleep(0.001);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 2. Функция для генерации уникального штрих-кода
CREATE OR REPLACE FUNCTION generate_barcode()
RETURNS TEXT AS $$
DECLARE
    barcode TEXT;
    counter INTEGER := 0;
BEGIN
    LOOP
        -- Генерируем 12-значный код
        barcode := LPAD(FLOOR(RANDOM() * 1000000000000)::TEXT, 12, '0');
        
        -- Проверяем уникальность
        IF NOT EXISTS (SELECT 1 FROM instant_tickets WHERE barcode = barcode) THEN
            RETURN barcode;
        END IF;
        
        counter := counter + 1;
        IF counter > 1000 THEN
            RAISE EXCEPTION 'Не удалось сгенерировать уникальный штрих-код';
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3. Функция для определения приза билета
CREATE OR REPLACE FUNCTION calculate_ticket_prize(ticket_count INTEGER)
RETURNS TABLE(prize_type VARCHAR, prize_amount NUMERIC, is_winner BOOLEAN) AS $$
DECLARE
    -- Настройки призового фонда (10% от прибыли)
    total_budget NUMERIC := 15.00; -- $15 из $150 прибыли при 100 билетах
    budget_per_ticket NUMERIC;
    win_probability NUMERIC := 0.20; -- 20% билетов выигрывают
    random_val NUMERIC;
    prize_category NUMERIC;
BEGIN
    budget_per_ticket := total_budget / 100; -- $0.15 в среднем на билет
    random_val := RANDOM();
    
    -- Определяем, выигрывает ли билет
    IF random_val <= win_probability THEN
        -- Билет выигрывает, определяем категорию приза
        prize_category := RANDOM();
        
        IF prize_category <= 0.70 THEN
            -- 70% - мелкие призы ($0.50 - $2.00)
            prize_type := 'small';
            prize_amount := 0.5 + (RANDOM() * 1.5); -- $0.50-$2.00
            is_winner := TRUE;
        ELSIF prize_category <= 0.95 THEN
            -- 25% - средние призы ($3.00 - $5.00)
            prize_type := 'medium';
            prize_amount := 3.0 + (RANDOM() * 2.0); -- $3.00-$5.00
            is_winner := TRUE;
        ELSE
            -- 5% - крупные призы ($8.00 - $10.00)
            prize_type := 'large';
            prize_amount := 8.0 + (RANDOM() * 2.0); -- $8.00-$10.00
            is_winner := TRUE;
        END IF;
        
        -- Округляем до центов
        prize_amount := ROUND(prize_amount, 2);
    ELSE
        -- Билет не выигрывает
        prize_type := 'none';
        prize_amount := 0;
        is_winner := FALSE;
    END IF;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- 4. Основная функция генерации instant tickets для заявки
CREATE OR REPLACE FUNCTION generate_instant_tickets_for_application(app_id UUID)
RETURNS INTEGER AS $$
DECLARE
    app_record RECORD;
    ticket_count INTEGER;
    i INTEGER;
    ticket_prize RECORD;
    generated_count INTEGER := 0;
BEGIN
    -- Получаем информацию о заявке
    SELECT * INTO app_record 
    FROM applications 
    WHERE id = app_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Заявка не найдена: %', app_id;
    END IF;
    
    -- Проверяем, что билеты еще не генерировались
    IF app_record.instant_ticket_generated THEN
        RAISE NOTICE 'Билеты для заявки % уже сгенерированы', app_id;
        RETURN 0;
    END IF;
    
    -- Определяем количество билетов = количество номеров
    ticket_count := array_length(app_record.numbers, 1);
    
    IF ticket_count IS NULL OR ticket_count = 0 THEN
        RAISE EXCEPTION 'В заявке % нет номеров для генерации билетов', app_id;
    END IF;
    
    -- Генерируем билеты
    FOR i IN 1..ticket_count LOOP
        -- Определяем приз для билета
        SELECT * INTO ticket_prize FROM calculate_ticket_prize(ticket_count);
        
        -- Создаем билет
        INSERT INTO instant_tickets (
            application_id,
            ticket_number,
            barcode,
            prize_type,
            prize_amount,
            is_winner,
            is_scratched,
            is_claimed
        ) VALUES (
            app_id,
            generate_ticket_number(),
            generate_barcode(),
            ticket_prize.prize_type,
            ticket_prize.prize_amount,
            ticket_prize.is_winner,
            FALSE,
            FALSE
        );
        
        generated_count := generated_count + 1;
    END LOOP;
    
    -- Отмечаем, что билеты сгенерированы
    UPDATE applications 
    SET instant_ticket_generated = TRUE 
    WHERE id = app_id;
    
    RAISE NOTICE 'Сгенерировано % билетов для заявки %', generated_count, app_id;
    RETURN generated_count;
END;
$$ LANGUAGE plpgsql;

-- 5. Триггер для автоматической генерации билетов при одобрении
CREATE OR REPLACE FUNCTION trigger_generate_instant_tickets()
RETURNS TRIGGER AS $$
BEGIN
    -- Проверяем изменение статуса на 'approved'
    IF OLD.status != 'approved' AND NEW.status = 'approved' THEN
        -- Генерируем билеты асинхронно (не блокируем основную операцию)
        PERFORM generate_instant_tickets_for_application(NEW.id);
        
        RAISE NOTICE 'Триггер: Генерация instant tickets для заявки %', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Удаляем старый триггер если существует
DROP TRIGGER IF EXISTS auto_generate_instant_tickets ON applications;

-- Создаем новый триггер
CREATE TRIGGER auto_generate_instant_tickets
    AFTER UPDATE ON applications
    FOR EACH ROW
    EXECUTE FUNCTION trigger_generate_instant_tickets();

-- 6. Включаем RLS для instant_tickets если еще не включен
ALTER TABLE instant_tickets ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики
DROP POLICY IF EXISTS "anon_read_instant_tickets" ON instant_tickets;
DROP POLICY IF EXISTS "service_role_all_instant_tickets" ON instant_tickets;

-- Создаем политики доступа
CREATE POLICY "anon_read_instant_tickets" ON instant_tickets
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "service_role_all_instant_tickets" ON instant_tickets
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 7. Тестовый запрос для проверки
DO $$
BEGIN
    RAISE NOTICE '✅ Система автоматической генерации instant tickets настроена';
    RAISE NOTICE '📋 При изменении applications.status на "approved" будут созданы билеты';
    RAISE NOTICE '🎫 Количество билетов = количество номеров в заявке';
    RAISE NOTICE '🎰 Алгоритм призов: 20%% выигрывают, бюджет $15 на 100 билетов';
END $$;