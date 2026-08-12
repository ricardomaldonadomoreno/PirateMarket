import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import AdminNavbarPirata from '../../../components/AdminNavbarPirata'
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
      .from('destacar_listings')
      .select(`id, user_id, listing_id, status, is_live, live_until, admin_note, reviewed_at, created_at,
        listing:listings(id, title, slug, photos, price, currency)`)
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
  const handleActivateFeatured = async (id, listingId) => {
    const now = new Date()
    const until = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Marcar anuncio como destacado en listings
    await supabase.from('listings').update({
      is_featured: true,
      featured_until: until.toISOString()
    }).eq('id', listingId)

    // Actualizar solicitud
    await supabase.from('destacar_listings').update({
      status: 'approved',
      is_live: true,
      live_until: until.toISOString(),
      reviewed_at: new Date().toISOString()
    }).eq('id', id)

    loadFeatured()
  }

  const handleDeactivateFeatured = async (id, listingId) => {
    // Quitar destacado del anuncio
    await supabase.from('listings').update({
      is_featured: false,
      featured_until: null
    }).eq('id', listingId)

    // Actualizar solicitud
    await supabase.from('destacar_listings').update({
      status: 'expired',
      is_live: false
    }).eq('id', id)

    loadFeatured()
  }

  const handleToggleBanner = async (id, current, listingId) => {
    // No se usa para esta nueva tabla, mantener compatibilidad
    loadFeatured()
  }

  const handleDeleteFeatured = async (id) => {
    if (!confirm('¿Eliminar este destacado?')) return
    await supabase.from('destacar_listings').delete().eq('id', id)
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
          <p className="admin-page-sub">{listings.length} anuncios · {featured.filter(f => f.is_live).length} destacados activos</p>
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
                  <span>Precio</span>
                  <span>Estado</span>
                  <span>Creado</span>
                  <span>Expira</span>
                  <span>Acciones</span>
                </div>
                {featured.map(f => (
                  <div key={f.id} className="admin-listing-row">
                    <div className="admin-listing-info">
                      <div className="admin-listing-thumb">
                        {f.listing?.photos?.[0]
                          ? <img src={f.listing.photos[0]} alt={f.listing.title} />
                          : <span>📦</span>
                        }
                      </div>
                      <div>
                        <div className="admin-listing-title">{f.listing?.title || 'Anuncio eliminado'}</div>
                        <div className="admin-listing-meta">
                          {f.listing?.price} {f.listing?.currency || 'USD'}
                        </div>
                      </div>
                    </div>

                    <div className="admin-cell-gold">$1 × 30 días</div>

                    <div>
                      <span className={`admin-badge ${
                        f.status === 'approved' ? 'badge-verified' :
                        f.status === 'pending' ? 'badge-pending' :
                        f.status === 'rejected' ? 'badge-rejected' : 'badge-free'
                      }`}>
                        {f.status === 'approved' ? '✓ Activo' :
                         f.status === 'pending' ? '⏳ Pendiente' :
                         f.status === 'rejected' ? 'Rechazado' :
                         f.status === 'expired' ? 'Expirado' : f.status}
                      </span>
                    </div>

                    <div className="admin-cell-muted">{fmt(f.created_at)}</div>
                    <div className="admin-cell-muted">{fmt(f.live_until)}</div>

                    <div className="admin-user-actions">
                      {f.status === 'pending' && (
                        <button className="btn-small btn-success" onClick={() => handleActivateFeatured(f.id, f.listing_id)}>
                          ✓ Activar
                        </button>
                      )}
                      {(f.status === 'approved') && (
                        <button className="btn-small btn-danger" onClick={() => handleDeactivateFeatured(f.id, f.listing_id)}>
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
