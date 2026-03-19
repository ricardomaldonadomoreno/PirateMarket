import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { 
  getListingBySlug, 
  incrementViews, 
  incrementContacts,
  incrementShares 
} from '../lib/supabase'
import { 
  formatPrice, 
  timeAgo, 
  timeUntilExpiry,
  generateWhatsAppURL,
  generateShareURL,
  copyToClipboard,
  openInMaps,
  getUserBadge
} from '../lib/utils'
import './ListingDetail.css'

// Helper para actualizar meta tags dinámicamente
function updateMetaTags({ title, description, image, url }) {
  // Título
  document.title = title

  const setMeta = (selector, value) => {
    let el = document.querySelector(selector)
    if (!el) {
      el = document.createElement('meta')
      // Detectar si es property o name
      if (selector.includes('property=')) {
        el.setAttribute('property', selector.match(/property="([^"]+)"/)[1])
      } else {
        el.setAttribute('name', selector.match(/name="([^"]+)"/)[1])
      }
      document.head.appendChild(el)
    }
    el.setAttribute('content', value)
  }

  // Open Graph (Facebook, WhatsApp, Telegram, LinkedIn)
  setMeta('meta[property="og:title"]',       title)
  setMeta('meta[property="og:description"]', description)
  setMeta('meta[property="og:image"]',       image)
  setMeta('meta[property="og:image:width"]', '1200')
  setMeta('meta[property="og:image:height"]','630')
  setMeta('meta[property="og:url"]',         url)
  setMeta('meta[property="og:type"]',        'product')
  setMeta('meta[property="og:site_name"]',   'Pirata Market')

  // Twitter Card
  setMeta('meta[name="twitter:card"]',        'summary_large_image')
  setMeta('meta[name="twitter:title"]',       title)
  setMeta('meta[name="twitter:description"]', description)
  setMeta('meta[name="twitter:image"]',       image)

  // Meta description general
  setMeta('meta[name="description"]', description)
}

function resetMetaTags() {
  document.title = 'Pirata Market'
  const setMeta = (selector, value) => {
    const el = document.querySelector(selector)
    if (el) el.setAttribute('content', value)
  }
  setMeta('meta[property="og:title"]',       'Pirata Market')
  setMeta('meta[property="og:description"]', 'Comercio sin intermediarios')
  setMeta('meta[property="og:image"]',       '/logo.png')
  setMeta('meta[property="og:url"]',         window.location.origin)
  setMeta('meta[name="description"]',        'Pirata Market - Comercio sin intermediarios')
}

export default function ListingDetail({ user }) {
  const { slug } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)

  useEffect(() => {
    loadListing()
    // Limpiar meta tags al salir de la página
    return () => resetMetaTags()
  }, [slug])

  const loadListing = async () => {
    window.scrollTo(0, 0)
    try {
      const data = await getListingBySlug(slug)
      setListing(data)
      await incrementViews(data.id)

      // Actualizar meta tags con los datos del anuncio
      const imageUrl = data.photos && data.photos.length > 0
        ? data.photos[0]
        : `${window.location.origin}/logo.png`

      const priceText = formatPrice(data.price, data.currency)
      const descText = data.description
        ? data.description.substring(0, 150).replace(/\n/g, ' ') + '...'
        : `${priceText} - Pirata Market`

      updateMetaTags({
        title:       `${data.title} - ${priceText} | Pirata Market`,
        description: descText,
        image:       imageUrl,
        url:         `${window.location.origin}/ficha/${data.slug}`
      })

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

  const handleShare = async () => {
    const url = generateShareURL(listing.slug)
    if (navigator.share) {
      try {
        await navigator.share({
          title: listing.title,
          text:  `${listing.title} - ${formatPrice(listing.price, listing.currency)}`,
          url:   url
        })
        await incrementShares(listing.id)
      } catch (error) {
        console.log('Share cancelled')
      }
    } else {
      const copied = await copyToClipboard(url)
      if (copied) {
        alert(t('messages.copied'))
        await incrementShares(listing.id)
      }
    }
  }

  const handleOpenMap = () => {
    if (listing.exact_location) {
      const coords = listing.exact_location.coordinates
      openInMaps(coords[1], coords[0])
    }
  }

  const nextPhoto = () => {
    if (listing.photos.length > 0) {
      setCurrentPhotoIndex((prev) => (prev + 1) % listing.photos.length)
    }
  }

  const prevPhoto = () => {
    if (listing.photos.length > 0) {
      setCurrentPhotoIndex((prev) =>
        prev === 0 ? listing.photos.length - 1 : prev - 1
      )
    }
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
    ? getUserBadge(listing.user.user_type, listing.user.is_verified, t)
    : { icon: '🏴‍☠️', label: t('badges.pirate'), color: 'gold' }

  const hasPhotos = listing.photos && listing.photos.length > 0

  return (
    <div className="listing-detail">
      <div className="listing-detail-container">
        <Link to="/" className="back-button">
          ← {t('buttons.back')}
        </Link>

        <div className="listing-detail-grid">
          {/* Left Column - Media */}
          <div className="listing-media-column">
            {hasPhotos ? (
              <div className="photo-gallery">
                <div className="photo-main">
                  <img
                    src={listing.photos[currentPhotoIndex]}
                    alt={listing.title}
                  />
                  {listing.photos.length > 1 && (
                    <>
                      <button className="photo-nav photo-prev" onClick={prevPhoto}>‹</button>
                      <button className="photo-nav photo-next" onClick={nextPhoto}>›</button>
                      <div className="photo-indicator">
                        {currentPhotoIndex + 1} / {listing.photos.length}
                      </div>
                    </>
                  )}
                </div>
                {listing.photos.length > 1 && (
                  <div className="photo-thumbnails">
                    {listing.photos.map((photo, index) => (
                      <button
                        key={index}
                        className={`photo-thumb ${index === currentPhotoIndex ? 'active' : ''}`}
                        onClick={() => setCurrentPhotoIndex(index)}
                      >
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
                <video controls>
                  <source src={listing.video_url} type="video/mp4" />
                </video>
              </div>
            )}

            <div className="listing-description card">
              <h3>{t('listing.detail.description')}</h3>
              <p>{listing.description}</p>
            </div>
          </div>

          {/* Right Column - Info */}
          <div className="listing-info-column">
            <div className="listing-header card">
              <div className="listing-price luxury-gold">
                {formatPrice(listing.price, listing.currency)}
              </div>
              <h1 className="listing-title-detail">{listing.title}</h1>

              <div className="listing-meta-detail">
                <span className={`badge badge-${badge.color}`}>
                  {badge.icon} {badge.label}
                </span>
                <span className="listing-category">
                  {listing.category?.icon} {t(`categories.${listing.category?.slug}`)}
                </span>
              </div>

              {listing.is_ghost && listing.expires_at && (
                <div className="expiry-notice">
                  ⏱️ {t('listing.detail.expires_in')}: {timeUntilExpiry(listing.expires_at, t)}
                </div>
              )}

              <div className="listing-stats">
                <span>👁️ {listing.views_count} {t('listing.detail.views')}</span>
                <span>📱 {listing.contacts_count} {t('listing.detail.contacts')}</span>
                <span>📅 {timeAgo(listing.created_at, t)}</span>
              </div>
            </div>

            <div className="listing-contact card">
              {listing.is_ghost ? (
                <div className="contact-ghost">
                  <p className="contact-notice">
                    🏴‍☠️ {t('listing.detail.pirate_contact_notice')}
                  </p>
                  <p className="contact-info">{listing.description}</p>
                </div>
              ) : (
                <button
                  className="btn btn-primary btn-contact"
                  onClick={handleContactWhatsApp}
                >
                  📱 {t('listing.detail.contact_whatsapp')}
                </button>
              )}

              <button className="btn btn-secondary" onClick={handleShare}>
                🔗 {t('listing.detail.share')}
              </button>
            </div>

            {listing.exact_location && (
              <div className="listing-location card">
                <h3>📍 {t('listing.fields.location')}</h3>
                <p className="location-name">{listing.display_location}</p>
                <button className="btn btn-outline" onClick={handleOpenMap}>
                  🗺️ {t('listing.detail.open_maps')}
                </button>
              </div>
            )}

            {listing.user && !listing.is_ghost && (
              <div className="seller-info card">
                <h3>{t('listing.detail.seller')}</h3>
                <div className="seller-profile">
                  {listing.user.avatar_url ? (
                    <img
                      src={listing.user.avatar_url}
                      alt={listing.user.display_name}
                      className="seller-avatar"
                    />
                  ) : (
                    <div className="seller-avatar-placeholder">
                      {listing.user.display_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="seller-details">
                    <div className="seller-name">{listing.user.display_name}</div>
                    <div className="seller-meta">
                      {t('listing.detail.member_since')} {new Date(listing.user.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <Link
                  to={`/vendedor/${listing.user.id}`}
                  className="btn btn-secondary"
                  style={{ width: '100%', marginTop: '0.75rem', textAlign: 'center' }}
                >
                  📋 Ver catálogo
                </Link>
              </div>
            )}

            <button className="btn-report">
              ⚠️ {t('listing.detail.report')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
