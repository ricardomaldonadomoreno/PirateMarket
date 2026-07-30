import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './AdminLogin.css'

export default function AdminLanding() {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminScope, setAdminScope] = useState('all')
  const navigate = useNavigate()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = () => {
    // Verificar admin logueado en sessionStorage
    const adminId = sessionStorage.getItem('admin_id')
    const adminEmail = sessionStorage.getItem('admin_email')
    const adminName = sessionStorage.getItem('admin_name')
    const scope = sessionStorage.getItem('admin_scope')

    if (!adminId || !adminEmail) {
      // No hay admin logueado, redirigir a login
      navigate('/admin', { replace: true })
      return
    }

    setIsAdmin(true)
    setAdminScope(scope || 'all')

    // Si solo tiene acceso a una plataforma, redirigir directamente
    if (scope === 'pirata') {
      navigate('/admin/pirata', { replace: true })
      return
    }
    if (scope === 'traficante') {
      navigate('/admin/traficante', { replace: true })
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

  // Si es sub-admin con acceso limitado, solo mostrar la plataforma permitida
  if (isAdmin && adminScope !== 'all') {
    return (
      <div className="admin-page">
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '4rem 2rem', textAlign: 'center' }}>
          <img src="/logo-ico.png" alt="Pirata Market" style={{ width: '80px', height: '80px', marginBottom: '1rem' }} />
          <h1 className="serif luxury-gold" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Backoffice</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
            Bienvenido, {sessionStorage.getItem('admin_name') || 'Administrador'}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '3rem' }}>
            Selecciona la plataforma que deseas administrar
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div
              className="admin-landing-card"
              onClick={() => navigate('/admin/pirata')}
              style={{
                background: 'rgba(212,175,55,0.05)',
                border: '1px solid rgba(212,175,55,0.2)',
                borderRadius: 'var(--radius-md)',
                padding: '2.5rem 1.5rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
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
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏴‍☠️</div>
              <h2 className="serif" style={{ color: 'var(--gold)', marginBottom: '0.5rem' }}>Pirata Market</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Usuarios, anuncios, reportes y destacados
              </p>
            </div>

            <div
              className="admin-landing-card"
              onClick={() => navigate('/admin/traficante')}
              style={{
                background: 'rgba(212,175,55,0.05)',
                border: '1px solid rgba(212,175,55,0.2)',
                borderRadius: 'var(--radius-md)',
                padding: '2.5rem 1.5rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
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
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚛</div>
              <h2 className="serif" style={{ color: 'var(--gold)', marginBottom: '0.5rem' }}>Traficante</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Viajes, verificaciones y destacados
              </p>
            </div>
          </div>

          <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <a href="/" style={{ color: 'var(--gold)', textDecoration: 'none', fontSize: '0.9rem' }}>
              ← Volver a Pirata Market
            </a>
          </div>
        </div>
      </div>
    )
  }

  // SuperAdmin (scope='all'): mostrar landing normal
  return (
    <div className="admin-page">
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '4rem 2rem', textAlign: 'center' }}>
        <img src="/logo-ico.png" alt="Pirata Market" style={{ width: '80px', height: '80px', marginBottom: '1rem' }} />
        <h1 className="serif luxury-gold" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Backoffice</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '3rem' }}>Selecciona la plataforma que deseas administrar</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div
            className="admin-landing-card"
            onClick={() => navigate('/admin/pirata')}
            style={{
              background: 'rgba(212,175,55,0.05)',
              border: '1px solid rgba(212,175,55,0.2)',
              borderRadius: 'var(--radius-md)',
              padding: '2.5rem 1.5rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
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
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏴‍☠️</div>
            <h2 className="serif" style={{ color: 'var(--gold)', marginBottom: '0.5rem' }}>Pirata Market</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Usuarios, anuncios, reportes y destacados
            </p>
          </div>

          <div
            className="admin-landing-card"
            onClick={() => navigate('/admin/traficante')}
            style={{
              background: 'rgba(212,175,55,0.05)',
              border: '1px solid rgba(212,175,55,0.2)',
              borderRadius: 'var(--radius-md)',
              padding: '2.5rem 1.5rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
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
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚛</div>
            <h2 className="serif" style={{ color: 'var(--gold)', marginBottom: '0.5rem' }}>Traficante</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Viajes, verificaciones y destacados
            </p>
          </div>
        </div>

        <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <a href="/" style={{ color: 'var(--gold)', textDecoration: 'none', fontSize: '0.9rem' }}>
            ← Volver a Pirata Market
          </a>
        </div>
      </div>
    </div>
  )
}
