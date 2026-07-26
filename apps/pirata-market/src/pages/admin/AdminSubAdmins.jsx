import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import './AdminUsuarios.css'

const appLabels = {
  pirata: 'Pirata Market',
  traficante: 'Traficante',
  both: 'Ambas',
}

export default function AdminSubAdmins() {
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
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

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('No hay sesion activa. Inicia sesion nuevamente.')
        setLoading(false)
        return
      }

      // Cargar lista de sub-admins desde la tabla sub_admins
      const { data: adminList, error: listError } = await supabase
        .from('sub_admins')
        .select('*, users:users(id, display_name, email, user_type)')
        .order('created_at', { ascending: false })

      if (listError) {
        console.error('Error loading sub_admins:', listError)
        setAdmins([])
      } else {
        setAdmins(adminList || [])
      }
    } catch (err) {
      console.error('Error loading:', err)
      setError('Error al cargar la pagina.')
    } finally {
      setLoading(false)
    }
  }

  // Crear nuevo sub-admin (email + contraseña)
  const handleCreateAdmin = async (e) => {
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
      // 1. Crear usuario en Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      })
      if (signUpError) throw signUpError
      if (!signUpData.user) {
        setError('No se pudo crear la cuenta. Verifica el correo y la contrasena.')
        setSaving(false)
        return
      }

      const adminId = signUpData.user.id

      // 2. Insertar en tabla users con user_type='admin'
      const { error: userError } = await supabase.from('users').insert([{
        id: adminId,
        email: form.email,
        display_name: form.full_name || form.email.split('@')[0],
        user_type: 'admin',
        whatsapp: '0000',
        created_at: new Date().toISOString(),
      }])
      if (userError && !userError.message?.includes('duplicate') && !userError.message?.includes('Already')) {
        throw userError
      }

      // 3. Actualizar nombre si se proporciono
      if (form.full_name) {
        await supabase.from('users').update({ display_name: form.full_name }).eq('id', adminId)
      }

      // 4. Registrar en tabla sub_admins
      const { error: subError } = await supabase.from('sub_admins').insert([{
        user_id: adminId,
        created_by: (await supabase.auth.getUser()).data?.user?.id,
        full_name: form.full_name || null,
        app_access: form.app_access,
        notes: form.notes || null,
      }])
      if (subError) throw subError

      setSuccess('Sub-admin creado correctamente: ' + form.email)
      setForm({ email: '', password: '', full_name: '', app_access: 'both', notes: '' })
      await loadAll()
    } catch (err) {
      setError(err.message || 'Error al crear el sub-admin.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async (id) => {
    if (!confirm('Desactivar este sub-admin? Perdera acceso al backoffice.')) return
    setError('')
    setSuccess('')
    try {
      // Desactivar en sub_admins
      const { error: subError } = await supabase
        .from('sub_admins')
        .update({ is_active: false })
        .eq('id', id)
      if (subError) throw subError

      // Cambiar user_type a 'person' para quitar acceso
      const { data: record } = await supabase
        .from('sub_admins')
        .select('user_id')
        .eq('id', id)
        .single()
      if (record) {
        await supabase.from('users').update({ user_type: 'person' }).eq('id', record.user_id)
      }

      setSuccess('Sub-admin desactivado.')
      await loadAll()
    } catch (err) {
      setError(err.message || 'Error al desactivar.')
    }
  }

  const handleReactivate = async (id) => {
    setError('')
    setSuccess('')
    try {
      const { data: record } = await supabase
        .from('sub_admins')
        .select('user_id')
        .eq('id', id)
        .single()
      if (!record) throw new Error('Registro no encontrado.')

      // Reactivar en sub_admins
      const { error: subError } = await supabase
        .from('sub_admins')
        .update({ is_active: true })
        .eq('id', id)
      if (subError) throw subError

      // Restaurar user_type a 'admin'
      await supabase.from('users').update({ user_type: 'admin' }).eq('id', record.user_id)

      setSuccess('Sub-admin reactivado.')
      await loadAll()
    } catch (err) {
      setError(err.message || 'Error al reactivar.')
    }
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

        {/* Formulario de crear sub-admin */}
        <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
          <h3 className="serif" style={{ color: 'var(--gold)', marginBottom: '0.25rem' }}>Crear Nuevo Sub-Admin</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Crea una cuenta administrativa con acceso al backoffice. El usuario podra ver y gestionar datos de la plataforma.
          </p>
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
                placeholder="Minimo 6 caracteres"
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
                placeholder="Juan Perez"
                value={form.full_name}
                onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
              />
            </div>
            <div style={{ minWidth: '140px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>App</label>
              <select className="input" value={form.app_access} onChange={e => setForm(p => ({ ...p, app_access: e.target.value }))}>
                <option value="both">Ambas</option>
                <option value="pirata">Pirata Market</option>
                <option value="traficante">Traficante</option>
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
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || !form.email || !form.password}
            >
              {saving ? 'Creando...' : '+ Crear Sub-Admin'}
            </button>
          </form>
        </div>

        {/* Lista de sub-admins */}
        <div className="admin-card">
          <h3 className="serif" style={{ color: 'var(--gold)', marginBottom: '1rem' }}>Sub-Administradores Registrados</h3>
          {loading ? (
            <div className="admin-loading">Cargando...</div>
          ) : admins.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No hay sub-administradores registrados aun.
            </div>
          ) : (
            <div className="admin-table">
              <div className="admin-listings-header">
                <span>Nombre</span>
                <span>Email</span>
                <span>App</span>
                <span>Estado</span>
                <span>Notas</span>
                <span>Acciones</span>
              </div>
              {admins.map(a => (
                <div key={a.id} className="admin-listing-row">
                  <div className="admin-listing-info">
                    <div className="admin-listing-title">{a.users?.display_name || a.full_name || '—'}</div>
                  </div>
                  <div style={{ fontSize: '0.85rem' }}>{a.users?.email || '—'}</div>
                  <div>
                    <span className={`admin-badge badge-${a.is_active ? 'success' : 'warning'}`}>
                      {appLabels[a.app_access] || a.app_access}
                    </span>
                  </div>
                  <div>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.15rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: a.is_active ? 'rgba(6,214,160,0.15)' : 'rgba(230,57,70,0.15)',
                      color: a.is_active ? 'var(--success)' : 'var(--danger)',
                    }}>
                      {a.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {a.notes || '—'}
                  </div>
                  <div className="admin-user-actions">
                    {a.is_active ? (
                      <button className="btn-small btn-danger" onClick={() => handleDeactivate(a.id)}>
                        Desactivar
                      </button>
                    ) : (
                      <button className="btn-small" style={{ background: 'var(--gold)', color: '#000' }} onClick={() => handleReactivate(a.id)}>
                        Reactivar
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
