import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import AdminNavbar from '../../components/AdminNavbar'
import './AdminUsuarios.css'

export default function AdminUsuarios() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [verificationRequests, setVerificationRequests] = useState({})
  const [docsModal, setDocsModal] = useState(null) // { user, request }
  const [rejectNote, setRejectNote] = useState('')
  const [lightboxImg, setLightboxImg] = useState(null)

  useEffect(() => { loadUsers() }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('users')
        .select('id, display_name, email, user_type, is_verified, is_banned, is_premium, premium_until, created_at, avatar_url, whatsapp')
        .order('created_at', { ascending: false })
      if (data) {
        setUsers(data)
        // cargar solicitudes de verificación para cada usuario
        const { data: requests } = await supabase
          .from('verification_requests')
          .select('*')
          .in('user_id', data.map(u => u.id))
          .order('created_at', { ascending: false })
        if (requests) {
          const map = {}
          requests.forEach(r => { if (!map[r.user_id]) map[r.user_id] = r })
          setVerificationRequests(map)
        }
      }
    } catch (error) { console.error(error) }
    finally { setLoading(false) }
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
      await supabase.from('users').update({ is_premium: false, premium_until: null }).eq('id', userId)
    } else {
      const until = new Date()
      until.setFullYear(until.getFullYear() + 1)
      await supabase.from('users').update({ is_premium: true, premium_until: until.toISOString() }).eq('id', userId)
    }
    loadUsers()
  }

  const handleApproveVerification = async (requestId, userId) => {
    await supabase.from('verification_requests').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', requestId)
    await supabase.from('users').update({ is_verified: true }).eq('id', userId)
    setDocsModal(null)
    loadUsers()
  }

  const handleRejectVerification = async (requestId) => {
    if (!rejectNote.trim()) { alert('Escribe un motivo de rechazo'); return }
    await supabase.from('verification_requests').update({
      status: 'rejected', admin_note: rejectNote, reviewed_at: new Date().toISOString()
    }).eq('id', requestId)
    setDocsModal(null)
    setRejectNote('')
    loadUsers()
  }

  const filtered = users.filter(u => {
    const matchSearch = u.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
    const matchType = filterType === 'all' || u.user_type === filterType
    return matchSearch && matchType
  })

  const typeIcon = (type) => type === 'shop' ? '🏪' : type === 'wholesale' ? '📦' : type === 'admin' ? '🔐' : '👤'
  const premiumExpiry = (until) => until ? new Date(until).toLocaleDateString() : ''

  return (
    <div className="admin-page">
      <AdminNavbar />
      <div className="admin-content">
        <div className="admin-page-header">
          <h1 className="serif luxury-gold">Usuarios</h1>
          <p className="admin-page-sub">{users.length} usuarios registrados</p>
        </div>

        <div className="admin-filters-bar">
          <input type="text" className="input" placeholder="Buscar por nombre o email..."
            value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: '320px' }} />
          <div className="admin-filter-btns">
            {['all', 'person', 'shop', 'wholesale', 'admin'].map(type => (
              <button key={type} className={`filter-btn ${filterType === type ? 'active' : ''}`} onClick={() => setFilterType(type)}>
                {type === 'all' ? 'Todos' : typeIcon(type) + ' ' + type}
              </button>
            ))}
          </div>
        </div>

        <div className="admin-card">
          {loading ? <div className="admin-loading">Cargando usuarios...</div> : (
            <div className="admin-users-table">
              <div className="admin-users-header">
                <span>Usuario</span>
                <span>Tipo</span>
                <span>Estado</span>
                <span>Premium</span>
                <span>Registro</span>
                <span>Acciones</span>
              </div>
              {filtered.map(user => {
                const vReq = verificationRequests[user.id]
                const hasPendingDocs = vReq?.status === 'pending'
                const isPremiumActive = user.is_premium && user.premium_until && new Date(user.premium_until) > new Date()

                return (
                  <div key={user.id} className={`admin-user-row ${user.is_banned ? 'banned' : ''}`}>
                    <div className="admin-user-info">
                      <div className="admin-user-avatar">
                        {user.avatar_url ? <img src={user.avatar_url} alt={user.display_name} />
                          : <span>{user.display_name?.charAt(0).toUpperCase()}</span>}
                      </div>
                      <div>
                        <div className="admin-user-name">
                          {user.display_name}
                          {hasPendingDocs && <span className="verif-pending-dot" title="Docs pendientes de revisión">📄</span>}
                        </div>
                        <div className="admin-user-email">{user.email}</div>
                      </div>
                    </div>

                    <div>
                      <select className="admin-type-select" value={user.user_type} onChange={e => handleChangeType(user.id, e.target.value)}>
                        <option value="person">👤 Persona</option>
                        <option value="shop">🏪 Tienda</option>
                        <option value="wholesale">📦 Mayorista</option>
                        <option value="admin">🔐 Admin</option>
                      </select>
                    </div>

                    <div className="admin-user-badges">
                      {user.is_verified && <span className="admin-badge badge-verified">✓ Verificado</span>}
                      {user.is_banned && <span className="admin-badge badge-banned">🚫 Baneado</span>}
                      {vReq?.status === 'pending' && <span className="admin-badge badge-pending">⏳ Docs</span>}
                      {vReq?.status === 'rejected' && <span className="admin-badge badge-rejected">✗ Rechazado</span>}
                    </div>

                    <div className="admin-premium-cell">
                      {isPremiumActive ? (
                        <div>
                          <span className="admin-badge badge-premium">⭐ Premium</span>
                          <div className="premium-expiry">hasta {premiumExpiry(user.premium_until)}</div>
                        </div>
                      ) : <span className="admin-badge badge-free">Básico</span>}
                    </div>

                    <div className="admin-user-date">{new Date(user.created_at).toLocaleDateString()}</div>

                    <div className="admin-user-actions">
                      <button className={`btn-small ${user.is_verified ? 'btn-danger' : 'btn-success'}`}
                        onClick={() => handleVerify(user.id, user.is_verified)}
                        title={user.is_verified ? 'Quitar verificación' : 'Verificar'}>
                        {user.is_verified ? '✗' : '✓'}
                      </button>
                      {vReq && (
                        <button className="btn-small btn-docs"
                          onClick={() => { setDocsModal({ user, request: vReq }); setRejectNote('') }}
                          title="Ver documentos">
                          📄
                        </button>
                      )}
                      <button className={`btn-small ${isPremiumActive ? 'btn-danger' : 'btn-premium'}`}
                        onClick={() => handleTogglePremium(user.id, isPremiumActive)}
                        title={isPremiumActive ? 'Desactivar premium' : 'Activar premium 1 año'}>
                        ⭐
                      </button>
                      <button className={`btn-small ${user.is_banned ? 'btn-success' : 'btn-danger'}`}
                        onClick={() => handleBan(user.id, user.is_banned)}>
                        {user.is_banned ? 'Desbanear' : 'Banear'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal de documentos */}
      {docsModal && (
        <div className="docs-modal-overlay" onClick={() => setDocsModal(null)}>
          <div className="docs-modal" onClick={e => e.stopPropagation()}>
            <div className="docs-modal-header">
              <h3>📄 Documentos de {docsModal.user.display_name}</h3>
              <button className="docs-modal-close" onClick={() => setDocsModal(null)}>✕</button>
            </div>

            <div className="docs-modal-body">
              {/* Docs de identidad — solo visibles aquí */}
              <div className="docs-section">
                <h4>🪪 Identidad (privado)</h4>
                <div className="docs-grid">
                  {(docsModal.request.identity_docs || []).map((url, i) => (
                    <img key={i} src={url} alt={`identity ${i}`} className="doc-thumb"
                      onClick={() => setLightboxImg(url)} />
                  ))}
                  {(!docsModal.request.identity_docs?.length) && <p className="docs-empty">Sin fotos</p>}
                </div>
              </div>

              {/* Docs del negocio */}
              {docsModal.request.business_docs?.length > 0 && (
                <div className="docs-section">
                  <h4>🏪 Negocio / Certificaciones</h4>
                  <div className="docs-grid">
                    {docsModal.request.business_docs.map((url, i) => (
                      <img key={i} src={url} alt={`business ${i}`} className="doc-thumb"
                        onClick={() => setLightboxImg(url)} />
                    ))}
                  </div>
                </div>
              )}

              <div className="docs-status-row">
                <span>Estado: </span>
                <span className={`admin-badge ${docsModal.request.status === 'pending' ? 'badge-pending' : docsModal.request.status === 'approved' ? 'badge-verified' : 'badge-rejected'}`}>
                  {docsModal.request.status}
                </span>
              </div>

              {docsModal.request.status === 'pending' && (
                <div className="docs-actions">
                  <button className="btn btn-primary" onClick={() => handleApproveVerification(docsModal.request.id, docsModal.user.id)}>
                    ✓ Aprobar verificación
                  </button>
                  <div className="docs-reject">
                    <input type="text" className="input" placeholder="Motivo del rechazo..."
                      value={rejectNote} onChange={e => setRejectNote(e.target.value)} />
                    <button className="btn btn-secondary" onClick={() => handleRejectVerification(docsModal.request.id)}>
                      ✗ Rechazar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox de doc */}
      {lightboxImg && (
        <div className="docs-lightbox" onClick={() => setLightboxImg(null)}>
          <img src={lightboxImg} alt="doc" />
          <button onClick={() => setLightboxImg(null)}>✕</button>
        </div>
      )}
    </div>
  )
}
