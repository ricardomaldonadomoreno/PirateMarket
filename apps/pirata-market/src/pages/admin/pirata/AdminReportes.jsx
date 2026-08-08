import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import AdminNavbarPirata from '../../../components/AdminNavbarPirata'
import './AdminReportes.css'

export default function AdminReportes() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [expandedId, setExpandedId] = useState(null)
  const [rejectNote, setRejectNote] = useState('')

  useEffect(() => { loadRequests() }, [filter])

  const loadRequests = async () => {
    setLoading(true)
    try {
      // Cargar solicitudes de destacar_requests
      let query = supabase
        .from('destacar_requests')
        .select(`*`)
        .order('created_at', { ascending: false })

      if (filter !== 'all') query = query.eq('status', filter)

      const { data } = await query

      if (data) {
        // Cargar info de usuarios y anuncios para cada solicitud
        const enriched = await Promise.all(
          data.map(async (req) => {
            const result = {}

            // Buscar usuario
            if (req.user_id) {
              const { data: userData } = await supabase
                .from('users')
                .select('display_name, email, avatar_url')
                .eq('id', req.user_id)
                .single()
              result.user = userData || null
            }

            // Buscar anuncios seleccionados
            if (req.listing_ids && req.listing_ids.length > 0) {
              const { data: listingsData } = await supabase
                .from('listings')
                .select('id, title, slug, photos, price, currency')
                .in('id', req.listing_ids)
              result.listings = listingsData || []
            } else {
              result.listings = []
            }

            return { ...req, ...result }
          })
        )
        setRequests(enriched)
      }
    } catch (error) {
      console.error('Error loading requests:', error)
    } finally {
      setLoading(false)
    }
  }

  // Aprobar anuncios destacados (setear is_featured=true, featured_until=30 días)
  const handleApproveListings = async (req) => {
    if (!req.listing_ids || req.listing_ids.length === 0) return
    const now = new Date()
    const until = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const { error } = await supabase
      .from('listings')
      .update({ is_featured: true, featured_until: until.toISOString() })
      .in('id', req.listing_ids)

    if (error) {
      console.error('Error approving listings:', error)
      alert('Error al aprobar anuncios')
      return
    }

    // Actualizar estado de la solicitud
    await supabase
      .from('destacar_requests')
      .update({ status: 'approved', admin_note: 'Anuncios destacados aprobados', reviewed_at: new Date().toISOString() })
      .eq('id', req.id)

    loadRequests()
  }

  // Aprobar banner (setear banner_approved=true, banner_live=true, banner_live_until=30 días)
  const handleApproveBanner = async (req) => {
    const now = new Date()
    const until = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const { error } = await supabase
      .from('destacar_requests')
      .update({
        banner_approved: true,
        banner_live: true,
        banner_live_until: until.toISOString(),
        status: 'approved',
        reviewed_at: new Date().toISOString()
      })
      .eq('id', req.id)

    if (error) {
      console.error('Error approving banner:', error)
      alert('Error al aprobar banner')
      return
    }

    // Si también tenía anuncios, aprobarlos
    if (req.listing_ids && req.listing_ids.length > 0) {
      const untilFeatured = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      await supabase
        .from('listings')
        .update({ is_featured: true, featured_until: untilFeatured.toISOString() })
        .in('id', req.listing_ids)
    }

    loadRequests()
  }

  // Rechazar solicitud con nota
  const handleReject = async (req) => {
    const note = rejectNote.trim() || 'Solicitud rechazada'

    const { error } = await supabase
      .from('destacar_requests')
      .update({
        status: 'rejected',
        admin_note: note,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', req.id)

    if (error) {
      console.error('Error rejecting:', error)
      alert('Error al rechazar')
      return
    }

    setRejectNote('')
    loadRequests()
  }

  const formatDate = (date) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('es', {
      day: '2-digit', month: 'short', year: 'numeric'
    })
  }

  return (
    <div className="admin-page">
      <AdminNavbarPirata />
      <div className="admin-content">
        <div className="admin-page-header">
          <h1 className="serif luxury-gold">Solicitudes de Destacar</h1>
          <p className="admin-page-sub">Anuncios destacados y banners publicitarios</p>
        </div>

        <div className="admin-filters-bar">
          <div className="admin-filter-btns">
            {['all', 'pending', 'approved', 'rejected'].map(s => (
              <button key={s} className={`filter-btn ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
                {s === 'all' ? '📋 Todos' : s === 'pending' ? '🔴 Pendientes' : s === 'approved' ? '🟢 Aprobados' : '⚫ Rechazados'}
              </button>
            ))}
          </div>
        </div>

        <div className="admin-reports-list">
          {loading ? (
            <div className="admin-card admin-loading">Cargando solicitudes...</div>
          ) : requests.length === 0 ? (
            <div className="admin-card admin-loading">
              No hay solicitudes {filter !== 'all' ? `con estado "${filter}"` : ''}
            </div>
          ) : requests.map(req => (
            <div key={req.id} className="admin-report-card">
              {/* Header */}
              <div className="admin-report-header">
                <span className="admin-report-user">
                  👤 {req.user?.display_name || 'Desconocido'}
                  <span className="admin-cell-muted"> ({req.user?.email || '—'})</span>
                </span>
                <span className={`admin-status status-${req.status}`}>{req.status}</span>
                <span className="admin-cell-muted">{formatDate(req.created_at)}</span>
              </div>

              {/* Contenido expandible */}
              <div className="admin-report-toggle" onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}>
                {expandedId === req.id ? '▲ Ocultar' : '▼ Ver detalles'}
              </div>

              {expandedId === req.id && (
                <div className="admin-report-expanded">
                  {/* Anuncios seleccionados */}
                  {req.listings && req.listings.length > 0 && (
                    <div className="admin-report-section">
                      <div className="admin-report-section-title">📦 Anuncios seleccionados ({req.listings.length})</div>
                      <div className="admin-report-listings-grid">
                        {req.listings.map(listing => (
                          <div key={listing.id} className="admin-report-listing-thumb">
                            {listing.photos?.length > 0 ? (
                              <img src={listing.photos[0]} alt={listing.title} />
                            ) : (
                              <div className="admin-report-listing-nophoto">📦</div>
                            )}
                            <div className="admin-report-listing-name">{listing.title}</div>
                            <div className="admin-report-listing-price">{listing.price} {listing.currency}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Banner */}
                  {req.banner_url && (
                    <div className="admin-report-section">
                      <div className="admin-report-section-title">🖼️ Banner publicitario</div>
                      <div className="admin-report-banner-preview">
                        <img src={req.banner_url} alt="Banner" />
                      </div>
                      <div className="admin-report-banner-status">
                        Aprobado: {req.banner_approved ? '✅ Sí' : '❌ No'} | Live: {req.banner_live ? '✅ Sí' : '❌ No'}
                        {req.banner_live_until && (
                          <span> | Hasta: {formatDate(req.banner_live_until)}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Nota del admin */}
                  {req.admin_note && (
                    <div className="admin-report-note">
                      <strong>Nota:</strong> {req.admin_note}
                      {req.reviewed_at && <span className="admin-cell-muted"> ({formatDate(req.reviewed_at)})</span>}
                    </div>
                  )}
                </div>
              )}

              {/* Acciones */}
              {req.status === 'pending' && (
                <div className="admin-report-actions">
                  {req.listings && req.listings.length > 0 && (
                    <button className="btn-small btn-success" onClick={() => handleApproveListings(req)}>
                      ✅ Aprobar anuncios ({req.listings.length} × $1)
                    </button>
                  )}
                  {req.banner_url && (
                    <button className="btn-small btn-gold" onClick={() => handleApproveBanner(req)}>
                      🖼️ Aprobar banner ($30)
                    </button>
                  )}
                  <button className="btn-small btn-danger" onClick={() => handleReject(req)}>
                    ❌ Rechazar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
