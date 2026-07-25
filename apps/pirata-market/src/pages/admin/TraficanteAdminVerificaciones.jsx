import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import AdminNavbarTraficante from '../../components/AdminNavbarTraficante'

export default function TraficanteAdminVerificaciones() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [lightbox, setLightbox] = useState(null)

  useEffect(() => { loadRequests() }, [filterStatus])

  const loadRequests = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('traficante_verification_requests')
        .select(`*, user:users(display_name, email, phone, country, city, full_name, is_verified)`)
        .order('created_at', { ascending: false })

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus)
      }

      const { data, error } = await query
      if (error) { console.error(error); return }
      if (data) setRequests(data)
    } catch (error) {
      console.error('loadRequests error:', error)
    } finally {
      setLoading(false)
    }
  }

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

    await supabase.from('traficante_profiles').update({ level, is_verified: true }).eq('id', userId)
    await supabase.from('users').update({ is_verified: true }).eq('id', userId)

    loadRequests()
  }

  const handleReject = async (requestId, userId) => {
    const note = prompt('Motivo de rechazo:')
    if (!note) return
    await supabase.from('traficante_verification_requests').update({
      status: 'rejected', admin_note: note, reviewed_at: new Date().toISOString()
    }).eq('id', requestId)
    await supabase.from('users').update({ is_verified: false }).eq('id', userId)
    loadRequests()
  }

  const handleRevoke = async (userId) => {
    if (!confirm('¿Revocar verificación del traficante?')) return
    await supabase.from('traficante_profiles').update({ is_verified: false }).eq('id', userId)
    await supabase.from('users').update({ is_verified: false }).eq('id', userId)
    loadRequests()
  }

  const fmt = (date) => date ? new Date(date).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'

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

  return (
    <div className="admin-page">
      <AdminNavbarTraficante />
      <div className="admin-content">
        <div className="admin-page-header">
          <h1 className="serif luxury-gold">Verificaciones Traficante</h1>
          <p className="admin-page-sub">{requests.length} solicitudes</p>
        </div>

        <div className="admin-filters-bar">
          <div className="admin-filter-btns">
            {['all', 'pending', 'approved', 'rejected'].map(s => (
              <button key={s} className={`filter-btn ${filterStatus === s ? 'active' : ''}`} onClick={() => setFilterStatus(s)}>
                {s === 'all' ? 'Todos' : s === 'pending' ? '⏳ Pendientes' : s === 'approved' ? '✓ Aprobados' : '✗ Rechazados'}
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
                <span>Traficante</span>
                <span>Estado</span>
                <span>Documentos</span>
                <span>Fecha</span>
                <span>Acciones</span>
              </div>
              {requests.map(req => (
                <div key={req.id} className="admin-listing-row">
                  <div className="admin-listing-info">
                    <div className="admin-listing-thumb">
                      {req.user?.is_verified
                        ? <span style={{ color: '#22c55e', fontSize: '1.5rem' }}>✓</span>
                        : <span style={{ fontSize: '1.5rem' }}>📄</span>
                      }
                    </div>
                    <div>
                      <div className="admin-listing-title">{req.user?.display_name || '—'}</div>
                      <div className="admin-listing-meta">
                        {req.user?.email}
                        {req.user?.full_name && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{req.user.full_name}</div>}
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className={`admin-badge ${
                      req.status === 'approved' ? 'badge-verified' :
                      req.status === 'rejected' ? 'badge-rejected' : 'badge-pending'
                    }`}>
                      {req.status === 'pending' ? '⏳ Pendiente' :
                       req.status === 'approved' ? '✓ Aprobado' : '✗ Rechazado'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8rem' }}>
                    {req.identity_docs?.length > 0 && <span style={{ marginRight: '0.5rem' }}>🪪 {req.identity_docs.length}</span>}
                    {req.domicile_docs?.length > 0 && <span style={{ marginRight: '0.5rem' }}>🏠 {req.domicile_docs.length}</span>}
                    {req.bank_docs?.length > 0 && <span style={{ marginRight: '0.5rem' }}>🏦 {req.bank_docs.length}</span>}
                    {req.selfie_url && <span>📷 ✓</span>}
                  </div>

                  <div className="admin-cell-muted">{fmt(req.created_at)}</div>

                  <div className="admin-user-actions">
                    {req.status === 'pending' && (
                      <>
                        <button className="btn-small btn-success" onClick={() => handleApprove(req.id, req.user_id)}>
                          ✓ Aprobar
                        </button>
                        <button className="btn-small btn-danger" onClick={() => handleReject(req.id, req.user_id)}>
                          ✗ Rechazar
                        </button>
                      </>
                    )}
                    {req.status === 'approved' && (
                      <button className="btn-small btn-danger" onClick={() => handleRevoke(req.user_id)}>
                        Revocar
                      </button>
                    )}
                    {/* Lightbox para documentos */}
                    {req.identity_docs?.length > 0 && (
                      <button className="btn-small btn-docs" onClick={() => openLightbox(req.identity_docs, 0)}>
                        🪪 Ver
                      </button>
                    )}
                    {req.domicile_docs?.length > 0 && (
                      <button className="btn-small btn-docs" onClick={() => openLightbox(req.domicile_docs, 0)}>
                        🏠 Ver
                      </button>
                    )}
                    {req.bank_docs?.length > 0 && (
                      <button className="btn-small btn-docs" onClick={() => openLightbox(req.bank_docs, 0)}>
                        🏦 Ver
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
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
