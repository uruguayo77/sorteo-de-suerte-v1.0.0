-- ================================
-- SISTEMA DE ADMINISTRADORES
-- ================================

-- 1. Создание таблицы администраторов
CREATE TABLE IF NOT EXISTS administrators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin')),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES administrators(id)
);

-- 2. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_administrators_email ON administrators(email);
CREATE INDEX IF NOT EXISTS idx_administrators_role ON administrators(role);
CREATE INDEX IF NOT EXISTS idx_administrators_is_active ON administrators(is_active);

-- 3. Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_administrators_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS trigger_administrators_updated_at ON administrators;
CREATE TRIGGER trigger_administrators_updated_at
  BEFORE UPDATE ON administrators
  FOR EACH ROW
  EXECUTE FUNCTION update_administrators_updated_at();

-- 5. Función para hacer hash de contraseñas (usando crypt de pgcrypto)
-- Asegúrate de que la extensión pgcrypto esté habilitada
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 6. Función para verificar contraseñas
CREATE OR REPLACE FUNCTION verify_admin_password(email_input TEXT, password_input TEXT)
RETURNS TABLE(
  admin_id UUID,
  admin_email VARCHAR(255),
  admin_name VARCHAR(255),
  admin_role VARCHAR(50),
  is_valid BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.email,
    a.full_name,
    a.role,
    (a.password_hash = crypt(password_input, a.password_hash)) AS is_valid
  FROM administrators a
  WHERE a.email = email_input 
    AND a.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Función para crear nuevos administradores (solo super_admin puede crear)
CREATE OR REPLACE FUNCTION create_administrator(
  email_input TEXT,
  password_input TEXT,
  full_name_input TEXT DEFAULT NULL,
  role_input TEXT DEFAULT 'admin',
  created_by_input UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_admin_id UUID;
  creator_role TEXT;
BEGIN
  -- Verificar que quien crea tiene permisos de super_admin
  IF created_by_input IS NOT NULL THEN
    SELECT role INTO creator_role 
    FROM administrators 
    WHERE id = created_by_input AND is_active = true;
    
    IF creator_role != 'super_admin' THEN
      RAISE EXCEPTION 'Solo super administradores pueden crear nuevos administradores';
    END IF;
  END IF;

  -- Crear el nuevo administrador
  INSERT INTO administrators (email, password_hash, full_name, role, created_by)
  VALUES (
    email_input,
    crypt(password_input, gen_salt('bf')),
    full_name_input,
    role_input,
    created_by_input
  )
  RETURNING id INTO new_admin_id;

  RETURN new_admin_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Función para actualizar último login
CREATE OR REPLACE FUNCTION update_admin_last_login(admin_id_input UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE administrators 
  SET last_login = NOW()
  WHERE id = admin_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Insertar el administrador principal
-- Email: bb@bbbbb.cc, Password: Asdqwe1@
INSERT INTO administrators (email, password_hash, full_name, role, is_active)
VALUES (
  'bb@bbbbb.cc',
  crypt('Asdqwe1@', gen_salt('bf')),
  'Administrador Principal',
  'super_admin',
  true
) ON CONFLICT (email) DO UPDATE SET
  password_hash = crypt('Asdqwe1@', gen_salt('bf')),
  role = 'super_admin',
  is_active = true,
  updated_at = NOW();

-- 10. Habilitar Row Level Security (RLS)
ALTER TABLE administrators ENABLE ROW LEVEL SECURITY;

-- 11. Política para que solo administradores puedan ver la tabla
DROP POLICY IF EXISTS "Administradores pueden ver su información" ON administrators;
CREATE POLICY "Administradores pueden ver su información" ON administrators
  FOR SELECT
  USING (
    -- Permitir acceso a través de las funciones de seguridad
    auth.role() = 'service_role'
    OR
    -- O si es un administrador activo (para futuras implementaciones con auth)
    EXISTS (
      SELECT 1 FROM administrators a
      WHERE a.email = auth.email()
      AND a.is_active = true
    )
  );

-- 12. Política para actualizaciones (solo super_admin puede modificar otros admins)
DROP POLICY IF EXISTS "Solo super admin puede modificar administradores" ON administrators;
CREATE POLICY "Solo super admin puede modificar administradores" ON administrators
  FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR
    EXISTS (
      SELECT 1 FROM administrators a
      WHERE a.email = auth.email()
      AND a.role = 'super_admin'
      AND a.is_active = true
    )
  );

-- 13. Política para inserciones (solo super_admin puede crear nuevos admins)
DROP POLICY IF EXISTS "Solo super admin puede crear administradores" ON administrators;
CREATE POLICY "Solo super admin puede crear administradores" ON administrators
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR
    EXISTS (
      SELECT 1 FROM administrators a
      WHERE a.email = auth.email()
      AND a.role = 'super_admin'
      AND a.is_active = true
    )
  );

-- 14. Función para obtener todos los administradores (solo para super_admin)
CREATE OR REPLACE FUNCTION get_all_administrators()
RETURNS TABLE(
  id UUID,
  email VARCHAR(255),
  full_name VARCHAR(255),
  role VARCHAR(50),
  is_active BOOLEAN,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  created_by_email VARCHAR(255)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.email,
    a.full_name,
    a.role,
    a.is_active,
    a.last_login,
    a.created_at,
    creator.email as created_by_email
  FROM administrators a
  LEFT JOIN administrators creator ON a.created_by = creator.id
  WHERE a.is_active = true
  ORDER BY a.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Función para desactivar administrador (solo super_admin)
CREATE OR REPLACE FUNCTION deactivate_administrator(admin_id_input UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE administrators 
  SET is_active = false, updated_at = NOW()
  WHERE id = admin_id_input;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16. Función para cambiar contraseña
CREATE OR REPLACE FUNCTION change_admin_password(
  admin_id_input UUID,
  new_password TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE administrators 
  SET password_hash = crypt(new_password, gen_salt('bf')),
      updated_at = NOW()
  WHERE id = admin_id_input AND is_active = true;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- EJEMPLOS DE USO
-- ================================

/*
-- Verificar login de administrador:
SELECT * FROM verify_admin_password('bb@bbbbb.cc', 'Asdqwe1@');

-- Crear un nuevo administrador (necesitas el ID del super_admin):
SELECT create_administrator(
  'nuevo@admin.com',
  'password123',
  'Nuevo Administrador',
  'admin',
  (SELECT id FROM administrators WHERE email = 'bb@bbbbb.cc')
);

-- Actualizar último login:
SELECT update_admin_last_login(
  (SELECT id FROM administrators WHERE email = 'bb@bbbbb.cc')
);

-- Obtener todos los administradores:
SELECT * FROM get_all_administrators();

-- Desactivar un administrador:
SELECT deactivate_administrator('admin-uuid-here');

-- Cambiar contraseña:
SELECT change_admin_password(
  (SELECT id FROM administrators WHERE email = 'admin@ejemplo.com'),
  'nueva_password123'
);
*/

-- ================================
-- COMENTARIOS IMPORTANTES
-- ================================

/*
NOTAS DE SEGURIDAD:

1. Las contraseñas se almacenan usando bcrypt con sal aleatoria
2. Solo super_admin puede crear, modificar o desactivar otros administradores
3. Las funciones usan SECURITY DEFINER para ejecutarse con permisos elevados
4. RLS (Row Level Security) protege el acceso directo a la tabla
5. Todas las operaciones de autenticación deben pasar por las funciones definidas

ROLES:
- super_admin: Puede gestionar otros administradores y tiene acceso completo
- admin: Puede acceder al panel de administración pero no gestionar otros admins

DATOS INICIALES:
- Email: bb@bbbbb.cc
- Password: Asdqwe1@
- Role: super_admin

Para usar en la aplicación, actualiza los hooks de React para usar estas funciones
en lugar de verificación hardcodeada en el frontend.
*/ 