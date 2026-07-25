import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import './AdminLogin.css'

export default function AdminLanding() {
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    // Verificar en admin_roles (fuente de verdad segura)
    const { data: roleData } = await supabase
      .from('admin_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleData) {
      setLoading(false)
      return
    }

    // Fallback: verificar user_type = 'admin'
    const { data } = await supabase
      .from('users')
      .select('user_type')
      .eq('id', user.id)
      .single()

    if (data?.user_type === 'admin') {
      setLoading(false)
    } else {
      navigate('/', { replace: true })
    }
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
            <div style={{ fontSize: '1.5rem', marginBottom: '1rem', fontWeight: 700, color: 'var(--gold)', fontFamily: 'Inter, sans-serif' }}>PM</div>
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
            <div style={{ fontSize: '1.5rem', marginBottom: '1rem', fontWeight: 700, color: 'var(--gold)', fontFamily: 'Inter, sans-serif' }}>TR</div>
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
