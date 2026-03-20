import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { formatPrice, timeAgo } from '../lib/utils'
import './SellerCatalog.css'

export default function SellerCatalog() {
  const { userId } = useParams()
  const { t } = useTranslation()
  const [seller, setSeller] = useState(null)
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState(null)

  useEffect(() => {
    window.scrollTo(0, 0)
    loadSellerData()
  }, [userId])

  useEffect(() => {
    const handleKey = (e) => {
      if (!lightbox) return
      if (e.key === 'Escape') setLightbox(null)
      if (e.key === 'ArrowRight') setLightbox(prev => ({ ...prev, index: (prev.index + 1) % prev.photos.length }))
      if (e.key === 'ArrowLeft') setLightbox(prev => ({ ...prev, index: prev.index === 0 ? prev.photos.length - 1 : prev.index - 1 }))
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [lightbox])

  const loadSellerData = async () => {
    setLoading(true)
    try {
      const { data: sellerData } = await supabase
        .from('users')
        .select('id, display_name, user_type, is_verified, avatar_url, created_at, whatsapp, is_premium, premium_until, shop_name, shop_bio, shop_link, shop_hours, shop_color, shop_logo_url, shop_banner_url')
        .eq('id', userId)
        .single()
      if (sellerData) setSeller(sellerData)

      const { data: listingsData } = await supabase
        .from('listings')
        .select('id, title, price, currency, photos, slug, display_location, created_at, category:categories(name, slug, icon)')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
      if (listingsData) setListings(listingsData)
    } catch (error) {
      console.error('Error loading seller:', error)
    } finally {
      setLoading(false)
    }
  }

  const openLightbox = (photos, index) => {
    if (!photos || photos.length === 0) return
    setLightbox({ photos, index })
    document.body.style.overflow = 'hidden'
  }

  const closeLightbox = () => {
    setLightbox(null)
    document.body.style.overflow = ''
  }

  const typeLabel = (type) =>
    type === 'shop' ? '🏪 Tienda' :
    type === 'wholesale' ? '📦 Mayorista' :
    type === 'admin' ? '🔐 Admin' : '👤 Persona'

  const typeColor = (type) =>
    type === 'shop' ? 'warning' :
    type === 'wholesale' ? 'success' : 'gold'

  if (loading) {
    return (
      <div className="seller-catalog">
        <div className="seller-catalog-container">
          <div className="skeleton" style={{ height: '200px', marginBottom: '2rem' }}></div>
          <div className="catalog-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: '220px' }}></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!seller) return (
    <div className="seller-catalog">
      <div className="seller-catalog-container">
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '4rem' }}>Vendedor no encontrado</p>
        <Link to="/" className="btn btn-secondary">← Volver</Link>
      </div>
    </div>
  )

  const isPremium = seller.is_premium && seller.premium_until && new Date(seller.premium_until) > new Date()
  const brandColor = isPremium && seller.shop_color ? seller.shop_color : 'var(--gold)'
  const displayName = isPremium && seller.shop_name ? seller.shop_name : seller.display_name

  return (
    <div className="seller-catalog">
      <div className="seller-catalog-container">
        <Link to="/" className="back-button">← {t('buttons.back')}</Link>

        {/* ===== HEADER PREMIUM ===== */}
        {isPremium ? (
          <div className="seller-header-premium">
            {/* Banner */}
            {seller.shop_banner_url && (
              <div className="seller-banner" style={{ borderColor: brandColor }}>
                <img src={seller.shop_banner_url} alt="Banner" />
              </div>
            )}

            <div className="seller-premium-body card" style={{ borderColor: brandColor }}>
              <div className="seller-premium-top">
                {/* Logo o avatar */}
                <div className="seller-premium-logo" style={{ borderColor: brandColor }}>
                  {seller.shop_logo_url ? (
                    <img src={seller.shop_logo_url} alt={displayName} />
                  ) : seller.avatar_url ? (
                    <img src={seller.avatar_url} alt={displayName} />
                  ) : (
                    <span style={{ color: brandColor }}>{displayName?.charAt(0).toUpperCase()}</span>
                  )}
                </div>

                <div className="seller-premium-info">
                  <div className="seller-premium-name-row">
                    <h1 className="serif" style={{ color: brandColor }}>{displayName}</h1>
                    <span className="premium-star-badge" style={{ background: `${brandColor}22`, color: brandColor, borderColor: brandColor }}>
                      ⭐ Premium
                    </span>
                  </div>

                  <div className="seller-header-badges">
                    <span className={`badge badge-${typeColor(seller.user_type)}`}>{typeLabel(seller.user_type)}</span>
                    {seller.is_verified && <span className="badge badge-verified">✓ Verificado</span>}
                  </div>

                  {seller.shop_bio && <p className="seller-premium-bio">{seller.shop_bio}</p>}

                  <div className="seller-premium-meta">
                    <span>📅 Miembro desde {new Date(seller.created_at).toLocaleDateString()}</span>
                    <span>📋 {listings.length} anuncios activos</span>
                    {seller.shop_hours && <span>🕐 {seller.shop_hours}</span>}
                  </div>
                </div>

                <div className="seller-premium-actions">
                  {seller.whatsapp && (
                    <a href={`https://wa.me/${seller.whatsapp.replace(/\D/g, '')}`}
                      target="_blank" rel="noopener noreferrer"
                      className="btn btn-primary seller-whatsapp-btn">
                      📱 WhatsApp
                    </a>
                  )}
                  {seller.shop_link && (
                    <a href={seller.shop_link} target="_blank" rel="noopener noreferrer"
                      className="btn btn-outline" style={{ borderColor: brandColor, color: brandColor }}>
                      🌐 Visitar sitio
                    </a>
                  )}
                </div>
              </div>

              {/* Certificaciones */}
              {seller.user_type !== 'person' && (
                <div className="seller-certifications">
                  <div className="seller-cert-header">
                    <span>🏅 Certificaciones y verificaciones</span>
                    {!seller.is_verified && <span className="seller-cert-pending">Pendiente de verificación</span>}
                  </div>
                  {seller.is_verified ? (
                    <div className="seller-cert-grid">
                      <div className="seller-cert-item"><span>✅</span><span>Identidad verificada</span></div>
                      <div className="seller-cert-item"><span>✅</span><span>Negocio registrado</span></div>
                    </div>
                  ) : (
                    <p className="seller-cert-empty">Este vendedor aún no ha completado el proceso de verificación.</p>
                  )}
                </div>
              )}
            </div>
          </div>

        ) : (
          /* ===== HEADER BÁSICO — igual que antes ===== */
          <div className="seller-header card">
            <div className="seller-header-main">
              <div className="seller-header-avatar">
                {seller.avatar_url
                  ? <img src={seller.avatar_url} alt={seller.display_name} />
                  : <span>{seller.display_name?.charAt(0).toUpperCase()}</span>
                }
              </div>
              <div className="seller-header-info">
                <div className="seller-header-top">
                  <h1 className="serif">{seller.display_name}</h1>
                  <div className="seller-header-badges">
                    <span className={`badge badge-${typeColor(seller.user_type)}`}>{typeLabel(seller.user_type)}</span>
                    {seller.is_verified && <span className="badge badge-verified">✓ Verificado</span>}
                  </div>
                </div>
                <div className="seller-header-meta">
                  <span>📅 Miembro desde {new Date(seller.created_at).toLocaleDateString()}</span>
                  <span>📋 {listings.length} anuncios activos</span>
                </div>
              </div>
              {seller.whatsapp && (
                <a href={`https://wa.me/${seller.whatsapp.replace(/\D/g, '')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="btn btn-primary seller-whatsapp-btn">
                  📱 WhatsApp
                </a>
              )}
            </div>

            {seller.user_type !== 'person' && (
              <div className="seller-certifications">
                <div className="seller-cert-header">
                  <span>🏅 Certificaciones y verificaciones</span>
                  {!seller.is_verified && <span className="seller-cert-pending">Pendiente de verificación</span>}
                </div>
                {seller.is_verified ? (
                  <div className="seller-cert-grid">
                    <div className="seller-cert-item"><span>✅</span><span>Identidad verificada</span></div>
                    <div className="seller-cert-item"><span>✅</span><span>Negocio registrado</span></div>
                  </div>
                ) : (
                  <p className="seller-cert-empty">Este vendedor aún no ha completado el proceso de verificación.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Catálogo — igual para premium y básico */}
        <div className="catalog-section">
          <h2 className="serif catalog-title" style={ isPremium ? { color: brandColor } : {} }>
            {seller.user_type === 'shop' ? '🏪 Catálogo de productos' :
             seller.user_type === 'wholesale' ? '📦 Catálogo mayorista' : '📋 Anuncios'}
          </h2>

          {listings.length === 0 ? (
            <div className="catalog-empty">
              <span>🏴‍☠️</span>
              <p>Este vendedor no tiene anuncios activos</p>
            </div>
          ) : (
            <div className="catalog-grid">
              {listings.map(listing => (
                <div key={listing.id} className="catalog-card"
                  style={ isPremium ? { '--brand-color': brandColor } : {} }
                  onClick={() => openLightbox(listing.photos, 0)}>
                  <div className="catalog-card-image">
                    {listing.photos && listing.photos.length > 0 ? (
                      <img src={listing.photos[0]} alt={listing.title} />
                    ) : (
                      <div className="catalog-no-image">{listing.category?.icon || '📦'}</div>
                    )}
                    {listing.photos && listing.photos.length > 1 && (
                      <span className="catalog-photo-count">+{listing.photos.length - 1}</span>
                    )}
                  </div>
                  <div className="catalog-card-info">
                    <p className="catalog-price" style={ isPremium ? { color: brandColor } : {} }>
                      {formatPrice(listing.price, listing.currency)}
                    </p>
                    <p className="catalog-card-title">{listing.title}</p>
                    <p className="catalog-card-location">📍 {listing.display_location}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox — sin cambios */}
      {lightbox && (
        <div className="lightbox" onClick={closeLightbox}>
          <button className="lightbox-close" onClick={closeLightbox}>✕</button>
          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            <img src={lightbox.photos[lightbox.index]} alt="Foto ampliada" className="lightbox-img" />
            {lightbox.photos.length > 1 && (
              <>
                <button className="lightbox-nav lightbox-prev"
                  onClick={() => setLightbox(prev => ({ ...prev, index: prev.index === 0 ? prev.photos.length - 1 : prev.index - 1 }))}>‹</button>
                <button className="lightbox-nav lightbox-next"
                  onClick={() => setLightbox(prev => ({ ...prev, index: (prev.index + 1) % prev.photos.length }))}>›</button>
                <div className="lightbox-counter">{lightbox.index + 1} / {lightbox.photos.length}</div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
