import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ClipboardList, Eye, Flag, MessageCircle, Package, Tag } from 'lucide-react'
import { supabase } from '../lib/supabase'
import DashboardSidebar from './DashboardSidebar'
import './Dashboard.css'

const dashboardCache = new Map()
const profileCache = new Map()
const selfieCache = new Map()

export default function Dashboard({ user, profile: externalProfile }) {
  const { t } = useTranslation()
  const location = useLocation()
  const [profile, setProfile] = useState(null)
  const [filter, setFilter] = useState('active')
  const initialDashboard = user ? dashboardCache.get(user.id) : null
  const [allListings, setAllListings] = useState(() => initialDashboard?.listings || [])
  const [listings, setListings] = useState(() => initialDashboard?.listings?.filter(listing => listing.status === 'active') || [])
  const [stats, setStats] = useState(() => initialDashboard?.stats || { total_views: 0, total_contacts: 0, active_listings: 0 })
  const [loading, setLoading] = useState(() => !user || !initialDashboard)
  const [auctionListingId, setAuctionListingId] = useState(null)
  const [auctionForm, setAuctionForm] = useState({ start_price: '', minimum_increment: '1', ends_at: '' })
  const [auctionError, setAuctionError] = useState('')
  const [auctionSaving, setAuctionSaving] = useState(false)

  // Cargar profile detallado para el sidebar (selfie de verificación)
  useEffect(() => {
    if (!user) return
    loadProfileDetail()
  }, [user])

  const loadProfileDetail = async () => {
    const cachedProfile = profileCache.get(user.id)
    if (cachedProfile) {
      setProfile(cachedProfile)
      return
    }
    try {
      const { data } = await supabase
        .from('users')
        .select(`
          display_name, avatar_url,
          pirata_profiles!inner(
            full_name, country, city, phone,
            identity, identity_verified, business_verified, identity_locked, allow_identity_edit
          ),
          shop_profiles(
            shop_name, shop_bio, shop_link, shop_hours, shop_color, shop_logo_url, shop_banner_url
          )
        `)
        .eq('id', user.id)
        .single()
      if (data && data.pirata_profiles) {
        // Fusionar: datos de users + pirata_profiles + shop_profiles en un solo objeto
        const nextProfile = {
          ...data,
          ...data.pirata_profiles,
          ...(data.shop_profiles || {}),
        }
        profileCache.set(user.id, nextProfile)
        setProfile(nextProfile)
      } else if (data) {
        profileCache.set(user.id, data)
        setProfile(data)
      }
    } catch (error) { console.error(error) }
  }

  // Cargar verificación para obtener selfie del sidebar
  const [verificationSelfie, setVerificationSelfie] = useState(null)

  useEffect(() => {
    if (!user) return
    const loadSelfie = async () => {
      const cachedSelfie = selfieCache.get(user.id)
      if (cachedSelfie !== undefined) {
        if (cachedSelfie) setVerificationSelfie(cachedSelfie)
        return
      }
      const { data } = await supabase
        .from('pirata_profiles')
        .select('selfie_url')
        .eq('user_id', user.id)
        .single()
      selfieCache.set(user.id, data?.selfie_url || null)
      if (data?.selfie_url) setVerificationSelfie(data.selfie_url)
    }
    loadSelfie()
  }, [user])

  // Cargar listings y stats (solo en la ruta /dashboard)
  useEffect(() => {
    if (!user || location.pathname !== '/dashboard') return
    loadDashboard()
  }, [user, filter, location.pathname])

  const applyDashboardListings = (nextAllListings) => {
    const nextStats = {
      total_views: nextAllListings.reduce((sum, l) => sum + (l.views_count || 0), 0),
      total_contacts: nextAllListings.reduce((sum, l) => sum + (l.contacts_count || 0), 0),
      active_listings: nextAllListings.filter(l => l.status === 'active').length,
    }
    const visibleListings = filter === 'all'
      ? nextAllListings
      : nextAllListings.filter(listing => listing.status === filter)
    dashboardCache.set(user.id, { listings: nextAllListings, stats: nextStats })
    setAllListings(nextAllListings)
    setListings(visibleListings)
    setStats(nextStats)
  }

  const loadDashboard = async () => {
    const cachedDashboard = dashboardCache.get(user.id)
    if (cachedDashboard) {
      applyDashboardListings(cachedDashboard.listings)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      let query = supabase.from('listings')
        .select(`*, category:categories(name, slug, icon)`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      const { data: listingsData, error: listingsError } = await query
      if (listingsError) throw listingsError
      const listingIds = (listingsData || []).map(listing => listing.id)
      let auctionsData = []
      if (listingIds.length > 0) {
        const { data, error } = await supabase
          .from('pirata_auctions')
          .select('id, listing_id, start_price, minimum_increment, ends_at, status')
          .in('listing_id', listingIds)
        if (error) {
          console.warn('No se pudieron cargar las subastas:', error)
        } else {
          auctionsData = data || []
        }
      }

      const auctionsByListing = Object.fromEntries(
        auctionsData.map(auction => [auction.listing_id, auction])
      )
      const listingsWithAuctions = (listingsData || []).map(listing => ({
        ...listing,
        auction: auctionsByListing[listing.id] || null,
      }))

      applyDashboardListings(listingsWithAuctions)
    } catch (error) { console.error(error) }
    finally { setLoading(false) }
  }

  const handleStatusChange = async (listingId, newStatus) => {
    try {
      const { error } = await supabase.from('listings').update({ status: newStatus }).eq('id', listingId)
      if (error) throw error
      const nextListings = allListings
        .map(listing => listing.id === listingId ? { ...listing, status: newStatus } : listing)
      applyDashboardListings(nextListings)
    } catch (error) { alert(t('messages.error')) }
  }

  const handleDelete = async (listingId) => {
    if (!confirm(t('messages.confirm_delete'))) return
    try {
      const { error } = await supabase.from('listings').delete().eq('id', listingId)
      if (error) throw error
      applyDashboardListings(allListings.filter(listing => listing.id !== listingId))
    } catch (error) { alert(t('messages.error')) }
  }

  const openAuctionForm = (listing) => {
    const defaultEnd = new Date(Date.now() + 24 * 60 * 60 * 1000)
    defaultEnd.setMinutes(defaultEnd.getMinutes() - defaultEnd.getTimezoneOffset())
    setAuctionListingId(listing.id)
    setAuctionError('')
    setAuctionForm({
      start_price: listing.price ?? '',
      minimum_increment: '1',
      ends_at: defaultEnd.toISOString().slice(0, 16),
    })
  }

  const closeAuctionForm = () => {
    setAuctionListingId(null)
    setAuctionError('')
  }

  const handleCreateAuction = async (listing) => {
    const startPrice = Number(auctionForm.start_price)
    const minimumIncrement = Number(auctionForm.minimum_increment)
    const endsAt = new Date(auctionForm.ends_at)

    if (!Number.isFinite(startPrice) || startPrice < 0) {
      setAuctionError('Ingresa un precio inicial válido.')
      return
    }
    if (!Number.isFinite(minimumIncrement) || minimumIncrement <= 0) {
      setAuctionError('El incremento mínimo debe ser mayor a cero.')
      return
    }
    if (!auctionForm.ends_at || Number.isNaN(endsAt.getTime()) || endsAt <= new Date()) {
      setAuctionError('La fecha de cierre debe ser futura.')
      return
    }

    setAuctionSaving(true)
    setAuctionError('')
    try {
      const { error } = await supabase.from('pirata_auctions').insert({
        listing_id: listing.id,
        start_price: startPrice,
        minimum_increment: minimumIncrement,
        ends_at: endsAt.toISOString(),
        status: 'active',
      })
      if (error) throw error

      applyDashboardListings(allListings.map(currentListing =>
        currentListing.id === listing.id
          ? {
              ...currentListing,
              auction: {
                listing_id: listing.id,
                start_price: startPrice,
                minimum_increment: minimumIncrement,
                ends_at: endsAt.toISOString(),
                status: 'active',
              },
            }
          : currentListing
      ))
      closeAuctionForm()
    } catch (error) {
      setAuctionError(error.message || 'No se pudo crear la subasta.')
    } finally {
      setAuctionSaving(false)
    }
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
              { icon: Eye, value: stats.total_views.toLocaleString(),   label: t('dashboard.stats.total_views') },
              { icon: MessageCircle, value: stats.total_contacts.toLocaleString(), label: t('dashboard.stats.total_contacts') },
              { icon: Flag, value: stats.active_listings,               label: t('dashboard.stats.active_listings') },
            ].map((s, i) => (
              <div key={i} className="stat-card">
                <div className="stat-icon"><s.icon size={20} strokeWidth={2} aria-hidden="true" /></div>
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
                  <h2><ClipboardList size={20} strokeWidth={2} aria-hidden="true" /> Mis anuncios</h2>
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
                {loading && listings.length === 0 ? (
                  <div className="listings-loading">
                    {[...Array(3)].map((_, i) => <div key={i} className="listing-row skeleton" style={{ height: '100px' }} />)}
                  </div>
                ) : listings.length === 0 ? (
                  <div className="no-listings">
                    <span className="no-listings-icon"><Flag size={28} strokeWidth={2} aria-hidden="true" /></span>
                    <p>{t('dashboard.no_listings')}</p>
                    <a href="/publicar" className="btn btn-primary">{t('dashboard.create_first')}</a>
                  </div>
                ) : (
                  <div className="listings-list">
                    {listings.map(listing => {
                      const auction = listing.auction
                      const auctionIsActive = auction?.status === 'active' && new Date(auction.ends_at) > new Date()
                      return (
                        <div key={listing.id} className="listing-item">
                          <div className="listing-row card">
                            <div className="listing-row-image">
                              {listing.photos?.length > 0
                                ? <img src={listing.photos[0]} alt={listing.title} />
                                : <div className="listing-row-no-image"><Package size={28} strokeWidth={2} aria-hidden="true" /></div>}
                            </div>
                            <div className="listing-row-info">
                              <a href={`/ficha/${listing.slug}`} className="listing-row-title">{listing.title}</a>
                              <div className="listing-row-meta">
                                <span className="listing-row-price luxury-gold">{listing.price} {listing.currency}</span>
                                <span className="listing-row-category"><Tag size={14} strokeWidth={2} aria-hidden="true" /> {listing.category?.name}</span>
                              </div>
                            </div>
                            <div className="listing-row-actions">
                              {auctionIsActive ? (
                                <span className="listing-edit-blocked" title="No puedes editar un anuncio con una subasta activa.">
                                  Edición bloqueada
                                </span>
                              ) : (
                                <a href={`/editar/${listing.id}`} className="btn-text-action" title="Editar anuncio">
                                  Editar
                                </a>
                              )}
                              {listing.status === 'active' && !auction && (
                                <button onClick={() => openAuctionForm(listing)} className="btn-text-action auction" title="Poner en subasta">
                                  Poner en subasta
                                </button>
                              )}
                              {auction && (
                                <span className={`listing-auction-status ${auction.status}`}>
                                  {auction.status === 'active' ? 'Subasta activa' : auction.status === 'finished' ? 'Subasta finalizada' : 'Subasta cancelada'}
                                </span>
                              )}
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

                          {auctionListingId === listing.id && !auction && (
                            <div className="auction-config-panel card">
                              <div className="auction-config-header">
                                <div>
                                  <h3>Configurar subasta</h3>
                                  <p>{listing.title}</p>
                                </div>
                                <button type="button" className="btn-text-action" onClick={closeAuctionForm}>Cerrar</button>
                              </div>
                              <div className="auction-form-grid">
                                <label>
                                  Precio inicial ({listing.currency})
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={auctionForm.start_price}
                                    onChange={event => setAuctionForm({ ...auctionForm, start_price: event.target.value })}
                                  />
                                </label>
                                <label>
                                  Incremento mínimo ({listing.currency})
                                  <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={auctionForm.minimum_increment}
                                    onChange={event => setAuctionForm({ ...auctionForm, minimum_increment: event.target.value })}
                                  />
                                </label>
                                <label>
                                  Fecha y hora de cierre
                                  <input
                                    type="datetime-local"
                                    value={auctionForm.ends_at}
                                    onChange={event => setAuctionForm({ ...auctionForm, ends_at: event.target.value })}
                                  />
                                </label>
                              </div>
                              {auctionError && <p className="auction-form-error">{auctionError}</p>}
                              <div className="auction-config-actions">
                                <button type="button" className="btn btn-primary" onClick={() => handleCreateAuction(listing)} disabled={auctionSaving}>
                                  {auctionSaving ? 'Guardando...' : 'Activar subasta'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
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
