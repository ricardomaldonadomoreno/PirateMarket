import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import LanguageSelector from './LanguageSelector'
import './Navbar.css'

export default function Navbar({ user, profile }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  // Cerrar al click fuera
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
    navigate('/')
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <img src="/logo-ico.png" alt="Pirata Market" className="logo-icon" />
          <div className="logo-text">
            <span className="logo-brand luxury-gold">pirata</span>
            <span className="logo-suffix">market</span>
          </div>
        </Link>

        <div className="navbar-actions">
          <LanguageSelector />

          <Link to="/publicar" className="btn btn-primary">
            {t('navbar.publish')}
          </Link>

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
                  {/* Info del usuario */}
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
