# 🏴‍☠️ PIRATA MARKET

Comercio sin intermediarios. Un servicio de **Buses App**.
Ricardo Maldonado Moreno
---

## 🌍 Idiomas Disponibles

- 🇪🇸 Español
- 🇺🇸 English
- 🇧🇷 Português
- 🇸🇦 العربية (RTL)
- 🇨🇳 中文

---

## 🚀 Stack Tecnológico

- **Frontend:** React 18 + Vite
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Internacionalización:** react-i18next
- **Mapas:** Leaflet.js
- **Deploy:** Vercel
- **Estilo:** CSS personalizado (paleta Buses App)

---

## 📁 Estructura del Proyecto
```
pirata-market/
├── public/              # Assets estáticos
├── src/
│   ├── components/      # Componentes reutilizables
│   ├── pages/          # Páginas principales
│   ├── lib/            # Utilidades y configuración
│   ├── i18n/           # Configuración de traducciones
│   ├── locales/        # Archivos de traducción (5 idiomas)
│   └── styles/         # Estilos globales
├── supabase/           # Schema y migraciones SQL
└── README.md
```

---

## 🛠️ Instalación Local

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/pirata-market.git
cd pirata-market
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz:
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
VITE_MAPBOX_TOKEN=tu_mapbox_token_aqui
```

### 4. Ejecutar en desarrollo
```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173)

---

## 📊 Setup Supabase

### 1. Crear proyecto

- Ve a [supabase.com](https://supabase.com)
- Crea un nuevo proyecto
- Copia URL y anon key

### 2. Ejecutar Schema SQL

- Abre **SQL Editor** en Supabase
- Copia el contenido de `supabase/schema.sql`
- Ejecuta el script

### 3. Configurar Storage

Crea dos buckets públicos:
- `listing-photos`
- `listing-videos`

---

## 🎯 Características

### Fichas Pirata (sin registro)
- ✅ Publicación rápida sin cuenta
- ✅ Duración: 72 horas (auto-delete)
- ✅ Incluye fotos y video
- ✅ Contacto manual en descripción

### Fichas Registradas
- ✅ Duración ilimitada
- ✅ Control geográfico (Leaflet maps)
- ✅ WhatsApp integrado
- ✅ Analytics (vistas, contactos)
- ✅ Edición posterior

### Roles
- **Visitante:** Ver marketplace, publicar Pirata
- **Registrado:** Fichas permanentes (Persona/Tienda/Mayorista)
- **Admin:** Backoffice completo

---

## 🚀 Deploy en Vercel

### Opción 1: GitHub Integration

1. Push tu código a GitHub
2. Ve a [vercel.com](https://vercel.com)
3. Importa tu repositorio
4. Agrega variables de entorno:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_MAPBOX_TOKEN`
5. Deploy

### Opción 2: Vercel CLI
```bash
npm i -g vercel
vercel
```

---

## 🎨 Paleta de Colores (Buses App)
```css
--gold: #B8985F        /* Dorado principal */
--dark: #2B2B2B        /* Fondo oscuro */
--light: #F5F1E8       /* Fondo claro */
--text-light: #F5F1E8  /* Texto en dark mode */
--text-dark: #1a1a1a   /* Texto en light mode */
```

---

## 📱 Navegación

- `/` - Marketplace (home)
- `/ficha/:slug` - Detalle de anuncio
- `/publicar` - Crear anuncio
- `/dashboard` - Panel de vendedor
- `/auth` - Login/Registro

---

## 🌐 Internacionalización

Los textos están en `src/locales/`:
- `es.json` - Español
- `en.json` - English
- `pt.json` - Português
- `ar.json` - العربية (RTL)
- `zh.json` - 中文

Para agregar un idioma:
1. Crea `src/locales/nuevo.json`
2. Agrega el idioma en `src/i18n/config.js`
3. Agrega opción en `LanguageSelector.jsx`

---

## 🗺️ Sistema de Ubicación

- **Publicar:** Mapa Leaflet para seleccionar punto
- **Ver:** Botón que abre Google Maps (Android/Desktop) o Apple Maps (iOS)
- **Privacidad:** Coordenadas exactas NO se muestran públicamente

---

## 🔒 Seguridad

- Row Level Security (RLS) en Supabase
- Autenticación JWT
- Validación de archivos (fotos max 5MB, video max 20MB)
- Rate limiting por usuario
- Datos de usuarios Ghost encriptados

---

## 📄 Licencia

Propietario: **Buses App**
Ricardo Maldonado Moreno
---

## 🤝 Contribuir

Este es un proyecto privado de Buses App.

---

## 📞 Soporte

Para soporte, contacta a: soporte@buses.app

---

**Hecho con 🏴‍☠️ por el equipo de Buses App**
