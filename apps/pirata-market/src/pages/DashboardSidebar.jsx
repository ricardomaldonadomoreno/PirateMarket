import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const SECTIONS = [
  { key: 'anuncios',     icon: '📋', label: 'Mis anuncios', path: '/dashboard' },
  { key: 'verificacion', icon: '🏅', label: 'Verificación', path: '/dashboard/verificacion' },
  { key: 'catalogo',     icon: '⭐', label: 'Catálogo Premium', path: '/dashboard/tienda' },
]

const ACCOUNT_TYPES = {
  person:    { label: 'Persona',    icon: '👤' },
  shop:      { label: 'Tienda',     icon: '🏪' },
  wholesale: { label: 'Mayorista',  icon: '📦' },
  admin:     { label: 'Admin',      icon: '🔐' },
}

export default function DashboardSidebar({ user, profile, verificationSelfie }) {
  const { t } = useTranslation()
  const location = useLocation()

  const displayName = profile?.display_name || user?.email?.split('@')[0] || ''
  const userType = profile?.identity || 'person'
  const isPremium = profile?.is_premium && profile?.premium_until && new Date(profile.premium_until) > new Date()
  const isShopOrWholesale = userType === 'shop' || userType === 'wholesale'
  const identityVerified = profile?.identity_verified
  const businessVerified = profile?.business_verified
  const sidebarAvatar = (verificationSelfie && identityVerified) ? verificationSelfie : null
  const userTypeInfo = ACCOUNT_TYPES[userType] || ACCOUNT_TYPES.person

  // Secciones visibles en sidebar
  const visibleSections = SECTIONS.filter(s =>
    s.key !== 'catalogo' || isShopOrWholesale
  )

  return (
    <aside className="db-sidebar">
      <div className="db-sidebar-profile">
        <div className="db-avatar">
          {sidebarAvatar
            ? <img src={sidebarAvatar} alt={displayName} />
            : <div className="db-avatar-placeholder">{displayName?.charAt(0).toUpperCase()}</div>
          }
        </div>
        <div className="db-sidebar-name">{displayName}</div>
        <span className={`user-type-badge user-type-${userType}`}>
          {userTypeInfo.icon} {t(`auth.${userType}`)}
        </span>
        {isPremium && (
          <div className="db-premium-badge">⭐ Premium — hasta {new Date(profile.premium_until).toLocaleDateString()}</div>
        )}
        <Link to="/publicar" className="btn btn-primary db-publish-btn">+ {t('navbar.publish')}</Link>
      </div>

      <nav className="db-nav">
        {visibleSections.map(s => (
          <Link key={s.key}
            to={s.path}
            className={`db-nav-item ${location.pathname === s.path ? 'active' : ''}`}
          >
            <span>{s.icon}</span>
            <span>{s.label}</span>
            {s.key === 'verificacion' && (!identityVerified || (isShopOrWholesale && !businessVerified)) && (
              <span className="db-nav-dot" />
            )}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
