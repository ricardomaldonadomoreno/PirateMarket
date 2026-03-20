import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { getListings, getCategories } from '../lib/supabase'
import { formatPrice, timeAgo } from '../lib/utils'
import { Link, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Circle, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './Home.css'

// Fix Leaflet icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function ZoneDrawHandler({ onZoneSet }) {
  useMapEvents({
    click: (e) => onZoneSet({ lat: e.latlng.lat, lng: e.latlng.lng })
  })
  return null
}

export default function Home() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [listings, setListings] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    category: null,
    minPrice: '',
    maxPrice: '',
    isPirate: false,
    sellerTypes: [],
    search: ''
  })

  // Filtro de zona
  const [showZoneMap, setShowZoneMap] = useState(false)
  const [zoneFilter, setZoneFilter] = useState(null) // { lat, lng, radius_km }
  const [zoneRadius, setZoneRadius] = useState(3)
  const zoneMapCenter = zoneFilter || { lat: -17.7863, lng: -63.1812 }

  // Restaurar scroll
  useEffect(() => {
    if (!loading && listings.length > 0) {
      const savedScroll = sessionStorage.getItem('home_scroll')
      if (savedScroll) {
        setTimeout(() => {
          window.scrollTo(0, parseInt(savedScroll))
          sessionStorage.removeItem('home_scroll')
        }, 50)
      }
    }
  }, [loading, listings])

  useEffect(() => { loadData() }, [])
  useEffect(() => { loadListings() }, [filters])

  const loadData = async () => {
    try {
      const cats = await getCategories()
      setCategories(cats)
      await loadListings()
    } catch (error) { console.error('Error loading data:', error) }
  }

  const loadListings = async () => {
    setLoading(true)
    try {
      const data = await getListings(filters)
      setListings(data)
    } catch (error) { console.error('Error loading listings:', error) }
    finally { setLoading(false) }
  }

  const handleFilterChange = (key, value) => setFilters(prev => ({ ...prev, [key]: value }))

  const toggleSellerType = (type) => {
    setFilters(prev => {
      const current = prev.sellerTypes
      const exists = current.includes(type)
      return { ...prev, sellerTypes: exists ? current.filter(t => t !== type) : [...current, type] }
    })
  }

  const handleCardClick = () => sessionStorage.setItem('home_scroll', window.scrollY.toString())

  // Filtro por zona — calcula distancia haversine
  const filterByZone = (listings) => {
    if (!zoneFilter) return listings
    return listings.filter(l => {
      if (!l.location_lat || !l.location_lng) return false
      const R = 6371
      const dLat = (l.location_lat - zoneFilter.lat) * Math.PI / 180
      const dLng = (l.location_lng - zoneFilter.lng) * Math.PI / 180
      const a = Math.sin(dLat/2) ** 2 +
        Math.cos(zoneFilter.lat * Math.PI / 180) * Math.cos(l.location_lat * Math.PI / 180) * Math.sin(dLng/2) ** 2
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
      return dist <= zoneFilter.radius_km
    })
  }

  const displayedListings = filterByZone(listings)

  const handleSetZone = (latlng) => {
    setZoneFilter({ lat: latlng.lat, lng: latlng.lng, radius_km: zoneRadius })
  }

  const handleClearZone = () => {
    setZoneFilter(null)
    setShowZoneMap(false)
  }

  const sellerTypeButtons = [
    { type: 'pirate', icon: '🏴‍☠️', label: t('home.filters.pirates') },
    { type: 'person', icon: '👤', label: t('home.filters.persons') },
    { type: 'shop', icon: '🏪', label: t('home.filters.shops') },
    { type: 'wholesale', icon: '📦', label: t('home.filters.wholesale') },
  ]

  return (
    <div className="home">
      <div className="home-container">
        <aside className="sidebar">
          <div className="filter-section">
            <h3 className="filter-title">{t('home.filters.title')}</h3>
            <input type="text" className="input" placeholder={t('home.title')}
              value={filters.search} onChange={e => handleFilterChange('search', e.target.value)} />
          </div>

          <div className="filter-section">
            <h4 className="filter-subtitle">{t('home.filters.seller_type')}</h4>
            <div className="seller-type-filters">
              {sellerTypeButtons.map(({ type, icon, label }) => (
                <button key={type}
                  className={`seller-type-btn seller-type-${type} ${type === 'pirate' ? filters.isPirate ? 'active' : '' : filters.sellerTypes.includes(type) ? 'active' : ''}`}
                  onClick={() => { if (type === 'pirate') handleFilterChange('isPirate', !filters.isPirate); else toggleSellerType(type) }}>
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>

          {/* NUEVO: Filtro por zona */}
          <div className="filter-section">
            <h4 className="filter-subtitle">🗺️ Buscar por zona</h4>
            <button
              className={`zone-filter-btn ${zoneFilter ? 'active' : ''}`}
              onClick={() => setShowZoneMap(!showZoneMap)}>
              {zoneFilter ? `📍 Zona activa (${zoneFilter.radius_km}km)` : '🗺️ Seleccionar zona'}
            </button>
            {zoneFilter && (
              <button className="zone-clear-btn" onClick={handleClearZone}>✕ Quitar filtro de zona</button>
            )}

            {showZoneMap && (
              <div className="zone-map-container">
                <p className="form-hint">Haz clic en el mapa para centrar la zona de búsqueda</p>
                <MapContainer
                  center={[zoneMapCenter.lat, zoneMapCenter.lng]}
                  zoom={12}
                  style={{ height: '220px', width: '100%', borderRadius: '10px', marginTop: '0.5rem' }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='© OpenStreetMap' />
                  <ZoneDrawHandler onZoneSet={handleSetZone} />
                  {zoneFilter && (
                    <Circle
                      center={[zoneFilter.lat, zoneFilter.lng]}
                      radius={zoneFilter.radius_km * 1000}
                      color="#B8985F" fillOpacity={0.15}
                    />
                  )}
                </MapContainer>
                <div style={{ marginTop: '0.75rem' }}>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Radio: <strong>{zoneRadius} km</strong>
                  </label>
                  <input type="range" min="0.5" max="50" step="0.5"
                    value={zoneRadius} className="zone-slider"
                    onChange={e => {
                      const r = parseFloat(e.target.value)
                      setZoneRadius(r)
                      if (zoneFilter) setZoneFilter(prev => ({ ...prev, radius_km: r }))
                    }} />
                </div>
              </div>
            )}
          </div>

          <div className="filter-section">
            <button className="ventas-tv-btn" onClick={() => navigate('/ventas-tv')}>
              📺 VentasTV
              <span className="ventas-tv-badge">{t('home.filters.live')}</span>
            </button>
          </div>

          <div className="filter-section">
            <h4 className="filter-subtitle">{t('home.filters.categories')}</h4>
            <div className="category-list">
              <button className={`category-item ${!filters.category ? 'active' : ''}`}
                onClick={() => handleFilterChange('category', null)}>
                <span className="category-icon">🌐</span>
                <span>{t('home.filters.all')}</span>
              </button>
              {categories.map(cat => (
                <button key={cat.id}
                  className={`category-item ${filters.category === cat.id ? 'active' : ''}`}
                  onClick={() => handleFilterChange('category', cat.id)}>
                  <span className="category-icon">{cat.icon}</span>
                  <span>{t(`categories.${cat.slug}`)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <h4 className="filter-subtitle">{t('home.filters.price')}</h4>
            <div className="price-inputs">
              <input type="number" className="input" placeholder={t('home.filters.min')}
                value={filters.minPrice} onChange={e => handleFilterChange('minPrice', e.target.value)} />
              <span>—</span>
              <input type="number" className="input" placeholder={t('home.filters.max')}
                value={filters.maxPrice} onChange={e => handleFilterChange('maxPrice', e.target.value)} />
            </div>
          </div>
        </aside>

        <main className="content">
          <div className="content-header">
            <h2 className="serif">{t('home.title')}</h2>
            <div className="differentiators">
              <span>🚫 {t('home.diff.no_bans')}</span>
              <span>🔓 {t('home.diff.no_restrictions')}</span>
              <span>⚡ {t('home.diff.no_algorithms')}</span>
              <Link to="/como-funciona" className="how-it-works-btn">{t('home.how_it_works')} →</Link>
            </div>
            <p className="results-count">
              {displayedListings.length} {displayedListings.length === 1 ? 'anuncio' : 'anuncios'}
              {zoneFilter && <span style={{ color: 'var(--gold)', marginLeft: '0.5rem' }}>en zona seleccionada</span>}
            </p>
          </div>

          {loading ? (
            <div className="listings-grid">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="listing-card skeleton" style={{ height: '240px' }}></div>
              ))}
            </div>
          ) : displayedListings.length === 0 ? (
            <div className="no-results">
              <span className="no-results-icon">🏴‍☠️</span>
              <p>{zoneFilter ? 'No hay anuncios en esta zona' : t('home.no_results')}</p>
            </div>
          ) : (
            <div className="listings-grid">
              {displayedListings.map(listing => {
                const uType = listing.user?.user_type
                const sellerIcon = listing.is_ghost ? '🏴‍☠️' : uType === 'shop' ? '🏪' : uType === 'wholesale' ? '📦' : '👤'
                const sellerClass = listing.is_ghost ? 'pirate' : uType === 'shop' ? 'shop' : uType === 'wholesale' ? 'wholesale' : 'person'

                return (
                  <Link key={listing.id} to={`/ficha/${listing.slug}`}
                    className="listing-card" onClick={handleCardClick}>
                    <div className="listing-image">
                      {listing.photos && listing.photos.length > 0 ? (
                        <img src={listing.photos[0]} alt={listing.title} />
                      ) : (
                        <div className="listing-no-image"><span>{listing.category?.icon || '📦'}</span></div>
                      )}
                      {listing.video_url && <div className="video-badge">▶ 6s</div>}
                      <div className={`seller-badge ${sellerClass}`}>{sellerIcon}</div>
                      {listing.location_lat && (
                        <div className="location-dot" title="Tiene ubicación">📍</div>
                      )}
                    </div>
                    <div className="listing-info">
                      <p className="listing-price">{formatPrice(listing.price, listing.currency)}</p>
                      <span className={`listing-seller-type listing-seller-${sellerClass}`}>
                        {sellerIcon} {listing.is_ghost ? t('badges.pirate') : uType === 'shop' ? t('badges.shop') : uType === 'wholesale' ? t('badges.wholesale') : t('badges.verified')}
                      </span>
                      <p className="listing-title">{listing.title}</p>
                      <div className="listing-meta">
                        <span className="listing-location">📍 {listing.display_location}</span>
                        <span className="listing-time">{timeAgo(listing.created_at, t)}</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
