import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import './AdminNavbar.css'

export default function AdminNavbarPacker() {
  const location = useLocation()
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminScope, setAdminScope] = useState('all')

  useEffect(() => {
    // Determinar tipo de acceso por sessionStorage (tabla admins)
    const adminId = sessionStorage.getItem('admin_id')
    const scope = sessionStorage.getItem('admin_scope')

    if (adminId) {
      setIsAdmin(true)
      setAdminScope(scope || 'all')
    }
  }, [])

  const handleLogout = () => {
    sessionStorage.removeItem('admin_id')
    sessionStorage.removeItem('admin_email')
    sessionStorage.removeItem('admin_name')
    sessionStorage.removeItem('admin_scope')
    navigate('/admin')
  }

  // Links base para Packer
  const packerLinks = [
    { path: '/admin/packer', icon: '📊', label: 'Dashboard' },
    { path: '/admin/packer/viajes', icon: '🚛', label: 'Viajes' },
    { path: '/admin/packer/verificaciones', icon: '✅', label: 'Verificaciones' },
    { path: '/admin/packer/destacados', icon: '⭐', label: 'Destacados' },
  ]

  // Sub-Admins solo para super_admin (scope='all')
  const subAdminLinks = adminScope === 'all'
    ? [{ path: '/admin/sub-admins', icon: '🔐', label: 'Sub-Admins' }]
    : []

  // Si el sub-admin solo tiene acceso a pirata, redirigir
  if (isAdmin && adminScope === 'pirata') {
    navigate('/admin/pirata', { replace: true })
    return null
  }

  const links = [...packerLinks, ...subAdminLinks]

  return (
    <nav className="admin-navbar">
      <div className="admin-navbar-brand">
        <img src="/logo-ico.png" alt="Packer" className="admin-nav-logo" />
        <div>
          <span className="admin-nav-title serif">packer</span>
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
        {adminScope === 'all' && (
          <Link to="/admin" className="admin-nav-link">
            🔄 Cambiar app
          </Link>
        )}
        <Link to="/packer" className="admin-nav-link" target="_blank">
          🌐 Ver packer
        </Link>
        <button onClick={handleLogout} className="btn btn-ghost admin-logout">
          Salir
        </button>
      </div>
    </nav>
  )
}
