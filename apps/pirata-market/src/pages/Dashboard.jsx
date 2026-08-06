import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import DashboardSidebar from './DashboardSidebar'
import './Dashboard.css'

export default function Dashboard({ user, profile: externalProfile }) {
  const { t } = useTranslation()
  const location = useLocation()
  const [profile, setProfile] = useState(null)
  const [listings, setListings] = useState([])
  const [stats, setStats] = useState({ total_views: 0, total_contacts: 0, active_listings: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('active')

  // Cargar profile detallado para el sidebar (selfie de verificación)
  useEffect(() => {
    if (!user) return
    loadProfileDetail()
  }, [user])

  const loadProfileDetail = async () => {
    try {
      const { data } = await supabase
        .from('users')
        .select(`
          display_name, avatar_url,
          shop_name, shop_bio, shop_link, shop_hours, shop_color, shop_logo_url, shop_banner_url,
          pirata_profiles!inner(
            full_name, country, city, phone,
            identity, is_premium, premium_until, identity_verified, business_verified, identity_locked, allow_identity_edit
          )
        `)
        .eq('id', user.id)
        .single()
      if (data && data.pirata_profiles) {
        setProfile({
          ...data,
          ...data.pirata_profiles,
        })
      } else if (data) {
        setProfile(data)
      }
    } catch (error) { console.error(error) }
  }

  // Cargar verificación para obtener selfie del sidebar
  const [verificationSelfie, setVerificationSelfie] = useState(null)

  useEffect(() => {
    if (!user) return
    const loadSelfie = async () => {
      const { data } = await supabase
        .from('pirata_profiles')
        .select('selfie_url')
        .eq('user_id', user.id)
        .single()
      if (data?.selfie_url) setVerificationSelfie(data.selfie_url)
    }
    loadSelfie()
  }, [user])

  // Cargar listings y stats (solo en la ruta /dashboard)
  useEffect(() => {
    if (!user || location.pathname !== '/dashboard') return
    loadDashboard()
  }, [user, filter, location.pathname])

  const loadDashboard = async () => {
    setLoading(true)
    try {
      let query = supabase.from('listings')
        .select(`*, category:categories(name, slug, icon)`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (filter !== 'all') query = query.eq('status', filter)
      const { data: listingsData, error: listingsError } = await query
      if (listingsError) throw listingsError
      setListings(listingsData)
      setStats({
        total_views: listingsData.reduce((sum, l) => sum + (l.views_count || 0), 0),
        total_contacts: listingsData.reduce((sum, l) => sum + (l.contacts_count || 0), 0),
        active_listings: listingsData.filter(l => l.status === 'active').length
      })
    } catch (error) { console.error(error) }
    finally { setLoading(false) }
  }

  const handleStatusChange = async (listingId, newStatus) => {
    try {
      await supabase.from('listings').update({ status: newStatus }).eq('id', listingId)
      loadDashboard()
    } catch (error) { alert(t('messages.error')) }
  }

  const handleDelete = async (listingId) => {
    if (!confirm(t('messages.confirm_delete'))) return
    try {
      await supabase.from('listings').delete().eq('id', listingId)
      loadDashboard()
    } catch (error) { alert(t('messages.error')) }
  }

  if (!user) return null

  const usedProfile = profile || externalProfile

  // Determinar si mostrar stats (solo en /dashboard)
  const showStats = location.pathname === '/dashboard'

  return (
    <div className="dashboard">
      <div className="dashboard-container">

        {/* ── STATS (solo en Mis anuncios) ── */}
        {showStats && (
          <div className="dashboard-stats">
            {[
              { icon: '👁️', value: stats.total_views.toLocaleString(),   label: t('dashboard.stats.total_views') },
              { icon: '📱', value: stats.total_contacts.toLocaleString(), label: t('dashboard.stats.total_contacts') },
              { icon: '🏴‍☠️', value: stats.active_listings,               label: t('dashboard.stats.active_listings') },
            ].map((s, i) => (
              <div key={i} className="stat-card">
                <div className="stat-icon">{s.icon}</div>
                <div className="stat-info">
                  <div className="stat-value">{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="db-layout">
          {/* ── SIDEBAR ── */}
          <DashboardSidebar
            user={user}
            profile={usedProfile}
            verificationSelfie={verificationSelfie}
          />

          <main className="db-main">
            {/* Sección Anuncios (solo /dashboard) */}
            {location.pathname === '/dashboard' && (
              <div className="db-section">
                <div className="db-section-header">
                  <h2>📋 Mis anuncios</h2>
                  <div className="db-filters">
                    {['all', 'active', 'sold', 'paused'].map(f => (
                      <button key={f}
                        className={`filter-btn ${filter === f ? 'active' : ''}`}
                        onClick={() => setFilter(f)}>
                        {f === 'all' ? t('dashboard.filters.all') : t(`dashboard.listing_status.${f}`)}
                      </button>
                    ))}
                  </div>
                </div>
                {loading ? (
                  <div className="listings-loading">
                    {[...Array(3)].map((_, i) => <div key={i} className="listing-row skeleton" style={{ height: '100px' }} />)}
                  </div>
                ) : listings.length === 0 ? (
                  <div className="no-listings">
                    <span className="no-listings-icon">🏴‍☠️</span>
                    <p>{t('dashboard.no_listings')}</p>
                    <a href="/publicar" className="btn btn-primary">{t('dashboard.create_first')}</a>
                  </div>
                ) : (
                  <div className="listings-list">
                    {listings.map(listing => (
                      <div key={listing.id} className="listing-row card">
                        <div className="listing-row-image">
                          {listing.photos?.length > 0
                            ? <img src={listing.photos[0]} alt={listing.title} />
                            : <div className="listing-row-no-image">{listing.category?.icon || '📦'}</div>}
                        </div>
                        <div className="listing-row-info">
                          <a href={`/ficha/${listing.slug}`} className="listing-row-title">{listing.title}</a>
                          <div className="listing-row-meta">
                            <span className="listing-row-price luxury-gold">{listing.price} {listing.currency}</span>
                            <span className="listing-row-category">{listing.category?.icon} {listing.category?.name}</span>
                          </div>
                        </div>
                        <div className="listing-row-actions">
                          {listing.status === 'active' && (
                            <button onClick={() => handleStatusChange(listing.id, 'paused')} className="btn-text-action" title="Pausar">
                              Pausar
                            </button>
                          )}
                          {listing.status === 'paused' && (
                            <button onClick={() => handleStatusChange(listing.id, 'active')} className="btn-text-action" title="Activar">
                              Activar
                            </button>
                          )}
                          <button onClick={() => handleStatusChange(listing.id, 'sold')} className="btn-text-action" title="Vendido">
                            Vendido
                          </button>
                          <button onClick={() => handleDelete(listing.id)} className="btn-text-action delete" title="Eliminar">
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Outlet para rutas hijas: /dashboard/verificacion, /dashboard/tienda */}
            {location.pathname !== '/dashboard' && (
              <Outlet context={{ profile: usedProfile, user }} />
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
