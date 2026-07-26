import { useState } from 'react'
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
      // 1. Crear cuenta en Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      })
      if (signUpError) throw signUpError
      if (!signUpData.user) {
        throw new Error('No se pudo crear la cuenta en Supabase.')
      }

      const userId = signUpData.user.id
      const displayName = form.full_name || form.email.split('@')[0]

      // 2. Upsert en tabla users con user_type='collaborator'
      //    onConflict en id para manejar si ya existe
      const { data: upsertData, error: upsertError } = await supabase
        .from('users')
        .upsert([{
          id: userId,
          email: form.email,
          display_name: displayName,
          user_type: 'collaborator',
          whatsapp: '0000',
        }], { onConflict: 'id' })
        .select()

      if (upsertError) {
        console.error('upsert users error:', upsertError)
        throw new Error('Error al registrar usuario: ' + upsertError.message)
      }
      console.log('users upsert result:', upsertData)

      // 3. Insertar en sub_admins
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      const { error: subError } = await supabase
        .from('sub_admins')
        .insert([{
          user_id: userId,
          created_by: currentUser.id,
          full_name: form.full_name || null,
          app_access: form.app_access,
          notes: form.notes || null,
          is_active: true,
        }])

      if (subError) {
        console.error('sub_admins error:', subError)
        throw new Error('Error al registrar sub-admin: ' + subError.message)
      }

      // 4. Limpiar formulario y mostrar exito
      setForm({ email: '', password: '', full_name: '', app_access: 'both', notes: '' })
      setSuccess('Sub-admin registrado correctamente: ' + form.email)
    } catch (err) {
      console.error('handleCreate error:', err)
      setError(err.message || 'Error al crear el sub-admin.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-content">
        <div className="admin-page-header">
          <h1 className="serif luxury-gold">Sub-Administradores</h1>
          <p className="admin-page-sub">Crear cuentas administrativas corporativas</p>
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

        {/* Formulario de crear sub-admin */}
        <div className="admin-card">
          <h3 className="serif" style={{ color: 'var(--gold)', marginBottom: '0.25rem' }}>Crear Nuevo Sub-Admin</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Completa los datos para crear una cuenta administrativa con acceso al backoffice.
          </p>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Email</label>
              <input
                type="email"
                className="input"
                placeholder="admin@empresa.com"
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
              {saving ? 'Registrando...' : 'Registrar Sub-Admin'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
