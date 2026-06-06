import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../../pirata-market/src/lib/supabase'
import LanguageSelector from '../../../pirata-market/src/components/LanguageSelector'
import './Navbar.css'

export default function TraficanteNavbar({ user }) {
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
          <span className="traficante-logo-icon">🚐</span>
          <div className="logo-text">
            <span className="logo-brand traficante-gold">Traficante App</span>
            <span className="logo-suffix traficante-by">by Buses</span>
          </div>
        </Link>

        <div className="navbar-actions">
          <LanguageSelector />

          <Link to="/traficante/publicar-viaje" className="btn btn-outline traficante-btn-outline">
            {t('navbar.travel')}
          </Link>

          <Link to="/traficante/buscar" className="btn btn-primary">
            {t('navbar.send')}
          </Link>

          {user ? (
            <>
              <Link to="/traficante/dashboard" className="btn-icon">👤</Link>
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
