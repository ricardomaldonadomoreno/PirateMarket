-- =============================================
-- ADMIN_AUDITS: Tabla de auditoría para admins
-- =============================================
-- Registra cada acción administrativa (crear, modificar, eliminar admin)
-- Incluye quién la hizo, cuándo, y detalles del cambio.

-- 1. Crear tabla de auditoría
CREATE TABLE IF NOT EXISTS admin_audits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID NOT NULL,               -- user_id del admin afectado
  action      TEXT NOT NULL,               -- 'create', 'update_role', 'delete', 'update_app'
  actor_id    UUID NOT NULL,               -- user_id del super_admin que ejecutó la acción
  old_role    TEXT,
  new_role    TEXT,
  old_app     TEXT,
  new_app     TEXT,
  email       TEXT,                        -- email del admin afectado (para referencia)
  details     TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. Habilitar RLS
ALTER TABLE admin_audits ENABLE ROW LEVEL SECURITY;

-- 3. Política: solo super_admins pueden ver la auditoría
CREATE POLICY "super_admins_can_view_audits"
  ON admin_audits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE admin_roles.user_id = auth.uid()
        AND admin_roles.role = 'super_admin'
    )
  );

-- 4. Política: solo super_admins pueden insertar
CREATE POLICY "super_admins_can_insert_audits"
  ON admin_audits FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE admin_roles.user_id = auth.uid()
        AND admin_roles.role = 'super_admin'
    )
  );

-- 5. Índices
CREATE INDEX IF NOT EXISTS idx_admin_audits_admin_id ON admin_audits(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audits_actor_id ON admin_audits(actor_id);
CREATE INDEX IF NOT EXISTS idx_admin_audits_created_at ON admin_audits(created_at DESC);

-- 6. Función para registrar auditoría automáticamente cuando se modifica admin_roles
CREATE OR REPLACE FUNCTION fn_admin_audit_on_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO admin_audits (admin_id, action, actor_id, new_role, new_app, email)
    SELECT
      NEW.user_id,
      'create',
      auth.uid(),
      NEW.role,
      NEW.app,
      u.email
    FROM users u WHERE u.id = NEW.user_id;

  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO admin_audits (admin_id, action, actor_id, old_role, new_role, old_app, new_app, email)
    SELECT
      OLD.user_id,
      CASE
        WHEN OLD.role != NEW.role THEN 'update_role'
        WHEN OLD.app != NEW.app THEN 'update_app'
        ELSE 'update'
      END,
      auth.uid(),
      OLD.role,
      NEW.role,
      OLD.app,
      NEW.app,
      u.email
    FROM users u WHERE u.id = OLD.user_id;

  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO admin_audits (admin_id, action, actor_id, old_role, old_app, email)
    SELECT
      OLD.user_id,
      'delete',
      auth.uid(),
      OLD.role,
      OLD.app,
      u.email
    FROM users u WHERE u.id = OLD.user_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Trigger en admin_roles para auditoría automática
DROP TRIGGER IF EXISTS trg_admin_audit ON admin_roles;
CREATE TRIGGER trg_admin_audit
  AFTER INSERT OR UPDATE OR DELETE ON admin_roles
  FOR EACH ROW
  EXECUTE FUNCTION fn_admin_audit_on_change();

-- 8. Vista rápida: últimas acciones
CREATE OR REPLACE VIEW v_admin_audit_recent AS
SELECT
  aa.id,
  aa.admin_id,
  aa.action,
  aa.actor_id,
  aa.old_role,
  aa.new_role,
  aa.old_app,
  aa.new_app,
  aa.email,
  aa.details,
  aa.created_at,
  au.display_name AS actor_name
FROM admin_audits aa
LEFT JOIN users au ON au.id = aa.actor_id
ORDER BY aa.created_at DESC
LIMIT 100;
