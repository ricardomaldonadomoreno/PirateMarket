import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase, uploadImage, uploadVideo, getCategories } from '../lib/supabase'
import { validateImage, validateVideo, compressImage } from '../lib/utils'
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './CreateListing.css'

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const CURRENCIES = [
  { code: 'BOB', label: 'BOB — Boliviano' },
  { code: 'USD', label: 'USD — Dólar' },
  { code: 'BRL', label: 'BRL — Real' },
  { code: 'ARS', label: 'ARS — Peso Arg.' },
  { code: 'PEN', label: 'PEN — Sol' },
  { code: 'CLP', label: 'CLP — Peso Chi.' },
  { code: 'PYG', label: 'PYG — Guaraní' },
]

// Componente para capturar clicks en el mapa
function MapClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng) })
  return null
}

export default function CreateListing() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [categories, setCategories] = useState([])

  const [formData, setFormData] = useState({
    title: '',
    price: '',
    currency: 'BOB',
    category_id: '',
    description: '',
    whatsapp_number: '',
    accepts_offers: false,
    location: ''
  })

  // Estado de ubicación
  const [pinLocation, setPinLocation] = useState(null) // { lat, lng }
  const [locationMode, setLocationMode] = useState('none') // none | exact | approximate | region
  const [saleZone, setSaleZone] = useState(null) // { lat, lng, radius_km }
  const [showSaleZone, setShowSaleZone] = useState(false)
  const [saleZoneRadius, setSaleZoneRadius] = useState(2)
  const [gpsLoading, setGpsLoading] = useState(false)
  const mapCenter = pinLocation || { lat: -17.7863, lng: -63.1812 } // Santa Cruz por defecto

  const [photoFiles, setPhotoFiles] = useState([])
  const [videoFile, setVideoFile] = useState(null)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    checkUser()
    loadCategories()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    if (user) {
      const { data: userData } = await supabase
        .from('users')
        .select('whatsapp')
        .eq('id', user.id)
        .single()
      if (userData?.whatsapp) {
        setFormData(prev => ({ ...prev, whatsapp_number: userData.whatsapp }))
      }
    }
  }

  const loadCategories = async () => {
    try {
      const cats = await getCategories()
      setCategories(cats)
    } catch (error) {
      console.error('Error loading categories:', error)
      alert('Error al cargar categorías: ' + error.message)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }))
  }

  const handlePhotoChange = async (e) => {
    const files = Array.from(e.target.files)
    const newErrors = {}
    if (photoFiles.length + files.length > 5) {
      newErrors.photos = t('listing.create.max_photos_error')
      setErrors(prev => ({ ...prev, ...newErrors }))
      return
    }
    for (const file of files) {
      const error = validateImage(file)
      if (error) {
        newErrors.photos = error
        setErrors(prev => ({ ...prev, ...newErrors }))
        return
      }
    }
    const compressedFiles = await Promise.all(files.map(file => compressImage(file)))
    setPhotoFiles(prev => [...prev, ...compressedFiles])
  }

  const handleVideoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const error = validateVideo(file)
    if (error) { setErrors(prev => ({ ...prev, video: error })); return }
    setVideoFile(file)
    setErrors(prev => ({ ...prev, video: null }))
  }

  const removePhoto = (index) => setPhotoFiles(prev => prev.filter((_, i) => i !== index))
  const removeVideo = () => setVideoFile(null)

  // GPS
  const handleGetGPS = () => {
    if (!navigator.geolocation) { alert('Tu dispositivo no soporta GPS'); return }
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setPinLocation(loc)
        if (showSaleZone) setSaleZone({ ...loc, radius_km: saleZoneRadius })
        setGpsLoading(false)
      },
      () => { alert('No se pudo obtener la ubicación'); setGpsLoading(false) }
    )
  }

  const handleMapClick = (latlng) => {
    const loc = { lat: latlng.lat, lng: latlng.lng }
    setPinLocation(loc)
    if (showSaleZone) setSaleZone({ ...loc, radius_km: saleZoneRadius })
  }

  const handleSaleZoneToggle = (val) => {
    setShowSaleZone(val)
    if (val && pinLocation) setSaleZone({ ...pinLocation, radius_km: saleZoneRadius })
    if (!val) setSaleZone(null)
  }

  const handleRadiusChange = (val) => {
    setSaleZoneRadius(val)
    if (pinLocation) setSaleZone({ ...pinLocation, radius_km: val })
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.title || formData.title.length < 10) newErrors.title = t('listing.create.title_min_error')
    if (!formData.price || formData.price <= 0) newErrors.price = t('listing.create.price_error')
    if (!formData.category_id) newErrors.category_id = t('listing.create.category_error')
    if (!formData.description) newErrors.description = t('listing.create.description_error')
    if (user && !formData.whatsapp_number) newErrors.whatsapp_number = t('listing.create.whatsapp_error')
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    setLoading(true)
    setUploadingMedia(true)
    try {
      const photoUrls = []
      for (let i = 0; i < photoFiles.length; i++) {
        const url = await uploadImage(photoFiles[i])
        photoUrls.push(url)
      }
      let videoUrl = null
      if (videoFile) videoUrl = await uploadVideo(videoFile)
      setUploadingMedia(false)

      const listingData = {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        currency: formData.currency,
        category_id: formData.category_id,
        photos: photoUrls,
        video_url: videoUrl,
        accepts_offers: formData.accepts_offers,
        display_location: formData.location || 'Santa Cruz',
        is_ghost: !user,
        user_id: user?.id || null,
        whatsapp_number: user ? formData.whatsapp_number : null,
        status: 'active',
        // Nuevos campos GPS
        location_lat: locationMode !== 'none' && pinLocation ? pinLocation.lat : null,
        location_lng: locationMode !== 'none' && pinLocation ? pinLocation.lng : null,
        visibility_zones: saleZone ? saleZone : null,
      }

      const { data, error } = await supabase
        .from('listings')
        .insert([listingData])
        .select()
        .single()

      if (error) throw error
      alert(t('listing.create.success'))
      navigate(`/ficha/${data.slug}`)
    } catch (error) {
      console.error('Error al publicar:', error)
      alert(t('listing.create.error') + ': ' + error.message)
    } finally {
      setLoading(false)
      setUploadingMedia(false)
    }
  }

  const isPirate = !user

  return (
    <div className="create-listing">
      <div className="create-listing-container">
        <div className="create-header">
          <h1 className="serif luxury-gold">
            {isPirate ? t('listing.create.title_pirate') : t('listing.create.title_registered')}
          </h1>
          {isPirate && (
            <div className="pirate-notice">
              <span>⏱️</span>
              <div>
                <strong>{t('listing.create.pirate_notice')}</strong>
                <p>{t('listing.create.pirate_upgrade')}</p>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="create-form">
          {/* Basic Info — sin cambios */}
          <div className="form-section card">
            <h3>{t('listing.create.basic_info')}</h3>
            <div className="form-group">
              <label>{t('listing.create.fields.title')} *</label>
              <input type="text" name="title" className="input"
                placeholder={t('listing.create.fields.title_placeholder')}
                value={formData.title} onChange={handleInputChange} maxLength={100} />
              {errors.title && <span className="error">{errors.title}</span>}
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>{t('listing.create.fields.price')} *</label>
                <div className="price-currency-row">
                  <select name="currency" className="input select currency-select"
                    value={formData.currency} onChange={handleInputChange}>
                    {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                  </select>
                  <input type="number" name="price" className="input price-input"
                    placeholder="0.00" value={formData.price} onChange={handleInputChange}
                    min="0" step="0.01" />
                </div>
                <p className="form-hint">{CURRENCIES.find(c => c.code === formData.currency)?.label}</p>
                {errors.price && <span className="error">{errors.price}</span>}
              </div>
              <div className="form-group">
                <label>{t('listing.create.fields.category')} *</label>
                <select name="category_id" className="input select"
                  value={formData.category_id} onChange={handleInputChange}>
                  <option value="">{t('listing.create.select_category')}</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                  ))}
                </select>
                {errors.category_id && <span className="error">{errors.category_id}</span>}
              </div>
            </div>
            <div className="form-group">
              <label>{t('listing.create.fields.description')} *</label>
              <textarea name="description" className="input textarea"
                placeholder={t('listing.create.fields.description_placeholder')}
                value={formData.description} onChange={handleInputChange} rows={6} />
              {errors.description && <span className="error">{errors.description}</span>}
            </div>
            {!isPirate && (
              <div className="form-group">
                <label className="checkbox-label">
                  <input type="checkbox" name="accepts_offers"
                    checked={formData.accepts_offers} onChange={handleInputChange} />
                  <span>{t('listing.create.fields.accepts_offers')}</span>
                </label>
              </div>
            )}
          </div>

          {/* Media — sin cambios */}
          <div className="form-section card">
            <h3>{t('listing.create.media')}</h3>
            <div className="form-group">
              <label>{t('listing.create.fields.photos')}</label>
              <div className="photo-upload">
                <input type="file" accept="image/*" multiple onChange={handlePhotoChange}
                  disabled={photoFiles.length >= 5} id="photo-input" style={{ display: 'none' }} />
                <label htmlFor="photo-input" className="btn btn-secondary upload-btn">
                  📷 {t('listing.create.upload_photos')} ({photoFiles.length}/5)
                </label>
              </div>
              {errors.photos && <span className="error">{errors.photos}</span>}
              {photoFiles.length > 0 && (
                <div className="photo-preview-grid">
                  {photoFiles.map((file, index) => (
                    <div key={index} className="photo-preview-item">
                      <img src={URL.createObjectURL(file)} alt={`Preview ${index + 1}`} />
                      <button type="button" className="photo-remove" onClick={() => removePhoto(index)}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="form-group">
              <label>{t('listing.create.fields.video')}</label>
              {!videoFile ? (
                <>
                  <input type="file" accept="video/*" onChange={handleVideoChange}
                    id="video-input" style={{ display: 'none' }} />
                  <label htmlFor="video-input" className="btn btn-secondary upload-btn">
                    🎥 {t('listing.create.upload_video')}
                  </label>
                </>
              ) : (
                <div className="video-preview">
                  <video src={URL.createObjectURL(videoFile)} controls />
                  <button type="button" className="btn btn-ghost" onClick={removeVideo}>
                    {t('buttons.delete')}
                  </button>
                </div>
              )}
              {errors.video && <span className="error">{errors.video}</span>}
            </div>
          </div>

          {/* Contact — sin cambios */}
          {!isPirate && (
            <div className="form-section card">
              <h3>{t('listing.create.contact')}</h3>
              <div className="form-group">
                <label>{t('listing.create.fields.whatsapp')} *</label>
                <input type="tel" name="whatsapp_number" className="input"
                  placeholder="+591 7XXXXXXX" value={formData.whatsapp_number}
                  onChange={handleInputChange} />
                {errors.whatsapp_number && <span className="error">{errors.whatsapp_number}</span>}
              </div>
            </div>
          )}

          {/* Location — NUEVO con mapa */}
          <div className="form-section card">
            <h3>📍 {t('listing.create.fields.location')}</h3>

            <div className="form-group">
              <input type="text" name="location" className="input"
                placeholder="Ej: Equipetrol, Santa Cruz"
                value={formData.location} onChange={handleInputChange} />
              <p className="form-hint">
                {isPirate ? t('listing.create.location_hint_pirate') : t('listing.create.location_hint_registered')}
              </p>
            </div>

            {/* Tipo de ubicación */}
            <div className="form-group">
              <label>Precisión de ubicación en el mapa</label>
              <div className="location-mode-btns">
                {[
                  { val: 'none', label: '🚫 Sin ubicación' },
                  { val: 'exact', label: '📍 Exacta' },
                  { val: 'approximate', label: '〰️ Aproximada' },
                  { val: 'region', label: '🌐 Solo región' },
                ].map(({ val, label }) => (
                  <button key={val} type="button"
                    className={`location-mode-btn ${locationMode === val ? 'active' : ''}`}
                    onClick={() => { setLocationMode(val); if (val === 'none') setPinLocation(null) }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {locationMode !== 'none' && (
              <>
                <div className="form-group">
                  <button type="button" className="btn btn-secondary gps-btn"
                    onClick={handleGetGPS} disabled={gpsLoading}>
                    {gpsLoading ? <><span className="loading"></span> Detectando...</> : '🎯 Usar mi ubicación (GPS)'}
                  </button>
                  <p className="form-hint">O haz clic en el mapa para colocar el pin</p>
                </div>

                <div className="location-map-container">
                  <MapContainer
                    center={[mapCenter.lat, mapCenter.lng]}
                    zoom={13}
                    style={{ height: '280px', width: '100%', borderRadius: '12px' }}
                    key={`${mapCenter.lat}-${mapCenter.lng}`}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='© OpenStreetMap'
                    />
                    <MapClickHandler onMapClick={handleMapClick} />
                    {pinLocation && (
                      <>
                        <Marker position={[pinLocation.lat, pinLocation.lng]} />
                        {locationMode === 'approximate' && (
                          <Circle center={[pinLocation.lat, pinLocation.lng]}
                            radius={500} color="var(--gold)" fillOpacity={0.15} />
                        )}
                        {locationMode === 'region' && (
                          <Circle center={[pinLocation.lat, pinLocation.lng]}
                            radius={3000} color="var(--gold)" fillOpacity={0.1} />
                        )}
                      </>
                    )}
                    {saleZone && (
                      <Circle center={[saleZone.lat, saleZone.lng]}
                        radius={saleZone.radius_km * 1000}
                        color="#06D6A0" fillOpacity={0.1} />
                    )}
                  </MapContainer>
                </div>

                {pinLocation && (
                  <p className="form-hint" style={{ marginTop: '0.5rem' }}>
                    📍 {pinLocation.lat.toFixed(5)}, {pinLocation.lng.toFixed(5)}
                  </p>
                )}

                {/* Zona de venta */}
                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label className="checkbox-label">
                    <input type="checkbox" checked={showSaleZone}
                      onChange={e => handleSaleZoneToggle(e.target.checked)} />
                    <span>🟢 Definir zona de venta/entrega</span>
                  </label>
                  <p className="form-hint">Activa esto si vendes solo en una zona específica o haces delivery</p>
                </div>

                {showSaleZone && (
                  <div className="sale-zone-controls">
                    <label>Radio de entrega: <strong>{saleZoneRadius} km</strong></label>
                    <input type="range" min="0.2" max="50" step="0.1"
                      value={saleZoneRadius}
                      onChange={e => handleRadiusChange(parseFloat(e.target.value))}
                      className="zone-slider" />
                    <div className="zone-slider-labels">
                      <span>200m</span><span>25km</span><span>50km</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Submit — sin cambios */}
          <div className="form-actions">
            <button type="button" className="btn btn-secondary"
              onClick={() => navigate('/')} disabled={loading}>
              {t('buttons.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <><span className="loading"></span>
                  {uploadingMedia ? t('listing.create.uploading') : t('listing.create.publishing')}
                </>
              ) : (
                <>🏴‍☠️ {isPirate ? t('listing.create.submit_pirate') : t('listing.create.submit')}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
