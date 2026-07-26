# Análisis completo de Traficante

## Qué es Traficante
Plataforma que conecta personas que viajan con personas que necesitan enviar paquetes. Sin couriers, sin burocracia. Tres perfiles de transportador: Viajero, Compactador, Fletero.

## Rutas existentes (App.jsx)
- `/traficante` — Home (landing page completa)
- `/traficante/buscar` — Placeholder "Próximamente"
- `/traficante/publicar-viaje` — Formulario completo de 9 pasos
- `/traficante/viaje/:id` — Placeholder "Próximamente"
- `/traficante/solicitud/:id` — Placeholder "Próximamente"
- `/traficante/mi-cuenta` — Cuenta con sidebar (personal, verificacion, resenas, nivel)
- `/traficante/dashboard` — Placeholder "Próximamente"

## Promesa vs Realidad

### Lo que PROMETE (es.json, Home.jsx):
1. Buscador por ruta/fecha → NO FUNCIONA (placeholder)
2. Revisar perfil y nivel del viajero → NO FUNCIONA (ViajeDetalle placeholder)
3. Enviar solicitud con fotos del paquete → NO FUNCIONA (Solicitud placeholder)
4. Entrega con QR + escrow → NO IMPLEMENTADO
5. Niveles de confianza (básico, medio, pro, elite) → SOLO EXPLICATIVO, no funcional
6. Garantía de pago en escrow → NO IMPLEMENTADO

### Lo que SÍ FUNCIONA:
1. **Home** — Landing completa con hero, buscador (decorativo), CTA, secciones informativas
2. **PublicarViaje** — Formulario funcional que inserta en `traficante_trips`
3. **MiCuenta** — Gestión de perfil (nombre fijo, teléfono fijo, dirección fija)
4. **Verificación** — Sube documentos (identidad, domicilio, banco, selfie) a `traficante_verification_requests`
5. **Reseñas** — Lee y muestra reseñas existentes (pasivo)
6. **Nivel** — Solo informativo, no hace nada

## Páginas placeholders (NO FUNCIONAN):
- Buscar.jsx — Solo texto "Próximamente"
- ViajeDetalle.jsx — Solo texto "Próximamente"
- Solicitud.jsx — Solo texto "Próximamente"
- Dashboard.jsx — Solo texto "Próximamente"

## Problemas de complejidad identificados

### 1. PublicarViaje: 9 pasos cuando puede ser 3-4
- Paso 1: Tipo (Viajero/Compactador) — NECESARIO
- Paso 2: Origen (ciudad, dirección, GPS, mapa) — COMPLEJO, puede simplificarse
- Paso 3: Destino (ciudad, dirección, GPS, mapa) — COMPLEJO, puede simplificarse
- Paso 4: Fechas (viajero) o Horario (compactador) — NECESARIO
- Paso 5: Transporte (viajero) — NECESARIO
- Paso 6: Capacidad (peso, tamaños) — NECESARIO
- Paso 7: Tipos de paquetes (acepto/no acepto) — NECESARIO
- Paso 8: Precio (simple o tabla) — NECESARIO
- Paso 9: Descripción — NECESARIO

### 2. MiCuenta: Demasiados campos y bloqueos
- Nombre completo → se fija permanentemente (bueno)
- Teléfono → se fija permanentemente (bueno)
- Dirección → se fija permanentemente (bueno)
- Bio pública → editable
- Rutas frecuentes → editable
- 3 funciones save separadas con lógica de locking

### 3. Verificación: 4 documentos obligatorios
- Identidad (obligatorio)
- Domicilio (obligatorio)
- Extracto bancario (opcional)
- Selfie (opcional)
- Proceso: comprime → sube a storage → inserta en tabla → revisa admin

### 4. Niveles: Concepto complejo sin implementación real
- 4 niveles con requisitos acumulativos
- No hay lógica automática de ascenso
- "Contacta a soporte para subir de nivel"
- Requisitos incluyen cosas no implementadas: "Garantía por artículo", "Escrow habilitado"

### 5. MiCuentaSidebar: Navegación interna
- 4 secciones fijas
- Muestra avatar, nombre, email, rating

## Base de datos relevante (traficante)
- `traficante_trips` — viajes publicados
- `traficante_verification_requests` — solicitudes de verificación
- `traficante_reviews` — reseñas
- `traficante_profiles` — perfil con level
- `traficante_docs` — bucket de storage para documentos
- Campo `user_type = 'traficante'` en tabla users
