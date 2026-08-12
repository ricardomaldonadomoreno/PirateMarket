import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import AdminNavbarPirata from '../../../components/AdminNavbarPirata'
import './AdminReportes.css'

export default function AdminReportes() {
  const [activeTab, setActiveTab] = useState('listings') // 'listings' | 'banners'
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [expandedId, setExpandedId] = useState(null)
  const [rejectNote, setRejectNote] = useState('')

  useEffect(() => { loadRequests() }, [filter, activeTab])

  const loadRequests = async () => {
    setLoading(true)
    try {
      if (activeTab === 'listings') {
        // Cargar solicitudes de destacar_listings
        let query = supabase
          .from('destacar_listings')
          .select(`*`)
          .order('created_at', { ascending: false })

        if (filter !== 'all') query = query.eq('status', filter)

        const { data } = await query

        if (data) {
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

              // Buscar anuncio
              if (req.listing_id) {
                const { data: listingData } = await supabase
                  .from('listings')
                  .select('id, title, slug, photos, price, currency')
                  .eq('id', req.listing_id)
                  .single()
                result.listing = listingData || null
              }

              return { ...req, ...result }
            })
          )
          setRequests(enriched)
        }
      } else {
        // Cargar solicitudes de destacar_banners
        let query = supabase
          .from('destacar_banners')
          .select(`*`)
          .order('created_at', { ascending: false })

        if (filter !== 'all') query = query.eq('status', filter)

        const { data } = await query

        if (data) {
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

              return { ...req, ...result }
            })
          )
          setRequests(enriched)
        }
      }
    } catch (error) {
      console.error('Error loading requests:', error)
    } finally {
      setLoading(false)
    }
  }

  // Aprobar anuncio destacado (setear is_featured=true, featured_until=30 días)
  const handleApproveListing = async (req) => {
    if (!req.listing_id) return
    const now = new Date()
    const until = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const { error: listingError } = await supabase
      .from('listings')
      .update({ is_featured: true, featured_until: until.toISOString() })
      .eq('id', req.listing_id)

    if (listingError) {
      console.error('Error approving listing:', listingError)
      alert('Error al aprobar anuncio')
      return
    }

    // Actualizar estado de la solicitud
    await supabase
      .from('destacar_listings')
      .update({ status: 'approved', admin_note: 'Anuncio destacado aprobado', reviewed_at: new Date().toISOString() })
      .eq('id', req.id)

    loadRequests()
  }

  // Aprobar banner (setear is_live=true, live_until=30 días)
  const handleApproveBanner = async (req) => {
    const now = new Date()
    const until = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const { error } = await supabase
      .from('destacar_banners')
      .update({
        is_live: true,
        live_until: until.toISOString(),
        status: 'approved',
        reviewed_at: new Date().toISOString()
      })
      .eq('id', req.id)

    if (error) {
      console.error('Error approving banner:', error)
      alert('Error al aprobar banner')
      return
    }

    loadRequests()
  }

  // Rechazar solicitud con nota
  const handleReject = async (req) => {
    const note = rejectNote.trim() || 'Solicitud rechazada'
    const tableName = activeTab === 'listings' ? 'destacar_listings' : 'destacar_banners'

    const { error } = await supabase
      .from(tableName)
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
          <p className="admin-page-sub">Administra anuncios destacados y banners publicitarios</p>
        </div>

        {/* Tabs: Listados / Banners */}
        <div className="admin-tabs-bar">
          <button
            className={`admin-tab-btn ${activeTab === 'listings' ? 'active' : ''}`}
            onClick={() => { setActiveTab('listings'); setFilter('pending') }}
          >
            📦 Anuncios Destacados
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'banners' ? 'active' : ''}`}
            onClick={() => { setActiveTab('banners'); setFilter('pending') }}
          >
            🖼️ Banners Publicitarios
          </button>
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
                  {activeTab === 'listings' && req.listing && (
                    <div className="admin-report-section">
                      <div className="admin-report-section-title">📦 Anuncio seleccionado</div>
                      <div className="admin-report-listing-thumb">
                        {req.listing.photos?.length > 0 ? (
                          <img src={req.listing.photos[0]} alt={req.listing.title} />
                        ) : (
                          <div className="admin-report-listing-nophoto">📦</div>
                        )}
                        <div className="admin-report-listing-name">{req.listing.title}</div>
                        <div className="admin-report-listing-price">{req.listing.price} {req.listing.currency}</div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'banners' && (
                    <div className="admin-report-section">
                      <div className="admin-report-section-title">🖼️ Banner publicitario</div>
                      <div className="admin-report-banner-preview">
                        <img src={req.banner_url} alt="Banner" />
                      </div>
                      <div className="admin-report-banner-status">
                        Live: {req.is_live ? '✅ Sí' : '❌ No'}
                        {req.live_until && (
                          <span> | Hasta: {formatDate(req.live_until)}</span>
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
                  {activeTab === 'listings' && (
                    <button className="btn-small btn-success" onClick={() => handleApproveListing(req)}>
                      ✅ Aprobar anuncio ($1)
                    </button>
                  )}
                  {activeTab === 'banners' && (
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
