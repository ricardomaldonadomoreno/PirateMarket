import { Link, useLocation } from 'react-router-dom'

const SECTIONS = [
  { key: 'viajes',       icon: '🚐', label: 'Mis viajes', path: '/traficante/mi-cuenta/viajes' },
  { key: 'personal',     icon: '👤', label: 'Información personal', path: '/traficante/mi-cuenta' },
  { key: 'verificacion', icon: '🔒', label: 'Verificación', path: '/traficante/mi-cuenta/verificacion' },
  { key: 'resenas',      icon: '⭐', label: 'Mis reseñas', path: '/traficante/mi-cuenta/resenas' },
  { key: 'nivel',        icon: '🏆', label: 'Mi nivel', path: '/traficante/mi-cuenta/nivel' },
]

export default function MiCuentaSidebar({ user, profile, verifRequest, avgRating, reviewsCount }) {
  const location = useLocation()

  const displayName = profile?.display_name || user?.email?.split('@')[0] || ''
  const sidebarAvatar = verifRequest?.selfie_url || null

  return (
    <aside className="mc-sidebar">
      <div className="mc-sidebar-profile">
        <div className="mc-avatar-wrap">
          {sidebarAvatar
            ? <img src={sidebarAvatar} alt="verificación" className="mc-avatar" />
            : <div className="mc-avatar-placeholder">
                {displayName?.charAt(0).toUpperCase()}
              </div>
          }
        </div>
        <div className="mc-sidebar-name">{displayName}</div>
        <div className="mc-sidebar-email">{user?.email}</div>
        {avgRating && (
          <div className="mc-sidebar-rating">
            ⭐ {avgRating} <span>({reviewsCount} reseñas)</span>
          </div>
        )}
      </div>

      <nav className="mc-nav">
        {SECTIONS.map(s => (
          <Link key={s.key}
            to={s.path}
            className={`mc-nav-item ${location.pathname === s.path ? 'active' : ''}`}
          >
            <span>{s.icon}</span>
            <span>{s.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  )
}
