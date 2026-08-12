import { Link, useLocation } from 'react-router-dom'
import { Plane, User, Shield, Star, Trophy } from 'lucide-react'

const SECTIONS = [
  { key: 'viajes',       icon: Plane, label: 'Mis viajes', path: '/packer/mi-cuenta/viajes' },
  { key: 'personal',     icon: User, label: 'Información personal', path: '/packer/mi-cuenta' },
  { key: 'verificacion', icon: Shield, label: 'Verificación', path: '/packer/mi-cuenta/verificacion' },
  { key: 'resenas',      icon: Star, label: 'Mis reseñas', path: '/packer/mi-cuenta/resenas' },
  { key: 'nivel',        icon: Trophy, label: 'Mi nivel', path: '/packer/mi-cuenta/nivel' },
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
            <Star size={13} className="mc-star-icon" /> {avgRating} <span>({reviewsCount} reseñas)</span>
          </div>
        )}
      </div>

      <nav className="mc-nav">
        {SECTIONS.map(s => (
          <Link key={s.key}
            to={s.path}
            className={`mc-nav-item ${location.pathname === s.path ? 'active' : ''}`}
          >
            <s.icon size={16} />
            <span>{s.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  )
}
