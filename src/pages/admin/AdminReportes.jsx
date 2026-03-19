import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import AdminNavbar from '../../components/AdminNavbar'
import './AdminReportes.css'

export default function AdminReportes() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')

  useEffect(() => { loadReports() }, [filter])

  const loadReports = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('reports')
        .select(`id, reason, details, status, created_at,
          listing:listings(id, title, slug, is_ghost),
          reporter:users(display_name, email)`)
        .order('created_at', { ascending: false })

      if (filter !== 'all') query = query.eq('status', filter)

      const { data } = await query
      if (data) setReports(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (id, status) => {
    await supabase.from('reports').update({ status, reviewed_at: new Date().toISOString() }).eq('id', id)
    loadReports()
  }

  const handleDeleteListing = async (listingId, reportId) => {
    if (!confirm('¿Eliminar el anuncio reportado?')) return
    await supabase.from('listings').delete().eq('id', listingId)
    await supabase.from('reports').update({ status: 'action_taken' }).eq('id', reportId)
    loadReports()
  }

  const reasonLabels = {
    spam: '📢 Spam',
    illegal: '🚫 Ilegal',
    scam: '💸 Estafa',
    inappropriate: '⚠️ Inapropiado'
  }

  return (
    <div className="admin-page">
      <AdminNavbar />
      <div className="admin-content">
        <div className="admin-page-header">
          <h1 className="serif luxury-gold">Reportes</h1>
          <p className="admin-page-sub">{reports.length} reportes</p>
        </div>

        <div className="admin-filters-bar">
          <div className="admin-filter-btns">
            {['all', 'pending', 'reviewed', 'action_taken', 'dismissed'].map(s => (
              <button key={s} className={`filter-btn ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
                {s === 'all' ? 'Todos' : s === 'pending' ? '🔴 Pendientes' : s === 'reviewed' ? '🟡 Revisados' : s === 'action_taken' ? '🟢 Acción tomada' : '⚫ Descartados'}
              </button>
            ))}
          </div>
        </div>

        <div className="admin-reports-list">
          {loading ? (
            <div className="admin-card admin-loading">Cargando reportes...</div>
          ) : reports.length === 0 ? (
            <div className="admin-card admin-loading">No hay reportes {filter !== 'all' ? `con estado "${filter}"` : ''}</div>
          ) : reports.map(report => (
            <div key={report.id} className="admin-report-card">
              <div className="admin-report-header">
                <span className="admin-report-reason">{reasonLabels[report.reason] || report.reason}</span>
                <span className={`admin-status status-${report.status}`}>{report.status}</span>
                <span className="admin-cell-muted">{new Date(report.created_at).toLocaleDateString()}</span>
              </div>

              <div className="admin-report-body">
                <div className="admin-report-listing">
                  <strong>Anuncio:</strong>{' '}
                  {report.listing ? (
                    <Link to={`/ficha/${report.listing.slug}`} target="_blank" className="admin-link">
                      {report.listing.title} {report.listing.is_ghost ? '🏴‍☠️' : ''}
                    </Link>
                  ) : '(eliminado)'}
                </div>
                {report.reporter && (
                  <div className="admin-report-reporter">
                    <strong>Reportado por:</strong> {report.reporter.display_name} ({report.reporter.email})
                  </div>
                )}
                {report.details && (
                  <div className="admin-report-details">"{report.details}"</div>
                )}
              </div>

              {report.status === 'pending' && (
                <div className="admin-report-actions">
                  <button className="btn-small btn-success" onClick={() => handleAction(report.id, 'reviewed')}>
                    ✓ Marcar revisado
                  </button>
                  <button className="btn-small btn-danger" onClick={() => handleAction(report.id, 'dismissed')}>
                    Descartar
                  </button>
                  {report.listing && (
                    <button className="btn-small btn-danger" onClick={() => handleDeleteListing(report.listing.id, report.id)}>
                      🗑️ Eliminar anuncio
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
