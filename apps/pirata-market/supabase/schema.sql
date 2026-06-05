-- ================================================
-- PIRATA MARKET - Database Schema
-- Un servicio de Buses App
-- ================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ================================================
-- ENUMS
-- ================================================

CREATE TYPE user_type AS ENUM ('person', 'shop', 'wholesale', 'admin');
CREATE TYPE listing_status AS ENUM ('active', 'sold', 'paused', 'deleted');
CREATE TYPE report_reason AS ENUM ('spam', 'illegal', 'scam', 'inappropriate');
CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'dismissed', 'action_taken');

-- ================================================
-- CATEGORIES
-- ================================================

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT,
  parent_id UUID REFERENCES categories(id),
  
  is_adult BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0
);

CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_active ON categories(is_active) WHERE is_active = TRUE;

-- Insert initial categories
INSERT INTO categories (name, slug, icon, is_adult, sort_order) VALUES
  ('Electrónica', 'electronica', '📱', FALSE, 1),
  ('Vehículos', 'vehiculos', '🚗', FALSE, 2),
  ('Inmuebles', 'inmuebles', '🏠', FALSE, 3),
  ('Muebles', 'muebles', '🛋️', FALSE, 4),
  ('Ropa y Accesorios', 'ropa', '👕', FALSE, 5),
  ('Servicios', 'servicios', '🔧', FALSE, 6),
  ('Alimentos', 'alimentos', '🍕', FALSE, 7),
  ('Mascotas', 'mascotas', '🐕', FALSE, 8),
  ('Deportes', 'deportes', '⚽', FALSE, 9),
  ('Hogar y Jardín', 'hogar', '🏡', FALSE, 10),
  ('Arte y Coleccionables', 'arte', '🎨', FALSE, 11),
  ('Libros', 'libros', '📚', FALSE, 12),
  ('Música', 'musica', '🎸', FALSE, 13),
  ('Bebés y Niños', 'bebes', '👶', FALSE, 14),
  ('Belleza y Salud', 'belleza', '💄', FALSE, 15),
  ('Empleos', 'empleos', '💼', FALSE, 16),
  ('Adultos +18', 'adultos', '🔞', TRUE, 99);

-- ================================================
-- USERS (Only registered sellers)
-- ================================================

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  user_type user_type NOT NULL DEFAULT 'person',
  
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  
  shop_name TEXT,
  shop_logo_url TEXT,
  
  is_verified BOOLEAN DEFAULT FALSE,
  verification_doc_url TEXT,
  verified_at TIMESTAMPTZ,
  
  city TEXT DEFAULT 'Santa Cruz',
  country TEXT DEFAULT 'BO',
  
  listings_count INT DEFAULT 0,
  total_views INT DEFAULT 0,
  total_contacts INT DEFAULT 0,
  
  is_banned BOOLEAN DEFAULT FALSE,
  ban_reason TEXT,
  banned_at TIMESTAMPTZ,
  last_login TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_type ON users(user_type);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_banned ON users(is_banned) WHERE is_banned = FALSE;

-- ================================================
-- LISTINGS (Pirate + Registered)
-- ================================================

CREATE TABLE listings (
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
  thumbnail_url TEXT,
  
  visibility_zones JSONB,
  display_location TEXT DEFAULT 'Santa Cruz',
  exact_location GEOGRAPHY(Point, 4326),
  
  whatsapp_number TEXT,
  whatsapp_message_template TEXT,
  accepts_offers BOOLEAN DEFAULT FALSE,
  
  status listing_status DEFAULT 'active',
  
  views_count INT DEFAULT 0,
  shares_count INT DEFAULT 0,
  contacts_count INT DEFAULT 0,
  
  is_featured BOOLEAN DEFAULT FALSE,
  is_reported BOOLEAN DEFAULT FALSE,
  report_count INT DEFAULT 0,
  
  expires_at TIMESTAMPTZ,
  
  sold_at TIMESTAMPTZ
);

CREATE INDEX idx_listings_user ON listings(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_listings_category ON listings(category_id);
CREATE INDEX idx_listings_status ON listings(status) WHERE status = 'active';
CREATE INDEX idx_listings_ghost ON listings(is_ghost) WHERE is_ghost = TRUE;
CREATE INDEX idx_listings_slug ON listings(slug);
CREATE INDEX idx_listings_created ON listings(created_at DESC);
CREATE INDEX idx_listings_expires ON listings(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_listings_location ON listings USING GIST (exact_location) WHERE exact_location IS NOT NULL;
CREATE INDEX idx_listings_search ON listings USING gin(to_tsvector('spanish', title || ' ' || COALESCE(description, '')));

-- ================================================
-- LISTING VIEWS
-- ================================================

CREATE TABLE listing_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  viewer_ip TEXT,
  
  user_agent TEXT,
  referrer TEXT
);

CREATE INDEX idx_listing_views_listing ON listing_views(listing_id);
CREATE INDEX idx_listing_views_date ON listing_views(created_at);

-- ================================================
-- LISTING CONTACTS
-- ================================================

CREATE TABLE listing_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  contactor_id UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_listing_contacts_listing ON listing_contacts(listing_id);

-- ================================================
-- REPORTS
-- ================================================

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  reporter_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reported_listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  
  reason report_reason NOT NULL,
  details TEXT,
  
  status report_status DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id)
);

CREATE INDEX idx_reports_listing ON reports(reported_listing_id);
CREATE INDEX idx_reports_status ON reports(status) WHERE status = 'pending';

-- ================================================
-- ROW LEVEL SECURITY
-- ================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- USERS POLICIES
CREATE POLICY "Public profiles viewable"
ON users FOR SELECT
USING (TRUE);

CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON users FOR INSERT
WITH CHECK (auth.uid() = id);

-- LISTINGS POLICIES
CREATE POLICY "Anyone can view active listings"
ON listings FOR SELECT
USING (status = 'active');

CREATE POLICY "Users can view own listings"
ON listings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can create ghost listings"
ON listings FOR INSERT
WITH CHECK (is_ghost = TRUE AND user_id IS NULL);

CREATE POLICY "Authenticated users can create registered listings"
ON listings FOR INSERT
WITH CHECK (auth.uid() = user_id AND is_ghost = FALSE);

CREATE POLICY "Users can update own listings"
ON listings FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own listings"
ON listings FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Ghost listings can be deleted with token"
ON listings FOR DELETE
USING (is_ghost = TRUE);

-- LISTING VIEWS POLICIES
CREATE POLICY "Anyone can log views"
ON listing_views FOR INSERT
WITH CHECK (TRUE);

-- LISTING CONTACTS POLICIES
CREATE POLICY "Anyone can log contacts"
ON listing_contacts FOR INSERT
WITH CHECK (TRUE);

-- REPORTS POLICIES
CREATE POLICY "Anyone can create reports"
ON reports FOR INSERT
WITH CHECK (TRUE);

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

CREATE TRIGGER update_listings_updated_at
BEFORE UPDATE ON listings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Update user listing count
CREATE OR REPLACE FUNCTION update_user_listing_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.user_id IS NOT NULL THEN
    UPDATE users SET listings_count = listings_count + 1 WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' AND OLD.user_id IS NOT NULL THEN
    UPDATE users SET listings_count = listings_count - 1 WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

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

-- Delete expired pirate listings (run daily via cron)
CREATE OR REPLACE FUNCTION delete_expired_ghost_listings()
RETURNS void AS $$
BEGIN
  DELETE FROM listings 
  WHERE is_ghost = TRUE 
  AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- GRANTS
-- ================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
```
