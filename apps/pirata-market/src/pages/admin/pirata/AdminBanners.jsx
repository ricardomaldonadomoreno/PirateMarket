import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import AdminNavbarPirata from '../../../components/AdminNavbarPirata'
import './AdminBanners.css'

export default function AdminBanners() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')

  useEffect(() => { loadRequests() }, [filter])

  const loadRequests = async () => {
    setLoading(true)
    try {
      // Cargar solicitudes de destacar_banners exclusivamente
      let query = supabase
        .from('destacar_banners')
        .select(`*`)
        .order('created_at', { ascending: false })

      if (filter !== 'all') query = query.eq('status', filter)

      const { data } = await query

      if (data) {
        // Enriquecer con info del usuario
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
    } catch (error) {
      console.error('Error loading banners:', error)
    } finally {
      setLoading(false)
    }
  }

  // Aprobar banner (is_live=true, live_until=30 días)
  const handleApprove = async (req) => {
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
      return
    }

    loadRequests()
  }

  // Desactivar banner (quitar del home)
  const handleDeactivate = async (req) => {
    const { error } = await supabase
      .from('destacar_banners')
      .update({
        is_live: false,
        status: 'expired'
      })
      .eq('id', req.id)

    if (error) {
      console.error('Error deactivating banner:', error)
      return
    }

    loadRequests()
  }

  // Rechazar solicitud
  const handleReject = async (req) => {
    const note = prompt('Nota de rechazo (opcional):') || 'Solicitud rechazada'

    const { error } = await supabase
      .from('destacar_banners')
      .update({
        status: 'rejected',
        admin_note: note,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', req.id)

    if (error) {
      console.error('Error rejecting banner:', error)
      return
    }

    loadRequests()
  }

  // Eliminar solicitud
  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta solicitud de banner?')) return
    const { error } = await supabase
      .from('destacar_banners')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting banner:', error)
      return
    }

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
          <h1 className="serif luxury-gold">Banners Publicitarios</h1>
          <p className="admin-page-sub">{requests.length} solicitudes</p>
        </div>

        {/* Filtros */}
        <div className="admin-filters-bar">
          <div className="admin-filter-btns">
            {['all', 'pending', 'approved', 'rejected', 'expired'].map(s => (
              <button key={s} className={`filter-btn ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
                {s === 'all' ? 'Todos' : s === 'pending' ? 'Pendientes' : s === 'approved' ? 'Aprobados' : s === 'rejected' ? 'Rechazados' : 'Expirados'}
              </button>
            ))}
          </div>
        </div>

        <div className="admin-reports-list">
          {loading ? (
            <div className="admin-card admin-loading">Cargando banners...</div>
          ) : requests.length === 0 ? (
            <div className="admin-card admin-loading">
              No hay solicitudes {filter !== 'all' ? `con estado "${filter}"` : ''}
            </div>
          ) : requests.map(req => (
            <div key={req.id} className="admin-report-card">
              {/* Header */}
              <div className="admin-report-header">
                <span className="admin-report-user">
                  {req.user?.display_name || 'Desconocido'}
                  <span className="admin-cell-muted"> ({req.user?.email || '—'})</span>
                </span>
                <span className="admin-cell-muted">{formatDate(req.created_at)}</span>
              </div>

              {/* Estado */}
              <div className="admin-report-status-row">
                <span className={`admin-status status-${req.status}`}>
                  {req.status === 'pending' ? 'Pendiente' :
                   req.status === 'approved' ? 'Aprobado' :
                   req.status === 'rejected' ? 'Rechazado' :
                   req.status === 'expired' ? 'Expirado' : req.status}
                </span>
                {req.is_live && (
                  <span className="admin-status status-live">En vivo</span>
                )}
              </div>

              {/* Preview del banner */}
              <div className="admin-report-banner-preview">
                <img src={req.banner_url} alt="Banner publicitario" />
              </div>

              {/* Info */}
              <div className="admin-report-meta">
                {req.live_until && (
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
                    Aprobar y activar ($30 × 30 días)
                  </button>
                  <button className="btn-small btn-danger" onClick={() => handleReject(req)}>
                    Rechazar
                  </button>
                </div>
              )}

              {req.status === 'approved' && req.is_live && (
                <div className="admin-report-actions">
                  <button className="btn-small btn-danger" onClick={() => handleDeactivate(req)}>
                    Desactivar del Home
                  </button>
                </div>
              )}

              <div className="admin-report-actions">
                <button className="btn-small btn-secondary" onClick={() => handleDelete(req.id)}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
