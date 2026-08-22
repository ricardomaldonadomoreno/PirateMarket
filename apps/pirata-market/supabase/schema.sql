-- ================================================
-- PIRATA MARKET - Database Schema
-- Un servicio de Buses App
-- ================================================
-- Este schema refleja la estructura REAL de la base de datos.
-- Para nuevas instalaciones, ejecutar en orden.
-- Para migraciones, ejecutar los ALTER TABLE al final.
-- ================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- ENUMS
-- ================================================

DO $$ BEGIN
  CREATE TYPE user_type AS ENUM ('person', 'superadmin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE listing_status AS ENUM ('active', 'sold', 'paused', 'deleted');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE report_reason AS ENUM ('spam', 'illegal', 'scam', 'inappropriate');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'dismissed', 'action_taken');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE verif_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE traf_level AS ENUM ('basico', 'medio', 'pro', 'elite');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ================================================
-- CATEGORIES
-- ================================================

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- Insert initial categories
INSERT INTO categories (name, slug, icon) VALUES
  ('Electrónica', 'electronica', '📱'),
  ('Vehículos', 'vehiculos', '🚗'),
  ('Inmuebles', 'inmuebles', '🏠'),
  ('Muebles', 'muebles', '🛋️'),
  ('Ropa y Accesorios', 'ropa', '👕'),
  ('Servicios', 'servicios', '🔧'),
  ('Alimentos', 'alimentos', '🍕'),
  ('Mascotas', 'mascotas', '🐶'),
  ('Deportes', 'deportes', '⚽'),
  ('Hogar y Jardín', 'hogar', '🌱'),
  ('Arte y Coleccionables', 'arte', '🎨'),
  ('Libros', 'libros', '📚'),
  ('Instrumentos Musicales', 'musica', '🎸'),
  ('Bebés y Niños', 'bebes', '👶'),
  ('Belleza y Salud', 'belleza', '💄'),
  ('Empleos', 'empleos', '💼'),
  ('Adultos +18', 'adultos', '🔞')
ON CONFLICT (slug) DO NOTHING;

-- ================================================
-- USERS (Cuenta base + perfil Pirata + perfil Packer)
-- ================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Identidad base (cuenta pública)
  user_type user_type NOT NULL DEFAULT 'person',
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  is_banned BOOLEAN DEFAULT FALSE,

  -- Verificación Pirata Market (vendendor)
  is_verified BOOLEAN DEFAULT FALSE,
  identity_verified BOOLEAN DEFAULT FALSE,
  identity_locked BOOLEAN DEFAULT FALSE,
  allow_identity_edit BOOLEAN DEFAULT FALSE,
  business_verified BOOLEAN DEFAULT FALSE,
  full_name TEXT,
  phone TEXT,
  city TEXT,
  country TEXT,

  -- Catálogo / Tienda (Capa 2 — solo shops/wholesale)
  is_premium BOOLEAN DEFAULT FALSE,
  premium_until TIMESTAMPTZ,
  shop_name TEXT,
  shop_logo_url TEXT,
  shop_bio TEXT,
  shop_link TEXT,
  shop_hours TEXT,
  shop_color TEXT DEFAULT '#D4AF37',
  shop_banner_url TEXT
);

-- Datos de Packer viven en packer_profiles, no en users.
-- La tabla packer_profiles tiene las columnas:
-- full_name, phone, phone_locked, address_city, address_text, address_lat, address_lng,
-- address_locked, address_country, address_state, address_state_code, address_country_code,
-- birth_country, doc_type, doc_number, personal_locked, bio, bank_verified,
-- identity_verified, address_verified, travel_doc_verified, second_country_verified,
-- frequent_routes, level, total_trips, total_shipments, avg_rating,
-- guarantee_deposit, deposit_currency, created_at, updated_at.

CREATE INDEX IF NOT EXISTS idx_users_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_banned ON users(is_banned) WHERE is_banned = FALSE;
CREATE INDEX IF NOT EXISTS idx_users_verified ON users(is_verified) WHERE is_verified = TRUE;

-- ================================================
-- LISTINGS
-- ================================================

CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  slug TEXT UNIQUE NOT NULL,

  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_ghost BOOLEAN DEFAULT FALSE,

  delete_token TEXT UNIQUE,

  title TEXT NOT NULL CHECK (char_length(title) >= 10 AND char_length(title) <= 100),
  description TEXT CHECK (char_length(description) <= 5000),
  price DECIMAL NOT NULL CHECK (price >= 0),
  currency TEXT DEFAULT 'BOB',
  category_id UUID REFERENCES categories(id) NOT NULL,

  photos TEXT[] DEFAULT '{}',
  video_url TEXT,

  visibility_zones JSONB,
  display_location TEXT,
  exact_location TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,

  whatsapp_number TEXT,
  accepts_offers BOOLEAN DEFAULT FALSE,

  status listing_status DEFAULT 'active',

  views_count INT DEFAULT 0,
  shares_count INT DEFAULT 0,
  contacts_count INT DEFAULT 0,

  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_listings_user ON listings(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_listings_slug ON listings(slug);
CREATE INDEX IF NOT EXISTS idx_listings_created ON listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_expires ON listings(expires_at) WHERE expires_at IS NOT NULL;

-- ================================================
-- LISTING VIEWS
-- ================================================

CREATE TABLE IF NOT EXISTS listing_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  viewer_ip TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_listing_views_listing ON listing_views(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_views_date ON listing_views(created_at);

-- ================================================
-- LISTING CONTACTS
-- ================================================

CREATE TABLE IF NOT EXISTS listing_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_listing_contacts_listing ON listing_contacts(listing_id);

-- ================================================
-- REPORTS
-- ================================================

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,

  reason report_reason NOT NULL,
  details TEXT,

  status report_status DEFAULT 'pending',
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_reports_listing ON reports(listing_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status) WHERE status = 'pending';

-- ================================================
-- VERIFICATION REQUESTS (Pirata Market)
-- ================================================

CREATE TABLE IF NOT EXISTS verification_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status verif_status DEFAULT 'pending',
  source TEXT DEFAULT 'pirata',

  identity_docs TEXT[],
  business_docs TEXT[],
  selfie_url TEXT,

  admin_note TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_verif_user ON verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_verif_status ON verification_requests(status) WHERE status = 'pending';

-- ================================================
-- PACKER VERIFICATION REQUESTS
-- ================================================

CREATE TABLE IF NOT EXISTS packer_verification_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status verif_status DEFAULT 'pending',

  identity_docs TEXT[],
  domicile_docs TEXT[],
  bank_docs TEXT[],
  selfie_url TEXT,

  admin_note TEXT,
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_packer_verif_user ON packer_verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_packer_verif_status ON packer_verification_requests(status) WHERE status = 'pending';

-- ================================================
-- PACKER PROFILES
-- ================================================

CREATE TABLE IF NOT EXISTS packer_profiles (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  level traf_level DEFAULT 'basico',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- PACKER REVIEWS
-- ================================================

CREATE TABLE IF NOT EXISTS packer_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_id UUID REFERENCES users(id) ON DELETE CASCADE,

  rating INT CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  reviewer_role TEXT
);

CREATE INDEX IF NOT EXISTS idx_packer_reviews_reviewed ON packer_reviews(reviewed_id);
CREATE INDEX IF NOT EXISTS idx_packer_reviews_reviewer ON packer_reviews(reviewer_id);

-- ================================================
-- ROW LEVEL SECURITY
-- ================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE packer_verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE packer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE packer_reviews ENABLE ROW LEVEL SECURITY;

-- USERS POLICIES
DO $$ BEGIN
  CREATE POLICY "Public profiles viewable"
  ON users FOR SELECT USING (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- LISTINGS POLICIES
DO $$ BEGIN
  CREATE POLICY "Anyone can view active listings"
  ON listings FOR SELECT USING (status = 'active');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own listings"
  ON listings FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Anyone can create ghost listings"
  ON listings FOR INSERT WITH CHECK (is_ghost = TRUE AND user_id IS NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can create registered listings"
  ON listings FOR INSERT WITH CHECK (auth.uid() = user_id AND is_ghost = FALSE);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own listings"
  ON listings FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own listings"
  ON listings FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Ghost listings can be deleted with token"
  ON listings FOR DELETE USING (is_ghost = TRUE);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- LISTING VIEWS POLICIES
DO $$ BEGIN
  CREATE POLICY "Anyone can log views"
  ON listing_views FOR INSERT WITH CHECK (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- LISTING CONTACTS POLICIES
DO $$ BEGIN
  CREATE POLICY "Anyone can log contacts"
  ON listing_contacts FOR INSERT WITH CHECK (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- REPORTS POLICIES
DO $$ BEGIN
  CREATE POLICY "Anyone can create reports"
  ON reports FOR INSERT WITH CHECK (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- VERIFICATION REQUESTS POLICIES
DO $$ BEGIN
  CREATE POLICY "Users can view own verifications"
  ON verification_requests FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create own verification"
  ON verification_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own verification"
  ON verification_requests FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage all verifications"
  ON verification_requests FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND user_type = 'admin')
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- PACKER VERIFICATION REQUESTS POLICIES
DO $$ BEGIN
  CREATE POLICY "Users can view own packer verifications"
  ON packer_verification_requests FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create own packer verification"
  ON packer_verification_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own packer verification"
  ON packer_verification_requests FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage packer verifications"
  ON packer_verification_requests FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND user_type = 'admin')
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- PACKER PROFILES POLICIES
DO $$ BEGIN
  CREATE POLICY "Anyone can view packer profiles"
  ON packer_profiles FOR SELECT USING (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can update packer profiles"
  ON packer_profiles FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND user_type = 'admin')
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- PACKER REVIEWS POLICIES
DO $$ BEGIN
  CREATE POLICY "Anyone can view reviews"
  ON packer_reviews FOR SELECT USING (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can write reviews"
  ON packer_reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ================================================
-- FUNCTIONS
-- ================================================

-- Auto-generate slug
CREATE OR REPLACE FUNCTION generate_listing_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
BEGIN
  base_slug := lower(regexp_replace(NEW.title, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  base_slug := substring(base_slug, 1, 50);

  final_slug := base_slug || '-' || substring(NEW.id::text, 1, 8);

  NEW.slug := final_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_listing_slug ON listings;
CREATE TRIGGER set_listing_slug
BEFORE INSERT ON listings
FOR EACH ROW
WHEN (NEW.slug IS NULL)
EXECUTE FUNCTION generate_listing_slug();

-- Auto-generate delete token for Pirate listings
CREATE OR REPLACE FUNCTION generate_delete_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_ghost = TRUE THEN
    NEW.delete_token := encode(gen_random_bytes(32), 'hex');
    NEW.expires_at := NOW() + INTERVAL '72 hours';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_delete_token ON listings;
CREATE TRIGGER set_delete_token
BEFORE INSERT ON listings
FOR EACH ROW
WHEN (NEW.is_ghost = TRUE)
EXECUTE FUNCTION generate_delete_token();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_listings_updated_at ON listings;
CREATE TRIGGER update_listings_updated_at
BEFORE UPDATE ON listings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_packer_profiles_updated_at ON packer_profiles;
CREATE TRIGGER update_packer_profiles_updated_at
BEFORE UPDATE ON packer_profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Update user listing count
CREATE OR REPLACE FUNCTION update_user_listing_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.user_id IS NOT NULL THEN
    UPDATE users SET listings_count = COALESCE(listings_count, 0) + 1 WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' AND OLD.user_id IS NOT NULL THEN
    UPDATE users SET listings_count = GREATEST(COALESCE(listings_count, 0) - 1, 0) WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_listing_count_trigger ON listings;
CREATE TRIGGER update_user_listing_count_trigger
AFTER INSERT OR DELETE ON listings
FOR EACH ROW
EXECUTE FUNCTION update_user_listing_count();

-- Increment views
CREATE OR REPLACE FUNCTION increment_listing_views(listing_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE listings
  SET views_count = views_count + 1
  WHERE id = listing_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment contacts
CREATE OR REPLACE FUNCTION increment_listing_contacts(listing_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE listings
  SET contacts_count = contacts_count + 1
  WHERE id = listing_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment shares
CREATE OR REPLACE FUNCTION increment_listing_shares(listing_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE listings
  SET shares_count = shares_count + 1
  WHERE id = listing_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete expired ghost listings
CREATE OR REPLACE FUNCTION delete_expired_ghost_listings()
RETURNS void AS $$
BEGIN
  DELETE FROM listings
  WHERE is_ghost = TRUE
  AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-create packer_profile on user creation
CREATE OR REPLACE FUNCTION create_packer_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO packer_profiles (id) VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS create_packer_profile_trigger ON users;
CREATE TRIGGER create_packer_profile_trigger
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_packer_profile();

-- ================================================
-- STORAGE BUCKETS
-- ================================================
-- Los siguientes buckets deben existir en Supabase Storage:
--   avatars (public)            — Foto de perfil: avatars/{user_id}.{ext}
--   listing-photos (public)     — Fotos de anuncios: listing-photos/{listing_id}/...
--   verification-docs (private) — Docs Pirata: verification-docs/{user_id}/identity/ y business/
--   traficante-docs (private; nombre histórico del bucket Storage de Packer): traficante-docs/{user_id}/identity/, domicile/, bank/

-- ================================================
-- PAÍSES DE AMÉRICA
-- ================================================
-- Usar en el frontend como opciones del selector de país en Dashboard.jsx (Capa 1):
--
-- const COUNTRIES = [
--   { code: 'AR', name: 'Argentina' },
--   { code: 'BO', name: 'Bolivia' },
--   { code: 'BR', name: 'Brasil' },
--   { code: 'CA', name: 'Canadá' },
--   { code: 'CL', name: 'Chile' },
--   { code: 'CO', name: 'Colombia' },
--   { code: 'CR', name: 'Costa Rica' },
--   { code: 'CU', name: 'Cuba' },
--   { code: 'DO', name: 'República Dominicana' },
--   { code: 'EC', name: 'Ecuador' },
--   { code: 'SV', name: 'El Salvador' },
--   { code: 'GT', name: 'Guatemala' },
--   { code: 'HN', name: 'Honduras' },
--   { code: 'JM', name: 'Jamaica' },
--   { code: 'MX', name: 'México' },
--   { code: 'NI', name: 'Nicaragua' },
--   { code: 'PA', name: 'Panamá' },
--   { code: 'PY', name: 'Paraguay' },
--   { code: 'PE', name: 'Perú' },
--   { code: 'PR', name: 'Puerto Rico' },
--   { code: 'TT', name: 'Trinidad y Tobago' },
--   { code: 'US', name: 'Estados Unidos' },
--   { code: 'UY', name: 'Uruguay' },
--   { code: 'VE', name: 'Venezuela' }
-- ];

-- ================================================
-- GRANTS
-- ================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
-- ================================================
-- MIGRATIONS (aplicar en orden en Supabase SQL Editor)
-- ================================================

-- Migration: Las columnas de documento ya viven en packer_profiles.
-- Estas líneas estaban en users y fueron eliminadas.

-- Migration: Corregir policies de packer_verification_requests
-- (las policies actuales no permiten INSERT porque usan EXCEPTION y no se reemplazan)

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own packer verifications" ON packer_verification_requests;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can create own packer verification" ON packer_verification_requests;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can update own packer verification" ON packer_verification_requests;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can manage packer verifications" ON packer_verification_requests;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Users can view own packer verifications"
  ON packer_verification_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own packer verification"
  ON packer_verification_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own packer verification"
  ON packer_verification_requests FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage packer verifications"
  ON packer_verification_requests FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND user_type = 'admin')
  );

-- Migration: Corregir policy de SELECT en packer_verification_requests para admin
-- (el admin necesita poder seleccionar TODAS las solicitudes, no solo las suyas)
CREATE POLICY "Admins can select all packer verifications"
  ON packer_verification_requests FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND user_type = 'admin')
  );
