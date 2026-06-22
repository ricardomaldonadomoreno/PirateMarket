import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import AdminNavbar from '../../components/AdminNavbar'
import './AdminUsuarios.css'

// ── HELPERS ──
const fmt = (date) => date ? new Date(date).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'

export default function AdminUsuarios() {
  const [users, setUsers]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filterType, setFilterType] = useState('all')

  // verification_requests keyed by user_id (solo la más reciente)
  const [verificationRequests, setVerificationRequests] = useState({})
  // anuncios activos keyed by user_id
  const [activeListings, setActiveListings] = useState({})

  // Modal de documentos
  const [docsModal, setDocsModal] = useState(null) // { user, request }

  // Notas separadas por capa para evitar pisarse
  const [rejectNotes, setRejectNotes] = useState({ identity: '', business: '' })

  // Nota informativa (no rechazo)
  const [infoNote, setInfoNote]       = useState('')
  const [sendingNote, setSendingNote] = useState(false)
  const [noteSent, setNoteSent]       = useState(false)

  // Lightbox con navegación
  const [lightbox, setLightbox] = useState(null) // { images: [], index: 0 }

  // ── CARGA DATOS ──
  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const { data: usersData } = await supabase
        .from('users')
        .select(`
          id, display_name, email, user_type, is_verified, is_banned, is_premium, premium_until,
          created_at, avatar_url, whatsapp, shop_name,
          full_name, country, city, phone,
          identity_verified, identity_locked, business_verified, allow_identity_edit
        `)
        .order('created_at', { ascending: false })

      if (!usersData) return
      setUsers(usersData)

      const userIds = usersData.map(u => u.id)

      // ── Bug fix: el campo es 'source', no 'app_source' ──
      const { data: requests } = await supabase
        .from('verification_requests')
        .select('*')
        .eq('source', 'pirata')
        .in('user_id', userIds)
        .order('created_at', { ascending: false })

      if (requests) {
        const map = {}
        requests.forEach(r => { if (!map[r.user_id]) map[r.user_id] = r })
        setVerificationRequests(map)
      }

      // Conteo de anuncios activos por usuario
      const { data: listings } = await supabase
        .from('listings')
        .select('user_id')
        .in('user_id', userIds)
        .eq('status', 'active')

      if (listings) {
        const counts = {}
        listings.forEach(l => { counts[l.user_id] = (counts[l.user_id] || 0) + 1 })
        setActiveListings(counts)
      }
    } catch (error) { console.error(error) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  // Refresca datos y también actualiza el modal abierto para que no quede obsoleto
  const refreshAll = async (userId) => {
    await loadUsers()
    if (docsModal?.user?.id === userId) {
      const { data: freshUser } = await supabase
        .from('users')
        .select(`
          id, display_name, email, user_type, is_verified, is_banned, is_premium, premium_until,
          created_at, avatar_url, whatsapp, shop_name,
          full_name, country, city, phone,
          identity_verified, identity_locked, business_verified, allow_identity_edit
        `)
        .eq('id', userId)
        .single()
      const { data: freshReq } = await supabase
        .from('verification_requests')
        .select('*')
        .eq('source', 'pirata')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (freshUser) setDocsModal({ user: freshUser, request: freshReq || null })
    }
  }

  // ── ACCIONES DE USUARIO ──
  const handleBan = async (userId, isBanned) => {
    if (!confirm(isBanned ? '¿Desbanear este usuario?' : '¿Banear este usuario?')) return
    await supabase.from('users').update({ is_banned: !isBanned }).eq('id', userId)
    refreshAll(userId)
  }

  const handleChangeType = async (userId, newType) => {
    await supabase.from('users').update({ user_type: newType }).eq('id', userId)
    refreshAll(userId)
  }

  const handleTogglePremium = async (userId, isPremium) => {
    if (isPremium) {
      await supabase.from('users').update({ is_premium: false, premium_until: null }).eq('id', userId)
    } else {
      const until = new Date()
      until.setFullYear(until.getFullYear() + 1)
      await supabase.from('users').update({ is_premium: true, premium_until: until.toISOString() }).eq('id', userId)
    }
    refreshAll(userId)
  }

  // ── VERIFICACIÓN EN CAPAS ──
  const handleApproveIdentity = async (requestId, userId) => {
    const now = new Date().toISOString()
    await supabase.from('verification_requests').update({
      status: 'approved',
      reviewed_at: now,
    }).eq('id', requestId)
    await supabase.from('users').update({
      identity_verified: true,
      identity_locked: true,
      allow_identity_edit: false,
    }).eq('id', userId)

    // Para tipo 'person', la Capa 1 es suficiente para is_verified
    const targetUser = users.find(u => u.id === userId)
    if (targetUser?.user_type === 'person') {
      await supabase.from('users').update({ is_verified: true }).eq('id', userId)
    }

    await refreshAll(userId)
  }

  const handleApproveBusiness = async (requestId, userId) => {
    const now = new Date().toISOString()
    // Bug fix: también actualiza verification_requests, no solo users
    await supabase.from('verification_requests').update({
      status: 'approved',
      reviewed_at: now,
    }).eq('id', requestId)
    await supabase.from('users').update({
      business_verified: true,
      is_verified: true,
    }).eq('id', userId)
    await refreshAll(userId)
  }

  const handleRejectLayer = async (requestId, layer) => {
    const note = rejectNotes[layer]
    if (!note.trim()) { alert('Escribe un motivo de rechazo'); return }
    const now = new Date().toISOString()
    await supabase.from('verification_requests').update({
      status: 'rejected',
      admin_note: note,
      reviewed_at: now,
    }).eq('id', requestId)

    const userId = docsModal.user.id
    if (layer === 'identity') {
      await supabase.from('users').update({ identity_verified: false }).eq('id', userId)
    } else {
      await supabase.from('users').update({ business_verified: false, is_verified: false }).eq('id', userId)
    }

    setRejectNotes(prev => ({ ...prev, [layer]: '' }))
    await refreshAll(userId)
  }

  const handleRevokeVerification = async (userId, layer) => {
    if (!confirm(`¿Revocar verificación de ${layer === 'identity' ? 'Identidad' : 'Negocio'}?`)) return
    if (layer === 'identity') {
      await supabase.from('users').update({
        identity_verified: false,
        identity_locked: false,
        is_verified: false,
      }).eq('id', userId)
    } else {
      await supabase.from('users').update({
        business_verified: false,
        is_verified: false,
      }).eq('id', userId)
    }
    await refreshAll(userId)
  }

  const handleAllowIdentityEdit = async (userId, currentValue) => {
    await supabase.from('users').update({
      allow_identity_edit: !currentValue,
      identity_locked: currentValue,
    }).eq('id', userId)
    await refreshAll(userId)
  }

  // ── NOTA INFORMATIVA (sin rechazar) ──
  const handleSendInfoNote = async () => {
    if (!infoNote.trim()) { alert('Escribe un mensaje para el usuario'); return }
    setSendingNote(true)
    const requestId = docsModal.request?.id
    if (requestId) {
      await supabase.from('verification_requests').update({
        admin_note: infoNote.trim(),
      }).eq('id', requestId)
    }
    setSendingNote(false)
    setNoteSent(true)
    setInfoNote('')
    setTimeout(() => setNoteSent(false), 3000)
    await refreshAll(docsModal.user.id)
  }

  // ── LIGHTBOX con navegación ──
  const openLightbox = (images, index) => setLightbox({ images, index })
  const closeLightbox = () => setLightbox(null)
  const lightboxPrev = () => setLightbox(prev => ({ ...prev, index: Math.max(0, prev.index - 1) }))
  const lightboxNext = () => setLightbox(prev => ({ ...prev, index: Math.min(prev.images.length - 1, prev.index + 1) }))

  // Teclas para lightbox
  useEffect(() => {
    if (!lightbox) return
    const handler = (e) => {
      if (e.key === 'ArrowLeft') lightboxPrev()
      if (e.key === 'ArrowRight') lightboxNext()
      if (e.key === 'Escape') closeLightbox()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightbox])

  // ── EXPORT CSV ──
  const exportCSV = () => {
    const headers = ['Nombre', 'Email', 'WhatsApp', 'Tipo', 'Tienda', 'Anuncios Activos', 'ID Verif', 'Neg Verif', 'Premium', 'Registro']
    const rows = filtered.map(u => [
      u.display_name || '', u.email || '', u.whatsapp || '', u.user_type || '', u.shop_name || '',
      activeListings[u.id] || 0,
      u.identity_verified ? 'Sí' : 'No', u.business_verified ? 'Sí' : 'No',
      u.is_premium ? 'Sí' : 'No',
      fmt(u.created_at)
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `usuarios_pirata_${Date.now()}.csv`
    a.click()
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    const matchSearch = u.display_name?.toLowerCase().includes(q) ||
                        u.email?.toLowerCase().includes(q) ||
                        u.shop_name?.toLowerCase().includes(q) ||
                        u.whatsapp?.toLowerCase().includes(q)
    const matchType = filterType === 'all' || u.user_type === filterType
    return matchSearch && matchType
  })

  // ── RENDER ──
  return (
    <div className="admin-page">
      <AdminNavbar />
      <div className="admin-content">
        <div className="admin-page-header">
          <h1 className="serif luxury-gold">Gestión de Usuarios — Pirata Market</h1>
          <button className="btn btn-secondary btn-sm" onClick={exportCSV}>Exportar CSV</button>
        </div>

        <div className="admin-filters-bar">
          <input type="text" className="input" placeholder="Buscar nombre, email, WhatsApp o tienda..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <div className="admin-filter-btns">
            {['all', 'person', 'shop', 'wholesale'].map(t => (
              <button key={t}
                className={`filter-btn ${filterType === t ? 'active' : ''}`}
                onClick={() => setFilterType(t)}>
                {t === 'all' ? 'Todos' : t === 'person' ? 'Persona' : t === 'shop' ? 'Tienda' : 'Mayorista'}
              </button>
            ))}
          </div>
        </div>

        <div className="admin-card">
          {loading ? <div className="admin-loading">Cargando...</div> : (
            <div className="admin-users-table">
              <div className="admin-users-header">
                <span>Usuario / Tienda</span>
                <span>Contacto</span>
                <span>Tipo</span>
                <span>Identidad</span>
                <span>Negocio</span>
                <span>Premium</span>
                <span>Anuncios</span>
                <span>Acciones</span>
              </div>

              {filtered.length === 0 && (
                <div className="admin-empty">No se encontraron usuarios.</div>
              )}

              {filtered.map(user => {
                const vReq     = verificationRequests[user.id]
                const isPremium = user.is_premium && user.premium_until && new Date(user.premium_until) > new Date()
                const listCount = activeListings[user.id] || 0

                const identityStatus = user.identity_verified ? 'verified'
                  : vReq?.identity_docs?.length ? 'pending' : 'none'
                const businessStatus = user.business_verified ? 'verified'
                  : vReq?.business_docs?.length ? 'pending' : 'none'

                return (
                  <div key={user.id} className={`admin-user-row ${user.is_banned ? 'banned' : ''}`}>

                    {/* Columna 1: Avatar + nombre + email */}
                    <div className="admin-user-info">
                      <div className="admin-user-avatar">
                        {user.avatar_url
                          ? <img src={user.avatar_url} alt={user.display_name} />
                          : <span>{user.display_name?.[0]?.toUpperCase()}</span>}
                      </div>
                      <div>
                        <div className="admin-user-name">
                          {user.display_name}
                          {user.is_verified && <span className="admin-verified-dot" title="Verificado">✓</span>}
                          {user.is_banned && <span className="admin-banned-label">BANEADO</span>}
                        </div>
                        {user.shop_name && <div className="admin-user-shop">🏪 {user.shop_name}</div>}
                        <div className="admin-user-email">{user.email}</div>
                        <div className="admin-user-date">Registro: {fmt(user.created_at)}</div>
                      </div>
                    </div>

                    {/* Columna 2: Contacto */}
                    <div className="admin-user-contact">
                      {user.whatsapp
                        ? <a href={`https://wa.me/${user.whatsapp.replace(/\D/g, '')}`}
                            target="_blank" rel="noreferrer"
                            className="admin-wa-link">
                            📱 {user.whatsapp}
                          </a>
                        : <span className="admin-text-muted">Sin WhatsApp</span>
                      }
                    </div>

                    {/* Columna 3: Tipo */}
                    <div>
                      <select className="admin-type-select"
                        value={user.user_type}
                        onChange={e => handleChangeType(user.id, e.target.value)}>
                        <option value="person">👤 Persona</option>
                        <option value="shop">🏪 Tienda</option>
                        <option value="wholesale">📦 Mayorista</option>
                      </select>
                    </div>

                    {/* Columna 4: Identidad */}
                    <div>
                      <span className={`admin-badge badge-${identityStatus}`}>
                        {identityStatus === 'verified' ? '✓ Verificada'
                          : identityStatus === 'pending' ? '⏳ Pendiente'
                          : '— Sin datos'}
                      </span>
                    </div>

                    {/* Columna 5: Negocio */}
                    <div>
                      {user.user_type !== 'person' ? (
                        <span className={`admin-badge badge-${businessStatus}`}>
                          {businessStatus === 'verified' ? '✓ Verificado'
                            : businessStatus === 'pending' ? '⏳ Pendiente'
                            : '— Sin datos'}
                        </span>
                      ) : <span className="admin-text-muted">—</span>}
                    </div>

                    {/* Columna 6: Premium */}
                    <div>
                      <span className={`admin-badge ${isPremium ? 'badge-premium' : 'badge-none'}`}>
                        {isPremium
                          ? <>⭐ hasta<br />{fmt(user.premium_until)}</>
                          : 'Básico'}
                      </span>
                    </div>

                    {/* Columna 7: Anuncios activos */}
                    <div className="admin-listing-count">
                      <span className={listCount > 0 ? 'count-active' : 'count-zero'}>
                        {listCount}
                      </span>
                    </div>

                    {/* Columna 8: Acciones */}
                    <div className="admin-user-actions">
                      <button className="btn-action"
                        onClick={() => {
                          setRejectNotes({ identity: '', business: '' })
                          setInfoNote('')
                          setNoteSent(false)
                          setDocsModal({ user, request: vReq })
                        }}>
                        Revisar
                      </button>
                      <button
                        className={`btn-action ${isPremium ? 'btn-danger' : 'btn-success'}`}
                        onClick={() => handleTogglePremium(user.id, isPremium)}>
                        {isPremium ? 'Quitar Premium' : 'Dar Premium'}
                      </button>
                      <button
                        className={`btn-action ${user.is_banned ? 'btn-success' : 'btn-danger'}`}
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

      {/* ══ MODAL DE DOCUMENTOS ══ */}
      {docsModal && (
        <div className="docs-modal-overlay" onClick={() => setDocsModal(null)}>
          <div className="docs-modal" onClick={e => e.stopPropagation()}>

            <div className="docs-modal-header">
              <div>
                <h3>{docsModal.user.display_name}</h3>
                <p className="docs-modal-email">{docsModal.user.email}</p>
              </div>
              <button className="close-btn" onClick={() => setDocsModal(null)}>✕</button>
            </div>

            <div className="docs-modal-body">

              {/* ── DATOS REALES ── */}
              <div className="docs-section">
                <h4>👤 Datos de Identidad Real</h4>
                <div className="real-data-grid">
                  <div className="data-item"><label>Nombre completo</label><span>{docsModal.user.full_name || '—'}</span></div>
                  <div className="data-item"><label>País</label><span>{docsModal.user.country || '—'}</span></div>
                  <div className="data-item"><label>Ciudad</label><span>{docsModal.user.city || '—'}</span></div>
                  <div className="data-item"><label>Teléfono</label><span>{docsModal.user.phone || '—'}</span></div>
                </div>
              </div>

              {/* ── CAPA 1: IDENTIDAD ── */}
              <div className="docs-section">
                <div className="section-title-row">
                  <h4>🪪 Capa 1: Identidad Personal</h4>
                  <div className="section-actions">
                    {docsModal.user.identity_verified && (
                      <>
                        <button className="btn-small btn-warning"
                          onClick={() => handleRevokeVerification(docsModal.user.id, 'identity')}>
                          Revocar
                        </button>
                        <button className="btn-small btn-secondary"
                          onClick={() => handleAllowIdentityEdit(docsModal.user.id, docsModal.user.allow_identity_edit)}>
                          {docsModal.user.allow_identity_edit ? 'Bloquear edición' : 'Permitir edición'}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {docsModal.request?.identity_docs?.length > 0 ? (
                  <>
                    <div className="docs-grid">
                      {docsModal.request.identity_docs.map((url, i) => (
                        <div key={i} className="doc-card"
                          onClick={() => openLightbox(docsModal.request.identity_docs, i)}>
                          <img src={url} alt={i === 0 ? 'Anverso' : 'Reverso'} />
                          <span>{i === 0 ? 'Anverso' : 'Reverso'}</span>
                        </div>
                      ))}
                    </div>

                    {!docsModal.user.identity_verified && (
                      <div className="approval-actions">
                        <button className="btn btn-success"
                          onClick={() => handleApproveIdentity(docsModal.request.id, docsModal.user.id)}>
                          ✓ Aprobar Identidad
                        </button>
                        <div className="reject-box">
                          <input type="text"
                            placeholder="Motivo de rechazo..."
                            value={rejectNotes.identity}
                            onChange={e => setRejectNotes(p => ({ ...p, identity: e.target.value }))} />
                          <button className="btn btn-danger"
                            onClick={() => handleRejectLayer(docsModal.request.id, 'identity')}>
                            Rechazar
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="docs-empty">El usuario aún no subió documentos de identidad.</p>
                )}
              </div>

              {/* ── CAPA 2: NEGOCIO ── */}
              {docsModal.user.user_type !== 'person' && (
                <div className="docs-section">
                  <div className="section-title-row">
                    <h4>🏪 Capa 2: Verificación de Negocio</h4>
                    {docsModal.user.business_verified && (
                      <button className="btn-small btn-warning"
                        onClick={() => handleRevokeVerification(docsModal.user.id, 'business')}>
                        Revocar
                      </button>
                    )}
                  </div>

                  {docsModal.request?.business_docs?.length > 0 ? (
                    <>
                      <div className="docs-grid">
                        {docsModal.request.business_docs.map((url, i) => (
                          <div key={i} className="doc-card"
                            onClick={() => openLightbox(docsModal.request.business_docs, i)}>
                            <img src={url} alt={`Doc ${i + 1}`} />
                            <span>Documento {i + 1}</span>
                          </div>
                        ))}
                      </div>

                      {!docsModal.user.business_verified && (
                        <div className="approval-actions">
                          <button className="btn btn-success"
                            onClick={() => handleApproveBusiness(docsModal.request.id, docsModal.user.id)}>
                            ✓ Aprobar Negocio
                          </button>
                          <div className="reject-box">
                            <input type="text"
                              placeholder="Motivo de rechazo..."
                              value={rejectNotes.business}
                              onChange={e => setRejectNotes(p => ({ ...p, business: e.target.value }))} />
                            <button className="btn btn-danger"
                              onClick={() => handleRejectLayer(docsModal.request.id, 'business')}>
                              Rechazar
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="docs-empty">El usuario aún no subió documentos de negocio.</p>
                  )}
                </div>
              )}

              {/* ── NOTA INFORMATIVA (no rechaza, solo informa) ── */}
              {docsModal.request && (
                <div className="docs-section docs-section-note">
                  <h4>💬 Enviar nota al usuario</h4>
                  <p className="docs-hint">
                    El usuario verá este mensaje en su panel de Verificación como "Nota del administrador".
                    No cambia el estado de su solicitud.
                  </p>
                  {docsModal.request.admin_note && (
                    <div className="current-note">
                      <label>Nota actual:</label>
                      <p>"{docsModal.request.admin_note}"</p>
                    </div>
                  )}
                  <div className="note-input-row">
                    <textarea
                      className="input note-textarea"
                      rows={3}
                      placeholder="Ej: Tu foto está borrosa, por favor sube una nueva imagen..."
                      value={infoNote}
                      onChange={e => setInfoNote(e.target.value)}
                    />
                    <button className="btn btn-secondary"
                      onClick={handleSendInfoNote}
                      disabled={sendingNote || !infoNote.trim()}>
                      {sendingNote ? 'Enviando...' : 'Enviar nota'}
                    </button>
                  </div>
                  {noteSent && <p className="note-sent">✓ Nota enviada correctamente</p>}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ══ LIGHTBOX CON NAVEGACIÓN ══ */}
      {lightbox && (
        <div className="lightbox-overlay" onClick={closeLightbox}>
          <button className="lightbox-close" onClick={closeLightbox}>✕</button>

          <button
            className="lightbox-nav lightbox-prev"
            onClick={e => { e.stopPropagation(); lightboxPrev() }}
            disabled={lightbox.index === 0}>
            ‹
          </button>

          <div className="lightbox-img-wrap" onClick={e => e.stopPropagation()}>
            <img src={lightbox.images[lightbox.index]} alt={`Doc ${lightbox.index + 1}`} />
            <div className="lightbox-counter">
              {lightbox.index + 1} / {lightbox.images.length}
            </div>
          </div>

          <button
            className="lightbox-nav lightbox-next"
            onClick={e => { e.stopPropagation(); lightboxNext() }}
            disabled={lightbox.index === lightbox.images.length - 1}>
            ›
          </button>
        </div>
      )}
    </div>
  )
}
