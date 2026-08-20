import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import {
  BadgeCheck,
  ClipboardList,
  Package,
  Rocket,
  ShieldCheck,
  Star,
  Store,
  UserRound,
} from 'lucide-react'

const SECTIONS = [
  { key: 'anuncios',     icon: ClipboardList, label: 'Mis anuncios', path: '/dashboard' },
  { key: 'verificacion', icon: BadgeCheck,    label: 'Verificación', path: '/dashboard/verificacion' },
  { key: 'catalogo',     icon: Star,          label: 'Catálogo Premium', path: '/dashboard/tienda' },
  { key: 'destacar',     icon: Rocket,       label: 'Destacar', path: '/dashboard/destacar' },
]

const ACCOUNT_TYPES = {
  person:    { label: 'Persona',    icon: UserRound },
  shop:      { label: 'Tienda',     icon: Store },
  wholesale: { label: 'Mayorista',  icon: Package },
  admin:     { label: 'Admin',      icon: ShieldCheck },
}

export default function DashboardSidebar({ user, profile, verificationSelfie }) {
  const { t } = useTranslation()
  const location = useLocation()
  const [pirata, setPirata] = useState(null)
  const [shop, setShop] = useState(null)

  // Cargar datos de pirata_profiles y shop_profiles directamente
  useEffect(() => {
    if (!user) return
    const load = async () => {
      try {
        const { data: pirataData } = await supabase
          .from('pirata_profiles')
          .select('identity, identity_verified, business_verified')
          .eq('user_id', user.id)
          .single()
        if (pirataData) setPirata(pirataData)

        const { data: shopData } = await supabase
          .from('shop_profiles')
          .select('is_premium, premium_until')
          .eq('user_id', user.id)
          .single()
        if (shopData) setShop(shopData)
      } catch (err) { console.error(err) }
    }
    load()
  }, [user])

  // Datos del perfil básico (users)
  const displayName = profile?.display_name || user?.email?.split('@')[0] || ''

  // Datos de pirata_profiles (independientes)
  const userType = pirata?.identity || 'person'
  const identityVerified = pirata?.identity_verified || false
  const businessVerified = pirata?.business_verified || false
  const isShopOrWholesale = userType === 'shop' || userType === 'wholesale'

  // Premium: viene de shop_profiles (catálogo premium)
  const shopPremium = shop?.is_premium && shop?.premium_until && new Date(shop.premium_until) > new Date()

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
          <userTypeInfo.icon size={14} strokeWidth={2} aria-hidden="true" />
          {t(`auth.${userType}`)}
        </span>
        {shopPremium && (
          <div className="db-premium-badge">
            <Star size={13} strokeWidth={2} aria-hidden="true" />
            Premium — hasta {new Date(shop.premium_until).toLocaleDateString()}
          </div>
        )}
        <Link to="/publicar" className="btn btn-primary db-publish-btn">+ {t('navbar.publish')}</Link>
      </div>

      <nav className="db-nav">
        {visibleSections.map(s => (
          <Link key={s.key}
            to={s.path}
            className={`db-nav-item ${location.pathname === s.path ? 'active' : ''}`}
          >
            <span className="db-nav-icon"><s.icon size={16} strokeWidth={2} aria-hidden="true" /></span>
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
