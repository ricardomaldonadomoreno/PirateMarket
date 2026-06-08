import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import AdminNavbar from '../../components/AdminNavbar'
import './AdminUsuarios.css'

export default function AdminUsuarios() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterVerif, setFilterVerif] = useState('all') // all, pending, approved, rejected
  const [filterApp, setFilterApp] = useState('all') // all, pirata-market, traficante
  const [verificationRequests, setVerificationRequests] = useState({})
  const [docsModal, setDocsModal] = useState(null) // { user, request, appOrigin }
  const [rejectNote, setRejectNote] = useState('')
  const [lightboxImg, setLightboxImg] = useState(null)

  useEffect(() => { loadUsers() }, [])

  // Detectar origen de la solicitud basado en los documentos
  const detectAppOrigin = (request, user) => {
    // Si tiene traficante_* fields, es de Traficante
    if (user?.traficante_phone_locked || user?.traficante_address_locked || user?.traficante_full_name) {
      return 'traficante'
    }
    // Si tiene shop_* fields, es de Pirata Market
    if (user?.shop_name || user?.shop_bio) {
      return 'pirata-market'
    }
    // Por defecto, Pirata Market
    return 'pirata-market'
  }

  const loadUsers = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('users')
        .select(`
          id, display_name, email, user_type, is_verified, is_banned, is_premium, premium_until, 
          created_at, avatar_url, whatsapp,
          shop_name, shop_bio,
          traficante_full_name, traficante_phone_locked, traficante_address_locked
        `)
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

  const handleApproveVerification = async (requestId, userId, appOrigin) => {
    // Actualizar campos específicos según la app
    const updateData = { is_verified: true }
    if (appOrigin === 'traficante') {
      updateData.traficante_identity_verified = true
      updateData.traficante_address_verified = true
    }

    await supabase.from('verification_requests').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', requestId)
    await supabase.from('users').update(updateData).eq('id', userId)
    setDocsModal(null)
    loadUsers()
  }

  const handleRejectVerification = async (requestId, appOrigin) => {
    if (!rejectNote.trim()) { alert('Escribe un motivo de rechazo'); return }
    const fullNote = `[${appOrigin === 'traficante' ? 'Traficante' : 'Pirata Market'}] ${rejectNote}`
    await supabase.from('verification_requests').update({
      status: 'rejected', admin_note: fullNote, reviewed_at: new Date().toISOString()
    }).eq('id', requestId)
    setDocsModal(null)
    setRejectNote('')
    loadUsers()
  }

  const filtered = users.filter(u => {
    const matchSearch = u.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
    const matchType = filterType === 'all' || u.user_type === filterType
    const vReq = verificationRequests[u.id]
    const matchVerif = filterVerif === 'all' || vReq?.status === filterVerif
    const appOrigin = detectAppOrigin(vReq, u)
    const matchApp = filterApp === 'all' || appOrigin === filterApp
    return matchSearch && matchType && matchVerif && matchApp
  })

  const typeIcon = (type) => type === 'shop' ? '🏪' : type === 'wholesale' ? '📦' : type === 'admin' ? '🔐' : '👤'
  const premiumExpiry = (until) => until ? new Date(until).toLocaleDateString() : ''
  const appBadge = (appOrigin) => appOrigin === 'traficante' 
    ? { icon: '🚚', label: 'Traficante', color: '#E07B39' }
    : { icon: '🏪', label: 'Pirata Market', color: '#B8985F' }

  const pendingCount = Object.values(verificationRequests).filter(r => r?.status === 'pending').length
  const traficantePendingCount = users.filter(u => {
    const vReq = verificationRequests[u.id]
    return vReq?.status === 'pending' && detectAppOrigin(vReq, u) === 'traficante'
  }).length
  const pirataPendingCount = pendingCount - traficantePendingCount

  return (
    <div className="admin-page">
      <AdminNavbar />
      <div className="admin-content">
        <div className="admin-page-header">
          <h1 className="serif luxury-gold">Usuarios</h1>
          <p className="admin-page-sub">{users.length} usuarios registrados • {pendingCount} solicitudes pendientes</p>
        </div>

        {/* ── STATS RÁPIDAS ── */}
        <div className="admin-stats-row">
          <div className="admin-stat-card">
            <div className="admin-stat-icon">📄</div>
            <div className="admin-stat-content">
              <div className="admin-stat-label">Pendientes totales</div>
              <div className="admin-stat-value">{pendingCount}</div>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon">🏪</div>
            <div className="admin-stat-content">
              <div className="admin-stat-label">Pirata Market</div>
              <div className="admin-stat-value">{pirataPendingCount}</div>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon">🚚</div>
            <div className="admin-stat-content">
              <div className="admin-stat-label">Traficante</div>
              <div className="admin-stat-value">{traficantePendingCount}</div>
            </div>
          </div>
        </div>

        <div className="admin-filters-bar">
          <input type="text" className="input" placeholder="Buscar por nombre o email..."
            value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: '320px' }} />
          
          <div className="admin-filter-btns">
            <div className="admin-filter-group">
              <span className="admin-filter-label">Tipo:</span>
              {['all', 'person', 'shop', 'wholesale', 'admin'].map(type => (
                <button key={type} className={`filter-btn ${filterType === type ? 'active' : ''}`} onClick={() => setFilterType(type)}>
                  {type === 'all' ? 'Todos' : typeIcon(type) + ' ' + type}
                </button>
              ))}
            </div>

            <div className="admin-filter-group">
              <span className="admin-filter-label">Verificación:</span>
              {['all', 'pending', 'approved', 'rejected'].map(status => (
                <button key={status} className={`filter-btn ${filterVerif === status ? 'active' : ''}`} onClick={() => setFilterVerif(status)}>
                  {status === 'all' ? 'Todos' : status === 'pending' ? '⏳ Pendiente' : status === 'approved' ? '✓ Aprobado' : '✗ Rechazado'}
                </button>
              ))}
            </div>

            <div className="admin-filter-group">
              <span className="admin-filter-label">App:</span>
              {['all', 'pirata-market', 'traficante'].map(app => (
                <button key={app} className={`filter-btn ${filterApp === app ? 'active' : ''}`} onClick={() => setFilterApp(app)}>
                  {app === 'all' ? 'Todas' : app === 'pirata-market' ? '🏪 Pirata Market' : '🚚 Traficante'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="admin-card">
          {loading ? <div className="admin-loading">Cargando usuarios...</div> : (
            <div className="admin-users-table">
              <div className="admin-users-header">
                <span>Usuario</span>
                <span>Tipo</span>
                <span>App</span>
                <span>Estado</span>
                <span>Premium</span>
                <span>Registro</span>
                <span>Acciones</span>
              </div>
              {filtered.length === 0 ? (
                <div className="admin-no-results">
                  <p>No se encontraron usuarios con los filtros aplicados.</p>
                </div>
              ) : (
                filtered.map(user => {
                  const vReq = verificationRequests[user.id]
                  const hasPendingDocs = vReq?.status === 'pending'
                  const isPremiumActive = user.is_premium && user.premium_until && new Date(user.premium_until) > new Date()
                  const appOrigin = detectAppOrigin(vReq, user)
                  const appInfo = appBadge(appOrigin)

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

                      <div>
                        <span className="admin-badge badge-app" style={{ backgroundColor: `${appInfo.color}20`, color: appInfo.color, borderColor: appInfo.color }}>
                          {appInfo.icon} {appInfo.label}
                        </span>
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
                            onClick={() => { setDocsModal({ user, request: vReq, appOrigin }); setRejectNote('') }}
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
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de documentos mejorado */}
      {docsModal && (
        <div className="docs-modal-overlay" onClick={() => setDocsModal(null)}>
          <div className="docs-modal" onClick={e => e.stopPropagation()}>
            <div className="docs-modal-header">
              <div className="docs-modal-title-row">
                <h3>📄 Documentos de {docsModal.user.display_name}</h3>
                <span className="docs-modal-app-badge" style={{ 
                  backgroundColor: `${appBadge(docsModal.appOrigin).color}20`, 
                  color: appBadge(docsModal.appOrigin).color,
                  borderColor: appBadge(docsModal.appOrigin).color
                }}>
                  {appBadge(docsModal.appOrigin).icon} {appBadge(docsModal.appOrigin).label}
                </span>
              </div>
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

              {/* Docs del negocio / Domicilio y Banco para Traficante */}
              {docsModal.request.business_docs?.length > 0 && (
                <div className="docs-section">
                  <h4>
                    {docsModal.appOrigin === 'traficante' ? '📄 Domicilio & Banco' : '🏪 Negocio / Certificaciones'}
                  </h4>
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

              {docsModal.request.admin_note && (
                <div className="docs-admin-note">
                  <strong>Nota anterior:</strong>
                  <p>{docsModal.request.admin_note}</p>
                </div>
              )}

              {docsModal.request.status === 'pending' && (
                <div className="docs-actions">
                  <button className="btn btn-primary" onClick={() => handleApproveVerification(docsModal.request.id, docsModal.user.id, docsModal.appOrigin)}>
                    ✓ Aprobar verificación
                  </button>
                  <div className="docs-reject">
                    <input type="text" className="input" placeholder="Motivo del rechazo..."
                      value={rejectNote} onChange={e => setRejectNote(e.target.value)} />
                    <button className="btn btn-secondary" onClick={() => handleRejectVerification(docsModal.request.id, docsModal.appOrigin)}>
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
