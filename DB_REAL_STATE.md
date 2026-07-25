# Estado Real de la Base de Datos vs Schema.sql

## Tablas que EXISTEN en la BD real (todas)

| Tabla | Estado | Columnas reales |
|---|---|---|
| **users** | ✅ Activa | id, email, display_name, whatsapp, user_type, avatar_url, is_verified, is_banned, created_at, updated_at, is_premium, premium_until, shop_name, shop_banner_url, shop_logo_url, shop_bio, shop_link, shop_hours, shop_color, traficante_full_name, traficante_phone, traficante_phone_locked, traficante_address_city, traficante_address_text, traficante_address_lat, traficante_address_lng, traficante_address_locked, traficante_bio, traficante_frequent_routes, traficante_identity_verified, traficante_address_verified, traficante_bank_verified, identity_verified, identity_locked, business_verified, allow_identity_edit |
| **listings** | ✅ Activa | id, user_id, category_id, title, slug, description, price, photos, video_url, is_ghost, delete_token, expires_at, whatsapp_number, accepts_offers, exact_location, display_location, visibility_zones, status, views_count, shares_count, contacts_count, created_at, updated_at, currency, location_lat, location_lng |
| **categories** | ✅ Activa | id, name, icon, slug, created_at (SIN parent_id, is_adult, is_active, sort_order) |
| **listing_views** | ✅ Activa | id, listing_id, viewer_ip, user_agent, created_at (SIN viewer_id, referrer) |
| **listing_contacts** | ✅ Activa | id, listing_id, created_at (SIN contactor_id) |
| **reports** | ✅ Activa | id, reason, details, status, reviewed_at, reviewed_by, created_at, reporter_id, listing_id (SIN reporter_user_id, reported_listing_id, admin_notes) |
| **verification_requests** | ✅ Activa (vacía) | id, user_id, status, source, identity_docs, business_docs, admin_note, reviewed_at, created_at (SIN reviewed_by) |
| **traficante_verification_requests** | ✅ Activa (vacía) | id, user_id, status, identity_docs, domicile_docs, bank_docs, admin_note, reviewed_at, created_at |
| **traficante_reviews** | ✅ Activa (vacía) | id, reviewer_id, reviewed_id, rating, comment, reviewer_role, created_at |
| **traficante_profiles** | ✅ Activa (vacía) | id, level, created_at, updated_at (SIN assigned_at) |

## Diferencias Schema.sql vs BD Real

### Columnas que existen en la BD pero NO en schema.sql:
- users: is_premium, premium_until, shop_bio, shop_link, shop_hours, shop_color, shop_banner_url, traficante_* (12 cols), identity_verified, identity_locked, business_verified, allow_identity_edit
- listings: location_lat, location_lng
- reports: reporter_id (en vez de reporter_user_id), listing_id (en vez de reported_listing_id)

### Columnas que existen en schema.sql pero NO en la BD real:
- users: bio, city, country, verification_doc_url, verified_at, listings_count, total_views, total_contacts, ban_reason, banned_at, last_login, full_name, phone
- listing_views: viewer_id, referrer
- listing_contacts: contactor_id
- reports: reporter_user_id, reported_listing_id, admin_notes
- verification_requests: reviewed_by
- traficante_profiles: assigned_at

### Categorías reales en BD (17):
Electrónica, Vehículos, Inmuebles, Muebles, Ropa y Accesorios, Servicios, Alimentos, Mascotas, Deportes, Hogar y Jardín, Arte y Coleccionables, Libros, Instrumentos Musicales, Bebés y Niños, Belleza y Salud, Empleos, Adultos +18

### Categorías en schema.sql (17):
Electrónica, Vehículos, Inmuebles, Muebles, Ropa y Accesorios, Servicios, Alimentos, Mascotas, Deportes, Hogar y Jardín, Arte y Coleccionables, Libros, Música, Bebés y Niños, Belleza y Salud, Empleos, Adultos +18
(Diferencia: BD tiene "Instrumentos Musicales" en vez de "Música")

## Storage Buckets
- **avatars**: ✅ Existe (archivo real: 749a97...JPG)
- **listing-photos**: ✅ Existe (URLs en listings.photos apuntan ahí)
- **verification-docs**: ❌ No existe (necesario para Dashboard verificación)
- **traficante-docs**: ❌ No existe (necesario para MiCuenta verificación)

## ENUMs confirmados
- user_type: 'person', 'shop', 'wholesale', 'admin' ✅
- listing_status: 'active', 'sold', 'paused', 'deleted' (asumido, no verificable via REST)
- report_reason: 'spam', 'illegal', 'scam', 'inappropriate' (asumido)
- report_status: 'pending', 'reviewed', 'dismissed', 'action_taken' (asumido)
- verif_status: 'pending', 'approved', 'rejected' (asumido)
- traf_level: 'basico', 'medio', 'pro', 'elite' (asumido)

## Triggers/Funciones que probablemente existen (no verificables via REST):
- generate_listing_slug
- generate_delete_token
- update_updated_at
- update_user_listing_count
- increment_listing_views
- increment_listing_contacts
- increment_listing_shares
- delete_expired_ghost_listings

## RLS Policies que probablemente existen (no verificables via REST)
