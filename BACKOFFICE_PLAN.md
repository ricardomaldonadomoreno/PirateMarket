# Plan de Implementación: Backoffice Reorganizado

## Tablas existentes y su uso

### Pirata Market:
| Tabla | Usada por | Admin necesita |
|-------|-----------|----------------|
| `users` | Toda la app | Usuarios, tipos, ban, premium |
| `verification_requests` | DashboardVerificacion.jsx | Aprobar/rechazar capas (identidad, negocio) |
| `listings` | Home, ListingDetail, Dashboard | CRUD, cambiar status |
| `featured_listings` | CreateListing, Home | Aprobar destacados, setear banner |
| `reports` | Reportes de usuarios | Gestionar reportes |
| `categories` | Categorías de anuncios | Activar/desactivar |

### Traficante:
| Tabla | Usada por | Admin necesita |
|-------|-----------|----------------|
| `users` | MiCuenta, MiPerfil | Ver perfiles de traficantes |
| `traficante_verification_requests` | MiCuentaVerificacion.jsx | Aprobar/rechazar identidad y domicilio |
| `traficante_trips` | PublicarViaje.jsx | Ver viajes activos, pausar/eliminar |
| `traficante_profiles` | MiCuentaNivel, MiCuenta | Ver rating, nivel |
| `traficante_reviews` | MiCuentaResenas | Ver reseñas |

## Orden de implementación

1. SQL (admin_roles) → 2. AdminRoute.jsx → 3. Landing /admin → 4. Rutas reorganizadas → 5. Admin SubAdmins → 6. Admin Pirata (usuarios, anuncios+destacados, reportes, dashboard) → 7. Admin Traficante (dashboard, viajes, verificaciones, destacados)
