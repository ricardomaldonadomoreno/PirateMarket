# Auditoría de Schema vs Frontend

## Lo que EXISTE en schema.sql

### Tablas existentes:
- categories
- users (columnas base: id, email, display_name, whatsapp, avatar_url, bio, user_type, shop_name, shop_logo_url, is_verified, verification_doc_url, verified_at, city, country, listings_count, total_views, total_contacts, is_banned, ban_reason, banned_at, last_login)
- listings
- listing_views
- listing_contacts
- reports

### Lo que FALTA en schema.sql (pero el frontend usa):
- No existe: `full_name`, `phone` (columnas de Capa 1 identidad en users)
- No existe: `shop_bio`, `shop_link`, `shop_hours`, `shop_color`, `shop_banner_url` (catálogo premium)
- No existe: `identity_verified`, `business_verified`, `identity_locked`, `allow_identity_edit`
- No existe: `is_premium`, `premium_until`
- No existe: tabla `verification_requests`
- No existe: columna `traficante_` prefix en users
- No existe: tabla `traficante_verification_requests`
- No existe: tabla `traficante_reviews`
- No existe: tabla `traficante_profiles`
- No existe: tabla `traficante_levels` (o columnas de nivel)
- No existe: ENUMs para tráfico (traficante_user_type, etc.)
- No existe: tabla `verification_docs` (storage bucket docs)
- No existe: triggers para traficante
- No existe: RLS policies para tablas de traficante
- No existe: funciones para traficante

## Lo que el FRONTEND usa (de las 3 páginas):

### Dashboard.jsx (Pirata - Vendedor)
Lee de users:
- display_name, user_type, avatar_url, is_verified, is_premium, premium_until
- shop_name, shop_bio, shop_link, shop_hours, shop_color, shop_logo_url, shop_banner_url
- full_name, country, city, phone
- identity_verified, business_verified, identity_locked, allow_identity_edit

Lee de verification_requests:
- * (todo) con filtro source='pirata'

Buckets:
- avatars/${user.id}.ext
- verification-docs/${user.id}/identity/
- verification-docs/${user.id}/business/

### MiCuenta.jsx (Traficante - Transportador)
Lee de users:
- display_name, avatar_url
- traficante_full_name, traficante_phone
- traficante_address_city, traficante_address_text
- traficante_address_lat, traficante_address_lng
- traficante_address_locked, traficante_phone_locked
- traficante_bio, traficante_frequent_routes
- traficante_identity_verified, traficante_address_verified, traficante_bank_verified

Lee de traficante_verification_requests:
- * (todo) con filtro user_id

Lee de traficante_reviews:
- *, reviewer:reviewer_id(display_name, avatar_url) con filtro reviewed_id

Lee de traficante_profiles:
- level con filtro id=user.id

Buckets:
- avatars/${user.id}.ext
- traficante-docs/${user.id}/identity/
- traficante-docs/${user.id}/domicile/
- traficante-docs/${user.id}/bank/

### MiPerfil.jsx (Perfil público)
Lee de users:
- display_name, avatar_url, whatsapp, user_type

Lee de traficante_profiles:
- level con filtro id=user.id

## Resumen: Tablas que faltan por crear
1. `verification_requests` (pirata)
2. `traficante_verification_requests`
3. `traficante_reviews`
4. `traficante_profiles`
5. Columnas faltantes en `users` (pirata + traficante)
6. ENUMs faltantes
7. RLS policies faltantes
8. Triggers/funciones faltantes
9. Storage buckets faltantes
