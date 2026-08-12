import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import './DashboardDestacar.css'

export default function DashboardDestacar({ user, profile }) {
  const { t } = useTranslation()
  const [listings, setListings] = useState([])
  const [selectedListings, setSelectedListings] = useState(new Set())
  const [bannerFile, setBannerFile] = useState(null)
  const [bannerPreview, setBannerPreview] = useState(null)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('') // success, error, info
  const [loading, setLoading] = useState(true)

  // Cargar los anuncios del usuario
  useEffect(() => {
    if (!user) return
    loadListings()
  }, [user])

  const loadListings = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('listings')
        .select(`*, category:categories(name, slug, icon)`)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
      if (error) throw error
      setListings(data || [])
    } catch (error) { console.error(error) }
    finally { setLoading(false) }
  }

  // Toggle selección de anuncio para destacar
  const toggleListing = (listingId) => {
    setSelectedListings(prev => {
      const next = new Set(prev)
      if (next.has(listingId)) next.delete(listingId)
      else next.add(listingId)
      return next
    })
  }

  // Manejar upload de banner (comprimir a max 2MB y redimensionar a 1200x300)
  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      setMessage('Solo se permiten imágenes (JPG, PNG, WebP)')
      setMessageType('error')
      return
    }

    try {
      setMessage('Comprimiendo imagen...')
      setMessageType('info')

      // Comprimir imagen: max 2MB, redimensionar a 1200x300
      const { compressImage } = await import('../lib/utils')
      const compressed = await compressImage(file, 1200, 0.8)

      // Verificar que no exceda 2MB
      const maxSize = 2 * 1024 * 1024 // 2MB
      if (compressed.size > maxSize) {
        // Si aún excede 2MB, comprimir con calidad más baja
        const compressedAgain = await compressImage(compressed, 1200, 0.5)
        if (compressedAgain.size > maxSize) {
          setMessage('La imagen no puede comprimirse por debajo de 2MB. Usa una imagen más pequeña.')
          setMessageType('error')
          setBannerFile(null)
          setBannerPreview(null)
          return
        }
        setBannerFile(compressedAgain)
        setBannerPreview(URL.createObjectURL(compressedAgain))
      } else {
        setBannerFile(compressed)
        setBannerPreview(URL.createObjectURL(compressed))
      }
      setMessage(`Imagen comprimida exitosamente (${(compressed.size / 1024 / 1024).toFixed(2)} MB). Redimensionada a 1200×300 px.`)
      setMessageType('success')
    } catch (error) {
      console.error('Error comprimiendo imagen:', error)
      setMessage('Error al procesar la imagen. Intenta con otra.')
      setMessageType('error')
    }
  }

  // Enviar solicitud de anuncios destacados
  const handleSubmitListings = async () => {
    if (selectedListings.size === 0) {
      setMessage('Selecciona al menos un anuncio para destacar')
      setMessageType('error')
      return
    }

    setSending(true)
    setMessage('')
    try {
      const listingInserts = Array.from(selectedListings).map(listingId => ({
        user_id: user.id,
        listing_id: listingId,
        status: 'pending',
      }))
      const { error: listingsError } = await supabase
        .from('destacar_listings')
        .insert(listingInserts)
      if (listingsError) throw listingsError

      setMessage('Solicitud de anuncios enviados. El admin la revisará pronto.')
      setMessageType('success')
      setSelectedListings(new Set())
    } catch (error) {
      console.error(error)
      setMessage(`Error al enviar: ${error.message}`)
      setMessageType('error')
    } finally {
      setSending(false)
    }
  }

  // Enviar solicitud de banner publicitario
  const handleSubmitBanner = async () => {
    if (!bannerFile) {
      setMessage('Sube una imagen de banner primero')
      setMessageType('error')
      return
    }

    setSending(true)
    setMessage('')
    try {
      const fileName = `${user.id}/${Date.now()}_${bannerFile.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('banner-uploads')
        .upload(fileName, bannerFile, { contentType: bannerFile.type })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage
        .from('banner-uploads')
        .getPublicUrl(uploadData.path)

      const { error: bannerError } = await supabase
        .from('destacar_banners')
        .insert({
          user_id: user.id,
          banner_url: publicUrl,
          status: 'pending',
        })
      if (bannerError) throw bannerError

      setMessage('Banner enviado correctamente. El admin lo revisará pronto.')
      setMessageType('success')
      setBannerFile(null)
      setBannerPreview(null)

      // Resetear el input de archivo
      const fileInput = document.getElementById('banner-upload-input')
      if (fileInput) fileInput.value = ''
    } catch (error) {
      console.error(error)
      setMessage(`Error al enviar: ${error.message}`)
      setMessageType('error')
    } finally {
      setSending(false)
    }
  }

  if (!user) return null

  return (
    <div className="destacar-page">
      <div className="destacar-header">
        <h2>⭐ Destacar Anuncios</h2>
        <p className="destacar-subtitle">
          Selecciona tus anuncios para destacar y/o sube un banner publicitario.
          Los anuncios destacados aparecen aleatoriamente en el Home.
        </p>
      </div>

      {/* Mensajes */}
      {message && (
        <div className={`destacar-message ${messageType}`}>
          {message}
        </div>
      )}

      {/* Sección 1: Selección de anuncios */}
      <div className="destacar-section">
        <div className="destacar-section-title">
          <span className="destacar-section-icon">📋</span>
          <span>Seleccionar anuncios para destacar</span>
          <span className="destacar-price-badge">$1 × 30 días</span>
        </div>

        {loading ? (
          <div className="destacar-loading">Cargando anuncios...</div>
        ) : listings.length === 0 ? (
          <div className="destacar-empty">
            <p>No tienes anuncios activos. <a href="/publicar">Publica uno primero</a>.</p>
          </div>
        ) : (
          <div className="destacar-listings">
            {listings.map(listing => {
              const isSelected = selectedListings.has(listing.id)
              const isFeatured = listing.is_featured && listing.featured_until && new Date(listing.featured_until) > new Date()
              return (
                <div key={listing.id}
                  className={`destacar-listing-item ${isSelected ? 'selected' : ''} ${isFeatured ? 'featured' : ''}`}
                  onClick={() => toggleListing(listing.id)}
                >
                  <div className="destacar-listing-checkbox">
                    {isSelected ? '✅' : '☐'}
                  </div>
                  <div className="destacar-listing-image">
                    {listing.photos?.length > 0
                      ? <img src={listing.photos[0]} alt={listing.title} />
                      : <div className="destacar-listing-no-img">{listing.category?.icon || '📦'}</div>
                    }
                  </div>
                  <div className="destacar-listing-info">
                    <div className="destacar-listing-title">{listing.title}</div>
                    <div className="destacar-listing-meta">
                      <span className="destacar-listing-price">{listing.price} {listing.currency}</span>
                      {isFeatured && <span className="destacar-listing-badge">Ya destacado</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Sección 2: Banner publicitario */}
      <div className="destacar-section">
        <div className="destacar-section-title">
          <span className="destacar-section-icon">🖼️</span>
          <span>Solicitar banner publicitario</span>
          <span className="destacar-price-badge">$30 × 30 días</span>
        </div>
        <p className="destacar-banner-desc">
          Sube una imagen de exactamente <strong>1200×300 px</strong>. Se mostrará en el banner rotatorio del Home (rotación cada 5 segundos).
        </p>

        <div className="destacar-banner-upload">
          <label htmlFor="banner-upload-input" className="destacar-banner-label">
            {bannerPreview ? (
              <div className="destacar-banner-preview-container">
                <img src={bannerPreview} alt="Banner preview" className="destacar-banner-preview" />
                <span className="destacar-banner-change">Cambiar imagen</span>
              </div>
            ) : (
              <div className="destacar-banner-placeholder">
                <span className="destacar-banner-placeholder-icon">📤</span>
                <span>Haz clic para subir tu banner (1200×300 px)</span>
              </div>
            )}
          </label>
          <input
            id="banner-upload-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleBannerUpload}
            style={{ display: 'none' }}
          />
        </div>

        {bannerPreview && (
          <div className="destacar-banner-dimensions">
            1200 × 300 px ✅
          </div>
        )}
      </div>

      {/* Botón para enviar anuncios destacados */}
      <div className="destacar-submit-section">
        <button
          className="btn btn-primary destacar-submit-btn"
          onClick={handleSubmitListings}
          disabled={sending}
        >
          {sending ? 'Enviando...' : 'Enviar anuncios para destacar'}
        </button>
        {selectedListings.size > 0 && (
          <span className="destacar-submit-info">
            {selectedListings.size} anuncio(s) seleccionado(s)
          </span>
        )}
      </div>

      {/* Botón para enviar banner */}
      <div className="destacar-submit-section">
        <button
          className="btn btn-gold destacar-submit-btn"
          onClick={handleSubmitBanner}
          disabled={sending}
        >
          {sending ? 'Enviando...' : 'Enviar banner'}
        </button>
        {bannerFile && (
          <span className="destacar-submit-info">
            Banner adjunto (1200×300)
          </span>
        )}
      </div>
    </div>
  )
}
