import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import AdminNavbarPirata from '../../../components/AdminNavbarPirata'
import './AdminUsuarios.css'

const fmt = (date) => date ? new Date(date).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'
const typeLabel = (type) => type === 'shop' ? 'Tienda' : type === 'wholesale' ? 'Mayorista' : 'Persona'

export default function AdminUsuarios() {
  const [users, setUsers]                             = useState([])
  const [loading, setLoading]                         = useState(true)
  const [search, setSearch]                           = useState('')
  const [filterType, setFilterType]                   = useState('all')
  const [verificationRequests, setVerificationRequests] = useState({})
  const [activeListings, setActiveListings]           = useState({})
  const [docsModal, setDocsModal]                     = useState(null)
  const [rejectNotes, setRejectNotes]                 = useState({ identity: '', business: '' })
  const [infoNote, setInfoNote]                       = useState('')
  const [sendingNote, setSendingNote]                 = useState(false)
  const [noteSent, setNoteSent]                       = useState(false)
  const [lightbox, setLightbox]                       = useState(null)

  useEffect(() => { loadUsers() }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id, display_name, email, user_type,
          is_verified, is_banned, is_premium, premium_until,
          created_at, avatar_url, whatsapp,
          pirata_profiles!inner(
            full_name, country, city, phone, shop_name,
            identity_verified, identity_locked, business_verified, allow_identity_edit
          )
        `)
        .neq('user_type', 'collaborator')
        .order('created_at', { ascending: false })

      if (error) { console.error('loadUsers error:', error); setLoading(false); return }
      if (data) await processUsers(data)
    } catch (err) {
      console.error('loadUsers error:', err)
    } finally {
      setLoading(false)
    }
  }

  const processUsers = async (usersData) => {
    // Aplanar pirata_profiles al nivel del usuario para compatibilidad con el resto del código
    const flattened = usersData.map(u => ({
      ...u,
      full_name: u.pirata_profiles?.full_name || null,
      country: u.pirata_profiles?.country || null,
      city: u.pirata_profiles?.city || null,
      phone: u.pirata_profiles?.phone || null,
      shop_name: u.pirata_profiles?.shop_name || null,
      identity_verified: u.pirata_profiles?.identity_verified || false,
      identity_locked: u.pirata_profiles?.identity_locked || false,
      business_verified: u.pirata_profiles?.business_verified || false,
      allow_identity_edit: u.pirata_profiles?.allow_identity_edit || false,
    }))
    setUsers(flattened)
    const userIds = usersData.map(u => u.id)

    const { data: requests } = await supabase
      .from('verification_requests')
      .select('*')
      .in('user_id', userIds)
      .eq('source', 'pirata')
      .order('created_at', { ascending: false })

    if (requests) {
      const map = {}
      requests.forEach(r => { if (!map[r.user_id]) map[r.user_id] = r })
      setVerificationRequests(map)
    }

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
  }

  const refreshAll = async (userId) => {
    await loadUsers()
    if (docsModal?.user?.id === userId) {
      const { data: freshUser } = await supabase
        .from('users')
        .select('id, display_name, email, user_type, is_verified, is_banned, is_premium, premium_until, created_at, avatar_url, whatsapp, pirata_profiles(full_name, country, city, phone, shop_name, identity_verified, identity_locked, business_verified, allow_identity_edit)')
        .eq('id', userId)
        .single()
      // Aplanar pirata_profiles
      const flatUser = freshUser ? {
        ...freshUser,
        full_name: freshUser.pirata_profiles?.full_name || null,
        country: freshUser.pirata_profiles?.country || null,
        city: freshUser.pirata_profiles?.city || null,
        phone: freshUser.pirata_profiles?.phone || null,
        shop_name: freshUser.pirata_profiles?.shop_name || null,
        identity_verified: freshUser.pirata_profiles?.identity_verified || false,
        identity_locked: freshUser.pirata_profiles?.identity_locked || false,
        business_verified: freshUser.pirata_profiles?.business_verified || false,
        allow_identity_edit: freshUser.pirata_profiles?.allow_identity_edit || false,
      } : null
      const { data: freshReq } = await supabase
        .from('verification_requests')
        .select('*')
        .eq('user_id', userId)
        .eq('source', 'pirata')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (flatUser) setDocsModal({ user: flatUser, request: freshReq || null })
    }
  }

  const handleBan = async (userId, isBanned) => {
    if (!confirm(isBanned ? 'Desbanear este usuario?' : 'Banear este usuario?')) return
    await supabase.from('users').update({ is_banned: !isBanned }).eq('id', userId)
    refreshAll(userId)
  }

  const handleVerify = async (userId, isVerified) => {
    await supabase.from('users').update({ is_verified: !isVerified }).eq('id', userId)
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

  // -- VERIFICACION EN CAPAS --
  const handleApproveIdentity = async (requestId, userId) => {
    const now = new Date().toISOString()
    await supabase.from('verification_requests').update({ status: 'approved', reviewed_at: now }).eq('id', requestId)
    await supabase.from('pirata_profiles').update({ identity_verified: true, identity_locked: true, allow_identity_edit: false }).eq('user_id', userId)
    const targetUser = users.find(u => u.id === userId)
    if (targetUser?.user_type === 'person') {
      await supabase.from('users').update({ is_verified: true }).eq('id', userId)
    }
    await refreshAll(userId)
  }

  const handleApproveBusiness = async (requestId, userId) => {
    const now = new Date().toISOString()
    await supabase.from('verification_requests').update({ status: 'approved', reviewed_at: now }).eq('id', requestId)
    await supabase.from('pirata_profiles').update({ business_verified: true }).eq('user_id', userId)
    await supabase.from('users').update({ is_verified: true }).eq('id', userId)
    await refreshAll(userId)
  }

  const handleRejectLayer = async (requestId, layer) => {
    const note = rejectNotes[layer]
    if (!note.trim()) { alert('Escribe un motivo de rechazo'); return }
    await supabase.from('verification_requests').update({
      status: 'rejected', admin_note: note, reviewed_at: new Date().toISOString()
    }).eq('id', requestId)
    const userId = docsModal.user.id
    if (layer === 'identity') {
      await supabase.from('pirata_profiles').update({ identity_verified: false, identity_locked: false }).eq('user_id', userId)
    } else {
      await supabase.from('pirata_profiles').update({ business_verified: false }).eq('user_id', userId)
      await supabase.from('users').update({ is_verified: false }).eq('id', userId)
    }
    setRejectNotes(p => ({ ...p, [layer]: '' }))
    await refreshAll(userId)
  }

  const handleApproveVerification = async (requestId, userId) => {
    await supabase.from('verification_requests').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', requestId)
    await supabase.from('users').update({ is_verified: true }).eq('id', userId)
    await refreshAll(userId)
  }

  const handleRevokeVerification = async (userId, layer) => {
    if (!confirm(`Revocar verificacion de ${layer === 'identity' ? 'Identidad' : 'Negocio'}?`)) return
    if (layer === 'identity') {
      await supabase.from('pirata_profiles').update({ identity_verified: false, identity_locked: false }).eq('user_id', userId)
      await supabase.from('users').update({ is_verified: false }).eq('id', userId)
    } else {
      await supabase.from('pirata_profiles').update({ business_verified: false }).eq('user_id', userId)
      await supabase.from('users').update({ is_verified: false }).eq('id', userId)
    }
    await refreshAll(userId)
  }

  const handleAllowIdentityEdit = async (userId, current) => {
    await supabase.from('pirata_profiles').update({ allow_identity_edit: !current, identity_locked: current }).eq('user_id', userId)
    await refreshAll(userId)
  }

  // -- NOTA INFORMATIVA --
  const handleSendInfoNote = async () => {
    if (!infoNote.trim()) { alert('Escribe un mensaje'); return }
    setSendingNote(true)
    if (docsModal?.request?.id) {
      await supabase.from('verification_requests').update({ admin_note: infoNote.trim() }).eq('id', docsModal.request.id)
    }
    setSendingNote(false)
    setNoteSent(true)
    setInfoNote('')
    setTimeout(() => setNoteSent(false), 3000)
    await refreshAll(docsModal.user.id)
  }

  // -- LIGHTBOX --
  const openLightbox  = (images, index) => setLightbox({ images, index })
  const closeLightbox = () => setLightbox(null)
  const lbPrev = () => setLightbox(p => ({ ...p, index: Math.max(0, p.index - 1) }))
  const lbNext = () => setLightbox(p => ({ ...p, index: Math.min(p.images.length - 1, p.index + 1) }))

  useEffect(() => {
    if (!lightbox) return
    const fn = (e) => {
      if (e.key === 'ArrowLeft') lbPrev()
      if (e.key === 'ArrowRight') lbNext()
      if (e.key === 'Escape') closeLightbox()
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [lightbox])

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    const matchSearch = u.display_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.whatsapp?.toLowerCase().includes(q) ||
      u.shop_name?.toLowerCase().includes(q)
    const matchType = filterType === 'all' || u.user_type === filterType
    return matchSearch && matchType
  })

  return (
    <div className="admin-page">
      <AdminNavbarPirata />
      <div className="admin-content">
        <div className="admin-page-header">
          <h1 className="serif luxury-gold">Usuarios</h1>
          <p className="admin-page-sub">{users.length} usuarios registrados</p>
        </div>

        <div className="admin-filters-bar">
          <input type="text" className="input" placeholder="Buscar nombre, email, WhatsApp o tienda..."
            value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: '320px' }} />
          <div className="admin-filter-btns">
            {['all', 'person', 'shop', 'wholesale'].map(type => (
              <button key={type}
                className={`filter-btn ${filterType === type ? 'active' : ''}`}
                onClick={() => setFilterType(type)}>
                {type === 'all' ? 'Todos' : typeLabel(type)}
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

              {filtered.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No se encontraron usuarios.
                </div>
              )}

              {filtered.map(user => {
                const vReq           = verificationRequests[user.id]
                const hasPendingDocs = vReq?.status === 'pending'
                const isPremiumActive = user.is_premium && user.premium_until && new Date(user.premium_until) > new Date()
                const listCount      = activeListings[user.id] || 0

                return (
                  <div key={user.id} className={`admin-user-row ${user.is_banned ? 'banned' : ''}`}>

                    <div className="admin-user-info">
                      <div className="admin-user-avatar">
                        {user.avatar_url
                          ? <img src={user.avatar_url} alt={user.display_name} />
                          : <span>{user.display_name?.charAt(0).toUpperCase()}</span>}
                      </div>
                      <div>
                        <div className="admin-user-name">
                          {user.display_name}
                          {hasPendingDocs && <span className="verif-pending-dot" title="Documentos pendientes">D</span>}
                        </div>
                        <div className="admin-user-email">{user.email}</div>
                        {user.whatsapp && (
                          <a href={`https://wa.me/${user.whatsapp.replace(/\D/g,'')}`}
                            target="_blank" rel="noreferrer"
                            className="admin-wa-link">
                            {user.whatsapp}
                          </a>
                        )}
                        {user.shop_name && <div className="admin-user-shop">{user.shop_name}</div>}
                        <div className="admin-user-date">{fmt(user.created_at)} · {listCount > 0 ? <span className="count-active">{listCount} anuncios</span> : <span>0 anuncios</span>}</div>
                      </div>
                    </div>

                    <div>
                      <span className="admin-type-label">{typeLabel(user.user_type)}</span>
                    </div>

                    <div className="admin-user-badges">
                      {user.is_verified
                        ? <span className="admin-badge badge-verified">Verificado</span>
                        : <span className="admin-badge badge-free">Sin verificar</span>}
                      {user.is_banned && <span className="admin-badge badge-banned">Baneado</span>}
                      {vReq?.status === 'pending'  && <span className="admin-badge badge-pending">Pendiente</span>}
                      {vReq?.status === 'rejected' && <span className="admin-badge badge-rejected">Rechazado</span>}
                      {user.identity_verified  && <span className="admin-badge badge-id">Identidad</span>}
                      {user.business_verified  && <span className="admin-badge badge-biz">Negocio</span>}
                    </div>

                    <div className="admin-premium-cell">
                      {isPremiumActive
                        ? <><span className="admin-badge badge-premium">Premium</span>
                            <div className="premium-expiry">hasta {fmt(user.premium_until)}</div></>
                        : <span className="admin-badge badge-free">Basico</span>}
                    </div>

                    <div className="admin-user-date">{fmt(user.created_at)}</div>

                    <div className="admin-user-actions">
                      <button className={`btn-small ${user.is_verified ? 'btn-danger' : 'btn-success'}`}
                        onClick={() => handleVerify(user.id, user.is_verified)}
                        title={user.is_verified ? 'Quitar verificacion general' : 'Marcar como verificado'}>
                        {user.is_verified ? 'Desverificar' : 'Verificar'}
                      </button>
                      <button className="btn-small btn-docs"
                        onClick={() => {
                          setRejectNotes({ identity: '', business: '' })
                          setInfoNote('')
                          setNoteSent(false)
                          setDocsModal({ user, request: vReq || null })
                        }}>
                        Revisar documentos
                      </button>
                      <button className={`btn-small ${isPremiumActive ? 'btn-danger' : 'btn-premium'}`}
                        onClick={() => handleTogglePremium(user.id, isPremiumActive)}>
                        {isPremiumActive ? 'Quitar Premium' : 'Activar Premium'}
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

      {/* -- MODAL DOCS -- */}
      {docsModal && (
        <div className="docs-modal-overlay" onClick={() => setDocsModal(null)}>
          <div className="docs-modal" onClick={e => e.stopPropagation()}>
            <div className="docs-modal-header">
              <h3>{docsModal.user.display_name}</h3>
              <button className="docs-modal-close" onClick={() => setDocsModal(null)}>X</button>
            </div>

            <div className="docs-modal-body">

              {(docsModal.user.full_name || docsModal.user.country || docsModal.user.city || docsModal.user.phone) && (
                <div className="docs-section">
                  <h4>Datos de identidad</h4>
                  <div className="real-data-grid">
                    {docsModal.user.full_name && <div className="data-item"><label>Nombre</label><span>{docsModal.user.full_name}</span></div>}
                    {docsModal.user.country   && <div className="data-item"><label>Pais</label><span>{docsModal.user.country}</span></div>}
                    {docsModal.user.city      && <div className="data-item"><label>Ciudad</label><span>{docsModal.user.city}</span></div>}
                    {docsModal.user.phone     && <div className="data-item"><label>Telefono</label><span>{docsModal.user.phone}</span></div>}
                  </div>
                </div>
              )}

              {/* Capa 1: Identidad */}
              <div className="docs-section">
                <div className="docs-section-title">
                  <h4>Capa 1 — Identidad personal</h4>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {docsModal.user.identity_verified && (
                      <>
                        <button className="btn-small btn-danger" onClick={() => handleRevokeVerification(docsModal.user.id, 'identity')}>Revocar identidad</button>
                        <button className="btn-small btn-docs" onClick={() => handleAllowIdentityEdit(docsModal.user.id, docsModal.user.allow_identity_edit)}>
                          {docsModal.user.allow_identity_edit ? 'Bloquear edicion' : 'Permitir edicion'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {docsModal.request?.identity_docs?.some(url => url) ? (
                  <>
                    <div className="docs-grid">
                      {docsModal.request.identity_docs.map((url, i) => (
                        <div key={i} className="doc-card" onClick={() => {
                          const validDocs = docsModal.request.identity_docs.filter(Boolean)
                          const idx = docsModal.request.identity_docs.indexOf(url)
                          openLightbox(validDocs, validDocs.indexOf(url))
                        }}>
                          {url ? (
                            <>
                              <img src={url} alt={i === 0 ? 'Anverso' : 'Reverso'} className="doc-thumb" />
                              <span className="doc-label">{i === 0 ? 'Anverso' : 'Reverso'}</span>
                            </>
                          ) : (
                            <><span className="doc-label" style={{color:'var(--text-muted)'}}>{i === 0 ? 'Anverso (falta)' : 'Reverso (falta)'}</span></>
                          )}
                        </div>
                      ))}
                    </div>
                    {!docsModal.user.identity_verified && (
                      <div className="docs-actions">
                        <button className="btn btn-primary" onClick={() => handleApproveIdentity(docsModal.request.id, docsModal.user.id)}>Aprobar identidad</button>
                        <div className="docs-reject">
                          <input type="text" className="input" placeholder="Motivo de rechazo..."
                            value={rejectNotes.identity}
                            onChange={e => setRejectNotes(p => ({ ...p, identity: e.target.value }))} />
                          <button className="btn btn-secondary" onClick={() => handleRejectLayer(docsModal.request.id, 'identity')}>Rechazar</button>
                        </div>
                      </div>
                    )}
                  </>
                ) : docsModal.request ? (
                  <div>
                    <p className="docs-empty">Sin fotos de identidad subidas aun.</p>
                    <div className="docs-status-row">
                      <span>Estado: </span>
                      <span className={`admin-badge ${docsModal.request.status === 'pending' ? 'badge-pending' : docsModal.request.status === 'approved' ? 'badge-verified' : 'badge-rejected'}`}>
                        {docsModal.request.status}
                      </span>
                    </div>
                    {docsModal.request.status === 'pending' && (
                      <div className="docs-actions">
                        <button className="btn btn-primary" onClick={() => handleApproveVerification(docsModal.request.id, docsModal.user.id)}>Aprobar</button>
                        <div className="docs-reject">
                          <input type="text" className="input" placeholder="Motivo de rechazo..."
                            value={rejectNotes.identity}
                            onChange={e => setRejectNotes(p => ({ ...p, identity: e.target.value }))} />
                          <button className="btn btn-secondary" onClick={() => handleRejectLayer(docsModal.request.id, 'identity')}>Rechazar</button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="docs-empty">Este usuario no tiene solicitud de verificacion.</p>
                )}
              </div>

              {/* Capa 2: Negocio */}
              {docsModal.user.user_type !== 'person' && (
                <div className="docs-section">
                  <div className="docs-section-title">
                    <h4>Capa 2 — Negocio</h4>
                    {docsModal.user.business_verified && (
                      <button className="btn-small btn-danger" onClick={() => handleRevokeVerification(docsModal.user.id, 'business')}>Revocar negocio</button>
                    )}
                  </div>
                  {docsModal.request?.business_docs?.some(url => url) ? (
                  <>
                    <div className="docs-grid">
                      {docsModal.request.business_docs.filter(Boolean).map((url, i) => (
                        <div key={i} className="doc-card" onClick={() => {
                          const validDocs = docsModal.request.business_docs.filter(Boolean)
                          openLightbox(validDocs, i)
                        }}>
                          <img src={url} alt={`Doc ${i+1}`} className="doc-thumb" />
                          <span className="doc-label">Doc {i+1}</span>
                        </div>
                      ))}
                    </div>
                      {!docsModal.user.business_verified && (
                        <div className="docs-actions">
                          <button className="btn btn-primary" onClick={() => handleApproveBusiness(docsModal.request.id, docsModal.user.id)}>Aprobar negocio</button>
                          <div className="docs-reject">
                            <input type="text" className="input" placeholder="Motivo de rechazo..."
                              value={rejectNotes.business}
                              onChange={e => setRejectNotes(p => ({ ...p, business: e.target.value }))} />
                            <button className="btn btn-secondary" onClick={() => handleRejectLayer(docsModal.request.id, 'business')}>Rechazar</button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : <p className="docs-empty">Sin documentos de negocio.</p>}
                </div>
              )}

              {/* Nota informativa */}
              {docsModal.request && (
                <div className="docs-section docs-section-note">
                  <h4>Nota para el usuario</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    El usuario la vera en su panel. No cambia el estado de su solicitud.
                  </p>
                  {docsModal.request.admin_note && (
                    <div style={{ background: 'rgba(184,152,95,0.07)', border: '1px solid rgba(184,152,95,0.2)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', marginBottom: '0.75rem' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--gold)', fontWeight: 700, marginBottom: '0.35rem' }}>NOTA ACTUAL</div>
                      <p style={{ fontSize: '0.85rem', margin: 0, fontStyle: 'italic' }}>"{docsModal.request.admin_note}"</p>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <textarea className="input" rows={3} placeholder="Ej: Tu foto esta borrosa, sube una mas clara..."
                      value={infoNote} onChange={e => setInfoNote(e.target.value)}
                      style={{ resize: 'vertical', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem' }} />
                    <button className="btn btn-secondary" onClick={handleSendInfoNote} disabled={sendingNote || !infoNote.trim()}>
                      {sendingNote ? 'Enviando...' : 'Enviar nota'}
                    </button>
                    {noteSent && <p style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600 }}>Nota enviada</p>}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* -- LIGHTBOX -- */}
      {lightbox && (
        <div className="docs-lightbox" onClick={closeLightbox}>
          <button className="lightbox-nav-btn lightbox-prev"
            onClick={e => { e.stopPropagation(); lbPrev() }}
            disabled={lightbox.index === 0}>‹</button>

          <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <img src={lightbox.images[lightbox.index]} alt="" style={{ maxWidth: '90vw', maxHeight: '82vh', objectFit: 'contain', borderRadius: 'var(--radius-md)' }} />
            <div style={{ marginTop: '0.75rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
              {lightbox.index + 1} / {lightbox.images.length}
            </div>
          </div>

          <button className="lightbox-nav-btn lightbox-next"
            onClick={e => { e.stopPropagation(); lbNext() }}
            disabled={lightbox.index === lightbox.images.length - 1}>›</button>

          <button onClick={closeLightbox} style={{ position: 'fixed', top: '1rem', right: '1rem', width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>X</button>
        </div>
      )}
    </div>
  )
}
