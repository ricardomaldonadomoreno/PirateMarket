import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import AdminNavbar from '../../components/AdminNavbar'
import './AdminUsuarios.css'

export default function AdminUsuarios() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterVerif, setFilterVerif] = useState('all')
  const [verificationRequests, setVerificationRequests] = useState({}) // { userId: { pirata: req, traficante: req } }
  const [docsModal, setDocsModal] = useState(null) // { user, appSource }
  const [rejectNote, setRejectNote] = useState('')
  const [rejectApp, setRejectApp] = useState('pirata') // app para la que se está rechazando
  const [lightboxImg, setLightboxImg] = useState(null)

  useEffect(() => { loadUsers() }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('users')
        .select(`
          id, display_name, email, user_type, is_verified, is_banned, is_premium, premium_until, 
          created_at, avatar_url, whatsapp,
          shop_name, shop_bio,
          traficante_full_name, traficante_phone_locked, traficante_address_locked,
          traficante_identity_verified, traficante_address_verified, traficante_bank_verified
        `)
        .order('created_at', { ascending: false })
      if (data) {
        setUsers(data)
        // Cargar todas las solicitudes de verificación agrupadas por usuario y app
        const { data: requests } = await supabase
          .from('verification_requests')
          .select('*')
          .in('user_id', data.map(u => u.id))
          .order('created_at', { ascending: false })
        if (requests) {
          const map = {}
          requests.forEach(r => {
            if (!map[r.user_id]) map[r.user_id] = {}
            const appSource = r.app_source || 'pirata'
            if (!map[r.user_id][appSource]) map[r.user_id][appSource] = r
          })
          setVerificationRequests(map)
        }
      }
    } catch (error) { console.error(error) }
    finally { setLoading(false) }
  }

  const filtered = users.filter(user => {
    const matchSearch = user.display_name?.toLowerCase().includes(search.toLowerCase()) || 
                       user.email?.toLowerCase().includes(search.toLowerCase())
    const matchType = filterType === 'all' || user.user_type === filterType
    const matchVerif = filterVerif === 'all' || 
                      (verificationRequests[user.id]?.pirata?.status === filterVerif) ||
                      (verificationRequests[user.id]?.traficante?.status === filterVerif)
    return matchSearch && matchType && matchVerif
  })

  const handleApproveVerification = async (userId, appSource) => {
    const request = verificationRequests[userId]?.[appSource]
    if (!request) return

    try {
      // Actualizar solicitud
      await supabase.from('verification_requests')
        .update({ status: 'approved', reviewed_at: new Date().toISOString() })
        .eq('id', request.id)

      // Actualizar flags de usuario según la app
      const updateData = {}
      if (appSource === 'traficante') {
        updateData.traficante_identity_verified = true
        updateData.traficante_address_verified = true
        updateData.traficante_bank_verified = true
      } else if (appSource === 'pirata') {
        updateData.is_verified = true
      }
      await supabase.from('users').update(updateData).eq('id', userId)

      setDocsModal(null)
      setRejectNote('')
      loadUsers()
    } catch (error) { console.error(error) }
  }

  const handleRejectVerification = async (userId, appSource) => {
    if (!rejectNote.trim()) { alert('Escribe un motivo de rechazo'); return }
    const request = verificationRequests[userId]?.[appSource]
    if (!request) return

    try {
      const appLabel = appSource === 'traficante' ? 'Traficante' : 'Pirata Market'
      const fullNote = `[${appLabel}] ${rejectNote}`
      await supabase.from('verification_requests')
        .update({ status: 'rejected', admin_note: fullNote, reviewed_at: new Date().toISOString() })
        .eq('id', request.id)

      setDocsModal(null)
      setRejectNote('')
      loadUsers()
    } catch (error) { console.error(error) }
  }

  const handleRevokeVerification = async (userId, appSource) => {
    if (!confirm(`¿Revocar verificación de ${appSource === 'traficante' ? 'Traficante' : 'Pirata Market'}?`)) return
    const request = verificationRequests[userId]?.[appSource]
    if (!request) return

    try {
      // Resetear solicitud a pending
      await supabase.from('verification_requests')
        .update({ status: 'pending', admin_note: null, reviewed_at: null })
        .eq('id', request.id)

      // Resetear flags de usuario
      const updateData = {}
      if (appSource === 'traficante') {
        updateData.traficante_identity_verified = false
        updateData.traficante_address_verified = false
        updateData.traficante_bank_verified = false
      } else if (appSource === 'pirata') {
        updateData.is_verified = false
      }
      await supabase.from('users').update(updateData).eq('id', userId)

      setDocsModal(null)
      setRejectNote('')
      loadUsers()
    } catch (error) { console.error(error) }
  }

  const premiumExpiry = (date) => {
    if (!date) return '—'
    const d = new Date(date)
    return d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="admin-page">
      <AdminNavbar />
      <div className="admin-content">
        <div className="admin-page-header">
          <h1 className="serif luxury-gold">Usuarios</h1>
          <p className="admin-page-sub">{users.length} usuarios en total</p>
        </div>

        <div className="admin-filters-bar">
          <input
            type="text" className="input" placeholder="Buscar por nombre o email..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: '300px' }}
          />
          <div className="admin-filter-btns">
            {['all', 'person', 'shop', 'wholesale', 'admin'].map(t => (
              <button key={t} className={`filter-btn ${filterType === t ? 'active' : ''}`} onClick={() => setFilterType(t)}>
                {t === 'all' ? 'Todos' : t === 'person' ? '👤' : t === 'shop' ? '🏪' : t === 'wholesale' ? '📦' : '🔐'}
              </button>
            ))}
          </div>
          <div className="admin-filter-btns">
            {['all', 'pending', 'approved', 'rejected'].map(s => (
              <button key={s} className={`filter-btn ${filterVerif === s ? 'active' : ''}`} onClick={() => setFilterVerif(s)}>
                {s === 'all' ? 'Todos' : s === 'pending' ? '⏳' : s === 'approved' ? '✓' : '✗'}
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
                <span>Verif. Pirata</span>
                <span>Verif. Traficante</span>
                <span>Premium</span>
                <span>Acciones</span>
              </div>
              {filtered.length === 0 ? (
                <div className="admin-no-results">
                  <p>No se encontraron usuarios con los filtros aplicados.</p>
                </div>
              ) : (
                filtered.map(user => {
                  const pirataReq = verificationRequests[user.id]?.pirata
                  const trafReq = verificationRequests[user.id]?.traficante
                  const isPremiumActive = user.is_premium && user.premium_until && new Date(user.premium_until) > new Date()

                  return (
                    <div key={user.id} className="admin-user-row">
                      <div className="admin-user-info">
                        <div className="admin-user-avatar">
                          {user.avatar_url ? <img src={user.avatar_url} alt={user.display_name} /> : <span>👤</span>}
                        </div>
                        <div>
                          <div className="admin-user-name">{user.display_name || user.email}</div>
                          <div className="admin-user-email">{user.email}</div>
                        </div>
                      </div>

                      <div>
                        <select className="admin-type-select" disabled style={{ opacity: 0.6 }}>
                          <option value={user.user_type}>
                            {user.user_type === 'person' ? '👤' : user.user_type === 'shop' ? '🏪' : user.user_type === 'wholesale' ? '📦' : '🔐'} {user.user_type}
                          </option>
                        </select>
                      </div>

                      {/* Verificación Pirata Market */}
                      <div className="admin-verif-cell">
                        {pirataReq ? (
                          <div className={`admin-verif-badge ${pirataReq.status}`}>
                            {pirataReq.status === 'pending' && '⏳ Pendiente'}
                            {pirataReq.status === 'approved' && '✓ Verificado'}
                            {pirataReq.status === 'rejected' && '✗ Rechazado'}
                            <button className="admin-verif-btn" onClick={() => setDocsModal({ user, appSource: 'pirata' })}>
                              📄
                            </button>
                          </div>
                        ) : <span className="admin-text-muted">—</span>}
                      </div>

                      {/* Verificación Traficante */}
                      <div className="admin-verif-cell">
                        {trafReq ? (
                          <div className={`admin-verif-badge ${trafReq.status}`}>
                            {trafReq.status === 'pending' && '⏳ Pendiente'}
                            {trafReq.status === 'approved' && '✓ Verificado'}
                            {trafReq.status === 'rejected' && '✗ Rechazado'}
                            <button className="admin-verif-btn" onClick={() => setDocsModal({ user, appSource: 'traficante' })}>
                              📄
                            </button>
                          </div>
                        ) : <span className="admin-text-muted">—</span>}
                      </div>

                      <div className="admin-premium-cell">
                        {isPremiumActive ? (
                          <div>
                            <span className="admin-badge badge-premium">⭐ Premium</span>
                            <div className="premium-expiry">hasta {premiumExpiry(user.premium_until)}</div>
                          </div>
                        ) : <span className="admin-badge badge-free">Básico</span>}
                      </div>

                      <div className="admin-user-actions">
                        {user.is_banned && <span className="admin-badge badge-banned">🚫 Baneado</span>}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE DOCUMENTOS */}
      {docsModal && (
        <div className="admin-modal-overlay" onClick={() => setDocsModal(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>Documentos de {docsModal.appSource === 'traficante' ? '🚚 Traficante' : '🏪 Pirata Market'}</h2>
              <button className="admin-modal-close" onClick={() => setDocsModal(null)}>✕</button>
            </div>

            <div className="admin-modal-body">
              <div className="admin-docs-user-info">
                <strong>{docsModal.user.display_name}</strong> ({docsModal.user.email})
              </div>

              {(() => {
                const request = verificationRequests[docsModal.user.id]?.[docsModal.appSource]
                if (!request) return <p>No hay solicitud de verificación</p>

                const isTraficante = docsModal.appSource === 'traficante'
                const identityDocs = request.identity_docs || []
                const businessDocs = request.business_docs || []

                return (
                  <>
                    {/* Documentos de Identidad */}
                    <div className="admin-docs-section">
                      <h3>🪪 Documentos de Identidad</h3>
                      {identityDocs.length === 0 ? (
                        <p className="admin-text-muted">Sin documentos</p>
                      ) : (
                        <div className="admin-docs-grid">
                          {identityDocs.map((url, i) => (
                            <div key={i} className="admin-doc-thumb" onClick={() => setLightboxImg(url)}>
                              <img src={url} alt={`Identidad ${i + 1}`} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Documentos de Negocio / Domicilio y Banco */}
                    <div className="admin-docs-section">
                      <h3>{isTraficante ? '📄 Domicilio & Banco' : '📦 Documentos de Negocio'}</h3>
                      {businessDocs.length === 0 ? (
                        <p className="admin-text-muted">Sin documentos</p>
                      ) : (
                        <div className="admin-docs-grid">
                          {businessDocs.map((url, i) => (
                            <div key={i} className="admin-doc-thumb" onClick={() => setLightboxImg(url)}>
                              <img src={url} alt={`Doc ${i + 1}`} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Notas de Admin */}
                    {request.admin_note && (
                      <div className="admin-docs-note">
                        <strong>Nota del administrador:</strong>
                        <p>{request.admin_note}</p>
                      </div>
                    )}

                    {/* Acciones */}
                    {request.status === 'pending' && (
                      <div className="admin-docs-actions">
                        <button className="btn btn-success" onClick={() => handleApproveVerification(docsModal.user.id, docsModal.appSource)}>
                          ✓ Aprobar
                        </button>
                        <div className="admin-reject-box">
                          <textarea
                            className="input"
                            placeholder="Motivo del rechazo..."
                            value={rejectNote}
                            onChange={e => setRejectNote(e.target.value)}
                            rows={2}
                          />
                          <button className="btn btn-danger" onClick={() => handleRejectVerification(docsModal.user.id, docsModal.appSource)}>
                            ✗ Rechazar
                          </button>
                        </div>
                      </div>
                    )}

                    {request.status === 'approved' && (
                      <div className="admin-docs-actions">
                        <button className="btn btn-warning" onClick={() => handleRevokeVerification(docsModal.user.id, docsModal.appSource)}>
                          🔄 Revocar Verificación
                        </button>
                      </div>
                    )}

                    {request.status === 'rejected' && (
                      <div className="admin-docs-actions">
                        <button className="btn btn-primary" onClick={() => handleRevokeVerification(docsModal.user.id, docsModal.appSource)}>
                          🔄 Volver a Revisar
                        </button>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX */}
      {lightboxImg && (
        <div className="admin-lightbox" onClick={() => setLightboxImg(null)}>
          <img src={lightboxImg} alt="Documento" />
        </div>
      )}
    </div>
  )
}
