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

export default function ListingDetail({ user }) {
  const { slug } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [showShareMenu, setShowShareMenu] = useState(false)

  useEffect(() => {
    loadListing()
  }, [slug])

  const loadListing = async () => {
    try {
      const data = await getListingBySlug(slug)
      setListing(data)
      
      // Increment views
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
    
    // Increment contacts counter
    await incrementContacts(listing.id)
    
    // Generate WhatsApp URL
    const whatsappNumber = listing.is_ghost 
      ? null 
      : listing.whatsapp_number
    
    if (whatsappNumber) {
      const url = generateWhatsAppURL(
        whatsappNumber,
        listing.title,
        listing.slug
      )
      window.open(url, '_blank')
    }
  }

  const handleShare = async () => {
    const url = generateShareURL(listing.slug)
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: listing.title,
          text: `${listing.title} - ${formatPrice(listing.price, listing.currency)}`,
          url: url
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
      setCurrentPhotoIndex((prev) => 
        (prev + 1) % listing.photos.length
      )
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

  if (!listing) {
    return null
  }

  const badge = listing.user 
    ? getUserBadge(listing.user.user_type, listing.user.is_verified, t)
    : { icon: '🏴‍☠️', label: t('badges.pirate'), color: 'gold' }

  const hasPhotos = listing.photos && listing.photos.length > 0

  return (
    <div className="listing-detail">
      <div className="listing-detail-container">
        {/* Back Button */}
        <Link to="/" className="back-button">
          ← {t('buttons.back')}
        </Link>

        <div className="listing-detail-grid">
          {/* Left Column - Media */}
          <div className="listing-media-column">
            {/* Photo Gallery */}
            {hasPhotos ? (
              <div className="photo-gallery">
                <div className="photo-main">
                  <img 
                    src={listing.photos[currentPhotoIndex]} 
                    alt={listing.title}
                  />
                  {listing.photos.length > 1 && (
                    <>
                      <button className="photo-nav photo-prev" onClick={prevPhoto}>
                        ‹
                      </button>
                      <button className="photo-nav photo-next" onClick={nextPhoto}>
                        ›
                      </button>
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

            {/* Video */}
            {listing.video_url && (
              <div className="listing-video">
                <video controls>
                  <source src={listing.video_url} type="video/mp4" />
                </video>
              </div>
            )}

            {/* Description */}
            <div className="listing-description card">
              <h3>{t('listing.detail.description')}</h3>
              <p>{listing.description}</p>
            </div>
          </div>

          {/* Right Column - Info */}
          <div className="listing-info-column">
            {/* Price & Title */}
            <div className="listing-header card">
              <div className="listing-price luxury-gold">
                {formatPrice(listing.price, listing.currency)}
              </div>
              <h1 className="listing-title-detail">{listing.title}</h1>
              
              {/* Meta */}
              <div className="listing-meta-detail">
                <span className={`badge badge-${badge.color}`}>
                  {badge.icon} {badge.label}
                </span>
                <span className="listing-category">
                  {listing.category?.icon} {t(`categories.${listing.category?.slug}`)}
                </span>
              </div>

              {/* Pirate Expiry */}
              {listing.is_ghost && listing.expires_at && (
                <div className="expiry-notice">
                  ⏱️ {t('listing.detail.expires_in')}: {timeUntilExpiry(listing.expires_at, t)}
                </div>
              )}

              {/* Stats */}
              <div className="listing-stats">
                <span>👁️ {listing.views_count} {t('listing.detail.views')}</span>
                <span>📱 {listing.contacts_count} {t('listing.detail.contacts')}</span>
                <span>📅 {timeAgo(listing.created_at, t)}</span>
              </div>
            </div>

            {/* Contact */}
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

              <button 
                className="btn btn-secondary"
                onClick={handleShare}
              >
                🔗 {t('listing.detail.share')}
              </button>
            </div>

            {/* Location */}
            {listing.exact_location && (
              <div className="listing-location card">
                <h3>📍 {t('listing.fields.location')}</h3>
                <p className="location-name">{listing.display_location}</p>
                <button 
                  className="btn btn-outline"
                  onClick={handleOpenMap}
                >
                  🗺️ {t('listing.detail.open_maps')}
                </button>
              </div>
            )}

            {/* Seller Info (if registered) */}
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
              </div>
            )}

            {/* Report */}
            <button className="btn-report">
              ⚠️ {t('listing.detail.report')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```
