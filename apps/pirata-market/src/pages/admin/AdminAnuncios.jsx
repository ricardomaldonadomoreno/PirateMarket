import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import AdminNavbarPirata from '../../components/AdminNavbarPirata'
import './AdminAnuncios.css'

export default function AdminAnuncios() {
  const [listings, setListings] = useState([])
  const [featured, setFeatured] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [activeTab, setActiveTab] = useState('listings') // 'listings' | 'featured'

  useEffect(() => {
    loadListings()
    loadFeatured()
  }, [])

  const loadListings = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('listings')
        .select(`id, title, price, currency, status, is_ghost, created_at, views_count, slug, photos,
          user:users(display_name, email),
          category:categories(name, icon)`)
        .order('created_at', { ascending: false })
      if (data) setListings(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const loadFeatured = async () => {
    const { data } = await supabase
      .from('featured_listings')
      .select(`id, status, show_in_banner, banner_image_url, price_per_week, activated_at, expires_at, created_at,
        listing:listings(id, title, slug, photos, price, currency),
        user:users(display_name, email)`)
      .order('created_at', { ascending: false })
    if (data) setFeatured(data)
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este anuncio?')) return
    await supabase.from('listings').delete().eq('id', id)
    loadListings()
  }

  const handleStatusChange = async (id, status) => {
    await supabase.from('listings').update({ status }).eq('id', id)
    loadListings()
  }

  // ── DESTACADOS ──
  const handleActivateFeatured = async (id) => {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 1 semana
    await supabase.from('featured_listings').update({
      status: 'active',
      activated_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString()
    }).eq('id', id)
    loadFeatured()
  }

  const handleDeactivateFeatured = async (id) => {
    await supabase.from('featured_listings').update({
      status: 'expired'
    }).eq('id', id)
    loadFeatured()
  }

  const handleToggleBanner = async (id, current) => {
    await supabase.from('featured_listings').update({ show_in_banner: !current }).eq('id', id)
    loadFeatured()
  }

  const handleDeleteFeatured = async (id) => {
    if (!confirm('¿Eliminar este destacado?')) return
    await supabase.from('featured_listings').delete().eq('id', id)
    loadFeatured()
  }

  const filtered = listings.filter(l => {
    const matchSearch = l.title?.toLowerCase().includes(search.toLowerCase()) ||
      l.user?.display_name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || l.status === filterStatus
    const matchType = filterType === 'all' ||
      (filterType === 'pirate' && l.is_ghost) ||
      (filterType === 'registered' && !l.is_ghost)
    return matchSearch && matchStatus && matchType
  })

  const fmt = (date) => date ? new Date(date).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'

  return (
    <div className="admin-page">
      <AdminNavbarPirata />
      <div className="admin-content">
        <div className="admin-page-header">
          <h1 className="serif luxury-gold">Anuncios</h1>
          <p className="admin-page-sub">{listings.length} anuncios · {featured.filter(f => f.status === 'active').length} destacados activos</p>
        </div>

        {/* Tabs */}
        <div className="admin-tab-bar">
          <button className={`admin-tab ${activeTab === 'listings' ? 'active' : ''}`} onClick={() => setActiveTab('listings')}>
            📋 Anuncios ({listings.length})
          </button>
          <button className={`admin-tab ${activeTab === 'featured' ? 'active' : ''}`} onClick={() => setActiveTab('featured')}>
            ⭐ Destacados ({featured.length})
          </button>
        </div>

        {activeTab === 'listings' && (
          <>
            <div className="admin-filters-bar">
              <input
                type="text" className="input" placeholder="Buscar por título o vendedor..."
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ maxWidth: '300px' }}
              />
              <div className="admin-filter-btns">
                {['all', 'active', 'paused', 'sold'].map(s => (
                  <button key={s} className={`filter-btn ${filterStatus === s ? 'active' : ''}`} onClick={() => setFilterStatus(s)}>
                    {s === 'all' ? 'Todos' : s}
                  </button>
                ))}
              </div>
              <div className="admin-filter-btns">
                {[['all', 'Todo'], ['pirate', '🏴‍☠️ Piratas'], ['registered', '✓ Registrados']].map(([val, label]) => (
                  <button key={val} className={`filter-btn ${filterType === val ? 'active' : ''}`} onClick={() => setFilterType(val)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="admin-card">
              {loading ? (
                <div className="admin-loading">Cargando anuncios...</div>
              ) : (
                <div className="admin-listings-table">
                  <div className="admin-listings-header">
                    <span>Anuncio</span>
                    <span>Vendedor</span>
                    <span>Precio</span>
                    <span>Estado</span>
                    <span>Vistas</span>
                    <span>Acciones</span>
                  </div>
                  {filtered.map(listing => (
                    <div key={listing.id} className="admin-listing-row">
                      <div className="admin-listing-info">
                        <div className="admin-listing-thumb">
                          {listing.photos?.[0]
                            ? <img src={listing.photos[0]} alt={listing.title} />
                            : <span>{listing.category?.icon || '📦'}</span>
                          }
                        </div>
                        <div>
                          <div className="admin-listing-title">{listing.title}</div>
                          <div className="admin-listing-meta">
                            {listing.is_ghost ? '🏴‍☠️ Pirata' : `${listing.category?.icon} ${listing.category?.name}`}
                          </div>
                        </div>
                      </div>

                      <div className="admin-cell-muted">
                        {listing.is_ghost ? '—' : listing.user?.display_name || '—'}
                      </div>

                      <div className="admin-cell-gold">
                        {listing.currency || 'BOB'} {Number(listing.price).toLocaleString()}
                      </div>

                      <div>
                        <select
                          className="admin-type-select"
                          value={listing.status}
                          onChange={e => handleStatusChange(listing.id, e.target.value)}
                        >
                          <option value="active">Activo</option>
                          <option value="paused">Pausado</option>
                          <option value="sold">Vendido</option>
                          <option value="deleted">Eliminado</option>
                        </select>
                      </div>

                      <div className="admin-cell-muted">👁️ {listing.views_count}</div>

                      <div className="admin-user-actions">
                        <Link to={`/ficha/${listing.slug}`} target="_blank" className="btn-small btn-success">
                          Ver
                        </Link>
                        <button className="btn-small btn-danger" onClick={() => handleDelete(listing.id)}>
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'featured' && (
          <div className="admin-card">
            {featured.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No hay solicitudes de destacados aún.
              </div>
            ) : (
              <div className="admin-listings-table">
                <div className="admin-listings-header">
                  <span>Anuncio</span>
                  <span>Vendedor</span>
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
                          : f.listing?.photos?.[0]
                            ? <img src={f.listing.photos[0]} alt={f.listing.title} />
                            : <span>📦</span>
                        }
                      </div>
                      <div>
                        <div className="admin-listing-title">{f.listing?.title || 'Anuncio eliminado'}</div>
                        <div className="admin-listing-meta">${f.price_per_week}/semana</div>
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
                        <button className="btn-small btn-success" onClick={() => handleActivateFeatured(f.id)}>
                          ✓ Activar
                        </button>
                      )}
                      {f.status === 'active' && (
                        <button className="btn-small btn-danger" onClick={() => handleDeactivateFeatured(f.id)}>
                          ✗ Expirar
                        </button>
                      )}
                      <button className="btn-small btn-danger" onClick={() => handleDeleteFeatured(f.id)}>
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
