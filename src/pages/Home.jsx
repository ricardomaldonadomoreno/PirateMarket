import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { getListings, getCategories } from '../lib/supabase'
import { formatPrice, timeAgo } from '../lib/utils'
import { Link, useNavigate } from 'react-router-dom'
import './Home.css'

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
    isPirate: undefined,
    search: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    loadListings()
  }, [filters])

  const loadData = async () => {
    try {
      const cats = await getCategories()
      setCategories(cats)
      await loadListings()
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const loadListings = async () => {
    setLoading(true)
    try {
      const data = await getListings(filters)
      setListings(data)
    } catch (error) {
      console.error('Error loading listings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="home">
      <div className="home-container">
        {/* Sidebar - Filters */}
        <aside className="sidebar">
          <div className="filter-section">
            <h3 className="filter-title">{t('home.filters.title')}</h3>

            {/* Search */}
            <input
              type="text"
              className="input"
              placeholder={t('home.title')}
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>

          {/* Solo Piratas — arriba por ser lo novedoso */}
          <div className="filter-section">
            <label className="checkbox-label pirate-filter">
              <input
                type="checkbox"
                checked={filters.isPirate === true}
                onChange={(e) => handleFilterChange('isPirate', e.target.checked ? true : undefined)}
              />
              <span>🏴‍☠️ {t('home.filters.only_pirates')}</span>
            </label>
          </div>

          {/* VentasTV */}
          <div className="filter-section">
            <button
              className="ventas-tv-btn"
              onClick={() => navigate('/ventas-tv')}
            >
              📺 VentasTV
              <span className="ventas-tv-badge">{t('home.filters.live')}</span>
            </button>
          </div>

          {/* Categories */}
          <div className="filter-section">
            <h4 className="filter-subtitle">{t('home.filters.categories')}</h4>
            <div className="category-list">
              <button
                className={`category-item ${!filters.category ? 'active' : ''}`}
                onClick={() => handleFilterChange('category', null)}
              >
                <span className="category-icon">🌐</span>
                <span>{t('home.filters.all')}</span>
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  className={`category-item ${filters.category === cat.id ? 'active' : ''}`}
                  onClick={() => handleFilterChange('category', cat.id)}
                >
                  <span className="category-icon">{cat.icon}</span>
                  <span>{t(`categories.${cat.slug}`)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="filter-section">
            <h4 className="filter-subtitle">{t('home.filters.price')}</h4>
            <div className="price-inputs">
              <input
                type="number"
                className="input"
                placeholder={t('home.filters.min')}
                value={filters.minPrice}
                onChange={(e) => handleFilterChange('minPrice', e.target.value)}
              />
              <span>—</span>
              <input
                type="number"
                className="input"
                placeholder={t('home.filters.max')}
                value={filters.maxPrice}
                onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
              />
            </div>
          </div>
        </aside>

        {/* Main Content - Listings Grid */}
        <main className="content">
          <div className="content-header">
            <h2 className="serif">{t('home.title')}</h2>

            {/* Diferenciadores */}
            <div className="differentiators">
              <span>🚫 {t('home.diff.no_bans')}</span>
              <span>🔓 {t('home.diff.no_restrictions')}</span>
              <span>⚡ {t('home.diff.no_algorithms')}</span>
              <Link to="/como-funciona" className="how-it-works-btn">
                {t('home.how_it_works')} →
              </Link>
            </div>

            <p className="results-count">
              {listings.length} {listings.length === 1 ? 'anuncio' : 'anuncios'}
            </p>
          </div>

          {loading ? (
            <div className="listings-grid">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="listing-card skeleton" style={{ height: '240px' }}></div>
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="no-results">
              <span className="no-results-icon">🏴‍☠️</span>
              <p>{t('home.no_results')}</p>
            </div>
          ) : (
            <div className="listings-grid">
              {listings.map((listing) => (
                <Link
                  key={listing.id}
                  to={`/ficha/${listing.slug}`}
                  className="listing-card"
                >
                  {/* Image */}
                  <div className="listing-image">
                    {listing.photos && listing.photos.length > 0 ? (
                      <img src={listing.photos[0]} alt={listing.title} />
                    ) : (
                      <div className="listing-no-image">
                        <span>{listing.category?.icon || '📦'}</span>
                      </div>
                    )}

                    {listing.video_url && (
                      <div className="video-badge">▶ 6s</div>
                    )}

                    <div className={`seller-badge ${listing.is_ghost ? 'pirate' : 'verified'}`}>
                      {listing.is_ghost ? '🏴‍☠️' : '✓'}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="listing-info">
                    <div className="listing-price luxury-gold">
                      {formatPrice(listing.price, listing.currency)}
                    </div>
                    <h3 className="listing-title">{listing.title}</h3>
                    <div className="listing-meta">
                      <span className="listing-location">
                        📍 {listing.display_location}
                      </span>
                      <span className="listing-time">
                        {timeAgo(listing.created_at, t)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
