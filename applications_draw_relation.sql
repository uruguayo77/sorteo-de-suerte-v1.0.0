-- Добавление связи между заявками и розыгрышами
-- Это позволит группировать заявки по конкретным розыгрышам

BEGIN;

-- 1. Добавляем колонку draw_id в таблицу applications
ALTER TABLE applications 
ADD COLUMN draw_id UUID REFERENCES lottery_draws(id) ON DELETE SET NULL;

-- 2. Добавляем индекс для оптимизации поиска
CREATE INDEX idx_applications_draw_id ON applications(draw_id);

-- 3. Добавляем комментарий к колонке
COMMENT ON COLUMN applications.draw_id IS 'ID розыгрыша к которому относится заявка';

-- 4. Обновляем существующие заявки, привязывая их к активному розыгрышу (если есть)
-- Логика: все существующие заявки привязываем к самому последнему созданному розыгрышу
DO $$
DECLARE
    latest_draw_id UUID;
BEGIN
    -- Находим ID последнего созданного розыгрыша
    SELECT id INTO latest_draw_id 
    FROM lottery_draws 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- Если есть розыгрыши, привязываем к нему все существующие заявки без draw_id
    IF latest_draw_id IS NOT NULL THEN
        UPDATE applications 
        SET draw_id = latest_draw_id 
        WHERE draw_id IS NULL;
        
        RAISE NOTICE 'Обновлено заявок: %', (SELECT COUNT(*) FROM applications WHERE draw_id = latest_draw_id);
    ELSE
        RAISE NOTICE 'Розыгрыши не найдены, заявки остались без привязки';
    END IF;
END $$;

-- 5. Создаем функцию для автоматической привязки новых заявок к активному розыгрышу
CREATE OR REPLACE FUNCTION auto_assign_draw_to_application()
RETURNS TRIGGER AS $$
DECLARE
    active_draw_id UUID;
BEGIN
    -- Если draw_id не указан, ищем активный розыгрыш
    IF NEW.draw_id IS NULL THEN
        -- Находим активный или запланированный розыгрыш
        SELECT id INTO active_draw_id 
        FROM lottery_draws 
        WHERE status IN ('active', 'scheduled')
        ORDER BY created_at DESC 
        LIMIT 1;
        
        -- Если активного нет, берем последний созданный
        IF active_draw_id IS NULL THEN
            SELECT id INTO active_draw_id 
            FROM lottery_draws 
            ORDER BY created_at DESC 
            LIMIT 1;
        END IF;
        
        NEW.draw_id := active_draw_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Создаем триггер для автоматической привязки
DROP TRIGGER IF EXISTS trigger_auto_assign_draw_to_application ON applications;
CREATE TRIGGER trigger_auto_assign_draw_to_application
    BEFORE INSERT ON applications
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_draw_to_application();

-- 7. Создаем представление для удобного получения заявок с информацией о розыгрыше
CREATE OR REPLACE VIEW v_applications_with_draw AS
SELECT 
    a.*,
    ld.draw_name,
    ld.draw_date,
    ld.status as draw_status,
    ld.prize_description,
    ld.winner_number,
    ld.winner_name
FROM applications a
LEFT JOIN lottery_draws ld ON a.draw_id = ld.id
ORDER BY ld.created_at DESC, a.created_at DESC;

-- 8. Добавляем комментарий к представлению
COMMENT ON VIEW v_applications_with_draw IS 'Заявки с информацией о связанном розыгрыше';

-- 9. Проверяем результат
SELECT 
    'Общее количество заявок' as info,
    COUNT(*) as count
FROM applications
UNION ALL
SELECT 
    'Заявки с привязкой к розыгрышу',
    COUNT(*)
FROM applications
WHERE draw_id IS NOT NULL
UNION ALL
SELECT 
    'Заявки без привязки',
    COUNT(*)
FROM applications
WHERE draw_id IS NULL;

-- 10. Показываем группировку заявок по розыгрышам
SELECT 
    COALESCE(ld.draw_name, 'Без розыгрыша') as draw_name,
    ld.status as draw_status,
    COUNT(a.id) as applications_count,
    ld.created_at as draw_created_at
FROM lottery_draws ld
RIGHT JOIN applications a ON ld.id = a.draw_id
GROUP BY ld.id, ld.draw_name, ld.status, ld.created_at
ORDER BY ld.created_at DESC NULLS LAST;

COMMIT; 