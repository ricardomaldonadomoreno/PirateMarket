import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './AdminNavbar.css'

export default function AdminNavbarPirata() {
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/admin')
  }

  const links = [
    { path: '/admin/pirata', icon: '📊', label: 'Dashboard' },
    { path: '/admin/pirata/usuarios', icon: '👥', label: 'Usuarios' },
    { path: '/admin/pirata/anuncios', icon: '📋', label: 'Anuncios' },
    { path: '/admin/pirata/reportes', icon: '🚨', label: 'Reportes' },
    { path: '/admin/sub-admins', icon: '🔐', label: 'Sub-Admins' },
  ]

  return (
    <nav className="admin-navbar">
      <div className="admin-navbar-brand">
        <img src="/logo-ico.png" alt="Pirata Market" className="admin-nav-logo" />
        <div>
          <span className="admin-nav-title serif">pirata</span>
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
          🔄 Cambiar app
        </Link>
        <Link to="/" className="admin-nav-link" target="_blank">
          🌐 Ver tienda
        </Link>
        <button onClick={handleLogout} className="btn btn-ghost admin-logout">
          Salir
        </button>
      </div>
    </nav>
  )
}
