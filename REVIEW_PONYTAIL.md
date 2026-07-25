# Review Ponytail — PirateMarket

**Repositorio:** [ricardomaldonadomoreno/PirateMarket](https://github.com/ricardomaldonadomoreno/PirateMarket)
**Fecha:** 23 de julio de 2026
**Metodología:** Principios Ponytail (YAGNI, minimalismo, eficiencia)

---

## Resumen ejecutivo

Tu proyecto **pirata-ecosystem** es un monorepo Vite que contiene dos aplicaciones (**pirata-market** y **traficante-app**) que comparten cliente Supabase, i18n, componentes de Navbar y Storage. El código es funcional y bien estructurado a nivel macro, pero presenta oportunidades significativas de simplificación. A continuación se organizan las recomendaciones por impacto: primero lo que eliminar, luego lo que consolidar, y finalmente lo que corregir.

---

## 1. Seguridad: Grants excesivos (impacto crítico)

**Dónde:** `apps/pirata-market/supabase/schema.sql`, líneas 410-415.

El archivo termina con dos bloques de `GRANT ALL ON ALL TABLES IN SCHEMA public` tanto para `anon` como para `authenticated`. Esto **invalida por completo** las políticas RLS (Row Level Security) definidas cuidadosamente en las líneas 220-281, porque los grants de tabla conceden acceso directo sin pasar por las policies.

En otras palabras: cualquier usuario no autenticado puede leer, insertar, actualizar y borrar directamente cualquier tabla de `users`, `listings`, `reports`, etc., saltándose todas las restricciones de RLS.

**Qué hacer:** Eliminar los bloques de `GRANT ALL` (líneas 412-415). Solo los grants de `USAGE ON SCHEMA` son necesarios. Las policies ya regulan el acceso per-row.

---

## 2. Acoplamiento entre apps: dos "Navbars" casi idénticas (impacto alto)

**Dónde:** `apps/pirata-market/src/components/Navbar.jsx` (114 líneas) y `apps/traficante-app/src/components/Navbar.jsx` (117 líneas).

Ambos componentes comparten el 80% de la lógica: cierre de menú al click fuera, logout, dropdown de usuario con los mismos enlaces internos, avatar, selector de idioma. La diferencia se reduce a: branding (logo/texto), namespace i18n (`translation` vs `traficante`), y rutas.

**Principio Ponytail aplicado:** ¿Ya existe en este código base? Sí, la mayor parte. ¿Puede ser un componente parametrizado? Sí.

**Qué hacer:** Crear un `SharedNavbar` con props para `brandName`, `brandLogo`, `homeRoute`, `namespace` i18n y `links`. Reemplazar ambos componentes con instancias del compartido. Esto reduce 231 líneas a ~120 con un solo archivo de CSS compartido.

---

## 3. Duplicación del flujo de avatar (impacto alto)

**Dónde:** La lógica de subir/eliminar avatar se repite casi idéntica en tres archivos:

| Archivo | Líneas del avatar | Patrón |
|---|---|---|
| `Dashboard.jsx` (pirata) | 137-187 | input file → validación → upload → getPublicUrl → update DB |
| `MiPerfil.jsx` (pirata) | 74-116 | idem + delete avatar |
| `MiCuenta.jsx` (traficante) | 139-171 | idem + delete avatar |

Las tres versiones difieren solo en detalles menores (uno incluye validación de tamaño, otro no). Todas usan el mismo bucket `avatars`, mismo patrón de path `${user.id}.${ext}`, y mismo cache-busting con `?t=`.

**Qué hacer:** Extraer un hook personalizado `useAvatar(user, profile, onProfileUpdate)` en `apps/pirata-market/src/lib/hooks/useAvatar.js`. Los tres componentes consumen el hook. **Una sola implementación, un solo bug fix, cero duplicación.**

---

## 4. Configuración Leaflet repetida 5 veces (impacto medio-alto)

**Dónde:** La configuración de iconos Leaflet se duplica en:

- `CreateListing.jsx` (líneas 11-17)
- `ListingDetail.jsx` (líneas 11-17)
- `MiCuenta.jsx` de traficante (líneas 8-14)
- `PublicarViaje.jsx` de traficante (líneas 8-14)
- `Home.jsx` de pirata (líneas 11-16)

Son exactamente los mismos 7 bloques de código que fijan las URLs de `marker-icon`, `marker-icon-2x` y `marker-shadow`.

**Qué hacer:** Un solo archivo `apps/pirata-market/src/lib/leaflet-fix.js` con la configuración. Importarlo una vez en `main.jsx`. Eliminar las 5 duplicaciones.

```js
// lib/leaflet-fix.js
import L from 'leaflet'
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})
```

---

## 5. Rutas "Próximamente" expuestas al público (impacto medio)

**Dónde:** `App.jsx`, rutas de traficante.

Traficante tiene 5 rutas que solo renderizan un placeholder estático con "Próximamente":

| Ruta | Archivo |
|---|---|
| `/traficante/buscar` | `traficante-app/src/pages/Buscar.jsx` |
| `/traficante/dashboard` | `traficante-app/src/pages/Dashboard.jsx` |
| `/traficante/viaje/:id` | `traficante-app/src/pages/ViajeDetalle.jsx` |
| `/traficante/solicitud/:id` | `traficante-app/src/pages/Solicitud.jsx` |
| `/traficante/admin/dashboard` | `traficante-app/src/pages/admin/AdminDashboard.jsx` |

**Principio Ponytail:** ¿Esto necesita estar construido todavía? No. Los placeholders solo aumentan la superficie de ataque y confunden a los usuarios.

**Qué hacer:** Dos opciones:
- **Opción A (minimalista):** Eliminar estas rutas de `App.jsx` y ocultar los enlaces en el Navbar hasta que estén funcionales.
- **Opción B:** Mantener solo la ruta que está realmente desarrollada (`/traficante`, `/traficante/mi-cuenta`, `/traficante/publicar-viaje`) y las demás bajo feature flags o comentarios.

---

## 6. Desajuste schema.sql vs código frontend (impacto medio)

**Dónde:** `schema.sql` define columnas básicas, pero el frontend accede a campos que no existen en el esquema documentado.

El `schema.sql` define para `users`: `user_type`, `display_name`, `whatsapp`, `avatar_url`, `shop_name`, `shop_logo_url`, `is_verified`, etc. Pero el frontend consulta y escribe en columnas que **no aparecen** en el esquema:

| Columna no documentada | Usada en |
|---|---|
| `is_premium`, `premium_until` | `Dashboard.jsx`, `AdminUsuarios.jsx` |
| `shop_bio`, `shop_link`, `shop_hours`, `shop_color`, `shop_banner_url` | `Dashboard.jsx` |
| `full_name`, `phone`, `identity_verified`, `business_verified`, `identity_locked`, `allow_identity_edit` | `Dashboard.jsx`, `AdminUsuarios.jsx` |
| `traficante_bio`, `traficante_phone`, `traficante_address_*`, `traficante_phone_locked`, `traficante_address_locked` | `MiCuenta.jsx` |
| `traficante_frequent_routes` | `MiCuenta.jsx` |

Y tablas completas ausentes del schema: `verification_requests`, `traficante_profiles`, `traficante_reviews`, `traficante_trips`, `traficante_verification_requests`.

Además, el frontend accede a `listing.location_lat` y `listing.location_lng`, pero el schema solo define `exact_location GEOGRAPHY(Point, 4326)`.

**Qué hacer:** Actualizar `schema.sql` para reflejar la realidad actual de la base de datos. Sin un schema que coincida con el código, el desarrollo se vuelve frágil y el onboarding de nuevos colaboradores es más difícil.

---

## 7. Dashboard.jsx sobrecargado (695 líneas, impacto medio)

**Dónde:** `apps/pirata-market/src/pages/Dashboard.jsx`.

Este componente maneja simultáneamente: estadísticas, listado de anuncios con filtros, cambio de tipo de cuenta, subida de avatar, formulario de tienda (7 campos), verificación en capas con subida de documentos, y navegación por sidebar. Son al menos 5 responsabilidades distintas en un solo archivo.

**Principio Ponytail:** No hay abstracciones que no fueron solicitadas, pero sí hay un componente que hace demasiado. La regla es: shortest working diff, pero también fewest lines per component.

**Qué hacer (sin over-engineering):** Extraer solo las secciones más grandes como componentes de presentación dentro del mismo archivo `Dashboard.jsx` o en archivos hermanos simples:

- `DashboardListings.jsx` — la sección de anuncios con filtros (más de 200 líneas)
- `DashboardShopForm.jsx` — el formulario de tienda
- `DashboardVerification.jsx` — la sección de verificación con capas

Los tres pueden vivir en la misma carpeta `pages/` como componentes internos de Dashboard, sin nueva abstracción ni nuevos patrones.

---

## 8. MiCuenta.jsx de traficante (805 líneas, impacto medio)

**Dónde:** `apps/traficante-app/src/pages/MiCuenta.jsx`.

El componente más grande del proyecto. Maneja: datos personales, dirección con mapa Leaflet, verificación documental, reseñas y niveles. Además escribe campos `traficante_*` que no están en el schema documentado.

**Qué hacer:** Mismo enfoque que Dashboard — extraer secciones como subcomponentes dentro del mismo archivo o archivos vecinos. No hace falta un patrón arquitectónico complejo: `MiCuentaPersonal`, `MiCuentaAddress`, `MiCuentaVerification`, `MiCuentaReviews` como funciones exportadas del mismo archivo.

---

## 9. AdminUsuarios.jsx: fallback silencioso por columnas faltantes (impacto medio)

**Dónde:** `apps/pirata-market/src/pages/admin/AdminUsuarios.jsx`, líneas 44-51.

El componente intenta un `select` completo de `users` y, si falla (probablemente por columnas que no existen), hace un fallback a un `select` mínimo. Este patrón es una señal de que el schema de producción y el schema documentado están desalineados.

**Qué hacer:** Corregir el schema (punto 6) y eliminar el try/catch de fallback. Si el schema está correcto, el select siempre funciona y no hace falta el workaround.

---

## 10. i18n: traducciones de traficante faltan para 3 idiomas (impacto bajo-medio)

**Dónde:** `apps/pirata-market/src/i18n/config.js`, líneas 19-21.

Para portugués, árabe y chino, el namespace `traficante` reutiliza las traducciones en español (`trafEs`). Esto significa que un usuario que navega en portugués verá la sección traficante en español.

**Qué hacer:** Si las traducciones de traficante no están en producción para esos idiomas, es preferible no exponerlas (no cargar el namespace) en lugar de mostrar texto en otro idioma. O bien, traducir los archivos `traficante-app/src/locales/pt.json`, `ar.json`, `zh.json`.

---

## 11. Meta tags OG duplicados: cliente vs servidor (impacto bajo)

**Dónde:** `ListingDetail.jsx` (líneas 19-60) y `api/og/[slug].js`.

El componente `ListingDetail` actualiza manualmente los meta tags OG en el cliente via `updateMetaTags()`. Paralelamente, existe un endpoint server-side (`/api/og/:slug`) que genera las mismas meta tags OG via HTML/HTML rewrite en Vercel para los bots.

Los bots de Facebook, WhatsApp, etc. NO ejecutan JavaScript, así que el endpoint server-side es el que realmente funciona. La actualización en cliente es innecesaria para el SEO y solo sirve si el usuario comparte desde dentro de la app (Web Share API).

**Qué hacer:** Eliminar `updateMetaTags()` y `resetMetaTags()` de `ListingDetail.jsx`. El endpoint `/api/og/:slug` ya cubre el caso de bots, y el Web Share API en `handleShare` ya pasa título y descripción manualmente sin depender de las meta tags del DOM.

---

## 12. Dependencia innecesaria: `date-fns` instalada pero no usada (impacto bajo)

**Dónde:** `package.json`, línea 21.

`date-fns` está en dependencias pero `timeAgo()` y `timeUntilExpiry()` están implementadas manualmente en `lib/utils.js` con aritmética de `Date`. No hay ningún import de `date-fns` en todo el proyecto.

**Qué hacer:** Eliminar `date-fns` de `package.json`. Si en el futuro se necesita, reinstalar. Hasta entonces, es una dependencia muerta.

---

## 13. Mapbox instalada pero no usada (impacto bajo)

**Dónde:** `package.json`, línea 22.

`mapbox-gl` está en dependencias pero no se importa en ningún archivo. El proyecto usa exclusivamente Leaflet para mapas.

**Qué hacer:** Eliminar `mapbox-gl` de `package.json`. Reduce el bundle y la instalación.

---

## 14. `react-dropzone` instalado pero no usado (impacto bajo)

**Dónde:** `package.json`, línea 23.

`react-dropzone` está en dependencias pero no se importa en ningún archivo. La subida de archivos se hace con `<input type="file">` nativo en todos los componentes.

**Qué hacer:** Eliminar `react-dropzone` de `package.json`.

---

## 15. SEO manual en cliente para una SPA (impacto bajo)

**Dónde:** `ListingDetail.jsx`, `updateMetaTags()`.

Como se mencionó en el punto 11, la SPA actualiza meta tags en runtime, pero los crawlers de redes sociales no ejecutan JS. El endpoint `/api/og/:slug` ya resuelve esto del lado servidor. El código de `updateMetaTags`/`resetMetaTags` es código muerto para el propósito SEO.

**Qué hacer:** Eliminar ambas funciones y sus llamadas en `ListingDetail.jsx`. Ahorra ~50 líneas de mantenimiento.

---

## Tabla resumen de acciones

| # | Acción | Impacto | Esfuerzo | Dificultad |
|---|---|---|---|---|
| 1 | Eliminar `GRANT ALL` en schema | Crítico | 4 líneas | Muy fácil |
| 2 | Unificar Navbars en componente compartido | Alto | 2-3 hrs | Fácil |
| 3 | Hook `useAvatar` compartido | Alto | 1-2 hrs | Fácil |
| 4 | Centralizar configuración Leaflet | Medio-alto | 30 min | Muy fácil |
| 5 | Ocultar rutas "Próximamente" | Medio | 15 min | Muy fácil |
| 6 | Actualizar `schema.sql` con columnas reales | Medio | 2-3 hrs | Medio |
| 7 | Extraer secciones de `Dashboard.jsx` | Medio | 2-3 hrs | Fácil |
| 8 | Extraer secciones de `MiCuenta.jsx` | Medio | 2-3 hrs | Fácil |
| 9 | Eliminar fallback de `AdminUsuarios.jsx` | Medio | 10 min | Muy fácil |
| 10 | Traducciones traficante faltantes o condicional | Bajo-medio | 1-2 hrs | Fácil |
| 11 | Eliminar `updateMetaTags` de cliente | Bajo | 30 min | Muy fácil |
| 12-14 | Eliminar dependencias no usadas (`date-fns`, `mapbox-gl`, `react-dropzone`) | Bajo | 5 min | Muy fácil |
| 15 | Eliminar SEO manual en cliente (redundante con punto 11) | Bajo | 15 min | Muy fácil |

---

## Conclusión

El proyecto tiene una base sólida: buena organización de carpetas, uso correcto de Supabase, i18n bien configurado, y un endpoint OG server-side inteligente. Los problemas principales son:

1. **Seguridad comprometida** por los grants excesivos que anulan RLS (punto 1).
2. **Acoplamiento entre apps** que genera duplicación de lógica (puntos 2, 3, 4).
3. **Schema desactualizado** que no refleja la realidad del frontend (punto 6).
4. **Superficie expandida innecesariamente** con rutas placeholder y dependencias muertas (puntos 5, 12-14).

Aplicando los cambios de los puntos 1, 2, 3 y 4 se obtiene la mayor mejora con el menor esfuerzo. El resto puede abordarse en iteraciones posteriores.
