# Análisis MiCuenta.jsx — Problemas y soluciones

## 1. Persistencia de datos (reinicia al salir)
- El useEffect (línea 79-84) recarga todo al montar: `loadProfile()`, `loadReviews()`, `loadVerification()`
- Problema: cuando el usuario navega fuera y vuelve, los estados de archivos pendientes (`identityFiles`, `domicileFiles`, `bankFiles`) se pierden porque son state local
- Solución: No hay solución simple para archivos pendientes (el usuario siempre tendrá que volver a seleccionar). PERO el problema real es que los campos editables se reinician. Verificar que `loadProfile` repuebla correctamente desde la DB.
- En realidad, el problema podría ser que App.jsx no pasa `profile` actualizado. Revisar.

## 2. Sidebar avatar
- Línea 272: usa `profile?.avatar_url` (avatar público de MiPerfil)
- Debe usar: `verifRequest?.selfie_url` (foto de verificación traficante)
- Schema actual: `traficante_verification_requests` NO tiene columna `selfie_url`
- Necesario: agregar `selfie_url` a `traficante_verification_requests` en schema.sql

## 3. Formato de verificación
- MiCuenta usa formato LISTA (mc-verif-list / mc-verif-item): filas horizontales con icono+info+status
- Dashboard usa formato CUADRO (verif-layer): tarjetas verticales con header+content
- Debe igualarse al formato de Dashboard (tarjetas verticales)

## 4. Selfie para verificación
- Dashboard tiene selfie en "Tu Foto Personal" antes de documentos
- MiCuenta NO tiene selfie
- Necesario: agregar campo selfie en MiCuenta verificación

## 5. Emojis en sección de verificación
- Sidebar: MANTENER emojis (icon + label)
- Sección verificación: QUITAR emojis del contenido, solo texto
- mc-verif-icon (emoji🪪📄🏦📱) → eliminar
- Labels con emojis (🪪 Documento, 📄 Comprobante, etc.) → quitar emojis
- Botones con emojis (📤 Enviar, 📷 Seleccionar) → quitar emojis en contenido principal
- Sidebar nav-item emojis: MANTENER

## 6. Reseñas
- loadReviews (línea 118-124): consulta `traficante_reviews` con `reviewed_id = user.id`
- join con `reviewer:reviewer_id(display_name, avatar_url)`
- La tabla `traficante_reviews` existe en schema.sql con columnas: reviewer_id, reviewed_id, rating, comment, reviewer_role
- La lógica parece correcta. El problema puede ser que no hay reviews en la BD aún.

## 7. Nivel (fallando)
- Línea 716-721: usa `currentLevel` que NO está definido como variable
- Buscando... la variable `currentLevel` no existe en los estados ni en loadProfile
- `loadProfile` (línea 86-116) NO consulta `traficante_profiles.level`
- Necesario: cargar nivel desde `traficante_profiles` y definir `currentLevel`

## 8. Schema: traficante_verification_requests
- No tiene columna `selfie_url`
- Necesario agregarla para la selfie del transportador

## Resumen de cambios necesarios:

### MiCuenta.jsx
1. Agregar estado `currentLevel` y cargarlo desde `traficante_profiles`
2. Agregar estado `selfieFile` y `selfiePreview`
3. Sidebar: usar `verifRequest?.selfie_url` en vez de `profile?.avatar_url`
4. Sección verificación: reescribir con formato de tarjetas (igual a Dashboard)
5. Agregar campo selfie
6. Quitar emojis del contenido de verificación (mantener en sidebar)
7. Compresión de imágenes (usar compressImage de utils)

### MiCuenta.css
1. Reescribir formato de verificación (de lista a tarjetas)
2. Agregar estilos para selfie (igual a Dashboard: verif-preview-single)
3. Agregar estilos para botones X eliminar

### schema.sql
1. Agregar `selfie_url TEXT` a `traficante_verification_requests`
