-- ═══════════════════════════════════════════════════════════════════════════
-- COLABORADORES: Sistema de login independiente
-- ═══════════════════════════════════════════════════════════════════════════
-- Los sub-admins no usan Supabase Auth. Tienen su propia tabla con
-- email, contraseña hasheada, y permisos de acceso al backoffice.
-- El admin/login valida directamente contra esta tabla.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Crear tabla colaborador
CREATE TABLE IF NOT EXISTS public.colaboradores (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email       TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,           -- contraseña hasheada con SHA-256
  full_name   TEXT NOT NULL,
  app_access  TEXT NOT NULL DEFAULT 'both' CHECK (app_access IN ('pirata', 'traficante', 'both')),
  notes       TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_by  UUID,                    -- user_id del admin que lo creó (auth.uid())
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_colaboradores_email ON public.colaboradores(email);

-- 2. Habilitar RLS
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;

-- 3. Solo admins pueden ver la lista de colaboradores
CREATE POLICY "colaboradores_select"
  ON public.colaboradores
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND user_type = 'admin')
  );

-- 4. Solo admins pueden crear colaboradores
CREATE POLICY "colaboradores_insert"
  ON public.colaboradores
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND user_type = 'admin')
  );

-- 5. Solo admins pueden actualizar colaboradores
CREATE POLICY "colaboradores_update"
  ON public.colaboradores
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND user_type = 'admin')
  );

-- 6. Solo admins pueden eliminar colaboradores
CREATE POLICY "colaboradores_delete"
  ON public.colaboradores
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND user_type = 'admin')
  );

-- 7. Función para validar login de colaborador (sin Supabase Auth)
--    Recibe email y contraseña en texto plano, devuelve el registro si coincide
CREATE OR REPLACE FUNCTION public.validate_colaborador(p_email TEXT, p_password TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  app_access TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.email, c.full_name, c.app_access
  FROM public.colaboradores c
  WHERE c.email = LOWER(p_email)
    AND c.password = encode(sha256(p_password::bytea), 'hex')
    AND c.is_active = TRUE
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Función para crear colaborador con contraseña hasheada
CREATE OR REPLACE FUNCTION public.create_colaborador(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_app_access TEXT,
  p_notes TEXT
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.colaboradores (email, password, full_name, app_access, notes, created_by)
  VALUES (
    LOWER(p_email),
    encode(sha256(p_password::bytea), 'hex'),
    p_full_name,
    p_app_access,
    p_notes,
    auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
