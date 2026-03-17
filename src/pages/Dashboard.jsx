import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { formatPrice, timeAgo } from '../lib/utils'
import './Dashboard.css'

export default function Dashboard({ user }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [listings, setListings] = useState([])
  const [stats, setStats] = useState({
    total_views: 0,
    total_contacts: 0,
    active_listings: 0
  })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('active') // active, sold, paused, all

  useEffect(() => {
    if (!user) {
      navigate('/auth')
      return
    }
    loadDashboard()
  }, [user, filter])

  const loadDashboard = async () => {
    setLoading(true)
    try {
      // Load user listings
      let query = supabase
        .from('listings')
        .select(`
          *,
          category:categories(name, slug, icon)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data: listingsData, error: listingsError } = await query

      if (listingsError) throw listingsError

      setListings(listingsData)

      // Calculate stats
      const totalViews = listingsData.reduce((sum, l) => sum + (l.views_count || 0), 0)
      const totalContacts = listingsData.reduce((sum, l) => sum + (l.contacts_count || 0), 0)
      const activeCount = listingsData.filter(l => l.status === 'active').length

      setStats({
        total_views: totalViews,
        total_contacts: totalContacts,
        active_listings: activeCount
      })

    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (listingId, newStatus) => {
    try {
      const { error } = await supabase
        .from('listings')
        .update({ status: newStatus })
        .eq('id', listingId)

      if (error) throw error

      loadDashboard()
    } catch (error) {
      console.error('Error updating status:', error)
      alert(t('messages.error'))
    }
  }

  const handleDelete = async (listingId) => {
    if (!confirm(t('messages.confirm_delete'))) return

    try {
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', listingId)

      if (error) throw error

      loadDashboard()
    } catch (error) {
      console.error('Error deleting listing:', error)
      alert(t('messages.error'))
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="dashboard">
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <div>
            <h1 className="serif luxury-gold">{t('dashboard.title')}</h1>
            <p className="dashboard-subtitle">
              {user.display_name} • {user.user_type === 'shop' ? '🏪' : user.user_type === 'wholesale' ? '📦' : '👤'}
            </p>
          </div>
          <Link to="/publicar" className="btn btn-primary">
            + {t('navbar.publish')}
          </Link>
        </div>

        {/* Stats */}
        <div className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-icon">👁️</div>
            <div className="stat-info">
              <div className="stat-value">{stats.total_views.toLocaleString()}</div>
              <div className="stat-label">{t('dashboard.stats.total_views')}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📱</div>
            <div className="stat-info">
              <div className="stat-value">{stats.total_contacts.toLocaleString()}</div>
              <div className="stat-label">{t('dashboard.stats.total_contacts')}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🏴‍☠️</div>
            <div className="stat-info">
              <div className="stat-value">{stats.active_listings}</div>
              <div className="stat-label">{t('dashboard.stats.active_listings')}</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="dashboard-filters">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            {t('dashboard.filters.all')}
          </button>
          <button
            className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
            onClick={() => setFilter('active')}
          >
            {t('dashboard.listing_status.active')}
          </button>
          <button
            className={`filter-btn ${filter === 'sold' ? 'active' : ''}`}
            onClick={() => setFilter('sold')}
          >
            {t('dashboard.listing_status.sold')}
          </button>
          <button
            className={`filter-btn ${filter === 'paused' ? 'active' : ''}`}
            onClick={() => setFilter('paused')}
          >
            {t('dashboard.listing_status.paused')}
          </button>
        </div>

        {/* Listings */}
        <div className="dashboard-listings">
          <h2>{t('dashboard.my_listings')}</h2>

          {loading ? (
            <div className="listings-loading">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="listing-row skeleton" style={{ height: '120px' }}></div>
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="no-listings">
              <span className="no-listings-icon">🏴‍☠️</span>
              <p>{t('dashboard.no_listings')}</p>
              <Link to="/publicar" className="btn btn-primary">
                {t('dashboard.create_first')}
              </Link>
            </div>
          ) : (
            <div className="listings-list">
              {listings.map((listing) => (
                <div key={listing.id} className="listing-row card">
                  {/* Image */}
                  <div className="listing-row-image">
                    {listing.photos && listing.photos.length > 0 ? (
                      <img src={listing.photos[0]} alt={listing.title} />
                    ) : (
                      <div className="listing-row-no-image">
                        {listing.category?.icon || '📦'}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="listing-row-info">
                    <Link to={`/ficha/${listing.slug}`} className="listing-row-title">
                      {listing.title}
                    </Link>
                    <div className="listing-row-meta">
                      <span className="listing-row-price luxury-gold">
                        {formatPrice(listing.price, listing.currency)}
                      </span>
                      <span className="listing-row-category">
                        {listing.category?.icon} {t(`categories.${listing.category?.slug}`)}
                      </span>
                      <span className="listing-row-date">
                        {timeAgo(listing.created_at, t)}
                      </span>
                    </div>
                    <div className="listing-row-stats">
                      <span>👁️ {listing.views_count}</span>
                      <span>📱 {listing.contacts_count}</span>
                      <span>🔗 {listing.shares_count}</span>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="listing-row-status">
                    <span className={`status-badge status-${listing.status}`}>
                      {t(`dashboard.listing_status.${listing.status}`)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="listing-row-actions">
                    <Link 
                      to={`/ficha/${listing.slug}`} 
                      className="btn-icon"
                      title={t('dashboard.actions.view')}
                    >
                      👁️
                    </Link>

                    {listing.status === 'active' && (
                      <button
                        className="btn-icon"
                        onClick={() => handleStatusChange(listing.id, 'paused')}
                        title={t('dashboard.actions.pause')}
                      >
                        ⏸️
                      </button>
                    )}

                    {listing.status === 'paused' && (
                      <button
                        className="btn-icon"
                        onClick={() => handleStatusChange(listing.id, 'active')}
                        title={t('dashboard.actions.activate')}
                      >
                        ▶️
                      </button>
                    )}

                    {listing.status === 'active' && (
                      <button
                        className="btn-icon"
                        onClick={() => handleStatusChange(listing.id, 'sold')}
                        title={t('dashboard.actions.mark_sold')}
                      >
                        ✓
                      </button>
                    )}

                    <button
                      className="btn-icon btn-icon-danger"
                      onClick={() => handleDelete(listing.id)}
                      title={t('dashboard.actions.delete')}
                    >
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
