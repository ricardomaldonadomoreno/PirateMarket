-- ═══════════════════════════════════════════════════════════════════════════
-- TRAFICANTE_TRIPS: Políticas RLS
-- ═══════════════════════════════════════════════════════════════════════════
-- Asegurar que los usuarios pueden crear, leer, actualizar y eliminar
-- sus propios viajes. Los admins pueden ver y gestionar todos.

-- Habilitar RLS
ALTER TABLE public.traficante_trips ENABLE ROW LEVEL SECURITY;

-- Política: cualquier usuario autenticado puede ver todos los viajes
CREATE POLICY "Users can view all trips"
  ON public.traficante_trips
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Política: cualquier usuario autenticado puede crear viajes
CREATE POLICY "Users can insert trips"
  ON public.traficante_trips
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política: solo el propietario puede actualizar su viaje
CREATE POLICY "Users can update own trips"
  ON public.traficante_trips
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política: solo el propietario puede eliminar su viaje
CREATE POLICY "Users can delete own trips"
  ON public.traficante_trips
  FOR DELETE
  USING (auth.uid() = user_id);

-- Política: admins pueden hacer todo
CREATE POLICY "Admins can manage all trips"
  ON public.traficante_trips
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND user_type = 'admin')
  );

-- Índices
CREATE INDEX IF NOT EXISTS idx_traficante_trips_user_id ON public.traficante_trips(user_id);
CREATE INDEX IF NOT EXISTS idx_traficante_trips_status ON public.traficante_trips(status);
CREATE INDEX IF NOT EXISTS idx_traficante_trips_origin_city ON public.traficante_trips(origin_city);
CREATE INDEX IF NOT EXISTS idx_traficante_trips_destination_city ON public.traficante_trips(destination_city);
