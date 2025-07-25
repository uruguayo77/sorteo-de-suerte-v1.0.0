-- Добавление системы валют - венесуэльские боливары с курсом доллара
-- Интеграция с ve.dolarapi.com для получения актуального курса

BEGIN;

-- 1. Добавляем поля цены в боливарах в таблицу lottery_draws
ALTER TABLE lottery_draws 
ADD COLUMN number_price_bs DECIMAL(10,2) DEFAULT 10.00,
ADD COLUMN number_price_usd DECIMAL(6,2) DEFAULT 1.00,
ADD COLUMN usd_to_bs_rate DECIMAL(10,4) DEFAULT 162.95;

-- 2. Добавляем комментарии к новым колонкам
COMMENT ON COLUMN lottery_draws.number_price_bs IS 'Цена одного номера в венесуэльских боливарах (Bs)';
COMMENT ON COLUMN lottery_draws.number_price_usd IS 'Цена одного номера в долларах США ($)';
COMMENT ON COLUMN lottery_draws.usd_to_bs_rate IS 'Курс доллара к боливару (сколько боливаров за 1 доллар)';

-- 3. Создаем таблицу для хранения настроек валют
CREATE TABLE IF NOT EXISTS currency_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    currency_code VARCHAR(3) NOT NULL,
    currency_name TEXT NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    usd_rate DECIMAL(10,4) NOT NULL DEFAULT 1.0000,
    is_active BOOLEAN DEFAULT TRUE,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    api_source TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Добавляем индексы для оптимизации
CREATE INDEX idx_currency_settings_code ON currency_settings(currency_code);
CREATE INDEX idx_currency_settings_active ON currency_settings(is_active);
CREATE INDEX idx_currency_settings_updated ON currency_settings(last_updated);

-- 5. Вставляем базовые валюты
INSERT INTO currency_settings (currency_code, currency_name, symbol, usd_rate, api_source) VALUES
('USD', 'Dólar Estadounidense', '$', 1.0000, 'base_currency'),
('VES', 'Bolívar Venezolano', 'Bs', 162.95, 'https://ve.dolarapi.com/v1/dolares/paralelo')
ON CONFLICT DO NOTHING;

-- 6. Создаем функцию для обновления курса валют
CREATE OR REPLACE FUNCTION update_currency_rate(
    p_currency_code VARCHAR(3),
    p_new_rate DECIMAL(10,4),
    p_api_source TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    updated_count INTEGER := 0;
BEGIN
    UPDATE currency_settings 
    SET 
        usd_rate = p_new_rate,
        last_updated = NOW(),
        updated_at = NOW(),
        api_source = COALESCE(p_api_source, api_source)
    WHERE 
        currency_code = p_currency_code 
        AND is_active = TRUE;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    IF updated_count > 0 THEN
        RAISE NOTICE 'Обновлен курс % = %', p_currency_code, p_new_rate;
        RETURN TRUE;
    ELSE
        RAISE NOTICE 'Валюта % не найдена или неактивна', p_currency_code;
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. Создаем функцию для получения текущего курса
CREATE OR REPLACE FUNCTION get_current_rate(p_currency_code VARCHAR(3) DEFAULT 'VES')
RETURNS DECIMAL(10,4) AS $$
DECLARE
    current_rate DECIMAL(10,4);
BEGIN
    SELECT usd_rate INTO current_rate
    FROM currency_settings 
    WHERE currency_code = p_currency_code AND is_active = TRUE
    LIMIT 1;
    
    RETURN COALESCE(current_rate, 1.0000);
END;
$$ LANGUAGE plpgsql;

-- 8. Создаем функцию для конвертации валют
CREATE OR REPLACE FUNCTION convert_currency(
    p_amount DECIMAL(10,2),
    p_from_currency VARCHAR(3) DEFAULT 'USD',
    p_to_currency VARCHAR(3) DEFAULT 'VES'
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    from_rate DECIMAL(10,4);
    to_rate DECIMAL(10,4);
    result DECIMAL(10,2);
BEGIN
    -- Получаем курсы валют
    SELECT get_current_rate(p_from_currency) INTO from_rate;
    SELECT get_current_rate(p_to_currency) INTO to_rate;
    
    -- Если конвертируем из USD
    IF p_from_currency = 'USD' THEN
        result = p_amount * to_rate;
    -- Если конвертируем в USD
    ELSIF p_to_currency = 'USD' THEN
        result = p_amount / from_rate;
    -- Если конвертируем между двумя не-USD валютами
    ELSE
        result = (p_amount / from_rate) * to_rate;
    END IF;
    
    RETURN ROUND(result, 2);
END;
$$ LANGUAGE plpgsql;

-- 9. Создаем триггер для автоматического расчета цены при изменении
CREATE OR REPLACE FUNCTION auto_calculate_prices()
RETURNS TRIGGER AS $$
DECLARE
    current_bs_rate DECIMAL(10,4);
BEGIN
    -- Получаем текущий курс боливара
    SELECT get_current_rate('VES') INTO current_bs_rate;
    
    -- Если изменили цену в долларах, пересчитываем боливары
    IF NEW.number_price_usd IS DISTINCT FROM OLD.number_price_usd OR OLD IS NULL THEN
        NEW.number_price_bs := ROUND(NEW.number_price_usd * current_bs_rate, 2);
        NEW.usd_to_bs_rate := current_bs_rate;
    -- Если изменили цену в боливарах, пересчитываем доллары
    ELSIF NEW.number_price_bs IS DISTINCT FROM OLD.number_price_bs THEN
        NEW.number_price_usd := ROUND(NEW.number_price_bs / current_bs_rate, 2);
        NEW.usd_to_bs_rate := current_bs_rate;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Создаем триггер на lottery_draws
DROP TRIGGER IF EXISTS trigger_auto_calculate_prices ON lottery_draws;
CREATE TRIGGER trigger_auto_calculate_prices
    BEFORE INSERT OR UPDATE ON lottery_draws
    FOR EACH ROW
    EXECUTE FUNCTION auto_calculate_prices();

-- 11. Создаем/обновляем представление для включения валютной информации
-- Проверяем, существует ли колонка scheduled_start_time для совместимости
DROP VIEW IF EXISTS v_lottery_draws_full CASCADE;

DO $$ 
DECLARE
    has_scheduled_start_time BOOLEAN;
BEGIN
    -- Проверяем существование колонки scheduled_start_time
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lottery_draws' 
        AND column_name = 'scheduled_start_time'
    ) INTO has_scheduled_start_time;
    
    IF has_scheduled_start_time THEN
        -- Создаем представление с поддержкой отложенного запуска
        EXECUTE '
        CREATE OR REPLACE VIEW v_lottery_draws_full AS
        SELECT 
            ld.id,
            ld.draw_name,
            ld.draw_date,
            ld.status,
            ld.winner_number,
            ld.winner_name,
            ld.winner_cedula,
            ld.prize_description,
            ld.prize_image_1,
            ld.prize_image_2,
            ld.prize_image_3,
            ld.scheduled_start_time,
            ld.number_price_bs,
            ld.number_price_usd,
            ld.usd_to_bs_rate,
            ld.created_by,
            ld.created_at,
            ld.updated_at,
            CASE 
                WHEN ld.status = ''scheduled'' AND ld.scheduled_start_time IS NOT NULL THEN
                    EXTRACT(EPOCH FROM (ld.scheduled_start_time - NOW()))::INTEGER
                ELSE NULL
            END as seconds_until_start,
            CASE 
                WHEN ld.status = ''scheduled'' AND ld.scheduled_start_time IS NOT NULL THEN
                    ld.scheduled_start_time > NOW()
                ELSE NULL
            END as is_waiting_to_start,
            CONCAT(ld.number_price_bs, '' Bs'') as price_bs_formatted,
            CONCAT(''$'', ld.number_price_usd) as price_usd_formatted,
            CONCAT(''1 USD = '', ld.usd_to_bs_rate, '' Bs'') as exchange_rate_formatted
        FROM lottery_draws ld
        ORDER BY ld.created_at DESC';
        
        RAISE NOTICE 'Создано представление v_lottery_draws_full с поддержкой отложенного запуска';
    ELSE
        -- Создаем представление без поддержки отложенного запуска
        EXECUTE '
        CREATE OR REPLACE VIEW v_lottery_draws_full AS
        SELECT 
            ld.id,
            ld.draw_name,
            ld.draw_date,
            ld.status,
            ld.winner_number,
            ld.winner_name,
            ld.winner_cedula,
            ld.prize_description,
            ld.prize_image_1,
            ld.prize_image_2,
            ld.prize_image_3,
            ld.number_price_bs,
            ld.number_price_usd,
            ld.usd_to_bs_rate,
            ld.created_by,
            ld.created_at,
            ld.updated_at,
            NULL::INTEGER as seconds_until_start,
            NULL::BOOLEAN as is_waiting_to_start,
            CONCAT(ld.number_price_bs, '' Bs'') as price_bs_formatted,
            CONCAT(''$'', ld.number_price_usd) as price_usd_formatted,
            CONCAT(''1 USD = '', ld.usd_to_bs_rate, '' Bs'') as exchange_rate_formatted
        FROM lottery_draws ld
        ORDER BY ld.created_at DESC';
        
        RAISE NOTICE 'Создано представление v_lottery_draws_full БЕЗ поддержки отложенного запуска';
    END IF;
END $$;

-- 12. Добавляем комментарий к обновленному представлению
COMMENT ON VIEW v_lottery_draws_full IS 'Полная информация о розыгрышах включая валютные данные и отложенный запуск';

-- 13. Создаем функцию для получения статистики по валютам
CREATE OR REPLACE FUNCTION get_currency_stats()
RETURNS TABLE (
    currency_code VARCHAR(3),
    currency_name TEXT,
    symbol VARCHAR(10),
    current_rate DECIMAL(10,4),
    last_updated TIMESTAMP WITH TIME ZONE,
    draws_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.currency_code,
        cs.currency_name,
        cs.symbol,
        cs.usd_rate,
        cs.last_updated,
        COUNT(ld.id)::INTEGER as draws_count
    FROM currency_settings cs
    LEFT JOIN lottery_draws ld ON (
        CASE 
            WHEN cs.currency_code = 'VES' THEN ld.number_price_bs > 0
            WHEN cs.currency_code = 'USD' THEN ld.number_price_usd > 0
            ELSE FALSE
        END
    )
    WHERE cs.is_active = TRUE
    GROUP BY cs.currency_code, cs.currency_name, cs.symbol, cs.usd_rate, cs.last_updated
    ORDER BY cs.currency_code;
END;
$$ LANGUAGE plpgsql;

-- 14. Показываем текущее состояние валют и цен
SELECT 
    'Валютные настройки' as info,
    currency_code,
    currency_name,
    symbol,
    usd_rate,
    last_updated
FROM currency_settings
WHERE is_active = TRUE;

-- 15. Показываем примеры конвертации
SELECT 
    'Примеры конвертации' as info,
    convert_currency(1.00, 'USD', 'VES') as "1_USD_to_VES",
    convert_currency(100.00, 'VES', 'USD') as "100_VES_to_USD";

COMMIT; 