import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import './AdminUsuarios.css'

const roleColors = {
  super_admin: 'gold',
  admin: 'success',
  moderator: 'warning',
}

const appLabels = {
  pirata: 'Pirata Market',
  traficante: 'Traficante',
  both: 'Ambas',
}

export default function AdminSubAdmins() {
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  // Formulario: crear nuevo admin corporativo
  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'admin',
    app: 'pirata',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      // Verificar si el usuario actual es super_admin
      const { data: roleData } = await supabase
        .from('admin_roles')
        .select('role')
        .eq('user_id', user.id)
        .single()
      setIsSuperAdmin(roleData?.role === 'super_admin')

      // Cargar todos los admins registrados
      const { data: adminList } = await supabase
        .from('admin_roles')
        .select('*, users:users(display_name, email)')
        .order('created_at', { ascending: false })
      if (adminList) setAdmins(adminList)
    } catch (err) {
      console.error('Error loading:', err)
    } finally {
      setLoading(false)
    }
  }

  // Crear nuevo admin corporativo (email + contraseña)
  const handleCreateAdmin = async (e) => {
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
      // 1. Verificar que no existe ya un admin con ese email
      const { data: existingRole } = await supabase
        .from('admin_roles')
        .select('id, users:users(email)')
        .eq('users.email', form.email)
        .single()
      if (existingRole) {
        setError('Ya existe un admin con ese correo.')
        setSaving(false)
        return
      }

      // 2. Crear nuevo usuario en Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      })
      if (signUpError) throw signUpError
      if (!signUpData.user) {
        setError('No se pudo crear la cuenta. Verifica el correo y la contraseña.')
        setSaving(false)
        return
      }

      const adminId = signUpData.user.id

      // 3. Insertar en tabla users (con user_type admin)
      const { error: userError } = await supabase.from('users').insert([{
        id: adminId,
        email: form.email,
        display_name: form.full_name || form.email.split('@')[0],
        user_type: 'admin',
        created_at: new Date().toISOString(),
      }])
      // Si ya existe en users (por trigger de auth), ignorar error de duplicado
      if (userError && !userError.message?.includes('duplicate') && !userError.message?.includes('Already')) {
        throw userError
      }

      // 4. Actualizar nombre si se proporcionó
      if (form.full_name) {
        await supabase.from('users').update({ display_name: form.full_name }).eq('id', adminId)
      }

      // 5. Asignar rol en admin_roles
      const { error: roleError } = await supabase.from('admin_roles').insert([{
        user_id: adminId,
        role: form.role,
        app: form.app,
        notes: form.notes || null,
      }])
      if (roleError) throw roleError

      setSuccess(`Admin creado correctamente: ${form.email}`)
      setForm({ email: '', password: '', full_name: '', role: 'admin', app: 'pirata', notes: '' })
      await loadAll()
    } catch (err) {
      setError(err.message || 'Error al crear el admin.')
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (id) => {
    if (!confirm('Eliminar este sub-admin?')) return
    await supabase.from('admin_roles').delete().eq('id', id)
    await loadAll()
  }

  const handleChangeRole = async (id, newRole) => {
    await supabase.from('admin_roles').update({ role: newRole }).eq('id', id)
    await loadAll()
  }

  return (
    <div className="admin-page">
      <div className="admin-content">
        <div className="admin-page-header">
          <h1 className="serif luxury-gold">Sub-Administradores</h1>
          <p className="admin-page-sub">Crear y gestionar cuentas administrativas corporativas</p>
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

        {isSuperAdmin && (
          <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
            <h3 className="serif" style={{ color: 'var(--gold)', marginBottom: '1rem' }}>Crear Nuevo Admin</h3>
            <form onSubmit={handleCreateAdmin} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Email</label>
                <input
                  type="email"
                  className="input"
                  placeholder="admin@empresa.com"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  required
                />
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Contraseña</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Mínimo 6 caracteres"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  minLength={6}
                  required
                />
              </div>
              <div style={{ flex: 1, minWidth: '180px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Nombre completo</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Juan Pérez"
                  value={form.full_name}
                  onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                />
              </div>
              <div style={{ minWidth: '140px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Rol</label>
                <select className="input" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                  <option value="admin">Admin</option>
                  <option value="moderator">Moderador</option>
                </select>
              </div>
              <div style={{ minWidth: '140px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>App</label>
                <select className="input" value={form.app} onChange={e => setForm(p => ({ ...p, app: e.target.value }))}>
                  <option value="pirata">Pirata Market</option>
                  <option value="traficante">Traficante</option>
                  <option value="both">Ambas</option>
                </select>
              </div>
              <div style={{ flex: 1, minWidth: '180px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Notas</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Departamento, referencia..."
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving || !form.email || !form.password}>
                {saving ? 'Creando...' : '+ Crear Admin'}
              </button>
            </form>
          </div>
        )}

        <div className="admin-card">
          {loading ? (
            <div className="admin-loading">Cargando...</div>
          ) : admins.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No hay administradores registrados aún.
            </div>
          ) : (
            <div className="admin-table">
              <div className="admin-listings-header">
                <span>Admin</span>
                <span>Rol</span>
                <span>App</span>
                <span>Notas</span>
                <span>Acciones</span>
              </div>
              {admins.map(r => (
                <div key={r.id} className="admin-listing-row">
                  <div className="admin-listing-info">
                    <div>
                      <div className="admin-listing-title">{r.users?.display_name || '—'}</div>
                      <div className="admin-listing-meta" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {r.users?.email}
                      </div>
                    </div>
                  </div>
                  <div>
                    <select
                      className="admin-type-select"
                      value={r.role}
                      onChange={e => isSuperAdmin && handleChangeRole(r.id, e.target.value)}
                      disabled={!isSuperAdmin || r.role === 'super_admin'}
                    >
                      <option value="super_admin">Super Admin</option>
                      <option value="admin">Admin</option>
                      <option value="moderator">Moderador</option>
                    </select>
                  </div>
                  <div>
                    <span className={`admin-badge badge-${roleColors[r.role] || 'free'}`}>
                      {appLabels[r.app] || r.app}
                    </span>
                  </div>
                  <div className="admin-cell-muted" style={{ fontSize: '0.8rem' }}>
                    {r.notes || '—'}
                  </div>
                  <div className="admin-user-actions">
                    {r.role !== 'super_admin' && isSuperAdmin && (
                      <button className="btn-small btn-danger" onClick={() => handleRemove(r.id)}>
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
