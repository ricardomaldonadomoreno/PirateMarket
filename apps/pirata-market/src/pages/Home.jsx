import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { getListings, getCategories } from '../lib/supabase'
import { supabase } from '../lib/supabase'
import { formatPrice, timeAgo } from '../lib/utils'
import { Link, useNavigate } from 'react-router-dom'
import { Ban, CircleHelp, Gavel, Globe2, Map, MapPin, Package, Search, Skull, SlidersHorizontal, Store, Tag, Tv, Unlock, User, X, Zap } from 'lucide-react'
import { MapContainer, TileLayer, Circle, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './Home.css'

function ZoneDrawHandler({ onZoneSet }) {
  useMapEvents({ click: (e) => onZoneSet({ lat: e.latlng.lat, lng: e.latlng.lng }) })
  return null
}

let homeViewCache = null

export default function Home() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [listings, setListings] = useState(() => homeViewCache?.listings || [])
  const [categories, setCategories] = useState(() => homeViewCache?.categories || [])
  const [loading, setLoading] = useState(() => !homeViewCache)
  const [loadingMore, setLoadingMore] = useState(false)
  const [listingsOffset, setListingsOffset] = useState(() => homeViewCache?.listingsOffset || 0)
  const [hasMoreListings, setHasMoreListings] = useState(() => homeViewCache?.hasMoreListings ?? true)
  const [showDrawer, setShowDrawer] = useState(false)
  const [featuredBanners, setFeaturedBanners] = useState(() => homeViewCache?.featuredBanners || [])
  const [currentBannerIdx, setCurrentBannerIdx] = useState(() => homeViewCache?.currentBannerIdx || 0)
  const [isBannerPaused, setIsBannerPaused] = useState(false)
  const [featuredListings, setFeaturedListings] = useState(() => homeViewCache?.featuredListings || [])
  const [featuredShuffle, setFeaturedShuffle] = useState(() => homeViewCache?.featuredShuffle || null) // Se genera una sola vez al cargar
  const [filters, setFilters] = useState(() => homeViewCache?.filters || {
    category: null,
    minPrice: '',
    maxPrice: '',
    isPirate: false,
    sellerTypes: [],
    auctionOnly: false,
    search: ''
  })
  const [appliedFilters, setAppliedFilters] = useState(() => homeViewCache?.appliedFilters || {
    category: null,
    minPrice: '',
    maxPrice: '',
    isPirate: false,
    sellerTypes: [],
    auctionOnly: false,
    search: ''
  })

  // Filtro de zona
  const [showZoneMap, setShowZoneMap] = useState(false)
  const [zoneFilter, setZoneFilter] = useState(() => homeViewCache?.zoneFilter || null)
  const [appliedZoneFilter, setAppliedZoneFilter] = useState(() => homeViewCache?.appliedZoneFilter || null)
  const [zoneRadius, setZoneRadius] = useState(() => homeViewCache?.zoneRadius || 3)
  const zoneMapCenter = zoneFilter || { lat: -17.7863, lng: -63.1812 }

  // Cerrar drawer con ESC
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') setShowDrawer(false) }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // Bloquear scroll del body cuando drawer abierto
  useEffect(() => {
    document.body.style.overflow = showDrawer ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [showDrawer])

  // Restaurar la vista guardada al volver desde una ficha
  useEffect(() => {
    if (!homeViewCache || loading) return
    const savedScroll = homeViewCache.scrollY
    const restoreTimer = setTimeout(() => {
      if (homeViewCache) {
        window.scrollTo(0, savedScroll)
        homeViewCache = null
      }
    }, 50)
    return () => clearTimeout(restoreTimer)
  }, [loading])

  useEffect(() => {
    if (homeViewCache) return
    loadData(); loadFeatured()
  }, [])

  // Rotación de banners cada 5 segundos (con pausa al hover)
  useEffect(() => {
    if (featuredBanners.length <= 1 || isBannerPaused) return
    const interval = setInterval(() => {
      setCurrentBannerIdx(prev => (prev + 1) % featuredBanners.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [featuredBanners, isBannerPaused])

  const goToBanner = (idx) => setCurrentBannerIdx(idx)
  const prevBanner = () => setCurrentBannerIdx(prev => (prev - 1 + featuredBanners.length) % featuredBanners.length)
  const nextBanner = () => setCurrentBannerIdx(prev => (prev + 1) % featuredBanners.length)
  useEffect(() => {
    if (homeViewCache) return
    loadListings()
  }, [appliedFilters, appliedZoneFilter])

  const loadFeatured = async () => {
    const now = new Date().toISOString()
    try {
      // Cargar banners aprobados y activos desde destacar_banners
      const { data: bannerData } = await supabase
        .from('destacar_banners')
        .select('id, banner_url, live_until')
        .eq('status', 'approved')
        .eq('is_live', true)
        .gt('live_until', now)
        .order('created_at', { ascending: false })

      if (bannerData && bannerData.length > 0) {
        setFeaturedBanners(bannerData)
      }

      // Cargar anuncios destacados desde destacar_listings (solo aprobados y activos)
      const { data: featuredData } = await supabase
        .from('destacar_listings')
        .select('listing_id')
        .eq('status', 'approved')
        .eq('is_live', true)
        .gt('live_until', now)

      if (featuredData) {
        setFeaturedListings(featuredData)
        // Generar orden aleatorio UNA vez al cargar (solo para destacados)
        setFeaturedShuffle(featuredData.map(f => ({ id: f.listing_id, rand: Math.random() })).sort((a, b) => a.rand - b.rand))
      }
    } catch (error) { console.error('Error loading featured:', error) }
  }

  const loadData = async () => {
    try {
      const cats = await getCategories()
      setCategories(cats)
    } catch (error) { console.error('Error loading data:', error) }
  }

  const loadListings = async (offset = 0, append = false) => {
    if (append) setLoadingMore(true)
    else setLoading(true)
    try {
      // No pasar sellerTypes a supabase para que traiga todos (el filtro se aplica localmente)
      const filtersForQuery = { ...appliedFilters, sellerTypes: [] }
      const data = await getListings(filtersForQuery, offset)

      // Filtrar por seller_type localmente (lee de listings.seller_type directamente)
      let filtered = data
      if (appliedFilters.sellerTypes && appliedFilters.sellerTypes.length > 0) {
        filtered = data.filter(listing =>
          !listing.is_ghost && appliedFilters.sellerTypes.includes(listing.seller_type)
        )
      }

      const listingIds = filtered.map(listing => listing.id)
      let auctionByListing = {}
      if (listingIds.length > 0) {
        const { data: auctionData, error: auctionError } = await supabase
          .from('pirata_auctions')
          .select('listing_id, start_price, ends_at, status')
          .in('listing_id', listingIds)
          .eq('status', 'active')

        if (auctionError) {
          console.warn('No se pudieron cargar las subastas del Home:', auctionError)
        } else {
          auctionByListing = Object.fromEntries(
            (auctionData || [])
              .filter(auction => new Date(auction.ends_at) > new Date())
              .map(auction => [auction.listing_id, auction])
          )
        }
      }

      const listingsWithAuctions = filtered.map(listing => ({
        ...listing,
        auction: auctionByListing[listing.id] || null,
      }))
      const visibleListings = appliedFilters.auctionOnly
        ? listingsWithAuctions.filter(listing => listing.auction)
        : listingsWithAuctions
      setListings(current => append ? [...current, ...visibleListings] : visibleListings)
      setListingsOffset(offset + data.length)
      setHasMoreListings(data.length === 24)
    } catch (error) { console.error('Error loading listings:', error) }
    finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const handleFilterChange = (key, value) => setFilters(prev => ({ ...prev, [key]: value }))

  const handleSearchSubmit = (event) => {
    event?.preventDefault()
    homeViewCache = null
    setAppliedFilters(prev => ({ ...prev, search: filters.search }))
  }
  const handleSearchKeyDown = (event) => {
    if (event.key === 'Enter') handleSearchSubmit(event)
  }

  const toggleSellerType = (type) => {
    setFilters(prev => {
      const current = prev.sellerTypes
      const exists = current.includes(type)
      return { ...prev, sellerTypes: exists ? current.filter(t => t !== type) : [...current, type] }
    })
  }

  const handleCardClick = () => {
    homeViewCache = {
      listings,
      categories,
      listingsOffset,
      hasMoreListings,
      featuredBanners,
      currentBannerIdx,
      featuredListings,
      featuredShuffle,
      filters,
      appliedFilters,
      zoneFilter,
      appliedZoneFilter,
      zoneRadius,
      scrollY: window.scrollY,
    }
  }

  const filterByZone = (listings) => {
    if (!appliedZoneFilter) return listings
    return listings.filter(l => {
      if (!l.location_lat || !l.location_lng) return false
      const R = 6371
      const dLat = (l.location_lat - appliedZoneFilter.lat) * Math.PI / 180
      const dLng = (l.location_lng - appliedZoneFilter.lng) * Math.PI / 180
      const a = Math.sin(dLat/2) ** 2 +
        Math.cos(appliedZoneFilter.lat * Math.PI / 180) * Math.cos(l.location_lat * Math.PI / 180) * Math.sin(dLng/2) ** 2
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
      return dist <= appliedZoneFilter.radius_km
    })
  }

  // Construir set de IDs destacados (listing_id viene de destacar_listings)
  const featuredIds = new Set(featuredListings.map(f => f.listing_id))
  // Ordenar los IDs destacados según el shuffle generado al cargar (no cambia en cada render)
  const featuredIdsOrdered = featuredShuffle ? featuredShuffle.map(f => f.id) : Array.from(featuredIds)
  
  // Separar destacados de no destacados, mantener orden original de los normales
  const allListings = filterByZone(listings)
  const nonFeatured = allListings.filter(l => !featuredIds.has(l.id))
  
  // Construir lista final: destacados intercalados según orden aleatorio fijo + normales en orden original
  let displayedListings = [...nonFeatured]
  if (featuredIdsOrdered.length > 0 && displayedListings.length > 0) {
    // Insertar destacados en posiciones aleatorias fijas entre los normales
    const step = Math.max(1, Math.floor(displayedListings.length / (featuredIdsOrdered.length + 1)))
    featuredIdsOrdered.forEach((id, i) => {
      const featured = allListings.find(l => l.id === id)
      if (featured) {
        const pos = Math.min(i * step + i, displayedListings.length)
        displayedListings.splice(pos, 0, featured)
      }
    })
  } else {
    // Si solo hay destacados
    displayedListings = allListings
  }

  const handleSetZone = (latlng) => setZoneFilter({ lat: latlng.lat, lng: latlng.lng, radius_km: zoneRadius })
  const handleApplyFilters = () => {
    homeViewCache = null
    setAppliedFilters(prev => ({ ...filters, search: prev.search }))
    setAppliedZoneFilter(zoneFilter)
    setShowDrawer(false)
  }
  const handleLoadMore = () => {
    if (!loadingMore && hasMoreListings) loadListings(listingsOffset, true)
  }
  const handleClearZone = () => { setZoneFilter(null); setShowZoneMap(false) }

  const activeFiltersCount = [
    filters.category,
    filters.minPrice,
    filters.maxPrice,
    filters.isPirate,
    filters.sellerTypes.length > 0,
    filters.auctionOnly,
    zoneFilter
  ].filter(Boolean).length

  const sellerTypeButtons = [
    { type: 'pirate', Icon: Skull, label: t('home.filters.pirates') },
    { type: 'person', Icon: User, label: t('home.filters.persons') },
    { type: 'shop', Icon: Store, label: t('home.filters.shops') },
    { type: 'wholesale', Icon: Package, label: t('home.filters.wholesale') },
    { type: 'auction', Icon: Gavel, label: 'Subastas' },
  ]

  // Contenido de filtros — reutilizado en sidebar y drawer
  const FiltersContent = () => (
    <>
      <div className="filter-section">
        <h4 className="filter-subtitle">{t('home.filters.seller_type')}</h4>
        <div className="seller-type-filters">
          {sellerTypeButtons.map(({ type, Icon, label }) => (
            <button key={type}
              className={`seller-type-btn seller-type-${type} ${type === 'pirate' ? filters.isPirate ? 'active' : '' : type === 'auction' ? filters.auctionOnly ? 'active' : '' : filters.sellerTypes.includes(type) ? 'active' : ''}`}
              onClick={() => {
                if (type === 'pirate') handleFilterChange('isPirate', !filters.isPirate)
                else if (type === 'auction') handleFilterChange('auctionOnly', !filters.auctionOnly)
                else toggleSellerType(type)
              }}>
              <Icon size={16} strokeWidth={1.8} aria-hidden="true" /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-section">
        <h4 className="filter-subtitle"><Map size={16} strokeWidth={1.8} aria-hidden="true" /> Buscar por zona</h4>
        <button className={`zone-filter-btn ${zoneFilter ? 'active' : ''}`}
          onClick={() => setShowZoneMap(!showZoneMap)}>
          {zoneFilter ? <><MapPin size={15} strokeWidth={1.8} aria-hidden="true" /> Zona activa ({zoneFilter.radius_km}km)</> : <><Map size={15} strokeWidth={1.8} aria-hidden="true" /> Seleccionar zona</>}
        </button>
        {zoneFilter && (
          <button className="zone-clear-btn" onClick={handleClearZone}><X size={14} strokeWidth={2} aria-hidden="true" /> Quitar filtro de zona</button>
        )}
        {showZoneMap && (
          <div className="zone-map-container">
            <p className="form-hint" style={{ marginBottom: '0.5rem' }}>Haz clic en el mapa para centrar la zona</p>
            <MapContainer
              center={[zoneMapCenter.lat, zoneMapCenter.lng]}
              zoom={12}
              style={{ height: '200px', width: '100%', borderRadius: '10px' }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='© OpenStreetMap' />
              <ZoneDrawHandler onZoneSet={handleSetZone} />
              {zoneFilter && (
                <Circle center={[zoneFilter.lat, zoneFilter.lng]}
                  radius={zoneFilter.radius_km * 1000} color="#D4AF37" fillOpacity={0.15} />
              )}
            </MapContainer>
            <div style={{ marginTop: '0.75rem' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Radio: <strong>{zoneRadius} km</strong>
              </label>
              <input type="range" min="0.2" max="50" step="0.5"
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
        <button className="ventas-tv-btn" onClick={() => { navigate('/ventas-tv'); setShowDrawer(false) }}>
          <Tv size={16} strokeWidth={1.8} aria-hidden="true" /> VentasTV
          <span className="ventas-tv-badge">{t('home.filters.live')}</span>
        </button>
      </div>

      <div className="filter-section">
        <h4 className="filter-subtitle">{t('home.filters.categories')}</h4>
        <div className="category-list">
          <button className={`category-item ${!filters.category ? 'active' : ''}`}
            onClick={() => handleFilterChange('category', null)}>
            <span className="category-icon"><Globe2 size={16} strokeWidth={1.8} aria-hidden="true" /></span>
            <span>{t('home.filters.all')}</span>
          </button>
          {categories.map(cat => (
            <button key={cat.id}
              className={`category-item ${filters.category === cat.id ? 'active' : ''}`}
              onClick={() => handleFilterChange('category', cat.id)}>
              <span className="category-icon"><Tag size={16} strokeWidth={1.8} aria-hidden="true" /></span>
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
    </>
  )

  return (
    <div className="home">
      {/* MÓVIL: barra superior fija */}
      <div className="mobile-filter-bar">
        <button className={`mobile-filter-btn ${activeFiltersCount > 0 ? 'has-filters' : ''}`}
          onClick={() => setShowDrawer(true)}>
          <SlidersHorizontal size={16} strokeWidth={1.8} aria-hidden="true" /> Buscar Anuncio
          {activeFiltersCount > 0 && (
            <span className="filter-count-badge">{activeFiltersCount}</span>
          )}
        </button>
      </div>

      {/* MÓVIL: chips de categorías */}
      <div className="mobile-categories-bar">
        <button className={`cat-chip ${!filters.category ? 'active' : ''}`}
          onClick={() => handleFilterChange('category', null)}>
          <Globe2 size={15} strokeWidth={1.8} aria-hidden="true" /> {t('home.filters.all')}
        </button>
        {categories.map(cat => (
          <button key={cat.id}
            className={`cat-chip ${filters.category === cat.id ? 'active' : ''}`}
            onClick={() => handleFilterChange('category', cat.id)}>
            {cat.icon} {t(`categories.${cat.slug}`)}
          </button>
        ))}
      </div>

      <div className="home-container">
        {/* DESKTOP: sidebar normal */}
        <aside className="sidebar">
          <div className="home-sidebar-intro">
            <h2 className="serif">{t('home.title')}</h2>
            <div className="home-sidebar-differentiators">
              <span><Ban size={15} strokeWidth={1.8} aria-hidden="true" /> {t('home.diff.no_bans')}</span>
              <span><Unlock size={15} strokeWidth={1.8} aria-hidden="true" /> {t('home.diff.no_restrictions')}</span>
              <span><Zap size={15} strokeWidth={1.8} aria-hidden="true" /> {t('home.diff.no_algorithms')}</span>
            </div>
          </div>
          <div className="filter-section">
            <Link to="/publicar" className="btn btn-primary sidebar-publish-btn">
              + Publicar Anuncio
            </Link>
          </div>
          <FiltersContent />
          <div className="filter-section">
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleApplyFilters}>
              Aplicar filtros
            </button>
          </div>
        </aside>

        <main className="content">

          {/* Banner Carousel Principal — estilo eBay/Amazon */}
          {featuredBanners.length > 0 && (
            <div
              className="banner-carousel"
              onMouseEnter={() => setIsBannerPaused(true)}
              onMouseLeave={() => setIsBannerPaused(false)}
            >
              {/* Flecha izquierda */}
              <button className="banner-carousel-arrow banner-carousel-arrow--left" onClick={prevBanner}>
                ‹
              </button>

              {/* Slide activo */}
              <div className="banner-carousel-slide">
                <img
                  src={featuredBanners[currentBannerIdx]?.banner_url}
                  alt="Banner publicitario"
                  className="banner-carousel-img"
                />
              </div>

              {/* Flecha derecha */}
              <button className="banner-carousel-arrow banner-carousel-arrow--right" onClick={nextBanner}>
                ›
              </button>

              {/* Dots indicadores */}
              {featuredBanners.length > 1 && (
                <div className="banner-carousel-dots">
                  {featuredBanners.map((_, idx) => (
                    <button
                      key={idx}
                      className={`banner-carousel-dot ${idx === currentBannerIdx ? 'active' : ''}`}
                      onClick={() => goToBanner(idx)}
                    />
                  ))}
                </div>
              )}

            </div>
          )}

          <div className="home-search-bar">
            <Link to="/como-funciona" className="home-search-help" aria-label={t('home.how_it_works')}>
              <CircleHelp size={16} strokeWidth={1.8} aria-hidden="true" />
              <span>{t('home.how_it_works')}</span>
            </Link>
            <form className="home-search-form" onSubmit={handleSearchSubmit}>
              <input
                type="text"
                className="home-search-input"
                placeholder={t('home.title')}
                value={filters.search}
                onChange={e => handleFilterChange('search', e.target.value)}
                onKeyDown={handleSearchKeyDown}
                aria-label={t('home.filters.title')}
              />
              <button type="submit" className="home-search-submit" aria-label={t('home.filters.title')}>
                <Search size={16} strokeWidth={2} aria-hidden="true" />
                <span>BUSCAR</span>
              </button>
            </form>
          </div>

          {loading ? (
            <div className="listings-grid">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="listing-card skeleton" style={{ height: '240px' }}></div>
              ))}
            </div>
          ) : displayedListings.length === 0 ? (
            <div className="no-results">
              <span className="no-results-icon"><Skull size={48} strokeWidth={1.5} aria-hidden="true" /></span>
              <p>{zoneFilter ? 'No hay anuncios en esta zona' : t('home.no_results')}</p>
            </div>
          ) : (
            <div className="listings-grid">
              {displayedListings.map(listing => {
                const uType = listing.seller_type || 'person'
                const SellerIcon = listing.is_ghost ? Skull : uType === 'shop' ? Store : uType === 'wholesale' ? Package : User
                const sellerClass = listing.is_ghost ? 'pirate' : uType === 'shop' ? 'shop' : uType === 'wholesale' ? 'wholesale' : 'person'
                const auctionIsActive = listing.auction?.status === 'active' && new Date(listing.auction.ends_at) > new Date()
                const cardPrice = auctionIsActive ? listing.auction.start_price : listing.price
                return (
                  <Link key={listing.id} to={`/ficha/${listing.slug}`}
                    className="listing-card" onClick={handleCardClick}>
                    <div className="listing-image">
                      {listing.photos && listing.photos.length > 0 ? (
                        <img src={listing.photos[0]} alt={listing.title} />
                      ) : (
                        <div className="listing-no-image"><Package size={32} strokeWidth={1.5} aria-hidden="true" /></div>
                      )}
                      {listing.video_url && <div className="video-badge">▶ 6s</div>}
                      {auctionIsActive && <div className="auction-badge">Subasta activa</div>}
                      {featuredIds.has(listing.id) && <div className="featured-badge">⭐ Destacado</div>}
                    </div>
                    <div className="listing-info">
                      <p className={`listing-price ${auctionIsActive ? 'auction-card-price' : ''}`}>
                        {auctionIsActive ? 'Desde ' : ''}{formatPrice(cardPrice, listing.currency)}
                      </p>
                      <span className={`listing-seller-type listing-seller-${sellerClass}`}>
                        <SellerIcon size={13} strokeWidth={1.8} aria-hidden="true" /> {listing.is_ghost ? t('badges.pirate') : uType === 'shop' ? t('badges.shop') : uType === 'wholesale' ? t('badges.wholesale') : t('badges.verified')}
                      </span>
                      <p className="listing-title">{listing.title}</p>
                      <div className="listing-meta">
                        <span className="home-listing-location"><MapPin size={13} strokeWidth={1.8} aria-hidden="true" /> {listing.location_lat ? 'Marcada' : 'No marcada'}</span>
                        <span className="listing-time">{timeAgo(listing.created_at, t)}</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {!loading && hasMoreListings && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={handleLoadMore} disabled={loadingMore}>
                {loadingMore ? t('buttons.loading') : t('buttons.load_more')}
              </button>
            </div>
          )}
        </main>
      </div>

      {/* MÓVIL: Drawer desde abajo */}
      {showDrawer && (
        <div className="drawer-overlay" onClick={() => setShowDrawer(false)}>
          <div className="drawer" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
              <h3 className="serif">Buscar Anuncio</h3>
              <div className="drawer-header-actions">
                {activeFiltersCount > 0 && (
                  <button className="drawer-clear-btn" onClick={() => {
                    setFilters({ category: null, minPrice: '', maxPrice: '', isPirate: false, sellerTypes: [], auctionOnly: false, search: filters.search })
                    handleClearZone()
                  }}>
                    Limpiar todo
                  </button>
                )}
                <button className="drawer-close" onClick={() => setShowDrawer(false)} aria-label="Cerrar filtros"><X size={18} strokeWidth={2} aria-hidden="true" /></button>
              </div>
            </div>
            <div className="drawer-body">
              <Link to="/publicar" className="drawer-publish-btn" onClick={() => setShowDrawer(false)}>
                + {t('navbar.publish')}
              </Link>
              <FiltersContent />
            </div>
            <div className="drawer-footer">
              <button className="btn btn-primary" style={{ width: '100%' }}
                onClick={handleApplyFilters}>
                Aplicar filtros
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
