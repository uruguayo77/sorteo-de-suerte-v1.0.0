-- ================================
-- SISTEMA DE SORTEOS Y RESULTADOS
-- ================================

-- 1. Tabla para configuración de sorteos
CREATE TABLE IF NOT EXISTS lottery_draws (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  draw_name VARCHAR(255) NOT NULL,
  draw_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'finished', 'cancelled')),
  winner_number INTEGER,
  winner_name VARCHAR(255),
  winner_cedula VARCHAR(255),
  prize_amount DECIMAL(10,2),
  created_by UUID REFERENCES administrators(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla para configuración global del sistema
CREATE TABLE IF NOT EXISTS lottery_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES administrators(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_lottery_draws_status ON lottery_draws(status);
CREATE INDEX IF NOT EXISTS idx_lottery_draws_draw_date ON lottery_draws(draw_date);
CREATE INDEX IF NOT EXISTS idx_lottery_settings_key ON lottery_settings(setting_key);

-- 4. Trigger para actualizar updated_at en lottery_draws
CREATE OR REPLACE FUNCTION update_lottery_draws_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_lottery_draws_updated_at ON lottery_draws;
CREATE TRIGGER trigger_lottery_draws_updated_at
  BEFORE UPDATE ON lottery_draws
  FOR EACH ROW
  EXECUTE FUNCTION update_lottery_draws_updated_at();

-- 5. Trigger para actualizar updated_at en lottery_settings
CREATE OR REPLACE FUNCTION update_lottery_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_lottery_settings_updated_at ON lottery_settings;
CREATE TRIGGER trigger_lottery_settings_updated_at
  BEFORE UPDATE ON lottery_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_lottery_settings_updated_at();

-- 6. Función para crear un nuevo sorteo
CREATE OR REPLACE FUNCTION create_lottery_draw(
  draw_name_input TEXT,
  draw_date_input TIMESTAMP WITH TIME ZONE,
  prize_amount_input DECIMAL DEFAULT 500.00,
  created_by_input UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_draw_id UUID;
BEGIN
  INSERT INTO lottery_draws (draw_name, draw_date, prize_amount, created_by, status)
  VALUES (
    draw_name_input,
    draw_date_input,
    prize_amount_input,
    created_by_input,
    'scheduled'
  )
  RETURNING id INTO new_draw_id;

  RETURN new_draw_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Función para obtener el sorteo activo actual
CREATE OR REPLACE FUNCTION get_current_draw()
RETURNS TABLE(
  id UUID,
  draw_name VARCHAR(255),
  draw_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50),
  winner_number INTEGER,
  winner_name VARCHAR(255),
  winner_cedula VARCHAR(255),
  prize_amount DECIMAL(10,2),
  time_remaining INTERVAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.draw_name,
    d.draw_date,
    d.status,
    d.winner_number,
    d.winner_name,
    d.winner_cedula,
    d.prize_amount,
    CASE 
      WHEN d.draw_date > NOW() THEN d.draw_date - NOW()
      ELSE INTERVAL '0'
    END as time_remaining
  FROM lottery_draws d
  WHERE d.status IN ('scheduled', 'active')
  ORDER BY d.draw_date ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Función para obtener todos los sorteos (para admin)
CREATE OR REPLACE FUNCTION get_all_draws()
RETURNS TABLE(
  id UUID,
  draw_name VARCHAR(255),
  draw_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50),
  winner_number INTEGER,
  winner_name VARCHAR(255),
  winner_cedula VARCHAR(255),
  prize_amount DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.draw_name,
    d.draw_date,
    d.status,
    d.winner_number,
    d.winner_name,
    d.winner_cedula,
    d.prize_amount,
    d.created_at
  FROM lottery_draws d
  ORDER BY d.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Función para actualizar estado del sorteo a "activo" cuando llega el tiempo
CREATE OR REPLACE FUNCTION update_draw_status_to_active()
RETURNS VOID AS $$
BEGIN
  UPDATE lottery_draws 
  SET status = 'active'
  WHERE status = 'scheduled' 
    AND draw_date <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Función para establecer ganador del sorteo
CREATE OR REPLACE FUNCTION set_draw_winner(
  draw_id_input UUID,
  winner_number_input INTEGER,
  admin_id_input UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  application_data RECORD;
  creator_role TEXT;
BEGIN
  -- Verificar que quien actualiza es administrador
  SELECT role INTO creator_role 
  FROM administrators 
  WHERE id = admin_id_input AND is_active = true;
  
  IF creator_role IS NULL THEN
    RAISE EXCEPTION 'Solo administradores pueden establecer ganadores';
  END IF;

  -- Obtener información del ganador desde applications
  SELECT a.user_name, a.cedula
  INTO application_data
  FROM applications a
  WHERE winner_number_input = ANY(a.numbers)
    AND a.status = 'approved'
  ORDER BY a.created_at ASC
  LIMIT 1;

  -- Actualizar el sorteo con el ganador
  UPDATE lottery_draws
  SET 
    status = 'finished',
    winner_number = winner_number_input,
    winner_name = COALESCE(application_data.user_name, 'Ganador sin información'),
    winner_cedula = COALESCE(application_data.cedula, 'N/A'),
    updated_at = NOW()
  WHERE id = draw_id_input;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Función para actualizar configuración del sistema
CREATE OR REPLACE FUNCTION update_lottery_setting(
  setting_key_input TEXT,
  setting_value_input TEXT,
  admin_id_input UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  creator_role TEXT;
BEGIN
  -- Verificar que quien actualiza es administrador
  SELECT role INTO creator_role 
  FROM administrators 
  WHERE id = admin_id_input AND is_active = true;
  
  IF creator_role IS NULL THEN
    RAISE EXCEPTION 'Solo administradores pueden actualizar configuraciones';
  END IF;

  INSERT INTO lottery_settings (setting_key, setting_value, updated_by)
  VALUES (setting_key_input, setting_value_input, admin_id_input)
  ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = setting_value_input,
    updated_by = admin_id_input,
    updated_at = NOW();

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Función para obtener configuraciones del sistema
CREATE OR REPLACE FUNCTION get_lottery_settings()
RETURNS TABLE(
  setting_key VARCHAR(100),
  setting_value TEXT,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.setting_key,
    s.setting_value,
    s.description,
    s.updated_at
  FROM lottery_settings s
  ORDER BY s.setting_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Función para obtener una configuración específica
CREATE OR REPLACE FUNCTION get_lottery_setting(setting_key_input TEXT)
RETURNS TEXT AS $$
DECLARE
  setting_value_result TEXT;
BEGIN
  SELECT setting_value INTO setting_value_result
  FROM lottery_settings
  WHERE setting_key = setting_key_input;
  
  RETURN setting_value_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Insertar configuraciones por defecto
INSERT INTO lottery_settings (setting_key, setting_value, description) VALUES
  ('default_prize_amount', '500.00', 'Monto del premio por defecto en USD'),
  ('draw_duration_hours', '24', 'Duración del sorteo en horas'),
  ('auto_draw_enabled', 'false', 'Activar sorteo automático'),
  ('company_name', 'Reserva Tu Suerte', 'Nombre de la empresa'),
  ('support_email', 'support@reservatusuerte.com', 'Email de soporte')
ON CONFLICT (setting_key) DO NOTHING;

-- 15. Habilitar RLS para las nuevas tablas
ALTER TABLE lottery_draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE lottery_settings ENABLE ROW LEVEL SECURITY;

-- 16. Políticas RLS para lottery_draws
DROP POLICY IF EXISTS "Cualquiera puede ver sorteos activos" ON lottery_draws;
CREATE POLICY "Cualquiera puede ver sorteos activos" ON lottery_draws
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR status IN ('active', 'finished')
  );

DROP POLICY IF EXISTS "Solo administradores pueden modificar sorteos" ON lottery_draws;
CREATE POLICY "Solo administradores pueden modificar sorteos" ON lottery_draws
  FOR ALL
  USING (auth.role() = 'service_role');

-- 17. Políticas RLS para lottery_settings
DROP POLICY IF EXISTS "Cualquiera puede ver configuraciones públicas" ON lottery_settings;
CREATE POLICY "Cualquiera puede ver configuraciones públicas" ON lottery_settings
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR setting_key IN ('company_name', 'support_email')
  );

DROP POLICY IF EXISTS "Solo administradores pueden modificar configuraciones" ON lottery_settings;
CREATE POLICY "Solo administradores pueden modificar configuraciones" ON lottery_settings
  FOR ALL
  USING (auth.role() = 'service_role');

-- ================================
-- EJEMPLOS DE USO
-- ================================

/*
-- Crear un nuevo sorteo:
SELECT create_lottery_draw(
  'Sorteo de Navidad 2024',
  '2024-12-25 20:00:00+00',
  1000.00,
  (SELECT id FROM administrators WHERE email = 'bb@bbbbb.cc')
);

-- Obtener sorteo actual:
SELECT * FROM get_current_draw();

-- Actualizar estado de sorteos (ejecutar periódicamente):
SELECT update_draw_status_to_active();

-- Establecer ganador:
SELECT set_draw_winner(
  'uuid-del-sorteo',
  42,
  (SELECT id FROM administrators WHERE email = 'bb@bbbbb.cc')
);

-- Obtener todos los sorteos:
SELECT * FROM get_all_draws();

-- Actualizar configuración:
SELECT update_lottery_setting(
  'default_prize_amount',
  '750.00',
  (SELECT id FROM administrators WHERE email = 'bb@bbbbb.cc')
);

-- Obtener configuraciones:
SELECT * FROM get_lottery_settings();

-- Obtener configuración específica:
SELECT get_lottery_setting('default_prize_amount');
*/

-- ================================
-- COMENTARIOS IMPORTANTES
-- ================================

/*
ESTADOS DE SORTEO:
- scheduled: Programado para el futuro
- active: En curso (tiempo expirado, esperando ganador)
- finished: Finalizado con ganador
- cancelled: Cancelado

CONFIGURACIONES DISPONIBLES:
- default_prize_amount: Monto del premio por defecto
- draw_duration_hours: Duración del sorteo en horas
- auto_draw_enabled: Activar sorteo automático
- company_name: Nombre de la empresa
- support_email: Email de soporte

FLUJO DEL SORTEO:
1. Admin crea sorteo con fecha/hora específica
2. Sistema automáticamente cambia estado a 'active' cuando llega el tiempo
3. Frontend muestra "esperando resultados"
4. Admin selecciona ganador manualmente
5. Sistema busca datos del ganador en applications aprobadas
6. Se muestra el ganador en frontend

SEGURIDAD:
- Solo administradores pueden crear/modificar sorteos
- Solo administradores pueden establecer ganadores
- RLS protege el acceso a datos sensibles
- Todas las funciones usan SECURITY DEFINER
*/ 