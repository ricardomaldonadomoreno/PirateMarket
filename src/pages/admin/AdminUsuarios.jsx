import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import AdminNavbar from '../../components/AdminNavbar'
import './AdminUsuarios.css'

export default function AdminUsuarios() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')

  useEffect(() => { loadUsers() }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('users')
        .select('id, display_name, email, user_type, is_verified, is_banned, is_premium, premium_until, created_at, avatar_url, whatsapp')
        .order('created_at', { ascending: false })
      if (data) setUsers(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleBan = async (userId, isBanned) => {
    if (!confirm(isBanned ? '¿Desbanear este usuario?' : '¿Banear este usuario?')) return
    await supabase.from('users').update({ is_banned: !isBanned }).eq('id', userId)
    loadUsers()
  }

  const handleVerify = async (userId, isVerified) => {
    await supabase.from('users').update({ is_verified: !isVerified }).eq('id', userId)
    loadUsers()
  }

  const handleChangeType = async (userId, newType) => {
    await supabase.from('users').update({ user_type: newType }).eq('id', userId)
    loadUsers()
  }

  const handleTogglePremium = async (userId, isPremium) => {
    if (isPremium) {
      // Desactivar
      await supabase.from('users').update({ is_premium: false, premium_until: null }).eq('id', userId)
    } else {
      // Activar por 1 año
      const until = new Date()
      until.setFullYear(until.getFullYear() + 1)
      await supabase.from('users').update({ is_premium: true, premium_until: until.toISOString() }).eq('id', userId)
    }
    loadUsers()
  }

  const filtered = users.filter(u => {
    const matchSearch = u.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
    const matchType = filterType === 'all' || u.user_type === filterType
    return matchSearch && matchType
  })

  const typeIcon = (type) => type === 'shop' ? '🏪' : type === 'wholesale' ? '📦' : type === 'admin' ? '🔐' : '👤'

  const premiumExpiry = (until) => {
    if (!until) return ''
    return new Date(until).toLocaleDateString()
  }

  return (
    <div className="admin-page">
      <AdminNavbar />
      <div className="admin-content">
        <div className="admin-page-header">
          <h1 className="serif luxury-gold">Usuarios</h1>
          <p className="admin-page-sub">{users.length} usuarios registrados</p>
        </div>

        <div className="admin-filters-bar">
          <input
            type="text" className="input" placeholder="Buscar por nombre o email..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: '320px' }}
          />
          <div className="admin-filter-btns">
            {['all', 'person', 'shop', 'wholesale', 'admin'].map(type => (
              <button
                key={type}
                className={`filter-btn ${filterType === type ? 'active' : ''}`}
                onClick={() => setFilterType(type)}
              >
                {type === 'all' ? 'Todos' : typeIcon(type) + ' ' + type}
              </button>
            ))}
          </div>
        </div>

        <div className="admin-card">
          {loading ? (
            <div className="admin-loading">Cargando usuarios...</div>
          ) : (
            <div className="admin-users-table">
              <div className="admin-users-header">
                <span>Usuario</span>
                <span>Tipo</span>
                <span>Estado</span>
                <span>Premium</span>
                <span>Registro</span>
                <span>Acciones</span>
              </div>
              {filtered.map(user => (
                <div key={user.id} className={`admin-user-row ${user.is_banned ? 'banned' : ''}`}>
                  <div className="admin-user-info">
                    <div className="admin-user-avatar">
                      {user.avatar_url
                        ? <img src={user.avatar_url} alt={user.display_name} />
                        : <span>{user.display_name?.charAt(0).toUpperCase()}</span>
                      }
                    </div>
                    <div>
                      <div className="admin-user-name">{user.display_name}</div>
                      <div className="admin-user-email">{user.email}</div>
                    </div>
                  </div>

                  <div>
                    <select
                      className="admin-type-select"
                      value={user.user_type}
                      onChange={e => handleChangeType(user.id, e.target.value)}
                    >
                      <option value="person">👤 Persona</option>
                      <option value="shop">🏪 Tienda</option>
                      <option value="wholesale">📦 Mayorista</option>
                      <option value="admin">🔐 Admin</option>
                    </select>
                  </div>

                  <div className="admin-user-badges">
                    {user.is_verified && <span className="admin-badge badge-verified">✓ Verificado</span>}
                    {user.is_banned && <span className="admin-badge badge-banned">🚫 Baneado</span>}
                  </div>

                  <div className="admin-premium-cell">
                    {user.is_premium && user.premium_until && new Date(user.premium_until) > new Date() ? (
                      <div>
                        <span className="admin-badge badge-premium">⭐ Premium</span>
                        <div className="premium-expiry">hasta {premiumExpiry(user.premium_until)}</div>
                      </div>
                    ) : (
                      <span className="admin-badge badge-free">Básico</span>
                    )}
                  </div>

                  <div className="admin-user-date">
                    {new Date(user.created_at).toLocaleDateString()}
                  </div>

                  <div className="admin-user-actions">
                    <button
                      className={`btn-small ${user.is_verified ? 'btn-danger' : 'btn-success'}`}
                      onClick={() => handleVerify(user.id, user.is_verified)}
                      title={user.is_verified ? 'Quitar verificación' : 'Verificar'}
                    >
                      {user.is_verified ? '✗' : '✓'}
                    </button>
                    <button
                      className={`btn-small ${user.is_premium && new Date(user.premium_until) > new Date() ? 'btn-danger' : 'btn-premium'}`}
                      onClick={() => handleTogglePremium(user.id, user.is_premium && new Date(user.premium_until) > new Date())}
                      title={user.is_premium ? 'Desactivar premium' : 'Activar premium 1 año'}
                    >
                      ⭐
                    </button>
                    <button
                      className={`btn-small ${user.is_banned ? 'btn-success' : 'btn-danger'}`}
                      onClick={() => handleBan(user.id, user.is_banned)}
                    >
                      {user.is_banned ? 'Desbanear' : 'Banear'}
                    </button>
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
