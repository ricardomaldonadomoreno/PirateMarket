import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './AdminNavbar.css'

export default function AdminNavbarTraficante() {
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/admin')
  }

  const links = [
    { path: '/admin/traficante', icon: 'DB', label: 'Dashboard' },
    { path: '/admin/traficante/viajes', icon: 'Vi', label: 'Viajes' },
    { path: '/admin/traficante/verificaciones', icon: 'Vr', label: 'Verificaciones' },
    { path: '/admin/traficante/destacados', icon: 'Ds', label: 'Destacados' },
    { path: '/admin/sub-admins', icon: 'SA', label: 'Sub-Admins' },
  ]

  return (
    <nav className="admin-navbar">
      <div className="admin-navbar-brand">
        <img src="/logo-ico.png" alt="Traficante" className="admin-nav-logo" />
        <div>
          <span className="admin-nav-title serif">traficante</span>
          <span className="admin-nav-sub">backoffice</span>
        </div>
      </div>

      <div className="admin-navbar-links">
        {links.map(link => (
          <Link
            key={link.path}
            to={link.path}
            className={`admin-nav-link ${location.pathname === link.path ? 'active' : ''}`}
          >
            {link.icon} {link.label}
          </Link>
        ))}
      </div>

      <div className="admin-navbar-actions">
        <Link to="/admin" className="admin-nav-link">
          Cambiar app
        </Link>
        <Link to="/traficante" className="admin-nav-link" target="_blank">
          Ver traficante
        </Link>
        <button onClick={handleLogout} className="btn btn-ghost admin-logout">
          Salir
        </button>
      </div>
    </nav>
  )
}
