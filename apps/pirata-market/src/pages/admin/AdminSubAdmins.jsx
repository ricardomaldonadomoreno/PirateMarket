import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import './AdminUsuarios.css'

const roleLabels = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  moderator: 'Moderador',
}

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
  const [roles, setRoles] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  // Formulario: asignar rol a usuario existente
  const [form, setForm] = useState({ user_id: '', role: 'admin', app: 'pirata', notes: '' })
  const [saving, setSaving] = useState(false)
  // Formulario: crear nuevo admin (email + contraseña)
  const [newAdminForm, setNewAdminForm] = useState({ email: '', password: '', role: 'admin', app: 'pirata', notes: '' })
  const [creatingAdmin, setCreatingAdmin] = useState(false)
  const [activeTab, setActiveTab] = useState('existing') // 'existing' | 'new'
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

      const { data: roleData } = await supabase
        .from('admin_roles')
        .select('role')
        .eq('user_id', user.id)
        .single()
      setIsSuperAdmin(roleData?.role === 'super_admin')

      const { data: adminRoles } = await supabase
        .from('admin_roles')
        .select('*, users:users(display_name, email)')
        .order('created_at', { ascending: false })
      if (adminRoles) setRoles(adminRoles)

      const { data: allUsers } = await supabase
        .from('users')
        .select('id, display_name, email')
        .order('display_name')
      if (allUsers) setUsers(allUsers)
    } catch (error) {
      console.error('Error loading:', error)
    } finally {
      setLoading(false)
    }
  }

  // Asignar rol a usuario existente
  const handleAdd = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!form.user_id) return
    setSaving(true)
    try {
      const existing = await supabase
        .from('admin_roles')
        .select('id')
        .eq('user_id', form.user_id)
        .single()

      if (existing.data) {
        setError('Este usuario ya tiene un rol administrativo.')
        setSaving(false)
        return
      }

      const { error: insertError } = await supabase.from('admin_roles').insert([{
        user_id: form.user_id,
        role: form.role,
        app: form.app,
        notes: form.notes || null,
      }])
      if (insertError) throw insertError
      setForm({ user_id: '', role: 'admin', app: 'pirata', notes: '' })
      setSuccess('Rol asignado correctamente.')
      await loadAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // Crear nuevo admin (email + contraseña)
  const handleCreateAdmin = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!newAdminForm.email || !newAdminForm.password) return
    setCreatingAdmin(true)
    try {
      // 1. Verificar que no existe ya un admin con ese email
      const existingRole = await supabase
        .from('admin_roles')
        .select('id, users:users(email)')
        .eq('users.email', newAdminForm.email)
        .single()
      if (existingRole.data) {
        setError('Ya existe un admin con ese correo.')
        setCreatingAdmin(false)
        return
      }

      // 2. Verificar si el usuario ya existe en auth
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .ilike('email', newAdminForm.email)
        .maybeSingle()

      if (existingUser) {
        // Usuario ya existe en users, solo verificar auth
        const { data: authUser } = await supabase.auth.signInWithPassword({
          email: newAdminForm.email,
          password: newAdminForm.password,
        })
        if (authUser?.user) {
          // Auth correcto, solo asignar rol
          const { error: insertError } = await supabase.from('admin_roles').insert([{
            user_id: existingUser.id,
            role: newAdminForm.role,
            app: newAdminForm.app,
            notes: newAdminForm.notes || null,
          }])
          if (insertError) throw insertError
          setSuccess(`Admin creado y rol asignado a ${newAdminForm.email}.`)
          setNewAdminForm({ email: '', password: '', role: 'admin', app: 'pirata', notes: '' })
          await loadAll()
          setCreatingAdmin(false)
          return
        }
        // Si el auth falla, significa que la contraseña es incorrecta
        setError('El usuario ya existe pero la contraseña no coincide.')
        setCreatingAdmin(false)
        return
      }

      // 3. Crear nuevo usuario en auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: newAdminForm.email,
        password: newAdminForm.password,
      })
      if (signUpError) throw signUpError
      if (!signUpData.user) {
        setError('No se pudo crear la cuenta. Verifica el correo.')
        setCreatingAdmin(false)
        return
      }

      // 4. Insertar en tabla users (con user_type admin)
      const { error: userError } = await supabase.from('users').insert([{
        id: signUpData.user.id,
        email: newAdminForm.email,
        display_name: newAdminForm.email.split('@')[0],
        user_type: 'admin',
        created_at: new Date().toISOString(),
      }])
      if (userError) {
        // Si ya existe en users, no es fatal
        if (!userError.message?.includes('duplicate')) throw userError
      }

      // 5. Asignar rol en admin_roles
      const { error: roleError } = await supabase.from('admin_roles').insert([{
        user_id: signUpData.user.id,
        role: newAdminForm.role,
        app: newAdminForm.app,
        notes: newAdminForm.notes || null,
      }])
      if (roleError) throw roleError

      setSuccess(`Nuevo admin creado: ${newAdminForm.email}`)
      setNewAdminForm({ email: '', password: '', role: 'admin', app: 'pirata', notes: '' })
      await loadAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreatingAdmin(false)
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

  // Filtrar usuarios que ya son admins para no mostrarlos en el selector
  const adminUserIds = new Set(roles.map(r => r.user_id))
  const availableUsers = users.filter(u => !adminUserIds.has(u.id))

  return (
    <div className="admin-page">
      <div className="admin-content">
        <div className="admin-page-header">
          <h1 className="serif luxury-gold">Sub-Administradores</h1>
          <p className="admin-page-sub">Gestión de accesos administrativos</p>
          <button onClick={() => navigate(-1)} className="btn-small btn-ghost" style={{ marginLeft: '1rem' }}>
            ← Volver
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
            <div className="admin-tab-bar" style={{ marginBottom: '1rem' }}>
              <button className={`admin-tab ${activeTab === 'existing' ? 'active' : ''}`} onClick={() => { setActiveTab('existing'); setError(''); setSuccess('') }}>
                Asignar a usuario existente
              </button>
              <button className={`admin-tab ${activeTab === 'new' ? 'active' : ''}`} onClick={() => { setActiveTab('new'); setError(''); setSuccess('') }}>
                Crear nuevo admin
              </button>
            </div>

            {activeTab === 'existing' && (
              <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Usuario</label>
                  <select className="input" value={form.user_id} onChange={e => setForm(p => ({ ...p, user_id: e.target.value }))}>
                    <option value="">Seleccionar usuario...</option>
                    {availableUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.display_name} ({u.email})</option>
                    ))}
                  </select>
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
                <button type="submit" className="btn btn-primary" disabled={saving || !form.user_id}>
                  {saving ? '...' : '+ Agregar'}
                </button>
              </form>
            )}

            {activeTab === 'new' && (
              <form onSubmit={handleCreateAdmin} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Email</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="admin@ejemplo.com"
                    value={newAdminForm.email}
                    onChange={e => setNewAdminForm(p => ({ ...p, email: e.target.value }))}
                    required
                  />
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Contraseña</label>
                  <input
                    type="password"
                    className="input"
                    placeholder="Mínimo 6 caracteres"
                    value={newAdminForm.password}
                    onChange={e => setNewAdminForm(p => ({ ...p, password: e.target.value }))}
                    minLength={6}
                    required
                  />
                </div>
                <div style={{ minWidth: '140px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Rol</label>
                  <select className="input" value={newAdminForm.role} onChange={e => setNewAdminForm(p => ({ ...p, role: e.target.value }))}>
                    <option value="admin">Admin</option>
                    <option value="moderator">Moderador</option>
                  </select>
                </div>
                <div style={{ minWidth: '140px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>App</label>
                  <select className="input" value={newAdminForm.app} onChange={e => setNewAdminForm(p => ({ ...p, app: e.target.value }))}>
                    <option value="pirata">Pirata Market</option>
                    <option value="traficante">Traficante</option>
                    <option value="both">Ambas</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary" disabled={creatingAdmin || !newAdminForm.email || !newAdminForm.password}>
                  {creatingAdmin ? 'Creando...' : '+ Crear Admin'}
                </button>
              </form>
            )}
          </div>
        )}

        <div className="admin-card">
          {loading ? (
            <div className="admin-loading">Cargando...</div>
          ) : (
            <div className="admin-table">
              <div className="admin-listings-header">
                <span>Admin</span>
                <span>Rol</span>
                <span>App</span>
                <span>Notas</span>
                <span>Acciones</span>
              </div>
              {roles.map(r => (
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
