import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import './AdminUsuarios.css'

export default function AdminSubAdmins() {
  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    app_access: 'both',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [colaboradores, setColaboradores] = useState([])
  const [loadingColabs, setLoadingColabs] = useState(true)
  const navigate = useNavigate()

  // Cargar lista de colaboradores al montar
  useEffect(() => {
    loadColaboradores()
  }, [])

  const loadColaboradores = async () => {
    setLoadingColabs(true)
    try {
      // Intentar con la función RPC primero
      const { data, error: rpcError } = await supabase
        .from('colaboradores')
        .select('id, email, full_name, app_access, notes, is_active, created_at')
        .order('created_at', { ascending: false })

      if (rpcError) {
        console.error('loadColaboradores error:', rpcError)
      } else if (data) {
        setColaboradores(data)
      }
    } catch (err) {
      console.error('loadColaboradores error:', err)
    } finally {
      setLoadingColabs(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!form.email || !form.password) {
      setError('El email y la contrasena son obligatorios.')
      return
    }
    if (form.password.length < 6) {
      setError('La contrasena debe tener al menos 6 caracteres.')
      return
    }

    setSaving(true)
    try {
      const { data, error: rpcError } = await supabase.rpc('create_colaborador', {
        p_email: form.email,
        p_password: form.password,
        p_full_name: form.full_name || form.email.split('@')[0],
        p_app_access: form.app_access,
        p_notes: form.notes || null,
      })

      if (rpcError) {
        console.error('create_colaborador error:', rpcError)
        throw new Error('Error al crear colaborador: ' + rpcError.message)
      }

      setForm({ email: '', password: '', full_name: '', app_access: 'both', notes: '' })
      setSuccess('Colaborador registrado correctamente: ' + form.email)
      loadColaboradores() // Recargar lista
    } catch (err) {
      console.error('handleCreate error:', err)
      setError(err.message || 'Error al crear el colaborador.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id, email) => {
    if (!confirm('Estas seguro de eliminar a ' + email + '?')) return
    try {
      const { error } = await supabase
        .from('colaboradores')
        .delete()
        .eq('id', id)

      if (error) {
        throw new Error('Error al eliminar: ' + error.message)
      }
      setSuccess('Colaborador eliminado: ' + email)
      loadColaboradores()
    } catch (err) {
      console.error('handleDelete error:', err)
      setError(err.message || 'Error al eliminar el colaborador.')
    }
  }

  const handleToggle = async (id, currentActive) => {
    try {
      const { error } = await supabase
        .from('colaboradores')
        .update({ is_active: !currentActive })
        .eq('id', id)

      if (error) throw new Error('Error: ' + error.message)
      setSuccess(currentActive ? 'Colaborador desactivado' : 'Colaborador reactivado')
      loadColaboradores()
    } catch (err) {
      setError(err.message || 'Error al cambiar estado.')
    }
  }

  const appLabel = (app) => {
    if (app === 'pirata') return 'Pirata Market'
    if (app === 'traficante') return 'Traficante'
    return 'Ambas'
  }

  return (
    <div className="admin-page">
      <div className="admin-content">
        <div className="admin-page-header">
          <h1 className="serif luxury-gold">Sub-Administradores</h1>
          <p className="admin-page-sub">Crear y gestionar cuentas de colaboradores con acceso al backoffice</p>
          <button onClick={() => navigate(-1)} className="btn-small btn-ghost" style={{ marginLeft: '1rem' }}>
            &larr; Volver
          </button>
        </div>

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

        {/* Formulario de crear colaborador */}
        <div className="admin-card" style={{ marginBottom: '2rem' }}>
          <h3 className="serif" style={{ color: 'var(--gold)', marginBottom: '0.25rem' }}>Crear Nuevo Colaborador</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Completa los datos para crear una cuenta de colaborador con acceso al backoffice.
          </p>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Email</label>
              <input
                type="email"
                className="input"
                placeholder="colaborador@empresa.com"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                required
                disabled={saving}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Contraseña</label>
              <input
                type="password"
                className="input"
                placeholder="Minimo 6 caracteres"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                minLength={6}
                required
                disabled={saving}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Nombre completo</label>
              <input
                type="text"
                className="input"
                placeholder="Juan Perez"
                value={form.full_name}
                onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                disabled={saving}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Plataforma</label>
              <select className="input" value={form.app_access} onChange={e => setForm(p => ({ ...p, app_access: e.target.value }))} disabled={saving}>
                <option value="both">Ambas plataformas</option>
                <option value="pirata">Solo Pirata Market</option>
                <option value="traficante">Solo Traficante</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Notas (opcional)</label>
              <input
                type="text"
                className="input"
                placeholder="Departamento, referencia..."
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                disabled={saving}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: '0.5rem' }}>
              {saving ? 'Registrando...' : 'Registrar Colaborador'}
            </button>
          </form>
        </div>

        {/* Lista de colaboradores registrados */}
        <div className="admin-card">
          <h3 className="serif" style={{ color: 'var(--gold)', marginBottom: '1rem' }}>
            Colaboradores Registrados ({colaboradores.length})
          </h3>

          {loadingColabs ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Cargando...</p>
          ) : colaboradores.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
              No hay colaboradores registrados.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Email</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Nombre</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Plataforma</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Estado</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Notas</th>
                    <th style={{ textAlign: 'right', padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {colaboradores.map(colab => (
                    <tr key={colab.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.75rem 1rem' }}>{colab.email}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{colab.full_name}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span className="badge" style={{ background: 'rgba(212,175,55,0.15)', color: 'var(--gold)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                          {appLabel(colab.app_access)}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ color: colab.is_active ? 'var(--success)' : 'var(--danger)', fontSize: '0.8rem' }}>
                          {colab.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {colab.notes || '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => handleToggle(colab.id, colab.is_active)}
                          className="btn-small"
                          style={{
                            background: colab.is_active ? 'rgba(230,57,70,0.15)' : 'rgba(6,214,160,0.15)',
                            color: colab.is_active ? 'var(--danger)' : 'var(--success)',
                            border: 'none',
                            marginRight: '0.5rem',
                            padding: '0.3rem 0.75rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                          }}
                        >
                          {colab.is_active ? 'Desactivar' : 'Reactivar'}
                        </button>
                        <button
                          onClick={() => handleDelete(colab.id, colab.email)}
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
      </div>
    </div>
  )
}
