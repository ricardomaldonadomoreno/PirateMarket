-- ═══════════════════════════════════════════════════════════════════════════
-- BACKOFFICE SETUP — SQL para Supabase
-- Ejecutar en SQL Editor de Supabase
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. TABLA: admin_roles
-- ═══════════════════════════════════════════════════════════════════════════
-- La fuente de verdad para acceso administrativo.
-- Separada de users.user_type para evitar bloqueo accidental.

CREATE TABLE IF NOT EXISTS public.admin_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'moderator')),
  app TEXT NOT NULL DEFAULT 'pirata' CHECK (app IN ('pirata', 'traficante', 'both')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, app)
);

CREATE INDEX IF NOT EXISTS idx_admin_roles_user_id ON public.admin_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_roles_app ON public.admin_roles(app);

-- Row Level Security
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

-- Solo usuarios con un rol en admin_roles pueden ver la tabla
CREATE POLICY "Admins can view admin_roles"
  ON public.admin_roles
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid())
  );

-- Solo super_admin puede crear/modificar roles
CREATE POLICY "Super admin can manage admin_roles"
  ON public.admin_roles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. TABLA: featured_listings (si no existe)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.featured_listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  banner_image_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
  show_in_banner BOOLEAN DEFAULT FALSE,
  price_per_week NUMERIC(10, 2) DEFAULT 1.00,
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_featured_listings_status ON public.featured_listings(status);
CREATE INDEX IF NOT EXISTS idx_featured_listings_user ON public.featured_listings(user_id);

-- RLS para featured_listings
ALTER TABLE public.featured_listings ENABLE ROW LEVEL SECURITY;

-- Admins pueden ver todos
CREATE POLICY "Admins can view featured_listings"
  ON public.featured_listings
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid())
    OR user_id = auth.uid()
  );

-- Admins pueden actualizar estado (activar/expirar/toggle banner)
CREATE POLICY "Admins can update featured_listings"
  ON public.featured_listings
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid())
  );

-- Usuarios pueden insertar solicitudes
CREATE POLICY "Users can create featured requests"
  ON public.featured_listings
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Storage bucket para banners
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-banners', 'listing-banners', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Política storage: admins pueden eliminar banners
CREATE POLICY "Admins can delete listing banners"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'listing-banners' AND
    EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid())
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. TABLA: featured_trips (si no existe — para traficante)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.featured_trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.traficante_trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  banner_image_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
  show_in_banner BOOLEAN DEFAULT FALSE,
  price_per_week NUMERIC(10, 2) DEFAULT 1.00,
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_featured_trips_status ON public.featured_trips(status);
CREATE INDEX IF NOT EXISTS idx_featured_trips_user ON public.featured_trips(user_id);

-- RLS para featured_trips
ALTER TABLE public.featured_trips ENABLE ROW LEVEL SECURITY;

-- Admins pueden ver todos
CREATE POLICY "Admins can view featured_trips"
  ON public.featured_trips
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid())
    OR user_id = auth.uid()
  );

-- Admins pueden actualizar estado
CREATE POLICY "Admins can update featured_trips"
  ON public.featured_trips
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid())
  );

-- Traficantes pueden insertar solicitudes
CREATE POLICY "Traficantes can create featured trip requests"
  ON public.featured_trips
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. MIGRACIÓN: Insertar admins existentes en admin_roles
-- ═══════════════════════════════════════════════════════════════════════════
-- Esta migración inserta todos los usuarios con user_type='admin' en admin_roles
-- como super_admin para que no pierdan acceso durante la transición.
-- Solo se ejecuta si la tabla admin_roles está vacía.

INSERT INTO public.admin_roles (user_id, role, app, notes)
SELECT id, 'super_admin', 'both', 'Migración automática — admin legacy'
FROM public.users
WHERE user_type = 'admin'
  AND id NOT IN (SELECT user_id FROM public.admin_roles)
ON CONFLICT (user_id, app) DO NOTHING;
