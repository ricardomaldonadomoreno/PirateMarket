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
Ricardo Maldonado Moreno
---

## 📞 Soporte

Para soporte, contacta a: soporte@buses.app

---

**🏴‍☠️ por Ricardo Maldonado Moreno - Buses**
