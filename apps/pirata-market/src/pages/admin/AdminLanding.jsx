import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import './AdminLogin.css'
import AdminNavbarGeneral from '../../components/AdminNavbarGeneral'

// AdminLanding = Hub central del backoffice
// - Sub-admin: solo ve la tarjeta de su app permitida
// - SuperAdmin (scope='all'): ve todas las tarjetas

export default function AdminLanding() {
  const [loading, setLoading] = useState(true)
  const [adminScope, setAdminScope] = useState('all')
  const navigate = useNavigate()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = () => {
    const adminId = sessionStorage.getItem('admin_id')
    const adminEmail = sessionStorage.getItem('admin_email')
    const scope = sessionStorage.getItem('admin_scope')

    if (!adminId || !adminEmail) {
      navigate('/admin', { replace: true })
      return
    }

    setAdminScope(scope || 'all')

    // Sub-admin: redirigir directo a su app
    if (scope === 'pirata') {
      navigate('/admin/pirata', { replace: true })
      return
    }
    if (scope === 'traficante') {
      navigate('/admin/packer', { replace: true })
      return
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="admin-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="loading" style={{ width: '40px', height: '40px' }}></div>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <AdminNavbarGeneral />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '3rem 2rem' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <img src="/logo-ico.png" alt="Pirata Market" style={{ width: '70px', height: '70px', marginBottom: '1rem' }} />
          <h1 className="serif luxury-gold" style={{ fontSize: '2.2rem', marginBottom: '0.3rem' }}>Backoffice</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Bienvenido, {sessionStorage.getItem('admin_name') || 'Administrador'}
          </p>
        </div>

        {/* Sección gestión general — Perfiles y Sub-Admins */}
        <h3 className="serif" style={{ color: 'var(--gold)', marginBottom: '1rem', fontSize: '1.2rem' }}>Gestión</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '3rem' }}>
          {/* Perfiles */}
          <div
            onClick={() => navigate('/admin/perfiles')}
            style={{
              background: 'rgba(212,175,55,0.05)',
              border: '1px solid rgba(212,175,55,0.2)',
              borderRadius: 'var(--radius-md)',
              padding: '1.5rem 1.25rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'center',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(212,175,55,0.1)'
              e.currentTarget.style.borderColor = 'rgba(212,175,55,0.5)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(212,175,55,0.05)'
              e.currentTarget.style.borderColor = 'rgba(212,175,55,0.2)'
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👤</div>
            <h2 className="serif" style={{ color: 'var(--gold)', marginBottom: '0.3rem', fontSize: '1.2rem' }}>Perfiles</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Administrar usuarios registrados y solicitudes de eliminación
            </p>
          </div>

          {/* Sub-Admins — Solo super_admin */}
          {adminScope === 'all' && (
          <div
            onClick={() => navigate('/admin/sub-admins')}
            style={{
              background: 'rgba(212,175,55,0.05)',
              border: '1px solid rgba(212,175,55,0.2)',
              borderRadius: 'var(--radius-md)',
              padding: '1.5rem 1.25rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'center',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(212,175,55,0.1)'
              e.currentTarget.style.borderColor = 'rgba(212,175,55,0.5)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(212,175,55,0.05)'
              e.currentTarget.style.borderColor = 'rgba(212,175,55,0.2)'
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔐</div>
            <h2 className="serif" style={{ color: 'var(--gold)', marginBottom: '0.3rem', fontSize: '1.2rem' }}>Sub-Admins</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Crear y administrar cuentas de sub-administradores
            </p>
          </div>
          )}
        </div>

        {/* Tarjetas de acceso a apps */}
        <h3 className="serif" style={{ color: 'var(--gold)', marginBottom: '1rem', fontSize: '1.2rem' }}>Plataformas</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '3rem' }}>
          {/* Pirata Market */}
          <div
            onClick={() => navigate('/admin/pirata')}
            style={{
              background: 'rgba(212,175,55,0.05)',
              border: '1px solid rgba(212,175,55,0.2)',
              borderRadius: 'var(--radius-md)',
              padding: '2rem 1.5rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'center',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(212,175,55,0.1)'
              e.currentTarget.style.borderColor = 'rgba(212,175,55,0.5)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(212,175,55,0.05)'
              e.currentTarget.style.borderColor = 'rgba(212,175,55,0.2)'
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🏴‍☠️</div>
            <h2 className="serif" style={{ color: 'var(--gold)', marginBottom: '0.5rem', fontSize: '1.4rem' }}>Pirata Market</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Usuarios, anuncios, reportes y destacados
            </p>
          </div>

          {/* Packer */}
          <div
            onClick={() => navigate('/admin/packer')}
            style={{
              background: 'rgba(212,175,55,0.05)',
              border: '1px solid rgba(212,175,55,0.2)',
              borderRadius: 'var(--radius-md)',
              padding: '2rem 1.5rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'center',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(212,175,55,0.1)'
              e.currentTarget.style.borderColor = 'rgba(212,175,55,0.5)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(212,175,55,0.05)'
              e.currentTarget.style.borderColor = 'rgba(212,175,55,0.2)'
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🚛</div>
            <h2 className="serif" style={{ color: 'var(--gold)', marginBottom: '0.5rem', fontSize: '1.4rem' }}>Packer</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Viajes, verificaciones y destacados
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <Link to="/" style={{ color: 'var(--gold)', textDecoration: 'none', fontSize: '0.85rem' }}>
            ← Volver a Pirata Market
          </Link>
        </div>
      </div>
    </div>
  )
}
