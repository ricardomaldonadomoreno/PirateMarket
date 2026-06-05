import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './AdminNavbar.css'

export default function AdminNavbar() {
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/admin')
  }

  const links = [
    { path: '/admin/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/admin/usuarios', icon: '👥', label: 'Usuarios' },
    { path: '/admin/anuncios', icon: '📋', label: 'Anuncios' },
    { path: '/admin/reportes', icon: '🚨', label: 'Reportes' },
  ]

  return (
    <nav className="admin-navbar">
      <div className="admin-navbar-brand">
        <img src="/logo - ico.png" alt="Pirata Market" className="admin-nav-logo" />
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
