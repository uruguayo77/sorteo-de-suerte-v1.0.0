-- Создание представления для билетов с информацией о розыгрышах
-- Это позволит группировать билеты по розыгрышам в админ панели

BEGIN;

-- 1. Создаем представление для получения билетов с информацией о розыгрыше
CREATE OR REPLACE VIEW v_instant_tickets_with_draw AS
SELECT 
    it.*,
    a.draw_id,
    ld.draw_name,
    ld.draw_date,
    ld.status as draw_status,
    ld.prize_description as draw_prize_description,
    ld.winner_number as draw_winner_number,
    ld.winner_name as draw_winner_name,
    -- Информация о заявке
    a.user_name,
    a.user_phone,
    a.cedula,
    a.numbers,
    a.status as application_status
FROM instant_tickets it
LEFT JOIN applications a ON it.application_id = a.id
LEFT JOIN lottery_draws ld ON a.draw_id = ld.id
ORDER BY ld.created_at DESC NULLS LAST, it.created_at DESC;

-- 2. Добавляем комментарий к представлению
COMMENT ON VIEW v_instant_tickets_with_draw IS 'Билеты с информацией о связанном розыгрыше через заявки';

-- 3. Даем права на чтение представления
GRANT SELECT ON v_instant_tickets_with_draw TO authenticated;
GRANT SELECT ON v_instant_tickets_with_draw TO anon;

-- 4. Проверяем результат
SELECT 
    'Всего билетов' as info,
    COUNT(*) as count
FROM v_instant_tickets_with_draw
UNION ALL
SELECT 
    'Билетов с розыгрышами',
    COUNT(*)
FROM v_instant_tickets_with_draw
WHERE draw_id IS NOT NULL
UNION ALL
SELECT 
    'Билетов без розыгрыша',
    COUNT(*)
FROM v_instant_tickets_with_draw
WHERE draw_id IS NULL;

COMMIT;