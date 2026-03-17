import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import LanguageSelector from './LanguageSelector'
import './Navbar.css'

export default function Navbar({ user }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <img src="/logo - ico.png" alt="Pirata Market" className="logo-icon" />
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
            <>
              <Link to="/dashboard" className="btn-icon">
                👤
              </Link>
              <button onClick={handleLogout} className="btn btn-ghost">
                {t('navbar.logout')}
              </button>
            </>
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
