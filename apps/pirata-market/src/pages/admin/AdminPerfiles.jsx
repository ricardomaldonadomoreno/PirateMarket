import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import AdminNavbarPirata from '../../components/AdminNavbarPirata'
import { Eye, Ban } from 'lucide-react'
import './AdminPerfiles.css'

const fmt = (date) => date ? new Date(date).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
const typeLabel = (type) => ({ person: 'Usuario', superadmin: 'Super Admin' }[type] || 'Usuario')

export default function AdminPerfiles() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('perfiles')
  const [filterCountry, setFilterCountry] = useState('all')
  const [countries, setCountries] = useState([])
  const [deletionRequests, setDeletionRequests] = useState([])
  const [detailModal, setDetailModal] = useState(null)
  const [deleteModal, setDeleteModal] = useState(null)
  const [executing, setExecuting] = useState(false)

  useEffect(() => { loadUsers(); loadDeletionRequests() }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, display_name, email, whatsapp, user_type, is_banned, created_at, avatar_url, country')
        .order('created_at', { ascending: false })

      if (error) { console.error('loadUsers error:', error); setLoading(false); return }
      if (data) {
        setUsers(data)
        // Extraer países únicos
        const uniqueCountries = [...new Set(data.map(u => u.country).filter(Boolean))]
        setCountries(uniqueCountries)
      }
    } catch (err) {
      console.error('loadUsers error:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadDeletionRequests = async () => {
    const { data } = await supabase
      .from('deletion_requests')
      .select('id, user_id, requested_at, status')
      .eq('status', 'pending')
      .order('requested_at', { ascending: false })
    setDeletionRequests(data || [])
  }

  const handleDeleteAccount = async (user) => {
    if (!confirm(`¿Confirmar eliminación de cuenta de "${user.display_name || user.email}"?\n\nEsta acción es IRREVERSIBLE y eliminará TODOS los datos del usuario.`)) return
    setExecuting(true)
    setDeleteModal(null)
    try {
      const { error } = await supabase.rpc('delete_user_account', { p_user_id: user.id })
      if (error) throw new Error(error.message)
      // Marcar solicitud como completada
      const req = deletionRequests.find(r => r.user_id === user.id)
      if (req) {
        await supabase.from('deletion_requests').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', req.id)
      }
      loadUsers()
      loadDeletionRequests()
    } catch (err) {
      alert('Error: ' + err.message)
    }
    setExecuting(false)
  }

  const handleRejectDeletion = async (requestId, userId) => {
    const reason = prompt('Motivo de rechazo (opcional):')
    await supabase.from('deletion_requests').update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      admin_note: reason || null
    }).eq('id', requestId)
    loadDeletionRequests()
  }

  const handleCancelDeletion = async (requestId) => {
    await supabase.from('deletion_requests').update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      admin_note: 'Cancelada por el usuario'
    }).eq('id', requestId)
    loadDeletionRequests()
  }

  const handleBan = async (userId, isBanned) => {
    if (!confirm(isBanned ? '¿Desbanear este usuario?' : '¿Banear este usuario?')) return
    const { error } = await supabase.from('users').update({ is_banned: !isBanned }).eq('id', userId)
    if (error) { alert('Error: ' + error.message); return }
    loadUsers()
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    const matchSearch = u.display_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.whatsapp?.toLowerCase().includes(q) ||
      u.country?.toLowerCase().includes(q)
    const matchCountry = filterCountry === 'all' || u.country === filterCountry
    return matchSearch && matchCountry
  })

  const filteredDeletions = deletionRequests.filter(r => {
    const q = search.toLowerCase()
    const u = users.find(x => x.id === r.user_id)
    const matchSearch = !q || (u?.display_name?.toLowerCase().includes(q) || u?.email?.toLowerCase().includes(q) || u?.whatsapp?.toLowerCase().includes(q))
    return matchSearch
  })

  const hasDeletionRequest = (userId) => deletionRequests.some(r => r.user_id === userId)

  const handleExportCSV = () => {
    const headers = ['ID', 'Nombre', 'Email', 'WhatsApp', 'País', 'Tipo', 'Registrado']
    const rows = users.map(u => [
      u.id,
      u.display_name || '',
      u.email || '',
      u.whatsapp || '',
      u.country || '',
      typeLabel(u.user_type),
      u.created_at || ''
    ])
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `perfiles_pirata_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="admin-page">
      <AdminNavbarPirata />
      <div className="admin-content">
        <div className="admin-page-header">
          <h1 className="serif luxury-gold">Perfiles Generales</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <p className="admin-page-sub" style={{ margin: 0 }}>{users.length} perfiles registrados en la plataforma</p>
            <button className="btn btn-gold" onClick={handleExportCSV} title="Descargar todos los perfiles en CSV">
              📥 Exportar CSV
            </button>
          </div>
        </div>



        {/* Tabs */}
        <div className="admin-tabs">
          <button className={`admin-tab ${tab === 'perfiles' ? 'active' : ''}`} onClick={() => setTab('perfiles')}>
            Perfiles ({users.length})
          </button>
          <button className={`admin-tab ${tab === 'deletions' ? 'active' : ''}`} onClick={() => setTab('deletions')}>
            Solicitudes de eliminación ({deletionRequests.length})
          </button>
        </div>

        {/* Filtros */}
        <div className="admin-filters-bar">
          <input type="text" className="input" placeholder="Buscar nombre, email, WhatsApp, país..."
            value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: '320px' }} />
          {tab === 'perfiles' && countries.length > 0 && (
            <select className="input country-filter" value={filterCountry} onChange={e => setFilterCountry(e.target.value)}>
              <option value="all">Todos los países</option>
              {countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>

        {/* Contenido según tab */}
        {tab === 'perfiles' && (
        <div className="admin-card">
          {loading ? <div className="admin-loading">Cargando perfiles...</div> : (
            <>
              <div className="admin-perfiles-header">
                <span>Usuario</span>
                <span>Contacto</span>
                <span>País</span>
                <span>Tipo</span>
                <span>Estado</span>
                <span>Registro</span>
                <span>Acciones</span>
              </div>

              {filtered.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No se encontraron perfiles.
                </div>
              )}

              {filtered.map(user => (
                <div key={user.id} className={`admin-perfil-row ${user.is_banned ? 'banned' : ''}`}>
                  <div className="admin-perfil-info">
                    <div className="admin-perfil-avatar">
                      {user.avatar_url
                        ? <img src={user.avatar_url} alt={user.display_name} />
                        : <span>{(user.display_name || user.email)?.charAt(0).toUpperCase()}</span>}
                    </div>
                    <div>
                      <div className="admin-perfil-name">
                        {user.display_name || 'Sin nombre'}
                        {hasDeletionRequest(user.id) && (
                          <span className="deletion-pending-tag" title="Solicitud de eliminación pendiente">Elim</span>
                        )}
                      </div>
                      <div className="admin-perfil-id">{user.id.slice(0, 8)}...</div>
                    </div>
                  </div>

                  <div className="admin-perfil-contact">
                    {user.email && <div className="perfil-email">{user.email}</div>}
                    {user.whatsapp && <a href={`https://wa.me/${user.whatsapp.replace(/\D/g, '')}`}
                      target="_blank" rel="noreferrer" className="perfil-wa">{user.whatsapp}</a>}
                  </div>

                  <div className="admin-perfil-country">
                    {user.country || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </div>

                  <div>
                    <span className="admin-type-label">{typeLabel(user.user_type)}</span>
                  </div>

                  <div className="admin-perfil-badges">
                    {user.is_banned
                      ? <span className="admin-badge badge-banned">Baneado</span>
                      : <span className="admin-badge badge-free">Activo</span>}
                  </div>

                  <div className="admin-perfil-date">
                    {fmt(user.created_at)}
                  </div>

                  <div className="admin-perfil-actions">
                    <button className="btn-icon" onClick={() => setDetailModal(user)} title="Ver detalle">
                      <Eye size={16} />
                    </button>
                    <button
                      className={`btn-icon ${user.is_banned ? 'btn-icon-unban' : 'btn-icon-ban'}`}
                      onClick={() => handleBan(user.id, user.is_banned)}
                      title={user.is_banned ? 'Desbanear usuario' : 'Banear usuario'}>
                      <Ban size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
        )}

        {tab === 'deletions' && (
        <div className="admin-card">
          {filteredDeletions.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No hay solicitudes de eliminación pendientes.
            </div>
          ) : (
            <>
              <div className="admin-perfiles-header">
                <span>Usuario</span>
                <span>Email</span>
                <span>Solicitado</span>
                <span>Estado</span>
                <span>Acciones</span>
              </div>
              {filteredDeletions.map(req => {
                const u = users.find(x => x.id === req.user_id)
                return (
                  <div key={req.id} className="admin-perfil-row">
                    <div className="admin-perfil-info">
                      <div className="admin-perfil-avatar">
                        {u?.avatar_url
                          ? <img src={u.avatar_url} alt={u.display_name} />
                          : <span>{(u?.display_name || u?.email || '?')?.charAt(0).toUpperCase()}</span>}
                      </div>
                      <div>
                        <div className="admin-perfil-name">{u?.display_name || 'Usuario eliminado'}</div>
                        <div className="admin-perfil-id">{req.user_id.slice(0, 8)}...</div>
                      </div>
                    </div>
                    <div className="admin-perfil-contact">
                      <div className="perfil-email">{u?.email || req.user_id}</div>
                    </div>
                    <div className="admin-perfil-date">{fmt(req.requested_at)}</div>
                    <div>
                      <span className="admin-badge badge-verified" style={{ background: 'var(--warning)' }}>Pendiente</span>
                    </div>
                    <div className="admin-perfil-actions">
                      <button className="btn btn-danger btn-sm" onClick={() => setDeleteModal(u)} disabled={executing}>
                        Aprobar y eliminar
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleCancelDeletion(req.id)}>
                        Cancelar
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleRejectDeletion(req.id, req.user_id)}>
                        Rechazar
                      </button>
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
        )}

        {/* Modal detalle */}
        {detailModal && (
          <div className="detail-modal-overlay" onClick={() => setDetailModal(null)}>
            <div className="detail-modal" onClick={e => e.stopPropagation()}>
              <div className="detail-modal-header">
                <h3>Detalle del perfil</h3>
                <button className="detail-modal-close" onClick={() => setDetailModal(null)}>✕</button>
              </div>
              <div className="detail-modal-body">
                <div className="detail-avatar-row">
                  <div className="detail-avatar">
                    {detailModal.avatar_url
                      ? <img src={detailModal.avatar_url} alt="avatar" />
                      : <span>{(detailModal.display_name || detailModal.email)?.charAt(0).toUpperCase()}</span>}
                  </div>
                  <div>
                    <div className="detail-name">{detailModal.display_name || 'Sin nombre'}</div>
                    <div className="detail-id">{detailModal.id}</div>
                  </div>
                </div>
                <div className="detail-grid">
                  <div className="detail-field">
                    <label>Email</label>
                    <span>{detailModal.email}</span>
                  </div>
                  <div className="detail-field">
                    <label>WhatsApp</label>
                    <span>{detailModal.whatsapp || 'No registrado'}</span>
                  </div>
                  <div className="detail-field">
                    <label>País</label>
                    <span>{detailModal.country || 'No registrado'}</span>
                  </div>
                  <div className="detail-field">
                    <label>Registro</label>
                    <span>{fmt(detailModal.created_at)}</span>
                  </div>
                  <div className="detail-field">
                    <label>Solicitud eliminación</label>
                    <span>
                      {hasDeletionRequest(detailModal.id)
                        ? <span style={{ color: 'var(--warning)' }}>Pendiente</span>
                        : 'Sin solicitud'}
                    </span>
                  </div>
                </div>
                {hasDeletionRequest(detailModal.id) && (
                  <button className="btn btn-danger" style={{ marginTop: '1rem', width: '100%' }}
                    onClick={() => { setDetailModal(null); setDeleteModal(detailModal) }}>
                    Aprobar eliminación de cuenta
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal confirmación eliminación */}
        {deleteModal && (
          <div className="delete-confirm-overlay" onClick={() => setDeleteModal(null)}>
            <div className="delete-confirm-modal" onClick={e => e.stopPropagation()}>
              <div className="delete-confirm-header">
                <h3>Confirmar eliminación</h3>
              </div>
              <div className="delete-confirm-body">
                <div className="delete-user-preview">
                  <div className="delete-avatar">
                    {deleteModal.avatar_url
                      ? <img src={deleteModal.avatar_url} alt="" />
                      : <span>{(deleteModal.display_name || deleteModal.email)?.charAt(0).toUpperCase()}</span>}
                  </div>
                  <div>
                    <strong>{deleteModal.display_name || deleteModal.email}</strong>
                    <span>{deleteModal.email}</span>
                  </div>
                </div>
                <div className="delete-warning">
                  <p>Esta acción eliminará permanentemente:</p>
                  <ul>
                    <li>Todos los datos del usuario (perfil, avatar)</li>
                    <li>Todos sus anuncios y publicaciones</li>
                    <li>Todos sus viajes y envíos (packer)</li>
                    <li>Sus verificaciones y documentos</li>
                    <li>Su cuenta de autenticación (login)</li>
                  </ul>
                  <p><strong>Esta acción NO se puede deshacer.</strong></p>
                </div>
                <div className="delete-confirm-actions">
                  <button className="btn btn-secondary" onClick={() => setDeleteModal(null)}>
                    Cancelar
                  </button>
                  <button className="btn btn-danger" onClick={() => handleDeleteAccount(deleteModal)} disabled={executing}>
                    {executing ? 'Eliminando...' : 'Confirmar eliminación'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
