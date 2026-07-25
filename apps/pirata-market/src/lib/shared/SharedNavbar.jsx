import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabase'
import LanguageSelector from '../../components/LanguageSelector'
import '../../components/Navbar.css'

/*
  ponytail: un solo Navbar para ambas apps.
  Props que cambian entre Pirata y Traficante:
    brandName, brandLogo, homeRoute, logoutRoute, i18nNamespace,
    primaryCta { to, labelKey, className },
    secondaryCta { to, labelKey, className },
    navClass — clase extra para overrides de tema (ej: "traficante-navbar")
  El resto (avatar, dropdown, idioma, login) es idéntico.
*/

export default function SharedNavbar({
  user,
  profile,
  brandName,
  brandLogo,
  homeRoute,
  logoutRoute,
  i18nNamespace,
  navClass = '',
  primaryCta,
  secondaryCta,
}) {
  const { t } = useTranslation(i18nNamespace)
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    setMenuOpen(false)
    await supabase.auth.signOut()
    navigate(logoutRoute || '/')
  }

  return (
    <nav className={`navbar${navClass ? ' ' + navClass : ''}`}>
      <div className="navbar-container">
        <Link to={homeRoute} className="navbar-logo">
          <img src={brandLogo} alt={brandName} className="logo-icon" />
          <div className="logo-text">
            <span className="logo-brand">{brandName}</span>
          </div>
        </Link>

        <div className="navbar-actions">
          <LanguageSelector />

          {primaryCta && (
            <Link to={primaryCta.to} className={`btn ${primaryCta.className || 'btn-primary'}`}>
              {t(primaryCta.labelKey)}
            </Link>
          )}

          {secondaryCta && (
            <Link to={secondaryCta.to} className={`btn ${secondaryCta.className || 'btn-primary'}`}>
              {t(secondaryCta.labelKey)}
            </Link>
          )}

          {user ? (
            <div className="navbar-user-menu" ref={menuRef}>
              <button
                className="navbar-avatar-btn"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="perfil" className="navbar-avatar-img" />
                  : <div className="navbar-avatar-placeholder">
                      {(profile?.display_name || user.email)?.charAt(0).toUpperCase()}
                    </div>
                }
              </button>

              {menuOpen && (
                <div className="navbar-dropdown">
                  <div className="navbar-dropdown-user">
                    <div className="navbar-dropdown-name">
                      {profile?.display_name || user.email?.split('@')[0]}
                    </div>
                    <div className="navbar-dropdown-email">{user.email}</div>
                  </div>

                  <div className="navbar-dropdown-divider" />

                  <Link to="/mi-perfil" className="navbar-dropdown-item"
                    onClick={() => setMenuOpen(false)}>
                    <span>⚙️</span>
                    <span>Perfil y Ayuda</span>
                  </Link>

                  <div className="navbar-dropdown-divider" />

                  <Link to="/dashboard" className="navbar-dropdown-item navbar-dropdown-item-active"
                    onClick={() => setMenuOpen(false)}>
                    <span>🏴‍☠️</span>
                    <span>Panel Pirata</span>
                  </Link>

                  <Link to="/traficante/mi-cuenta" className="navbar-dropdown-item"
                    onClick={() => setMenuOpen(false)}>
                    <span>🚐</span>
                    <span>Panel Traficante</span>
                  </Link>

                  <div className="navbar-dropdown-divider" />

                  <button className="navbar-dropdown-item navbar-dropdown-logout"
                    onClick={handleLogout}>
                    <span>🚪</span>
                    <span>{t('navbar.logout')}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/auth" className="btn btn-secondary">
              {t('navbar.login')}
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
