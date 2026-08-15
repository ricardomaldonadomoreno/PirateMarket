import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MapContainer, TileLayer, Marker, Circle } from 'react-leaflet'
import { X, ZoomIn } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import { supabase, getListingBySlug, incrementViews, incrementContacts, incrementShares } from '../lib/supabase'
import { formatPrice, timeAgo, timeUntilExpiry, generateWhatsAppURL, generateShareURL, copyToClipboard, openInMaps, getUserBadge } from '../lib/utils'
import './ListingDetail.css'

export default function ListingDetail({ user }) {
  const { slug } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [listing, setListing] = useState(null)
  const [auction, setAuction] = useState(null)
  const [auctionResult, setAuctionResult] = useState(null)
  const [bidHistory, setBidHistory] = useState([])
  const [bidCount, setBidCount] = useState(0)
  const [bidAmount, setBidAmount] = useState('')
  const [bidError, setBidError] = useState('')
  const [bidMessage, setBidMessage] = useState('')
  const [bidSaving, setBidSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [showMapOptions, setShowMapOptions] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(null)

  useEffect(() => {
    loadListing()
  }, [slug])

  const loadListing = async () => {
    window.scrollTo(0, 0)
    try {
      const data = await getListingBySlug(slug)
      const { data: auctionData, error: auctionError } = await supabase
        .from('pirata_auctions')
        .select('id, start_price, minimum_increment, ends_at, status')
        .eq('listing_id', data.id)
        .maybeSingle()

      if (auctionError) {
        console.warn('No se pudo cargar la subasta del anuncio:', auctionError)
      }

      if (auctionData) {
        const { data: resultData, error: resultError } = await supabase
          .from('pirata_auction_results')
          .select('winner_id, winning_amount, winning_bid_id, finalized_at, winner:users (id, email, display_name, whatsapp, avatar_url, country)')
          .eq('auction_id', auctionData.id)
          .maybeSingle()

        if (resultError) {
          console.warn('No se pudo cargar el resultado de la subasta:', resultError)
        }
        setAuctionResult(resultData || null)

        const { data: bidData, count: bidTotal, error: bidsError } = await supabase
          .from('pirata_auction_bids')
          .select('id, amount, created_at', { count: 'exact' })
          .eq('auction_id', auctionData.id)
          .order('amount', { ascending: false })
          .limit(5)

        if (bidsError) {
          console.warn('No se pudieron cargar las pujas:', bidsError)
        } else {
          setBidHistory(bidData || [])
          setBidCount(bidTotal || 0)
        }
      } else {
        setAuctionResult(null)
        setBidHistory([])
        setBidCount(0)
      }

      setAuction(auctionData || null)
      setListing(data)
      await incrementViews(data.id)
    } catch (error) {
      console.error('Error loading listing:', error)
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  const handleContactWhatsApp = async () => {
    if (!listing) return
    await incrementContacts(listing.id)
    const whatsappNumber = listing.is_ghost ? null : listing.whatsapp_number
    if (whatsappNumber) {
      const url = generateWhatsAppURL(whatsappNumber, listing.title, listing.slug)
      window.open(url, '_blank')
    }
  }

  const getBidErrorMessage = (message) => {
    if (message?.includes('AUTH_REQUIRED')) return 'Debes iniciar sesión para pujar.'
    if (message?.includes('AUCTION_CLOSED')) return 'Esta subasta ya terminó.'
    if (message?.includes('SELLER_CANNOT_BID')) return 'No puedes pujar en tu propio anuncio.'
    if (message?.includes('INVALID_AMOUNT')) return 'Ingresa un monto válido.'
    const minimumMatch = message?.match(/BID_TOO_LOW:([0-9.]+)/)
    if (minimumMatch) return `La puja mínima ahora es ${formatPrice(Number(minimumMatch[1]), listing.currency)}.`
    return 'No se pudo registrar la puja. Intenta nuevamente.'
  }

  const handlePlaceBid = async (event) => {
    event.preventDefault()
    if (!auction || !auctionIsActive || !user) return

    const amount = Number(bidAmount)
    const currentBid = bidHistory[0]?.amount || auction.start_price
    const minimumBid = bidHistory.length > 0
      ? currentBid + auction.minimum_increment
      : auction.start_price

    if (!Number.isFinite(amount) || amount < minimumBid) {
      setBidError(`La puja mínima es ${formatPrice(minimumBid, listing.currency)}.`)
      return
    }

    setBidSaving(true)
    setBidError('')
    setBidMessage('')
    try {
      const { data, error } = await supabase.rpc('place_pirata_bid', {
        p_auction_id: auction.id,
        p_amount: amount,
      })
      if (error) throw error

      const newBid = Array.isArray(data) ? data[0] : data
      setBidHistory(currentBids => [
        { id: newBid.bid_id, amount: newBid.amount, created_at: newBid.created_at },
        ...currentBids,
      ].sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 5))
      setBidCount(currentCount => currentCount + 1)
      setBidAmount('')
      setBidMessage('Puja registrada correctamente.')
    } catch (error) {
      setBidError(getBidErrorMessage(error.message))
    } finally {
      setBidSaving(false)
    }
  }

  const handleShare = async () => {
    const url = generateShareURL(listing.slug)
    if (navigator.share) {
      try {
        await navigator.share({ title: listing.title, text: `${listing.title} - ${formatPrice(listing.price, listing.currency)}`, url })
        await incrementShares(listing.id)
      } catch (error) { console.log('Share cancelled') }
    } else {
      const copied = await copyToClipboard(url)
      if (copied) { alert(t('messages.copied')); await incrementShares(listing.id) }
    }
  }

  // Abrir en app de mapas preferida
  const openInMapApp = (app) => {
    const lat = listing.location_lat
    const lng = listing.location_lng
    const urls = {
      google: `https://www.google.com/maps?q=${lat},${lng}`,
      waze: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
      apple: `maps://maps.apple.com/?q=${lat},${lng}`,
    }
    window.open(urls[app], '_blank')
    setShowMapOptions(false)
  }

  const nextPhoto = () => {
    if (listing.photos.length > 0) setCurrentPhotoIndex(prev => (prev + 1) % listing.photos.length)
  }
  const prevPhoto = () => {
    if (listing.photos.length > 0) setCurrentPhotoIndex(prev => prev === 0 ? listing.photos.length - 1 : prev - 1)
  }

  if (loading) {
    return (
      <div className="listing-detail">
        <div className="listing-detail-container">
          <div className="skeleton" style={{ height: '400px', marginBottom: '2rem' }}></div>
          <div className="skeleton" style={{ height: '200px' }}></div>
        </div>
      </div>
    )
  }

  if (!listing) return null

  const badge = listing.user
    ? getUserBadge(listing.user.user_type, listing.user.pirata_profiles?.identity_verified, t)
    : { icon: '🏴‍☠️', label: t('badges.pirate'), color: 'gold' }

  const hasPhotos = listing.photos && listing.photos.length > 0
  const hasLocation = listing.location_lat && listing.location_lng
  const auctionIsActive = auction?.status === 'active' && new Date(auction.ends_at) > new Date()
  const auctionStatusLabel = auctionIsActive
    ? 'Subasta activa'
    : auction?.status === 'cancelled'
      ? 'Subasta cancelada'
      : 'Subasta finalizada'
  const finalWinnerName = auctionResult?.winner?.display_name || auctionResult?.winner?.email || 'Sin ganador'
  const isAuctionOwner = Boolean(user?.id && listing.user_id === user.id)
  const isAuctionWinner = Boolean(user?.id && auctionResult?.winner_id === user.id)
  const hasWinningBid = auctionResult?.winning_amount !== null && auctionResult?.winning_amount !== undefined
  const currentBid = bidHistory[0]?.amount || auction?.start_price
  const minimumBid = auction && bidHistory.length > 0
    ? currentBid + auction.minimum_increment
    : auction?.start_price
  const auctionPrice = auctionIsActive
    ? currentBid
    : auctionResult?.winning_amount ?? listing.price

  return (
    <div className="listing-detail">
      <div className="listing-detail-container">
        <Link to="/" className="back-button">← {t('buttons.back')}</Link>

        <div className="listing-detail-grid">
          {/* Left Column */}
          <div className="listing-media-column">
            {hasPhotos ? (
              <div className="photo-gallery">
                <div className="photo-main">
                  <img src={listing.photos[currentPhotoIndex]} alt={listing.title} />
                  <button className="photo-zoom-btn" onClick={() => setLightboxIndex(currentPhotoIndex)} title="Ver imagen completa">
                    <ZoomIn size={20} />
                  </button>
                  {listing.photos.length > 1 && (
                    <>
                      <button className="photo-nav photo-prev" onClick={prevPhoto}>‹</button>
                      <button className="photo-nav photo-next" onClick={nextPhoto}>›</button>
                      <div className="photo-indicator">{currentPhotoIndex + 1} / {listing.photos.length}</div>
                    </>
                  )}
                </div>
                {listing.photos.length > 1 && (
                  <div className="photo-thumbnails">
                    {listing.photos.map((photo, index) => (
                      <button key={index}
                        className={`photo-thumb ${index === currentPhotoIndex ? 'active' : ''}`}
                        onClick={() => setCurrentPhotoIndex(index)}>
                        <img src={photo} alt={`${listing.title} ${index + 1}`} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="photo-placeholder">
                <span>{listing.category?.icon || '📦'}</span>
              </div>
            )}

            {listing.video_url && (
              <div className="listing-video">
                <video controls><source src={listing.video_url} type="video/mp4" /></video>
              </div>
            )}

            <div className="listing-description card">
              <h3>{t('listing.detail.description')}</h3>
              <p>{listing.description}</p>
            </div>

            {/* Mini mapa Leaflet si tiene coordenadas */}
            {hasLocation && (
              <div className="listing-map-preview card">
                <h3>📍 Ubicación</h3>
                <MapContainer
                  center={[listing.location_lat, listing.location_lng]}
                  zoom={14}
                  style={{ height: '200px', width: '100%', borderRadius: '12px' }}
                  zoomControl={false}
                  dragging={false}
                  scrollWheelZoom={false}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='© OpenStreetMap' />
                  <Marker position={[listing.location_lat, listing.location_lng]} />
                  {listing.visibility_zones && (
                    <Circle
                      center={[listing.visibility_zones.lat, listing.visibility_zones.lng]}
                      radius={listing.visibility_zones.radius_km * 1000}
                      color="#06D6A0" fillOpacity={0.1}
                    />
                  )}
                </MapContainer>
                <div className="map-open-btns">
                  <button className="btn btn-outline map-app-btn" onClick={() => openInMapApp('google')}>🗺️ Google Maps</button>
                  <button className="btn btn-outline map-app-btn" onClick={() => openInMapApp('waze')}>🚗 Waze</button>
                  <button className="btn btn-outline map-app-btn" onClick={() => openInMapApp('apple')}>🍎 Apple Maps</button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column — sin cambios */}
          <div className="listing-info-column">
            <div className="listing-header card">
              {auction && (
                <div className={`auction-detail-status ${auctionIsActive ? 'active' : 'closed'}`}>
                  <span>{auctionStatusLabel}</span>
                  {auctionIsActive && <span>Finaliza {new Date(auction.ends_at).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })}</span>}
                </div>
              )}
              <div className={`listing-price luxury-gold ${auctionIsActive ? 'auction-price' : ''}`}>
                {auctionIsActive ? 'Desde ' : ''}{formatPrice(auctionPrice, listing.currency)}
              </div>
              {auctionIsActive && (
                <div className="auction-detail-note">
                  {bidCount} {bidCount === 1 ? 'puja' : 'pujas'} · Puja mínima: {formatPrice(minimumBid, listing.currency)}
                </div>
              )}
              {auctionResult && (
                <div className={`auction-final-result ${isAuctionWinner ? 'auction-winner-result' : ''}`}>
                  {isAuctionWinner ? (
                    <>
                      <strong>Ganaste esta subasta</strong>
                      <span>{formatPrice(auctionResult.winning_amount, listing.currency)}</span>
                    </>
                  ) : isAuctionOwner && hasWinningBid ? (
                    <>
                      <strong>Comprador ganador</strong>
                      <span>{formatPrice(auctionResult.winning_amount, listing.currency)}</span>
                      <span>{finalWinnerName}</span>
                    </>
                  ) : (
                    <>
                      <strong>{hasWinningBid ? 'Monto final' : 'Subasta sin pujas'}</strong>
                      {hasWinningBid && <span>{formatPrice(auctionResult.winning_amount, listing.currency)}</span>}
                      {hasWinningBid && <span>Ganador: {finalWinnerName}</span>}
                    </>
                  )}
                </div>
              )}
              <h1 className="listing-title-detail">{listing.title}</h1>
              <div className="listing-meta-detail">
                <span className={`badge badge-${badge.color}`}>{badge.icon} {badge.label}</span>
                <span className="listing-category">{listing.category?.icon} {t(`categories.${listing.category?.slug}`)}</span>
              </div>
              {listing.is_ghost && listing.expires_at && (
                <div className="expiry-notice">⏱️ {t('listing.detail.expires_in')}: {timeUntilExpiry(listing.expires_at, t)}</div>
              )}
              <div className="listing-stats">
                <span>👁️ {listing.views_count} {t('listing.detail.views')}</span>
                <span>📱 {listing.contacts_count} {t('listing.detail.contacts')}</span>
                <span>📅 {timeAgo(listing.created_at, t)}</span>
              </div>
            </div>

            <div className="listing-contact card">
              {auctionIsActive ? (
                <div className="auction-contact-notice">
                  <strong>Este anuncio está en subasta.</strong>
                  <span>Precio actual: {formatPrice(currentBid, listing.currency)}</span>
                  {isAuctionOwner ? (
                    <span>No puedes pujar en tu propio anuncio.</span>
                  ) : !user ? (
                    <button type="button" className="btn btn-primary" onClick={() => navigate('/auth')}>Inicia sesión para pujar</button>
                  ) : (
                    <form className="auction-bid-form" onSubmit={handlePlaceBid}>
                      <label htmlFor="auction-bid-amount">Tu puja ({listing.currency})</label>
                      <div className="auction-bid-input-row">
                        <input
                          id="auction-bid-amount"
                          type="number"
                          min={minimumBid}
                          step="0.01"
                          value={bidAmount}
                          onChange={event => setBidAmount(event.target.value)}
                          placeholder={String(minimumBid)}
                        />
                        <button type="submit" className="btn btn-primary" disabled={bidSaving}>
                          {bidSaving ? 'Enviando...' : 'Pujar'}
                        </button>
                      </div>
                      <small>Mínimo permitido: {formatPrice(minimumBid, listing.currency)}</small>
                    </form>
                  )}
                  {bidError && <span className="auction-bid-error">{bidError}</span>}
                  {bidMessage && <span className="auction-bid-success">{bidMessage}</span>}
                  {bidHistory.length > 0 && (
                    <span className="auction-bid-history">Última puja: {formatPrice(bidHistory[0].amount, listing.currency)}</span>
                  )}
                </div>
              ) : auction && auction.status !== 'cancelled' ? (
                <div className="auction-contact-notice auction-finished-notice">
                  {isAuctionOwner && hasWinningBid ? (
                    <>
                      <strong>Datos del comprador ganador</strong>
                      {auctionResult.winner?.avatar_url && <img src={auctionResult.winner.avatar_url} alt={finalWinnerName} className="auction-contact-avatar" />}
                      <span>Nombre: {finalWinnerName}</span>
                      <span>Correo: {auctionResult.winner?.email || 'No disponible'}</span>
                      <span>WhatsApp: {auctionResult.winner?.whatsapp || 'No registrado'}</span>
                      <span>País: {auctionResult.winner?.country || 'No registrado'}</span>
                    </>
                  ) : isAuctionWinner ? (
                    <>
                      <strong>Ganaste esta subasta.</strong>
                      <span>Monto final: {formatPrice(auctionResult.winning_amount, listing.currency)}</span>
                      <span>El anunciante podrá contactarte para coordinar.</span>
                    </>
                  ) : (
                    <>
                      <strong>Esta subasta ha finalizado.</strong>
                      {hasWinningBid ? (
                        <span>Monto final: {formatPrice(auctionResult.winning_amount, listing.currency)}</span>
                      ) : (
                        <span>La subasta terminó sin pujas.</span>
                      )}
                    </>
                  )}
                </div>
              ) : listing.is_ghost ? (
                <div className="contact-ghost">
                  <p className="contact-notice">🏴‍☠️ {t('listing.detail.pirate_contact_notice')}</p>
                  <p className="contact-info">{listing.description}</p>
                </div>
              ) : (
                <button className="btn btn-primary btn-contact" onClick={handleContactWhatsApp}>
                  📱 {t('listing.detail.contact_whatsapp')}
                </button>
              )}
              <button className="btn btn-secondary" onClick={handleShare}>
                🔗 {t('listing.detail.share')}
              </button>
            </div>

            {listing.user && !listing.is_ghost && (
              <div className="seller-info card">
                <h3>{t('listing.detail.seller')}</h3>
                <div className="seller-profile">
                  {listing.user.avatar_url ? (
                    <img src={listing.user.avatar_url} alt={listing.user.display_name} className="seller-avatar" />
                  ) : (
                    <div className="seller-avatar-placeholder">{listing.user.display_name.charAt(0).toUpperCase()}</div>
                  )}
                  <div className="seller-details">
                    <div className="seller-name">{listing.user.display_name}</div>
                    <div className="seller-meta">{t('listing.detail.member_since')} {new Date(listing.user.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
                <Link to={`/vendedor/${listing.user.id}`} className="btn btn-secondary"
                  style={{ width: '100%', marginTop: '0.75rem', textAlign: 'center' }}>
                  📋 Ver catálogo
                </Link>
              </div>
            )}

            <button className="btn-report">⚠️ {t('listing.detail.report')}</button>
          </div>
        </div>
      </div>

      {/* Lightbox para imagen completa */}
      {lightboxIndex !== null && (
        <div className="lightbox-overlay" onClick={() => setLightboxIndex(null)}>
          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setLightboxIndex(null)}>
              <X size={24} />
            </button>
            <button className="lightbox-nav lightbox-prev" onClick={() => setLightboxIndex(prev => prev > 0 ? prev - 1 : listing.photos.length - 1)}>
              ‹
            </button>
            <img src={listing.photos[lightboxIndex]} alt={listing.title} className="lightbox-img" />
            <button className="lightbox-nav lightbox-next" onClick={() => setLightboxIndex(prev => prev < listing.photos.length - 1 ? prev + 1 : 0)}>
              ›
            </button>
            <div className="lightbox-indicator">{lightboxIndex + 1} / {listing.photos.length}</div>
          </div>
        </div>
      )}
    </div>
  )
}
