-- ============================================
-- TABLA: featured_listings
-- Descripción: Solicitudes de anuncios destacados (de pago)
-- Tarifa: $1.00/semana
-- ============================================

CREATE TABLE IF NOT EXISTS public.featured_listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  banner_image_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
  show_in_banner BOOLEAN DEFAULT FALSE,
  price_per_week NUMERIC(10, 2) DEFAULT 1.00,
  activated_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_featured_listings_user_id ON public.featured_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_featured_listings_listing_id ON public.featured_listings(listing_id);
CREATE INDEX IF NOT EXISTS idx_featured_listings_status ON public.featured_listings(status);
CREATE INDEX IF NOT EXISTS idx_featured_listings_active ON public.featured_listings(status, show_in_banner);

-- Row Level Security
ALTER TABLE public.featured_listings ENABLE ROW LEVEL SECURITY;

-- Política: El dueño puede ver sus propias solicitudes
CREATE POLICY "Users can view own featured requests"
  ON public.featured_listings
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política: El dueño puede crear solicitudes
CREATE POLICY "Users can create featured requests"
  ON public.featured_listings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política: El admin puede ver todas
CREATE POLICY "Admins can view all featured"
  ON public.featured_listings
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND user_type = 'admin'
  ));

-- Política: El admin puede actualizar (activar/expirar/cancelar)
CREATE POLICY "Admins can update featured"
  ON public.featured_listings
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND user_type = 'admin'
  ));

-- Política: El admin puede eliminar
CREATE POLICY "Admins can delete featured"
  ON public.featured_listings
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND user_type = 'admin'
  ));

-- ============================================
-- BUCKET: listing-banners
-- Para almacenar imágenes de banner de destacados
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-banners', 'listing-banners', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Política del bucket: solo admins suben
CREATE POLICY "Admins can upload banners"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'listing-banners' AND EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND user_type = 'admin'
  ));

-- Política del bucket: cualquiera puede ver banners
CREATE POLICY "Anyone can view banners"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-banners');

-- Política del bucket: admins pueden eliminar
CREATE POLICY "Admins can delete banners"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'listing-banners' AND EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND user_type = 'admin'
  ));
