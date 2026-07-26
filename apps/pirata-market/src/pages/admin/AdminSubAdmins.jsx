import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import './AdminUsuarios.css'

// SubAdmins: solo crea colaboradores en la tabla colaborador.
// No usa Supabase Auth. No FK a users. No triggers. No email verification.
// Solo: email + contraseña → se hashea en la función SQL → se guarda en colaborador.

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
  const navigate = useNavigate()

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
      // Llamar a la función SQL que hashea la contraseña y crea el colaborador
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

      // Limpiar formulario y mostrar exito
      setForm({ email: '', password: '', full_name: '', app_access: 'both', notes: '' })
      setSuccess('Colaborador registrado correctamente: ' + form.email)
    } catch (err) {
      console.error('handleCreate error:', err)
      setError(err.message || 'Error al crear el colaborador.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-content">
        <div className="admin-page-header">
          <h1 className="serif luxury-gold">Sub-Administradores</h1>
          <p className="admin-page-sub">Crear cuentas de colaboradores con acceso al backoffice</p>
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
        <div className="admin-card">
          <h3 className="serif" style={{ color: 'var(--gold)', marginBottom: '0.25rem' }}>Crear Nuevo Colaborador</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Completa los datos para crear una cuenta de colaborador con acceso al backoffice. El usuario podra iniciar sesion inmediatamente.
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

            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ marginTop: '0.5rem' }}
            >
              {saving ? 'Registrando...' : 'Registrar Colaborador'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
