import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import AdminNavbarPacker from '../../../components/AdminNavbarPacker'

export default function PackerAdminVerificaciones() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [detailModal, setDetailModal] = useState(null)
  const [rejectNote, setRejectNote] = useState('')
  const [infoNote, setInfoNote] = useState('')
  const [lightbox, setLightbox] = useState(null)

  useEffect(() => { loadRequests() }, [filterStatus])

  const loadRequests = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('traficante_verification_requests')
        .select(`
          *,
          user:users(
            display_name, email, whatsapp,
            avatar_url,
            traficante_profiles(
              full_name, phone, birth_country, doc_type, doc_number,
              personal_locked, phone_locked,
              address_city, address_country, address_text,
              address_lat, address_lng,
              address_locked,
              identity_verified, address_verified, bank_verified
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus)
      }

      const { data, error } = await query
      if (error) { console.error(error); return }
      if (data) {
        // Aplanar traficante_profiles en user para mantener compatibilidad con la UI
        const flattened = data.map(req => {
          const tp = req.user?.traficante_profiles?.[0]
          return {
            ...req,
            user: tp ? { ...req.user, ...tp } : req.user
          }
        })
        setRequests(flattened)
      }
    } catch (error) {
      console.error('loadRequests error:', error)
    } finally {
      setLoading(false)
    }
  }

  // ── APROBAR ──
  const handleApprove = async (requestId, userId) => {
    const now = new Date().toISOString()
    await supabase.from('traficante_verification_requests').update({
      status: 'approved', reviewed_at: now
    }).eq('id', requestId)

    // Calcular nivel basado en documentos subidos
    const req = requests.find(r => r.id === requestId)
    let level = 'basico'
    if (req?.identity_docs?.length > 0) level = 'medio'
    if (req?.domicile_docs?.length > 0 && req?.bank_docs?.length > 0) level = 'pro'
    if (req?.selfie_url) level = 'elite'

    await supabase.from('traficante_profiles').update({
      level,
      identity_verified: true,
      address_verified: true,
      bank_verified: true,
    }).eq('id', userId)

    setDetailModal(null)
    loadRequests()
  }

  // ── RECHAZAR ──
  const handleReject = async (requestId, userId) => {
    if (!rejectNote.trim()) { alert('Escribe un motivo de rechazo'); return }
    const now = new Date().toISOString()
    await supabase.from('traficante_verification_requests').update({
      status: 'rejected', admin_note: rejectNote.trim(), reviewed_at: now
    }).eq('id', requestId)
    setRejectNote('')
    setDetailModal(null)
    loadRequests()
  }

  // ── REVOCAR ──
  const handleRevoke = async (userId) => {
    if (!confirm('¿Revocar verificación completa del packer?')) return
    await supabase.from('traficante_profiles').update({
      level: 'basico',
      identity_verified: false,
      address_verified: false,
      bank_verified: false,
    }).eq('id', userId)
    setDetailModal(null)
    loadRequests()
  }

  // ── ENVIAR NOTA INFORMATIVA ──
  const handleSendNote = async () => {
    if (!infoNote.trim()) return
    if (detailModal?.request?.id) {
      await supabase.from('traficante_verification_requests').update({
        admin_note: infoNote.trim()
      }).eq('id', detailModal.request.id)
      setInfoNote('')
    }
  }

  // ── LIGHTBOX ──
  const openLightbox = (images, index) => setLightbox({ images, index })
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

  const fmt = (date) => date ? new Date(date).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'
  const fmtFull = (date) => date ? new Date(date).toLocaleString('es-BO', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'

  return (
    <div className="admin-page">
      <AdminNavbarPacker />
      <div className="admin-content">
        <div className="admin-page-header">
          <h1 className="serif luxury-gold">Verificaciones Packer</h1>
          <p className="admin-page-sub">{requests.length} solicitudes</p>
        </div>

        <div className="admin-filters-bar">
          <div className="admin-filter-btns">
            {['all', 'pending', 'approved', 'rejected'].map(s => (
              <button key={s} className={`filter-btn ${filterStatus === s ? 'active' : ''}`} onClick={() => setFilterStatus(s)}>
                {s === 'all' ? 'Todos' : s === 'pending' ? 'Pendientes' : s === 'approved' ? 'Aprobados' : 'Rechazados'}
              </button>
            ))}
          </div>
        </div>

        <div className="admin-card">
          {loading ? (
            <div className="admin-loading">Cargando verificaciones...</div>
          ) : requests.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No hay solicitudes de verificación.
            </div>
          ) : (
            <div className="admin-listings-table">
              <div className="admin-listings-header">
                <span>Packer</span>
                <span>Estado</span>
                <span>Documentos</span>
                <span>Fecha</span>
                <span>Acciones</span>
              </div>
              {requests.map(req => (
                <div key={req.id} className="admin-listing-row">
                  <div className="admin-listing-info">
                    <div className="admin-listing-thumb">
                      {req.user?.avatar_url
                        ? <img src={req.user.avatar_url} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: '1.5rem' }}>📄</span>
                      }
                    </div>
                    <div>
                      <div className="admin-listing-title">{req.user?.display_name || '—'}</div>
                      <div className="admin-listing-meta">
                        {req.user?.email}
                        {req.user?.full_name && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {req.user.full_name}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className={`admin-badge ${
                      req.status === 'approved' ? 'badge-verified' :
                      req.status === 'rejected' ? 'badge-rejected' : 'badge-pending'
                    }`}>
                      {req.status === 'pending' ? 'Pendiente' :
                       req.status === 'approved' ? 'Aprobado' : 'Rechazado'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8rem' }}>
                    {req.identity_docs?.length > 0 && <span style={{ marginRight: '0.5rem' }}>ID {req.identity_docs.length}</span>}
                    {req.domicile_docs?.length > 0 && <span style={{ marginRight: '0.5rem' }}>DOM {req.domicile_docs.length}</span>}
                    {req.bank_docs?.length > 0 && <span style={{ marginRight: '0.5rem' }}>BANCO {req.bank_docs.length}</span>}
                    {req.selfie_url && <span>FOTO</span>}
                  </div>

                  <div className="admin-cell-muted">{fmt(req.created_at)}</div>

                  <div className="admin-user-actions">
                    <button className="btn-small btn-docs" onClick={() => {
                      setRejectNote('')
                      setInfoNote(req.admin_note || '')
                      setDetailModal({ user: req.user, request: req })
                    }}>
                      Revisar
                    </button>
                    {req.status === 'pending' && (
                      <button className="btn-small btn-success" onClick={() => handleApprove(req.id, req.user_id)}>
                        Aprobar
                      </button>
                    )}
                    {req.status === 'approved' && (
                      <button className="btn-small btn-danger" onClick={() => handleRevoke(req.user_id)}>
                        Revocar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* MODAL DE DETALLE — TODOS LOS DATOS DEL USUARIO               */}
      {/* ════════════════════════════════════════════════════════════ */}
      {detailModal && (
        <div className="docs-modal-overlay" onClick={() => setDetailModal(null)}>
          <div className="docs-modal traficante-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="docs-modal-header">
              <h3>{detailModal.user?.display_name || '—'}</h3>
              <button className="docs-modal-close" onClick={() => setDetailModal(null)}>X</button>
            </div>

            <div className="docs-modal-body">
              <div className="traf-modal-status-bar">
                <span className={`admin-badge ${
                  detailModal.request?.status === 'approved' ? 'badge-verified' :
                  detailModal.request?.status === 'rejected' ? 'badge-rejected' : 'badge-pending'
                }`}>
                  {detailModal.request?.status === 'pending' ? 'Pendiente' :
                   detailModal.request?.status === 'approved' ? 'Aprobado' : 'Rechazado'}
                </span>
                {detailModal.user?.identity_verified && (
                  <span className="admin-badge badge-verified" style={{ marginLeft: '0.5rem' }}>Verificado</span>
                )}
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                  Enviado: {fmtFull(detailModal.request?.created_at)}
                </span>
              </div>

              {/* ── DATOS PERSONALES (de traficante_profiles) ── */}
              <div className="docs-section">
                <h4>Datos personales</h4>
                {detailModal.user?.personal_locked && (
                  <div className="traf-locked-banner">Datos personales fijados por el usuario</div>
                )}
                <div className="traf-data-grid">
                  {detailModal.user?.full_name && (
                    <div className="traf-data-item">
                      <label>Nombre completo real</label>
                      <span>{detailModal.user.full_name}</span>
                    </div>
                  )}
                  {detailModal.user?.phone && (
                    <div className="traf-data-item">
                      <label>Teléfono</label>
                      <span>{detailModal.user.phone}</span>
                    </div>
                  )}
                  {detailModal.user?.birth_country && (
                    <div className="traf-data-item">
                      <label>País de nacimiento</label>
                      <span>{detailModal.user.birth_country}</span>
                    </div>
                  )}
                  {detailModal.user?.doc_type && (
                    <div className="traf-data-item">
                      <label>Tipo de documento</label>
                      <span>{detailModal.user.doc_type === 'ci' ? 'Cédula de Identidad (CI)' : detailModal.user.doc_type === 'pasaporte' ? 'Pasaporte' : detailModal.user.doc_type}</span>
                    </div>
                  )}
                  {detailModal.user?.doc_number && (
                    <div className="traf-data-item traf-data-full">
                      <label>Número de documento</label>
                      <span>{detailModal.user.doc_number}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── DIRECCIÓN (de traficante_profiles) ── */}
              <div className="docs-section">
                <h4>Dirección</h4>
                <div className="traf-data-grid">
                  {detailModal.user?.address_city && (
                    <div className="traf-data-item">
                      <label>Ciudad</label>
                      <span>{detailModal.user.address_city}</span>
                    </div>
                  )}
                  {detailModal.user?.address_country && (
                    <div className="traf-data-item">
                      <label>País</label>
                      <span>{detailModal.user.address_country}</span>
                    </div>
                  )}
                  {detailModal.user?.address_text && (
                    <div className="traf-data-item traf-data-full">
                      <label>Dirección exacta</label>
                      <span>{detailModal.user.address_text}</span>
                    </div>
                  )}
                  {detailModal.user?.address_lat && detailModal.user?.address_lng && (
                    <div className="traf-data-item">
                      <label>Coordenadas GPS</label>
                      <span>
                        {Number(detailModal.user.address_lat).toFixed(5)}, {Number(detailModal.user.address_lng).toFixed(5)}
                        {detailModal.user.address_locked && (
                          <span className="traf-locked-tag">Fija</span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── DOCUMENTOS DE VERIFICACIÓN (de traficante_verification_requests) ── */}
              <div className="docs-section">
                <h4>Documento de identidad</h4>
                {detailModal.request?.identity_docs?.length > 0 ? (
                  <div className="docs-grid">
                    {detailModal.request.identity_docs.map((url, i) => (
                      <div key={i} className="doc-card" onClick={() => openLightbox(detailModal.request.identity_docs, i)}>
                        <img src={url} alt={`ID ${i+1}`} className="doc-thumb" />
                        <span className="doc-label">{i === 0 ? 'Anverso' : i === 1 ? 'Reverso' : `Doc ${i+1}`}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="docs-empty">Sin documentos de identidad subidos.</p>
                )}
              </div>

              <div className="docs-section">
                <h4>Comprobante de domicilio</h4>
                {detailModal.request?.domicile_docs?.length > 0 ? (
                  <div className="docs-grid">
                    {detailModal.request.domicile_docs.map((url, i) => (
                      <div key={i} className="doc-card" onClick={() => openLightbox(detailModal.request.domicile_docs, i)}>
                        <img src={url} alt={`Dom ${i+1}`} className="doc-thumb" />
                        <span className="doc-label">Doc {i+1}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="docs-empty">Sin comprobante de domicilio subido.</p>
                )}
              </div>

              <div className="docs-section">
                <h4>Extracto bancario</h4>
                {detailModal.request?.bank_docs?.length > 0 ? (
                  <div className="docs-grid">
                    {detailModal.request.bank_docs.map((url, i) => (
                      <div key={i} className="doc-card" onClick={() => openLightbox(detailModal.request.bank_docs, i)}>
                        <img src={url} alt={`Bank ${i+1}`} className="doc-thumb" />
                        <span className="doc-label">Doc {i+1}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="docs-empty">Sin extracto bancario subido.</p>
                )}
              </div>

              <div className="docs-section">
                <h4>Foto personal (selfie)</h4>
                {detailModal.request?.selfie_url ? (
                  <div className="docs-grid">
                    <div className="doc-card doc-card-selfie" onClick={() => openLightbox([detailModal.request.selfie_url], 0)}>
                      <img src={detailModal.request.selfie_url} alt="Selfie" className="doc-thumb doc-thumb-selfie" />
                      <span className="doc-label">Foto personal</span>
                    </div>
                  </div>
                ) : (
                  <p className="docs-empty">Sin foto personal subida.</p>
                )}
              </div>

              {/* ── NOTA DEL ADMIN ── */}
              <div className="docs-section docs-section-note">
                <h4>Nota para el usuario</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  El usuario la verá en su panel de verificación.
                </p>
                {detailModal.request?.admin_note && (
                  <div className="traf-admin-note-current">
                    <div style={{ fontSize: '0.7rem', color: 'var(--gold)', fontWeight: 700, marginBottom: '0.35rem' }}>NOTA ACTUAL</div>
                    <p style={{ fontSize: '0.85rem', margin: 0, fontStyle: 'italic' }}>"{detailModal.request.admin_note}"</p>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <textarea className="input" rows={3} placeholder="Ej: Tu foto está borrosa, sube una más clara..."
                    value={infoNote} onChange={e => setInfoNote(e.target.value)}
                    style={{ flex: 1, resize: 'vertical', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem' }} />
                  <button className="btn btn-secondary" onClick={handleSendNote} disabled={!infoNote.trim()} style={{ whiteSpace: 'nowrap' }}>
                    Enviar nota
                  </button>
                </div>
              </div>

              {/* ── ACCIONES DE APROBACIÓN/RECHAZO ── */}
              {detailModal.request?.status === 'pending' && (
                <div className="traf-modal-actions">
                  <button className="btn btn-primary traf-btn-approve" onClick={() => handleApprove(detailModal.request.id, detailModal.user.id)}>
                    Aprobar verificación
                  </button>
                  <div className="traf-reject-row">
                    <input type="text" className="input" placeholder="Motivo de rechazo..."
                      value={rejectNote} onChange={e => setRejectNote(e.target.value)}
                      style={{ flex: 1 }} />
                    <button className="btn btn-secondary traf-btn-reject" onClick={() => handleReject(detailModal.request.id, detailModal.user.id)}>
                      Rechazar
                    </button>
                  </div>
                </div>
              )}

              {detailModal.request?.status === 'approved' && (
                <div className="traf-modal-actions">
                  <button className="btn btn-danger" onClick={() => handleRevoke(detailModal.user.id)}>
                    Revocar verificación
                  </button>
                </div>
              )}

              {detailModal.request?.status === 'rejected' && (
                <div className="traf-modal-actions">
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Rechazado el {fmtFull(detailModal.request.reviewed_at)}. El usuario puede re-enviar documentos.
                  </p>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* LIGHTBOX                                                    */}
      {/* ════════════════════════════════════════════════════════════ */}
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
          <button onClick={closeLightbox} style={{ position: 'fixed', top: '1rem', right: '1rem', width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
      )}
    </div>
  )
}
