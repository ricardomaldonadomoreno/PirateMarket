import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import './AdminLogin.css'

// AdminLanding = Hub central del backoffice
// - Sub-admin: solo ve la tarjeta de su app permitida
// - SuperAdmin (scope='all'): ve tarjetas de apps + formulario de sub-admins + lista de sub-admins
//
// Crear sub-admins via Edge Function `create-admin` (slug: rapid-handler)
// Listar/eliminar/activar via Supabase REST directamente en tabla admins

export default function AdminLanding() {
  const [loading, setLoading] = useState(true)
  const [adminScope, setAdminScope] = useState('all')
  const [admins, setAdmins] = useState([])
  const [loadingAdmins, setLoadingAdmins] = useState(true)
  const [form, setForm] = useState({ email: '', password: '', full_name: '', scope: 'both' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
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

    // SuperAdmin: cargar lista de sub-admins
    loadAdmins()
    setLoading(false)
  }

  const loadAdmins = async () => {
    setLoadingAdmins(true)
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('id, email, full_name, scope, active, created_at')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('loadAdmins error:', error)
      } else if (data) {
        // Filtrar superadmin para no mostrarlo en la lista
        setAdmins(data.filter(a => a.scope !== 'all'))
      }
    } catch (err) {
      console.error('loadAdmins error:', err)
    } finally {
      setLoadingAdmins(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!form.email || !form.password) {
      setError('El email y la contraseña son obligatorios.')
      return
    }
    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setSaving(true)
    try {
      const CREATE_ADMIN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rapid-handler`
      const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

      const res = await fetch(CREATE_ADMIN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({
          superadmin_email: sessionStorage.getItem('admin_email'),
          email: form.email,
          password: form.password,
          full_name: form.full_name || form.email.split('@')[0],
          scope: form.scope,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al crear sub-admin')
      }

      setForm({ email: '', password: '', full_name: '', scope: 'both' })
      setSuccess('Sub-admin registrado correctamente: ' + form.email)
      loadAdmins()
    } catch (err) {
      console.error('handleCreate error:', err)
      setError(err.message || 'Error al crear el sub-admin.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id, email) => {
    if (!confirm('¿Eliminar a ' + email + '?')) return
    try {
      const { error } = await supabase.from('admins').delete().eq('id', id)
      if (error) throw new Error(error.message)
      setSuccess('Sub-admin eliminado: ' + email)
      loadAdmins()
    } catch (err) {
      setError('Error al eliminar: ' + err.message)
    }
  }

  const handleToggle = async (id, currentActive) => {
    try {
      const { error } = await supabase
        .from('admins')
        .update({ active: !currentActive })
        .eq('id', id)
      if (error) throw new Error(error.message)
      setSuccess(currentActive ? 'Desactivado' : 'Reactivado')
      loadAdmins()
    } catch (err) {
      setError('Error: ' + err.message)
    }
  }

  const scopeLabel = (scope) => {
    const map = { pirata: 'Pirata', traficante: 'Traficante', both: 'Ambas', all: 'SuperAdmin' }
    return map[scope] || scope
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
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '3rem 2rem' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <img src="/logo-ico.png" alt="Pirata Market" style={{ width: '70px', height: '70px', marginBottom: '1rem' }} />
          <h1 className="serif luxury-gold" style={{ fontSize: '2.2rem', marginBottom: '0.3rem' }}>Backoffice</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Bienvenido, {sessionStorage.getItem('admin_name') || 'Administrador'}
          </p>
        </div>

        {/* Alertas */}
        {error && (
          <div style={{ background: 'rgba(230,57,70,0.1)', border: '1px solid rgba(230,57,70,0.3)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: '1rem', color: 'var(--danger)', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ background: 'rgba(6,214,160,0.1)', border: '1px solid rgba(6,214,160,0.3)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: '1rem', color: 'var(--success)', fontSize: '0.875rem' }}>
            {success}
          </div>
        )}

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

        {/* Sección Sub-Admins — Solo para superadmin */}
        {adminScope === 'all' && (
        <>
        <h3 className="serif" style={{ color: 'var(--gold)', marginBottom: '1rem', fontSize: '1.2rem' }}>Sub-Administradores</h3>

        {/* Formulario crear sub-admin */}
        <div className="admin-card" style={{ marginBottom: '2rem' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Crea una cuenta de sub-administrador con acceso limitado al backoffice.
          </p>
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', maxWidth: '700px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Email</label>
              <input
                type="email"
                className="input"
                placeholder="subadmin@empresa.com"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                required
                disabled={saving}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Contraseña</label>
              <input
                type="password"
                className="input"
                placeholder="Mínimo 6 caracteres"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                minLength={6}
                required
                disabled={saving}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Nombre completo</label>
              <input
                type="text"
                className="input"
                placeholder="Juan Pérez"
                value={form.full_name}
                onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                disabled={saving}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Acceso</label>
              <select className="input" value={form.scope} onChange={e => setForm(p => ({ ...p, scope: e.target.value }))} disabled={saving}>
                <option value="both">Ambas plataformas</option>
                <option value="pirata">Solo Pirata Market</option>
                <option value="traficante">Solo Packer</option>
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: '0.5rem' }}>
                {saving ? 'Registrando...' : 'Crear Sub-Admin'}
              </button>
            </div>
          </form>
        </div>

        {/* Lista de sub-admins */}
        <div className="admin-card">
          <h4 className="serif" style={{ color: 'var(--gold)', marginBottom: '1rem', fontSize: '1rem' }}>
            Sub-Administradores registrados ({admins.length})
          </h4>

          {loadingAdmins ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Cargando...</p>
          ) : admins.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
              No hay sub-administradores registrados.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Email</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Nombre</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Acceso</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Estado</th>
                    <th style={{ textAlign: 'right', padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map(admin => (
                    <tr key={admin.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.75rem 1rem' }}>{admin.email}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{admin.full_name}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span className="badge" style={{ background: 'rgba(212,175,55,0.15)', color: 'var(--gold)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                          {scopeLabel(admin.scope)}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ color: admin.active ? 'var(--success)' : 'var(--danger)', fontSize: '0.8rem' }}>
                          {admin.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => handleToggle(admin.id, admin.active)}
                          className="btn-small"
                          style={{
                            background: admin.active ? 'rgba(230,57,70,0.15)' : 'rgba(6,214,160,0.15)',
                            color: admin.active ? 'var(--danger)' : 'var(--success)',
                            border: 'none',
                            marginRight: '0.5rem',
                            padding: '0.3rem 0.75rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                          }}
                        >
                          {admin.active ? 'Desactivar' : 'Reactivar'}
                        </button>
                        <button
                          onClick={() => handleDelete(admin.id, admin.email)}
                          className="btn-small"
                          style={{
                            background: 'rgba(230,57,70,0.15)',
                            color: 'var(--danger)',
                            border: 'none',
                            padding: '0.3rem 0.75rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                          }}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        </>
        )}

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
