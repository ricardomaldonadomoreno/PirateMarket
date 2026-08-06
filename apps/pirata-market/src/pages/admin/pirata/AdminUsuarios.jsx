import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import AdminNavbarPirata from '../../../components/AdminNavbarPirata'
import './AdminUsuarios.css'

const fmt = (date) => date ? new Date(date).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'
const typeLabel = (type) => type === 'shop' ? 'Tienda' : type === 'wholesale' ? 'Mayorista' : 'Persona'
const statusLabel = (s) => s === 'pending' ? 'Pendiente' : s === 'approved' ? 'Aprobado' : s === 'rejected' ? 'Rechazado' : 'Sin solicitud'

export default function AdminUsuarios() {
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [docsModal, setDocsModal]     = useState(null)
  const [rejectNotes, setRejectNotes] = useState({ identity: '', business: '' })
  const [infoNote, setInfoNote]       = useState('')
  const [sendingNote, setSendingNote] = useState(false)
  const [noteSent, setNoteSent]       = useState(false)
  const [lightbox, setLightbox]       = useState(null)

  useEffect(() => { loadUsers() }, [])

  // ── CARGA: Solo pirata_profiles + users para email/display_name ──
  const loadUsers = async () => {
    setLoading(true)
    try {
      // 1. Leer pirata_profiles (tabla principal) — solo los que tienen verif_status != null
      const { data: profiles, error } = await supabase
        .from('pirata_profiles')
        .select('*')
        .not('verif_status', 'is', null)
        .order('created_at', { ascending: false })

      if (error) { console.error('loadUsers error:', error); setLoading(false); return }
      if (profiles) await processUsers(profiles)
    } catch (err) {
      console.error('loadUsers error:', err)
    } finally {
      setLoading(false)
    }
  }

  const processUsers = async (profilesData) => {
    const userIds = profilesData.map(p => p.user_id)

    // 2. Datos de la cuenta raíz (solo email y display_name)
    const { data: usersRoot } = await supabase
      .from('users')
      .select('id, display_name, email')
      .in('id', userIds)

    const usersMap = {}
    if (usersRoot) {
      usersRoot.forEach(u => { usersMap[u.id] = u })
    }

    // 3. Aplanar datos — todo viene de pirata_profiles
    const flattened = profilesData.map(p => {
      const u = usersMap[p.user_id] || {}
      return {
        id: p.id,
        user_id: p.user_id,
        // pirata_profiles
        identity: p.identity,
        full_name: p.full_name || null,
        country: p.country || null,
        city: p.city || null,
        phone: p.phone || null,
        shop_name: p.shop_name || null,
        identity_verified: p.identity_verified || false,
        business_verified: p.business_verified || false,
        identity_locked: p.identity_locked || false,
        allow_identity_edit: p.allow_identity_edit || false,
        verif_status: p.verif_status || null,
        identity_docs: p.identity_docs || [null, null],
        business_docs: p.business_docs || [],
        selfie_url: p.selfie_url || null,
        admin_note: p.admin_note || null,
        reviewed_at: p.reviewed_at || null,
        created_at: p.created_at,
        // users (solo referencia)
        display_name: u.display_name || null,
        email: u.email || null,
      }
    })
    setUsers(flattened)
  }

  // ── REFRESH MODAL ──
  const refreshAll = async (userId) => {
    await loadUsers()
    if (docsModal?.user?.id === userId) {
      const { data: freshProfile } = await supabase
        .from('pirata_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      const { data: freshRoot } = await supabase
        .from('users')
        .select('display_name, email')
        .eq('id', userId)
        .single()

      const u = freshRoot || {}
      const flatUser = freshProfile ? {
        id: freshProfile.id,
        user_id: freshProfile.user_id,
        identity: freshProfile.identity,
        full_name: freshProfile.full_name || null,
        country: freshProfile.country || null,
        city: freshProfile.city || null,
        phone: freshProfile.phone || null,
        shop_name: freshProfile.shop_name || null,
        identity_verified: freshProfile.identity_verified || false,
        business_verified: freshProfile.business_verified || false,
        identity_locked: freshProfile.identity_locked || false,
        allow_identity_edit: freshProfile.allow_identity_edit || false,
        verif_status: freshProfile.verif_status || null,
        identity_docs: freshProfile.identity_docs || [null, null],
        business_docs: freshProfile.business_docs || [],
        selfie_url: freshProfile.selfie_url || null,
        admin_note: freshProfile.admin_note || null,
        reviewed_at: freshProfile.reviewed_at || null,
        created_at: freshProfile.created_at,
        display_name: u.display_name || null,
        email: u.email || null,
      } : null

      if (flatUser) setDocsModal({ user: flatUser })
    }
  }

  // ── ACCIONES DE VERIFICACION ──
  const handleApproveIdentity = async (userId) => {
    const now = new Date().toISOString()
    await supabase.from('pirata_profiles').update({
      identity_verified: true,
      identity_locked: true,
      allow_identity_edit: false,
      verif_status: 'approved',
      reviewed_at: now,
    }).eq('user_id', userId)
    await refreshAll(userId)
  }

  const handleApproveBusiness = async (userId) => {
    const now = new Date().toISOString()
    await supabase.from('pirata_profiles').update({
      business_verified: true,
      reviewed_at: now,
    }).eq('user_id', userId)
    await refreshAll(userId)
  }

  const handleRejectLayer = async (layer) => {
    const note = rejectNotes[layer]
    if (!note.trim()) { alert('Escribe un motivo de rechazo'); return }
    const userId = docsModal.user.user_id
    if (layer === 'identity') {
      await supabase.from('pirata_profiles').update({
        identity_verified: false,
        identity_locked: false,
        verif_status: 'rejected',
        admin_note: note,
        reviewed_at: new Date().toISOString(),
      }).eq('user_id', userId)
    } else {
      await supabase.from('pirata_profiles').update({
        business_verified: false,
        admin_note: note,
        reviewed_at: new Date().toISOString(),
      }).eq('user_id', userId)
    }
    setRejectNotes(p => ({ ...p, [layer]: '' }))
    await refreshAll(userId)
  }

  const handleApproveVerification = async (userId) => {
    await supabase.from('pirata_profiles').update({
      identity_verified: true,
      identity_locked: true,
      verif_status: 'approved',
      reviewed_at: new Date().toISOString(),
    }).eq('user_id', userId)
    await refreshAll(userId)
  }

  const handleRevokeVerification = async (userId, layer) => {
    if (!confirm(`Revocar verificación de ${layer === 'identity' ? 'Identidad' : 'Negocio'}?`)) return
    if (layer === 'identity') {
      await supabase.from('pirata_profiles').update({
        identity_verified: false,
        identity_locked: false,
        verif_status: null,
      }).eq('user_id', userId)
    } else {
      await supabase.from('pirata_profiles').update({
        business_verified: false,
      }).eq('user_id', userId)
    }
    await refreshAll(userId)
  }

  const handleAllowIdentityEdit = async (userId, current) => {
    await supabase.from('pirata_profiles').update({
      allow_identity_edit: !current,
      identity_locked: current,
    }).eq('user_id', userId)
    await refreshAll(userId)
  }

  // ── NOTA INFORMATIVA ──
  const handleSendInfoNote = async () => {
    if (!infoNote.trim()) { alert('Escribe un mensaje'); return }
    setSendingNote(true)
    await supabase.from('pirata_profiles').update({
      admin_note: infoNote.trim(),
    }).eq('user_id', docsModal.user.user_id)
    setSendingNote(false)
    setNoteSent(true)
    setInfoNote('')
    setTimeout(() => setNoteSent(false), 3000)
    await refreshAll(docsModal.user.user_id)
  }

  // ── LIGHTBOX ──
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

  // ── FILTROS ──
  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    const matchSearch = u.display_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.shop_name?.toLowerCase().includes(q)
    const matchType = filterType === 'all' || u.identity === filterType
    const matchStatus = filterStatus === 'all' || u.verif_status === filterStatus
    return matchSearch && matchType && matchStatus
  })

  return (
    <div className="admin-page">
      <AdminNavbarPirata />
      <div className="admin-content">
        <div className="admin-page-header">
          <h1 className="serif luxury-gold">Usuarios Pirata</h1>
          <p className="admin-page-sub">{users.length} usuarios con solicitud de verificación</p>
        </div>

        <div className="admin-filters-bar">
          <input type="text" className="input" placeholder="Buscar nombre, email o tienda..."
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
          <div className="admin-filter-btns" style={{ marginLeft: '0.5rem' }}>
            {['all', 'pending', 'approved', 'rejected'].map(s => (
              <button key={s}
                className={`filter-btn ${filterStatus === s ? 'active' : ''}`}
                onClick={() => setFilterStatus(s)}>
                {s === 'all' ? 'Todos estados' : statusLabel(s)}
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
                <span>Verificación</span>
                <span>Registro</span>
                <span>Acciones</span>
              </div>

              {filtered.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No se encontraron usuarios con verificación.
                </div>
              )}

              {filtered.map(user => (
                <div key={user.id} className="admin-user-row">
                  <div className="admin-user-info">
                    <div>
                      <div className="admin-user-name">{user.display_name}</div>
                      <div className="admin-user-email">{user.email}</div>
                      {user.shop_name && <div className="admin-user-shop">{user.shop_name}</div>}
                    </div>
                  </div>

                  <div>
                    <span className="admin-type-label">{typeLabel(user.identity)}</span>
                  </div>

                  <div className="admin-user-badges">
                    {user.verif_status === 'pending'  && <span className="admin-badge badge-pending">Pendiente</span>}
                    {user.verif_status === 'approved' && <span className="admin-badge badge-verified">Aprobado</span>}
                    {user.verif_status === 'rejected' && <span className="admin-badge badge-rejected">Rechazado</span>}
                    {user.identity_verified  && <span className="admin-badge badge-id">Identidad</span>}
                    {user.business_verified  && <span className="admin-badge badge-biz">Negocio</span>}
                  </div>

                  <div className="admin-user-date">{fmt(user.created_at)}</div>

                  <div className="admin-user-actions">
                    <button className="btn-small btn-docs"
                      onClick={() => {
                        setRejectNotes({ identity: '', business: '' })
                        setInfoNote('')
                        setNoteSent(false)
                        setDocsModal({ user })
                      }}>
                      Revisar documentos
                    </button>
                  </div>
                </div>
              ))}
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

              {/* Datos personales */}
              {(docsModal.user.full_name || docsModal.user.country || docsModal.user.city || docsModal.user.phone) && (
                <div className="docs-section">
                  <h4>Datos de identidad</h4>
                  <div className="real-data-grid">
                    {docsModal.user.full_name && <div className="data-item"><label>Nombre</label><span>{docsModal.user.full_name}</span></div>}
                    {docsModal.user.country   && <div className="data-item"><label>País</label><span>{docsModal.user.country}</span></div>}
                    {docsModal.user.city      && <div className="data-item"><label>Ciudad</label><span>{docsModal.user.city}</span></div>}
                    {docsModal.user.phone     && <div className="data-item"><label>Teléfono</label><span>{docsModal.user.phone}</span></div>}
                  </div>
                </div>
              )}

              {/* Selfie */}
              {docsModal.user.selfie_url && (
                <div className="docs-section">
                  <h4>Foto personal</h4>
                  <div className="docs-grid">
                    <div className="doc-card" onClick={() => openLightbox([docsModal.user.selfie_url], 0)}>
                      <img src={docsModal.user.selfie_url} alt="Selfie" className="doc-thumb" />
                      <span className="doc-label">Selfie</span>
                    </div>
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
                        <button className="btn-small btn-danger" onClick={() => handleRevokeVerification(docsModal.user.user_id, 'identity')}>Revocar identidad</button>
                        <button className="btn-small btn-docs" onClick={() => handleAllowIdentityEdit(docsModal.user.user_id, docsModal.user.allow_identity_edit)}>
                          {docsModal.user.allow_identity_edit ? 'Bloquear edición' : 'Permitir edición'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {docsModal.user.identity_docs?.some(url => url) ? (
                  <>
                    <div className="docs-grid">
                      {docsModal.user.identity_docs.map((url, i) => (
                        <div key={i} className="doc-card" onClick={() => {
                          const validDocs = docsModal.user.identity_docs.filter(Boolean)
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
                        <button className="btn btn-primary" onClick={() => handleApproveIdentity(docsModal.user.user_id)}>Aprobar identidad</button>
                        <div className="docs-reject">
                          <input type="text" className="input" placeholder="Motivo de rechazo..."
                            value={rejectNotes.identity}
                            onChange={e => setRejectNotes(p => ({ ...p, identity: e.target.value }))} />
                          <button className="btn btn-secondary" onClick={() => handleRejectLayer('identity')}>Rechazar</button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div>
                    <p className="docs-empty">Sin fotos de identidad subidas aún.</p>
                    <div className="docs-status-row">
                      <span>Estado: </span>
                      <span className={`admin-badge ${docsModal.user.verif_status === 'pending' ? 'badge-pending' : docsModal.user.verif_status === 'approved' ? 'badge-verified' : 'badge-rejected'}`}>
                        {statusLabel(docsModal.user.verif_status)}
                      </span>
                    </div>
                    {docsModal.user.verif_status === 'pending' && (
                      <div className="docs-actions">
                        <button className="btn btn-primary" onClick={() => handleApproveVerification(docsModal.user.user_id)}>Aprobar</button>
                        <div className="docs-reject">
                          <input type="text" className="input" placeholder="Motivo de rechazo..."
                            value={rejectNotes.identity}
                            onChange={e => setRejectNotes(p => ({ ...p, identity: e.target.value }))} />
                          <button className="btn btn-secondary" onClick={() => handleRejectLayer('identity')}>Rechazar</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Capa 2: Negocio */}
              {docsModal.user.identity !== 'person' && (
                <div className="docs-section">
                  <div className="docs-section-title">
                    <h4>Capa 2 — Negocio</h4>
                    {docsModal.user.business_verified && (
                      <button className="btn-small btn-danger" onClick={() => handleRevokeVerification(docsModal.user.user_id, 'business')}>Revocar negocio</button>
                    )}
                  </div>
                  {docsModal.user.business_docs?.some(url => url) ? (
                  <>
                    <div className="docs-grid">
                      {docsModal.user.business_docs.filter(Boolean).map((url, i) => (
                        <div key={i} className="doc-card" onClick={() => {
                          const validDocs = docsModal.user.business_docs.filter(Boolean)
                          openLightbox(validDocs, i)
                        }}>
                          <img src={url} alt={`Doc ${i+1}`} className="doc-thumb" />
                          <span className="doc-label">Doc {i+1}</span>
                        </div>
                      ))}
                    </div>
                      {!docsModal.user.business_verified && (
                        <div className="docs-actions">
                          <button className="btn btn-primary" onClick={() => handleApproveBusiness(docsModal.user.user_id)}>Aprobar negocio</button>
                          <div className="docs-reject">
                            <input type="text" className="input" placeholder="Motivo de rechazo..."
                              value={rejectNotes.business}
                              onChange={e => setRejectNotes(p => ({ ...p, business: e.target.value }))} />
                            <button className="btn btn-secondary" onClick={() => handleRejectLayer('business')}>Rechazar</button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : <p className="docs-empty">Sin documentos de negocio.</p>}
                </div>
              )}

              {/* Nota informativa */}
              <div className="docs-section docs-section-note">
                <h4>Nota para el usuario</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  El usuario la verá en su panel. No cambia el estado de su solicitud.
                </p>
                {docsModal.user.admin_note && (
                  <div style={{ background: 'rgba(184,152,95,0.07)', border: '1px solid rgba(184,152,95,0.2)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--gold)', fontWeight: 700, marginBottom: '0.35rem' }}>NOTA ACTUAL</div>
                    <p style={{ fontSize: '0.85rem', margin: 0, fontStyle: 'italic' }}>"{docsModal.user.admin_note}"</p>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <textarea className="input" rows={3} placeholder="Ej: Tu foto está borrosa, sube una más clara..."
                    value={infoNote} onChange={e => setInfoNote(e.target.value)}
                    style={{ resize: 'vertical', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem' }} />
                  <button className="btn btn-secondary" onClick={handleSendInfoNote} disabled={sendingNote || !infoNote.trim()}>
                    {sendingNote ? 'Enviando...' : 'Enviar nota'}
                  </button>
                  {noteSent && <p style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600 }}>Nota enviada</p>}
                </div>
              </div>

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
