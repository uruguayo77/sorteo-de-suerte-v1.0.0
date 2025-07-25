-- Добавление функциональности отложенного запуска розыгрышей
-- Позволяет установить таймер до начала розыгрыша

BEGIN;

-- 1. Добавляем поле scheduled_start_time в таблицу lottery_draws
ALTER TABLE lottery_draws 
ADD COLUMN scheduled_start_time TIMESTAMP WITH TIME ZONE;

-- 2. Добавляем индекс для оптимизации поиска розыгрышей готовых к запуску
CREATE INDEX idx_lottery_draws_scheduled_start ON lottery_draws(scheduled_start_time, status) 
WHERE status = 'scheduled' AND scheduled_start_time IS NOT NULL;

-- 3. Добавляем комментарий к колонке
COMMENT ON COLUMN lottery_draws.scheduled_start_time IS 'Время автоматического запуска розыгрыша (если установлено)';

-- 4. Создаем функцию для автоматического запуска розыгрышей
CREATE OR REPLACE FUNCTION auto_start_scheduled_draws()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER := 0;
BEGIN
    -- Обновляем статус розыгрышей, время запуска которых наступило
    UPDATE lottery_draws 
    SET 
        status = 'active',
        updated_at = NOW()
    WHERE 
        status = 'scheduled' 
        AND scheduled_start_time IS NOT NULL 
        AND scheduled_start_time <= NOW()
        AND scheduled_start_time > NOW() - INTERVAL '1 hour'; -- Защита от слишком старых записей
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    -- Логирование для отладки
    IF updated_count > 0 THEN
        RAISE NOTICE 'Автоматически запущено розыгрышей: %', updated_count;
    END IF;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- 5. Добавляем комментарий к функции
COMMENT ON FUNCTION auto_start_scheduled_draws() IS 'Автоматически запускает розыгрыши по расписанию';

-- 6. Создаем функцию для проверки и валидации времени запуска
CREATE OR REPLACE FUNCTION validate_scheduled_start_time()
RETURNS TRIGGER AS $$
BEGIN
    -- Проверяем что время запуска не в прошлом (с буфером 1 минута)
    IF NEW.scheduled_start_time IS NOT NULL AND NEW.scheduled_start_time < NOW() + INTERVAL '1 minute' THEN
        RAISE EXCEPTION 'Время запуска розыгрыша не может быть в прошлом или менее чем через 1 минуту';
    END IF;
    
    -- Если статус scheduled и время запуска не установлено, это обычный розыгрыш
    -- Если статус scheduled и время запуска установлено, это отложенный розыгрыш
    
    -- Автоматически устанавливаем статус в зависимости от времени запуска
    IF NEW.scheduled_start_time IS NOT NULL THEN
        IF NEW.scheduled_start_time <= NOW() THEN
            NEW.status := 'active';
        ELSE
            NEW.status := 'scheduled';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Создаем триггер для валидации
DROP TRIGGER IF EXISTS trigger_validate_scheduled_start_time ON lottery_draws;
CREATE TRIGGER trigger_validate_scheduled_start_time
    BEFORE INSERT OR UPDATE ON lottery_draws
    FOR EACH ROW
    EXECUTE FUNCTION validate_scheduled_start_time();

-- 8. Удаляем и пересоздаем представление для включения информации о запланированном времени
DROP VIEW IF EXISTS v_lottery_draws_full CASCADE;

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
    ld.created_by,
    ld.created_at,
    ld.updated_at,
    CASE 
        WHEN ld.status = 'scheduled' AND ld.scheduled_start_time IS NOT NULL THEN
            EXTRACT(EPOCH FROM (ld.scheduled_start_time - NOW()))::INTEGER
        ELSE NULL
    END as seconds_until_start,
    CASE 
        WHEN ld.status = 'scheduled' AND ld.scheduled_start_time IS NOT NULL THEN
            ld.scheduled_start_time > NOW()
        ELSE NULL
    END as is_waiting_to_start
FROM lottery_draws ld
ORDER BY ld.created_at DESC;

-- 9. Добавляем комментарий к представлению
COMMENT ON VIEW v_lottery_draws_full IS 'Полная информация о розыгрышах включая данные об отложенном запуске';

-- 10. Создаем функцию для получения активных таймеров
CREATE OR REPLACE FUNCTION get_scheduled_draws_with_timer()
RETURNS TABLE (
    id UUID,
    draw_name TEXT,
    scheduled_start_time TIMESTAMP WITH TIME ZONE,
    seconds_remaining INTEGER,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ld.id,
        ld.draw_name,
        ld.scheduled_start_time,
        GREATEST(0, EXTRACT(EPOCH FROM (ld.scheduled_start_time - NOW()))::INTEGER) as seconds_remaining,
        ld.status
    FROM lottery_draws ld
    WHERE 
        ld.status = 'scheduled' 
        AND ld.scheduled_start_time IS NOT NULL 
        AND ld.scheduled_start_time > NOW() - INTERVAL '1 minute'
    ORDER BY ld.scheduled_start_time ASC;
END;
$$ LANGUAGE plpgsql;

-- 11. Показываем текущие розыгрыши с таймерами
SELECT 
    'Розыгрыши с отложенным запуском' as info,
    COUNT(*) as count
FROM lottery_draws
WHERE status = 'scheduled' AND scheduled_start_time IS NOT NULL
UNION ALL
SELECT 
    'Обычные запланированные розыгрыши',
    COUNT(*)
FROM lottery_draws
WHERE status = 'scheduled' AND scheduled_start_time IS NULL
UNION ALL
SELECT 
    'Активные розыгрыши',
    COUNT(*)
FROM lottery_draws
WHERE status = 'active';

COMMIT; 