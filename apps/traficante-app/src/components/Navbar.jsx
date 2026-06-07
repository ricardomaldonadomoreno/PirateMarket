import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../../pirata-market/src/lib/supabase'
import LanguageSelector from '../../../pirata-market/src/components/LanguageSelector'
import './Navbar.css'

export default function TraficanteNavbar({ user, profile }) {
  const { t } = useTranslation('traficante')
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/traficante')
  }

  return (
    <nav className="navbar traficante-navbar">
      <div className="navbar-container">
        <Link to="/traficante" className="navbar-logo">
          <img src="/traficante/logoPNG.png" alt="Traficante" className="logo-icon" />
          <div className="logo-text">
            <span className="logo-brand traficante-gold">traficante</span>
            <span className="logo-suffix traficante-by">by buses app</span>
          </div>
        </Link>

        <div className="navbar-actions">
          <LanguageSelector />

          <Link to="/traficante/publicar-viaje" className="btn btn-outline traficante-btn-outline">
            {t('navbar.travel')}
          </Link>

          <Link to="/traficante/buscar" className="btn btn-primary t-btn-primary">
            {t('navbar.send')}
          </Link>

          {user ? (
            <>
              <Link to="/traficante/dashboard" className="navbar-avatar-btn">
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="perfil" className="navbar-avatar-img" />
                  : <div className="navbar-avatar-placeholder">
                      {(profile?.display_name || user.email)?.charAt(0).toUpperCase()}
                    </div>
                }
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
