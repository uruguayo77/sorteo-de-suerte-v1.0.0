-- ========================================
-- АНАЛИТИЧЕСКАЯ СИСТЕМА ДЛЯ RESERVA TU SUERTE
-- ========================================
-- Создание таблиц, представлений и политик для аналитики
-- Хранение логов: 90 дней
-- Безопасность: только для админов (is_admin_user())

-- 1. ТАБЛИЦА ДЛЯ ЛОГИРОВАНИЯ АКТИВНОСТИ ПОЛЬЗОВАТЕЛЕЙ
-- ========================================
CREATE TABLE IF NOT EXISTS user_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL, -- ID сессии пользователя
    user_ip INET, -- IP адрес пользователя
    user_agent TEXT, -- User Agent браузера
    page_visited TEXT NOT NULL, -- Страница которую посетил (/admin, /lottery, etc)
    action_type TEXT NOT NULL CHECK (action_type IN (
        'page_visit', 'number_select', 'payment_start', 'payment_complete',
        'ticket_scratch', 'admin_login', 'reservation_create', 'reservation_cancel'
    )), -- Тип действия
    metadata JSONB DEFAULT '{}', -- Дополнительные данные (номера, суммы и т.д.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для оптимизации производительности
CREATE INDEX IF NOT EXISTS idx_user_activity_log_session_id ON user_activity_log(session_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_created_at ON user_activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_action_type ON user_activity_log(action_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_page_visited ON user_activity_log(page_visited);

-- 2. ОБНОВЛЕНИЕ ТАБЛИЦЫ APPLICATIONS
-- ========================================
-- Добавляем поля для отслеживания времени бронирования
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS reservation_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reservation_expires_at TIMESTAMP WITH TIME ZONE;

-- Комментарии к новым полям
COMMENT ON COLUMN applications.reservation_started_at IS 'Время начала бронирования номеров';
COMMENT ON COLUMN applications.reservation_expires_at IS 'Время истечения бронирования (обычно +15 минут)';

-- 3. SQL ПРЕДСТАВЛЕНИЯ ДЛЯ АНАЛИТИКИ
-- ========================================

-- 3.1 Активные пользователи в реальном времени (последние 10 минут)
CREATE OR REPLACE VIEW v_active_users_realtime AS
SELECT 
    session_id,
    user_ip,
    user_agent,
    COUNT(*) as page_views,
    MAX(created_at) as last_activity,
    NOW() - MAX(created_at) as time_since_activity,
    ARRAY_AGG(DISTINCT page_visited ORDER BY page_visited) as pages_visited,
    ARRAY_AGG(DISTINCT action_type ORDER BY action_type) as actions_performed
FROM user_activity_log
WHERE created_at > NOW() - INTERVAL '10 minutes'
GROUP BY session_id, user_ip, user_agent
ORDER BY last_activity DESC;

-- 3.2 Активные бронирования с countdown
CREATE OR REPLACE VIEW v_active_reservations AS
SELECT 
    a.id,
    a.user_name,
    a.user_phone,
    a.cedula,
    a.numbers,
    a.reservation_started_at,
    a.reservation_expires_at,
    ld.draw_name,
    ld.draw_date,
    NOW() as current_time,
    CASE 
        WHEN a.reservation_expires_at IS NULL THEN NULL
        WHEN a.reservation_expires_at <= NOW() THEN INTERVAL '0'
        ELSE a.reservation_expires_at - NOW()
    END as time_remaining,
    CASE 
        WHEN a.reservation_expires_at IS NULL THEN 'no_timer'
        WHEN a.reservation_expires_at <= NOW() THEN 'expired'
        WHEN a.reservation_expires_at - NOW() < INTERVAL '5 minutes' THEN 'expiring_soon'
        WHEN a.reservation_expires_at - NOW() < INTERVAL '10 minutes' THEN 'expiring_warning'
        ELSE 'active'
    END as reservation_status,
    EXTRACT(EPOCH FROM (a.reservation_expires_at - NOW())) as seconds_remaining
FROM applications a
LEFT JOIN lottery_draws ld ON a.draw_id = ld.id
WHERE a.status IN ('pending', 'reserved') 
  AND (a.reservation_expires_at IS NULL OR a.reservation_expires_at > NOW() - INTERVAL '1 hour')
ORDER BY 
    CASE 
        WHEN a.reservation_expires_at IS NULL THEN 3
        WHEN a.reservation_expires_at <= NOW() THEN 2
        WHEN a.reservation_expires_at - NOW() < INTERVAL '5 minutes' THEN 1
        ELSE 4
    END,
    a.reservation_expires_at ASC NULLS LAST;

-- 3.3 Просроченные бронирования
CREATE OR REPLACE VIEW v_expired_reservations AS
SELECT 
    a.*,
    ld.draw_name,
    NOW() - a.reservation_expires_at as time_expired
FROM applications a
LEFT JOIN lottery_draws ld ON a.draw_id = ld.id
WHERE a.status = 'pending' 
  AND a.reservation_expires_at IS NOT NULL 
  AND a.reservation_expires_at <= NOW()
  AND a.reservation_expires_at > NOW() - INTERVAL '24 hours' -- только за последние 24 часа
ORDER BY a.reservation_expires_at DESC;

-- 3.4 Статистика конверсии
CREATE OR REPLACE VIEW v_conversion_stats AS
WITH daily_stats AS (
    SELECT 
        DATE(created_at) as date,
        COUNT(*) FILTER (WHERE status = 'pending') as reservations_created,
        COUNT(*) FILTER (WHERE status = 'paid') as reservations_paid,
        COUNT(*) FILTER (WHERE status = 'expired') as reservations_expired,
        SUM(CASE WHEN status = 'paid' THEN 1.0 ELSE 0 END) as paid_count,
        COUNT(*) as total_count
    FROM applications
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY DATE(created_at)
)
SELECT 
    date,
    reservations_created,
    reservations_paid,
    reservations_expired,
    CASE 
        WHEN reservations_created > 0 
        THEN ROUND((reservations_paid::DECIMAL / reservations_created::DECIMAL) * 100, 2)
        ELSE 0 
    END as conversion_rate_percent,
    CASE 
        WHEN total_count > 0 
        THEN ROUND((paid_count / total_count) * 100, 2)
        ELSE 0 
    END as overall_success_rate
FROM daily_stats
ORDER BY date DESC;

-- 3.5 Почасовая активность
CREATE OR REPLACE VIEW v_hourly_activity AS
SELECT 
    DATE(created_at) as date,
    EXTRACT(HOUR FROM created_at) as hour,
    COUNT(*) as total_actions,
    COUNT(DISTINCT session_id) as unique_users,
    COUNT(*) FILTER (WHERE action_type = 'page_visit') as page_visits,
    COUNT(*) FILTER (WHERE action_type = 'number_select') as number_selections,
    COUNT(*) FILTER (WHERE action_type = 'payment_start') as payment_starts,
    COUNT(*) FILTER (WHERE action_type = 'payment_complete') as payment_completions
FROM user_activity_log
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), EXTRACT(HOUR FROM created_at)
ORDER BY date DESC, hour DESC;

-- 4. RLS ПОЛИТИКИ (ТОЛЬКО ДЛЯ АДМИНОВ)
-- ========================================

-- Включаем RLS для новой таблицы
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

-- Политика для чтения (только админы)
CREATE POLICY "Admins can read activity logs" ON user_activity_log
    FOR SELECT
    TO authenticated
    USING (is_admin_user());

-- Политика для записи (все могут писать логи)
CREATE POLICY "Anyone can insert activity logs" ON user_activity_log
    FOR INSERT
    TO public
    WITH CHECK (true);

-- Политика для обновления (только админы)
CREATE POLICY "Admins can update activity logs" ON user_activity_log
    FOR UPDATE
    TO authenticated
    USING (is_admin_user())
    WITH CHECK (is_admin_user());

-- Политика для удаления (только админы)
CREATE POLICY "Admins can delete activity logs" ON user_activity_log
    FOR DELETE
    TO authenticated
    USING (is_admin_user());

-- 5. ФУНКЦИЯ ДЛЯ ОЧИСТКИ СТАРЫХ ЛОГОВ (90 ДНЕЙ)
-- ========================================
CREATE OR REPLACE FUNCTION cleanup_old_activity_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Удаляем логи старше 90 дней
    DELETE FROM user_activity_log 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Логируем результат
    INSERT INTO user_activity_log (
        session_id, 
        action_type, 
        page_visited, 
        metadata
    ) VALUES (
        'system',
        'admin_login', 
        '/system/cleanup',
        jsonb_build_object('deleted_logs', deleted_count, 'cleanup_date', NOW())
    );
    
    RETURN deleted_count;
END;
$$;

-- Комментарий к функции
COMMENT ON FUNCTION cleanup_old_activity_logs() IS 'Автоматическая очистка логов активности старше 90 дней';

-- 6. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
-- ========================================

-- Функция получения статистики в реальном времени
CREATE OR REPLACE FUNCTION get_realtime_analytics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    -- Проверяем права админа
    IF NOT is_admin_user() THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;
    
    WITH stats AS (
        SELECT 
            -- Пользователи онлайн (последние 10 минут)
            (SELECT COUNT(DISTINCT session_id) 
             FROM user_activity_log 
             WHERE created_at > NOW() - INTERVAL '10 minutes') as users_online,
            
            -- Активные бронирования
            (SELECT COUNT(*) 
             FROM v_active_reservations 
             WHERE reservation_status IN ('active', 'expiring_warning', 'expiring_soon')) as active_reservations,
            
            -- Критические (истекающие в течение 5 минут)
            (SELECT COUNT(*) 
             FROM v_active_reservations 
             WHERE reservation_status = 'expiring_soon') as expiring_reservations,
            
            -- Конверсия за сегодня
            (SELECT COALESCE(AVG(conversion_rate_percent), 0) 
             FROM v_conversion_stats 
             WHERE date = CURRENT_DATE) as todays_conversion_rate,
            
            -- Общая активность за последний час
            (SELECT COUNT(*) 
             FROM user_activity_log 
             WHERE created_at > NOW() - INTERVAL '1 hour') as hourly_activity
    )
    SELECT jsonb_build_object(
        'users_online', users_online,
        'active_reservations', active_reservations,
        'expiring_reservations', expiring_reservations,
        'todays_conversion_rate', todays_conversion_rate,
        'hourly_activity', hourly_activity,
        'last_updated', NOW()
    ) INTO result
    FROM stats;
    
    RETURN result;
END;
$$;

-- 7. ТРИГГЕРЫ ДЛЯ АВТОМАТИЧЕСКОГО ЛОГИРОВАНИЯ
-- ========================================

-- Функция для логирования изменений в applications
CREATE OR REPLACE FUNCTION log_application_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Логируем создание новой заявки
    IF TG_OP = 'INSERT' THEN
        INSERT INTO user_activity_log (
            session_id,
            action_type,
            page_visited,
            user_ip,
            metadata
        ) VALUES (
            COALESCE(NEW.id::TEXT, 'unknown'),
            'reservation_create',
            '/lottery',
            NULL, -- IP будем получать из frontend
            jsonb_build_object(
                'application_id', NEW.id,
                'user_name', NEW.user_name,
                'numbers', NEW.numbers,
                'draw_id', NEW.draw_id
            )
        );
        RETURN NEW;
    END IF;
    
    -- Логируем изменения статуса
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        INSERT INTO user_activity_log (
            session_id,
            action_type,
            page_visited,
            user_ip,
            metadata
        ) VALUES (
            COALESCE(NEW.id::TEXT, 'unknown'),
            CASE 
                WHEN NEW.status = 'paid' THEN 'payment_complete'
                WHEN NEW.status = 'expired' THEN 'reservation_cancel'
                ELSE 'page_visit'
            END,
            '/lottery',
            NULL,
            jsonb_build_object(
                'application_id', NEW.id,
                'old_status', OLD.status,
                'new_status', NEW.status,
                'user_name', NEW.user_name
            )
        );
        RETURN NEW;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Создаем триггер
DROP TRIGGER IF EXISTS trigger_log_application_changes ON applications;
CREATE TRIGGER trigger_log_application_changes
    AFTER INSERT OR UPDATE ON applications
    FOR EACH ROW
    EXECUTE FUNCTION log_application_changes();

-- ========================================
-- КОММЕНТАРИИ И ДОКУМЕНТАЦИЯ
-- ========================================

COMMENT ON TABLE user_activity_log IS 'Логирование активности пользователей для аналитики (хранение 90 дней)';
COMMENT ON VIEW v_active_users_realtime IS 'Пользователи активные в последние 10 минут';
COMMENT ON VIEW v_active_reservations IS 'Активные бронирования с countdown таймерами';
COMMENT ON VIEW v_expired_reservations IS 'Просроченные бронирования за последние 24 часа';
COMMENT ON VIEW v_conversion_stats IS 'Статистика конверсии бронирований в оплаченные заявки';
COMMENT ON VIEW v_hourly_activity IS 'Почасовая активность пользователей за последние 7 дней';

-- ========================================
-- ЗАВЕРШЕНИЕ МИГРАЦИИ
-- ========================================
-- Все таблицы, представления и политики созданы
-- Система готова для интеграции с frontend