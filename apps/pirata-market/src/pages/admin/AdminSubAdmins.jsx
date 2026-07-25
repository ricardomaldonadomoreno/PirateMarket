import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import './AdminUsuarios.css' // Reutilizar estilos del admin

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
  const [form, setForm] = useState({ user_id: '', role: 'admin', app: 'pirata', notes: '' })
  const [saving, setSaving] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
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

      // Cargar todos los admin_roles
      const { data: adminRoles } = await supabase
        .from('admin_roles')
        .select('*, users:users(display_name, email)')
        .order('created_at', { ascending: false })
      if (adminRoles) setRoles(adminRoles)

      // Cargar TODOS los usuarios (no filtrar por user_type, ya que admin_roles es la fuente de verdad)
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

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.user_id) return
    setSaving(true)
    try {
      // Verificar que el usuario no tenga ya un rol admin
      const existing = await supabase
        .from('admin_roles')
        .select('id')
        .eq('user_id', form.user_id)
        .single()

      if (existing.data) {
        alert('Este usuario ya tiene un rol administrativo.')
        setSaving(false)
        return
      }

      const { error } = await supabase.from('admin_roles').insert([{
        user_id: form.user_id,
        role: form.role,
        app: form.app,
        notes: form.notes || null,
      }])
      if (error) throw error
      setForm({ user_id: '', role: 'admin', app: 'pirata', notes: '' })
      await loadAll()
    } catch (error) {
      alert('Error: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (id) => {
    if (!confirm('¿Eliminar este sub-admin?')) return
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
          <p className="admin-page-sub">Gestión de accesos administrativos</p>
          <button onClick={() => navigate(-1)} className="btn-small btn-ghost" style={{ marginLeft: '1rem' }}>
            ← Volver
          </button>
        </div>

        {isSuperAdmin && (
          <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
            <h3 className="serif" style={{ color: 'var(--gold)', marginBottom: '1rem' }}>Agregar Sub-Admin</h3>
            <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Usuario</label>
                <select className="input" value={form.user_id} onChange={e => setForm(p => ({ ...p, user_id: e.target.value }))}>
                  <option value="">Seleccionar usuario...</option>
                  {users.map(u => (
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
