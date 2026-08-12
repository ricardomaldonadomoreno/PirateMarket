import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import AdminNavbarPirata from '../../../components/AdminNavbarPirata'
import './AdminAnuncios.css'

export default function AdminAnuncios() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')

  useEffect(() => {
    loadRequests()
  }, [filter])

  const loadRequests = async () => {
    setLoading(true)
    try {
      // Cargar solicitudes de destacar_listings con info del anuncio
      let query = supabase
        .from('destacar_listings')
        .select(`*`)
        .order('created_at', { ascending: false })

      if (filter !== 'all') query = query.eq('status', filter)

      const { data } = await query

      if (data) {
        // Enriquecer con info del anuncio
        const enriched = await Promise.all(
          data.map(async (req) => {
            const result = {}

            // Buscar anuncio
            if (req.listing_id) {
              const { data: listingData } = await supabase
                .from('listings')
                .select('id, title, slug, photos, price, currency, is_featured, featured_until')
                .eq('id', req.listing_id)
                .single()
              result.listing = listingData || null
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

  // Aprobar solicitud: marcar anuncio como destacado en listings
  const handleApprove = async (req) => {
    const now = new Date()
    const until = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Marcar anuncio como destacado
    if (req.listing_id) {
      await supabase.from('listings').update({
        is_featured: true,
        featured_until: until.toISOString()
      }).eq('id', req.listing_id)
    }

    // Actualizar solicitud
    await supabase.from('destacar_listings').update({
      status: 'approved',
      is_live: true,
      live_until: until.toISOString(),
      reviewed_at: new Date().toISOString()
    }).eq('id', req.id)

    loadRequests()
  }

  // Desactivar destacado (expirar)
  const handleDeactivate = async (req) => {
    // Quitar destacado del anuncio
    if (req.listing_id) {
      await supabase.from('listings').update({
        is_featured: false,
        featured_until: null
      }).eq('id', req.listing_id)
    }

    // Actualizar solicitud
    await supabase.from('destacar_listings').update({
      status: 'expired',
      is_live: false
    }).eq('id', req.id)

    loadRequests()
  }

  // Rechazar solicitud
  const handleReject = async (req) => {
    await supabase.from('destacar_listings').update({
      status: 'rejected',
      reviewed_at: new Date().toISOString()
    }).eq('id', req.id)

    loadRequests()
  }

  // Eliminar solicitud
  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta solicitud?')) return
    await supabase.from('destacar_listings').delete().eq('id', id)
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
          <h1 className="serif luxury-gold">Solicitudes de Destacar Anuncios</h1>
          <p className="admin-page-sub">{requests.length} solicitudes</p>
        </div>

        {/* Filtros */}
        <div className="admin-filters-bar">
          <div className="admin-filter-btns">
            {['all', 'pending', 'approved', 'rejected', 'expired'].map(s => (
              <button key={s} className={`filter-btn ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
                {s === 'all' ? '📋 Todos' : s === 'pending' ? '🔴 Pendientes' : s === 'approved' ? '🟢 Aprobados' : s === 'rejected' ? '⚫ Rechazados' : '⏰ Expirados'}
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
                <span className="admin-cell-muted">{formatDate(req.created_at)}</span>
                <span className={`admin-status status-${req.status}`}>
                  {req.status === 'pending' ? 'Pendiente' :
                   req.status === 'approved' ? 'Aprobado' :
                   req.status === 'rejected' ? 'Rechazado' :
                   req.status === 'expired' ? 'Expirado' : req.status}
                </span>
              </div>

              {/* Anuncio */}
              {req.listing && (
                <div className="admin-report-listing-thumb">
                  {req.listing.photos?.length > 0 ? (
                    <img src={req.listing.photos[0]} alt={req.listing.title} />
                  ) : (
                    <div className="admin-report-listing-nophoto">📦</div>
                  )}
                  <div className="admin-report-listing-name">{req.listing.title}</div>
                  <div className="admin-report-listing-price">{req.listing.price} {req.listing.currency}</div>
                  <Link to={`/ficha/${req.listing.slug}`} target="_blank" className="admin-report-listing-link">Ver anuncio</Link>
                </div>
              )}

              {/* Info de estado */}
              <div className="admin-report-meta">
                {req.is_live && (
                  <span className="admin-cell-muted">
                    Activo hasta: {formatDate(req.live_until)}
                  </span>
                )}
                {req.admin_note && (
                  <span className="admin-cell-muted">
                    Nota: {req.admin_note}
                  </span>
                )}
              </div>

              {/* Acciones */}
              {req.status === 'pending' && (
                <div className="admin-report-actions">
                  <button className="btn-small btn-success" onClick={() => handleApprove(req)}>
                    ✓ Aprobar y activar ($1 × 30 días)
                  </button>
                  <button className="btn-small btn-danger" onClick={() => handleReject(req)}>
                    ✗ Rechazar
                  </button>
                </div>
              )}

              {req.status === 'approved' && (
                <div className="admin-report-actions">
                  <button className="btn-small btn-danger" onClick={() => handleDeactivate(req)}>
                    ✗ Expirar / Desactivar
                  </button>
                </div>
              )}

              <div className="admin-report-actions">
                <button className="btn-small btn-secondary" onClick={() => handleDelete(req.id)}>
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
