import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import AdminNavbarPirata from '../../../components/AdminNavbarPirata'
import './AdminBanners.css'

export default function AdminBanners() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')

  // Banners de la app (subidos por admin)
  const [appBanners, setAppBanners] = useState([])
  const [appBannerFile, setAppBannerFile] = useState(null)
  const [appBannerPreview, setAppBannerPreview] = useState(null)
  const [appBannerDays, setAppBannerDays] = useState(30)
  const [appBannerUploading, setAppBannerUploading] = useState(false)

  useEffect(() => { loadRequests() }, [filter])
  useEffect(() => { loadAppBanners() }, [])

  // ── Cargar solicitudes de usuarios ──
  const loadRequests = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('destacar_banners')
        .select(`*`)
        .neq('is_app_banner', true)
        .order('created_at', { ascending: false })

      if (filter !== 'all') query = query.eq('status', filter)

      const { data } = await query

      if (data) {
        const enriched = await Promise.all(
          data.map(async (req) => {
            const result = {}
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

  // ── Cargar banners de la app ──
  const loadAppBanners = async () => {
    try {
      const { data } = await supabase
        .from('destacar_banners')
        .select('*')
        .eq('is_app_banner', true)
        .order('created_at', { ascending: false })

      if (data) setAppBanners(data)
    } catch (error) {
      console.error('Error loading app banners:', error)
    }
  }

  // ── Aprobar banner de usuario ──
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

    if (error) { console.error('Error approving:', error); return }
    loadRequests()
  }

  // ── Desactivar banner de usuario ──
  const handleDeactivate = async (req) => {
    const { error } = await supabase
      .from('destacar_banners')
      .update({ is_live: false, status: 'expired' })
      .eq('id', req.id)

    if (error) { console.error('Error deactivating:', error); return }
    loadRequests()
  }

  // ── Rechazar solicitud de usuario ──
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

    if (error) { console.error('Error rejecting:', error); return }
    loadRequests()
  }

  // ── Eliminar banner ──
  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este banner?')) return
    const { error } = await supabase
      .from('destacar_banners')
      .delete()
      .eq('id', id)

    if (error) { console.error('Error deleting:', error); return }
    loadRequests()
    loadAppBanners()
  }

  // ── Banners de la app: suba de imagen ──
  const handleAppBannerFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setAppBannerFile(file)
      const reader = new FileReader()
      reader.onload = (ev) => setAppBannerPreview(ev.target?.result)
      reader.readAsDataURL(file)
    }
  }

  // ── Subir banner de la app ──
  const handleUploadAppBanner = async () => {
    if (!appBannerFile) return
    setAppBannerUploading(true)

    try {
      // Subir al bucket banner-uploads
      const fileName = `app-banner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`
      const { error: uploadError } = await supabase.storage
        .from('banner-uploads')
        .upload(fileName, appBannerFile)

      if (uploadError) throw uploadError

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('banner-uploads')
        .getPublicUrl(fileName)

      const bannerUrl = urlData.publicUrl

      // Insertar en destacar_banners con is_app_banner=true, aprobado y activo directamente
      const now = new Date()
      const until = new Date(now.getTime() + appBannerDays * 24 * 60 * 60 * 1000)

      const { error } = await supabase
        .from('destacar_banners')
        .insert({
          user_id: null,
          banner_url: bannerUrl,
          status: 'approved',
          is_live: true,
          live_until: until.toISOString(),
          is_app_banner: true,
          admin_note: `Banner de la app - ${appBannerDays} días`,
          reviewed_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        })

      if (error) throw error

      // Reset
      setAppBannerFile(null)
      setAppBannerPreview(null)
      setAppBannerDays(30)

      loadAppBanners()
      loadRequests()
    } catch (error) {
      console.error('Error uploading app banner:', error)
      alert('Error al subir el banner. Intenta de nuevo.')
    } finally {
      setAppBannerUploading(false)
    }
  }

  // ── Activar/desactivar banner de la app ──
  const handleToggleAppBanner = async (banner) => {
    const { error } = await supabase
      .from('destacar_banners')
      .update({ is_live: !banner.is_live })
      .eq('id', banner.id)

    if (error) { console.error('Error toggling:', error); return }
    loadAppBanners()
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
        </div>

        {/* ── SECCIÓN: Banners de la App ── */}
        <div className="admin-section admin-app-banner-section">
          <h2 className="admin-section-title">🖼️ Banners de la App</h2>
          <p className="admin-section-sub">Sube banners propios de la app para mostrar en el Home</p>

          {/* Formulario de subida */}
          <div className="admin-app-banner-form">
            <div className="admin-app-banner-upload">
              <input
                type="file"
                accept="image/*"
                onChange={handleAppBannerFileChange}
                id="app-banner-upload"
                className="admin-file-input"
              />
              <label htmlFor="app-banner-upload" className="admin-file-label">
                {appBannerPreview ? (
                  <img src={appBannerPreview} alt="Preview" className="admin-file-preview" />
                ) : (
                  <div className="admin-file-placeholder">
                    <span className="admin-file-icon">📤</span>
                    <span>Seleccionar imagen (1200×300)</span>
                  </div>
                )}
              </label>
            </div>

            <div className="admin-app-banner-options">
              <label className="admin-label">Días de duración:</label>
              <select
                value={appBannerDays}
                onChange={(e) => setAppBannerDays(Number(e.target.value))}
                className="admin-select"
              >
                <option value={7}>7 días</option>
                <option value={14}>14 días</option>
                <option value={30}>30 días</option>
                <option value={60}>60 días</option>
                <option value={90}>90 días</option>
              </select>
            </div>

            <button
              className="admin-btn admin-btn-gold"
              onClick={handleUploadAppBanner}
              disabled={!appBannerFile || appBannerUploading}
            >
              {appBannerUploading ? 'Subiendo...' : 'Publicar Banner'}
            </button>
          </div>

          {/* Lista de banners de la app */}
          {appBanners.length > 0 && (
            <div className="admin-app-banner-list">
              {appBanners.map(banner => (
                <div key={banner.id} className={`admin-app-banner-item ${banner.is_live ? 'live' : ''}`}>
                  <div className="admin-app-banner-img">
                    <img src={banner.banner_url} alt="Banner app" />
                  </div>
                  <div className="admin-app-banner-info">
                    <span className={`admin-status status-${banner.is_live ? 'approved' : 'rejected'}`}>
                      {banner.is_live ? 'En vivo' : 'Pausado'}
                    </span>
                    <span className="admin-cell-muted">Hasta {formatDate(banner.live_until)}</span>
                  </div>
                  <div className="admin-app-banner-actions">
                    <button
                      className="btn-small btn-gold"
                      onClick={() => handleToggleAppBanner(banner)}
                    >
                      {banner.is_live ? 'Pausar' : 'Activar'}
                    </button>
                    <button
                      className="btn-small btn-danger"
                      onClick={() => handleDelete(banner.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── SECCIÓN: Solicitudes de usuarios ── */}
        <div className="admin-section">
          <h2 className="admin-section-title">📨 Solicitudes de Usuarios</h2>
          <p className="admin-section-sub">{requests.length} solicitudes</p>

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
    </div>
  )
}
