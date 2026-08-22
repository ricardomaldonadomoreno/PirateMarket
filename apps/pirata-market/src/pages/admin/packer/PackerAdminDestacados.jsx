import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import AdminNavbarPacker from '../../../components/AdminNavbarPacker'

export default function PackerAdminDestacados() {
  const [featured, setFeatured] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadFeatured() }, [])

  const loadFeatured = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('packer_featured_trips')
        .select(`id, status, show_in_banner, banner_image_url, price_per_week, activated_at, expires_at, created_at,
          trip:packer_trips(id, origin:origin_city, destination:destination_city, departure_date, available_seats:max_units),
          user:users(display_name, email)`)
        .order('created_at', { ascending: false })

      if (error) { console.error(error); return }
      if (data) setFeatured(data)
    } catch (error) {
      console.error('loadFeatured error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleActivate = async (id) => {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 1 semana
    await supabase.from('packer_featured_trips').update({
      status: 'active',
      activated_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString()
    }).eq('id', id)
    loadFeatured()
  }

  const handleDeactivate = async (id) => {
    await supabase.from('packer_featured_trips').update({ status: 'expired' }).eq('id', id)
    loadFeatured()
  }

  const handleToggleBanner = async (id, current) => {
    await supabase.from('packer_featured_trips').update({ show_in_banner: !current }).eq('id', id)
    loadFeatured()
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este destacado?')) return
    await supabase.from('packer_featured_trips').delete().eq('id', id)
    loadFeatured()
  }

  const fmt = (date) => date ? new Date(date).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'

  return (
    <div className="admin-page">
      <AdminNavbarPacker />
      <div className="admin-content">
        <div className="admin-page-header">
          <h1 className="serif luxury-gold">Destacados — Packer</h1>
          <p className="admin-page-sub">{featured.length} solicitudes de destacados de viajes</p>
        </div>

        <div className="admin-card">
          {loading ? (
            <div className="admin-loading">Cargando destacados...</div>
          ) : featured.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No hay solicitudes de destacados.
            </div>
          ) : (
            <div className="admin-listings-table">
              <div className="admin-listings-header">
                <span>Viaje</span>
                <span>Solicitante</span>
                <span>Estado</span>
                <span>Banner</span>
                <span>Activa</span>
                <span>Expira</span>
                <span>Acciones</span>
              </div>
              {featured.map(f => (
                <div key={f.id} className="admin-listing-row">
                  <div className="admin-listing-info">
                    <div className="admin-listing-thumb">
                      {f.banner_image_url
                        ? <img src={f.banner_image_url} alt="Banner" />
                        : <span>🚛</span>
                      }
                    </div>
                    <div>
                      <div className="admin-listing-title">{f.trip?.origin} → {f.trip?.destination}</div>
                      <div className="admin-listing-meta">
                        {fmt(f.trip?.departure_date)} · {f.trip?.available_seats} asientos
                      </div>
                    </div>
                  </div>

                  <div className="admin-cell-muted">{f.user?.display_name || '—'}</div>

                  <div>
                    <span className={`admin-badge ${
                      f.status === 'active' ? 'badge-verified' :
                      f.status === 'pending' ? 'badge-pending' :
                      f.status === 'expired' ? 'badge-rejected' : 'badge-free'
                    }`}>
                      {f.status === 'active' ? '✓ Activo' :
                       f.status === 'pending' ? '⏳ Pendiente' :
                       f.status === 'expired' ? 'Expirado' : f.status}
                    </span>
                  </div>

                  <div>
                    <button
                      className={`btn-small ${f.show_in_banner ? 'btn-premium' : 'btn-secondary'}`}
                      onClick={() => handleToggleBanner(f.id, f.show_in_banner)}
                      disabled={f.status !== 'active'}
                    >
                      {f.show_in_banner ? '🖼️ En banner' : '🖼️ No banner'}
                    </button>
                  </div>

                  <div className="admin-cell-muted">{fmt(f.activated_at)}</div>
                  <div className="admin-cell-muted">{fmt(f.expires_at)}</div>

                  <div className="admin-user-actions">
                    {f.status === 'pending' && (
                      <button className="btn-small btn-success" onClick={() => handleActivate(f.id)}>
                        ✓ Activar
                      </button>
                    )}
                    {f.status === 'active' && (
                      <button className="btn-small btn-danger" onClick={() => handleDeactivate(f.id)}>
                        ✗ Expirar
                      </button>
                    )}
                    <button className="btn-small btn-danger" onClick={() => handleDelete(f.id)}>
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
