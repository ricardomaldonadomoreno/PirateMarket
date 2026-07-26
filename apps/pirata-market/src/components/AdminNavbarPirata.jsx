import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './AdminNavbar.css'

export default function AdminNavbarPirata() {
  const location = useLocation()
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState(false)
  const [colabApp, setColabApp] = useState('both')

  useEffect(() => {
    // Determinar tipo de acceso
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('user_type')
          .eq('id', user.id)
          .maybeSingle()
        if (data?.user_type === 'admin') {
          setIsAdmin(true)
          return
        }
      }
      // Si no es admin principal, verificar si es colaborador
      const colab = sessionStorage.getItem('colaborador_app')
      if (colab) {
        setColabApp(colab)
      }
    }
    check()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    sessionStorage.removeItem('colaborador_id')
    sessionStorage.removeItem('colaborador_email')
    sessionStorage.removeItem('colaborador_name')
    sessionStorage.removeItem('colaborador_app')
    navigate('/admin')
  }

  // Links base para Pirata Market
  const pirataLinks = [
    { path: '/admin/pirata', icon: '📊', label: 'Dashboard' },
    { path: '/admin/pirata/usuarios', icon: '👥', label: 'Usuarios' },
    { path: '/admin/pirata/anuncios', icon: '📋', label: 'Anuncios' },
    { path: '/admin/pirata/reportes', icon: '🚨', label: 'Reportes' },
  ]

  // Sub-Admins solo para super_admin
  const subAdminLinks = isAdmin
    ? [{ path: '/admin/sub-admins', icon: '🔐', label: 'Sub-Admins' }]
    : []

  // Si el colaborador solo tiene acceso a traficante, no mostrar este navbar
  if (!isAdmin && colabApp === 'traficante') {
    navigate('/admin/traficante', { replace: true })
    return null
  }

  const links = [...pirataLinks, ...subAdminLinks]

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
        {isAdmin && (
          <Link to="/admin" className="admin-nav-link">
            🔄 Cambiar app
          </Link>
        )}
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
