import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase, uploadImage, uploadVideo } from '../lib/supabase'
import { validateImage, validateVideo, compressImage } from '../lib/utils'
import './CreateListing.css'

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
    category_id: '',
    description: '',
    photos: [],
    video: null,
    whatsapp: '',
    accepts_offers: false,
    location: ''
  })

  const [errors, setErrors] = useState({})
  const [photoPreviews, setPhotoPreviews] = useState([])
  const [videoPreview, setVideoPreview] = useState(null)

  useEffect(() => {
    checkUser()
    loadCategories()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    
    // Si hay usuario, cargar su WhatsApp
    if (user) {
      const { data: userData } = await supabase
        .from('users')
        .select('whatsapp')
        .eq('id', user.id)
        .single()
      
      if (userData?.whatsapp) {
        setFormData(prev => ({ ...prev, whatsapp: userData.whatsapp }))
      }
    }
  }

  const loadCategories = async () => {
    console.log('Loading categories...')
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name')
    
    if (error) {
      console.error('Error loading categories:', error)
      alert('Error al cargar categorías: ' + error.message)
    } else {
      console.log('Categories loaded:', data)
      setCategories(data || [])
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files)
    
    // Validar cantidad
    if (formData.photos.length + files.length > 5) {
      setErrors(prev => ({ ...prev, photos: t('listing.create.max_photos_error') }))
      return
    }

    setUploadingMedia(true)
    const newPhotos = []
    const newPreviews = []

    for (const file of files) {
      // Validar imagen
      const validation = validateImage(file)
      if (!validation.valid) {
        alert(validation.error)
        continue
      }

      try {
        // Comprimir imagen
        const compressed = await compressImage(file)
        
        // Subir a Supabase
        const url = await uploadImage(compressed, 'listing-photos')
        newPhotos.push(url)
        newPreviews.push(URL.createObjectURL(compressed))
      } catch (err) {
        console.error('Error uploading photo:', err)
        alert('Error al subir foto: ' + err.message)
      }
    }

    setFormData(prev => ({
      ...prev,
      photos: [...prev.photos, ...newPhotos]
    }))
    setPhotoPreviews(prev => [...prev, ...newPreviews])
    setUploadingMedia(false)
  }

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validar video
    const validation = validateVideo(file)
    if (!validation.valid) {
      alert(validation.error)
      return
    }

    setUploadingMedia(true)
    try {
      const url = await uploadVideo(file, 'listing-videos')
      setFormData(prev => ({ ...prev, video: url }))
      setVideoPreview(URL.createObjectURL(file))
    } catch (err) {
      console.error('Error uploading video:', err)
      alert('Error al subir video: ' + err.message)
    }
    setUploadingMedia(false)
  }

  const removePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }))
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const removeVideo = () => {
    setFormData(prev => ({ ...prev, video: null }))
    setVideoPreview(null)
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.title || formData.title.length < 10) {
      newErrors.title = t('listing.create.title_min_error')
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = t('listing.create.price_error')
    }

    if (!formData.category_id) {
      newErrors.category = t('listing.create.category_error')
    }

    if (!formData.description) {
      newErrors.description = t('listing.create.description_error')
    }

    // Si es usuario registrado, validar WhatsApp
    if (user && (!formData.whatsapp || formData.whatsapp.length < 8)) {
      newErrors.whatsapp = t('listing.create.whatsapp_error')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const listingData = {
        title: formData.title,
        price: parseFloat(formData.price),
        category_id: formData.category_id,
        description: formData.description,
        photos: formData.photos,
        video_url: formData.video,
        display_location: formData.location || null,
        status: 'active',
        is_ghost: !user, // true si no hay usuario
        user_id: user ? user.id : null,
        whatsapp_number: user ? formData.whatsapp : null,
        accepts_offers: user ? formData.accepts_offers : false
      }

      console.log('Submitting listing:', listingData)

      const { data, error } = await supabase
        .from('listings')
        .insert([listingData])
        .select()
        .single()

      if (error) {
        console.error('Error creating listing:', error)
        throw error
      }

      console.log('Listing created:', data)

      // Redirigir a la ficha creada
      navigate(`/ficha/${data.slug}`)
    } catch (err) {
      console.error('Error:', err)
      alert('Error al publicar: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const isPirate = !user

  return (
    <div className="create-listing">
      <div className="create-listing-container">
        <div className="create-listing-header">
          <h1>
            {isPirate 
              ? t('listing.create.title_pirate') 
              : t('listing.create.title_registered')
            }
          </h1>
          {isPirate && (
            <div className="pirate-notice">
              <p>⏱️ {t('listing.create.pirate_notice')}</p>
              <p className="pirate-upgrade">
                {t('listing.create.pirate_upgrade')} 
                <button onClick={() => navigate('/auth')} className="link-button">
                  {t('auth.signup')}
                </button>
              </p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="create-listing-form">
          {/* Información Básica */}
          <section className="form-section">
            <h2>{t('listing.create.basic_info')}</h2>

            <div className="form-group">
              <label>{t('listing.create.fields.title')} *</label>
              <input
                type="text"
                name="title"
                className="input"
                placeholder={t('listing.create.fields.title_placeholder')}
                value={formData.title}
                onChange={handleInputChange}
                required
              />
              {errors.title && (
                <p className="error-message">{errors.title}</p>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>{t('listing.create.fields.price')} (BOB) *</label>
                <input
                  type="number"
                  name="price"
                  className="input"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={handleInputChange}
                  required
                />
                {errors.price && (
                  <p className="error-message">{errors.price}</p>
                )}
              </div>

              <div className="form-group">
                <label>{t('listing.create.fields.category')} *</label>
                <select
                  name="category_id"
                  className="input select"
                  value={formData.category_id}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">{t('listing.create.select_category')}</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="error-message">{errors.category}</p>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>{t('listing.create.fields.description')} *</label>
              <textarea
                name="description"
                className="input textarea"
                placeholder={t('listing.create.fields.description_placeholder')}
                rows="6"
                value={formData.description}
                onChange={handleInputChange}
                required
              />
              {errors.description && (
                <p className="error-message">{errors.description}</p>
              )}
            </div>
          </section>

          {/* Fotos y Video */}
          <section className="form-section">
            <h2>{t('listing.create.media')}</h2>

            <div className="form-group">
              <label>{t('listing.create.fields.photos')}</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="input-file"
                disabled={uploadingMedia || formData.photos.length >= 5}
              />
              {errors.photos && (
                <p className="error-message">{errors.photos}</p>
              )}
              
              {photoPreviews.length > 0 && (
                <div className="photo-previews">
                  {photoPreviews.map((preview, index) => (
                    <div key={index} className="photo-preview">
                      <img src={preview} alt={`Preview ${index + 1}`} />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="remove-photo"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label>{t('listing.create.fields.video')}</label>
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoUpload}
                className="input-file"
                disabled={uploadingMedia || formData.video}
              />
              
              {videoPreview && (
                <div className="video-preview">
                  <video src={videoPreview} controls />
                  <button
                    type="button"
                    onClick={removeVideo}
                    className="remove-video"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            {uploadingMedia && (
              <p className="upload-status">{t('listing.create.uploading')}</p>
            )}
          </section>

          {/* Contacto (solo para usuarios registrados) */}
          {user && (
            <section className="form-section">
              <h2>{t('listing.create.contact')}</h2>

              <div className="form-group">
                <label>{t('listing.create.fields.whatsapp')} *</label>
                <input
                  type="tel"
                  name="whatsapp"
                  className="input"
                  placeholder="+591 7XXXXXXX"
                  value={formData.whatsapp}
                  onChange={handleInputChange}
                  required
                />
                {errors.whatsapp && (
                  <p className="error-message">{errors.whatsapp}</p>
                )}
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="accepts_offers"
                    checked={formData.accepts_offers}
                    onChange={handleInputChange}
                  />
                  <span>{t('listing.create.fields.accepts_offers')}</span>
                </label>
              </div>
            </section>
          )}

          {/* Ubicación */}
          <section className="form-section">
            <h2>{t('listing.create.fields.location')}</h2>

            <div className="form-group">
              <input
                type="text"
                name="location"
                className="input"
                placeholder={
                  isPirate 
                    ? t('listing.create.location_hint_pirate')
                    : t('listing.create.location_hint_registered')
                }
                value={formData.location}
                onChange={handleInputChange}
              />
              <p className="form-hint">
                {isPirate 
                  ? t('listing.create.location_hint_pirate')
                  : t('listing.create.location_hint_registered')
                }
              </p>
            </div>
          </section>

          {/* Botones */}
          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn btn-secondary"
              disabled={loading}
            >
              {t('buttons.cancel')}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || uploadingMedia}
            >
              {loading ? (
                <>
                  <span className="loading"></span>
                  {t('listing.create.publishing')}
                </>
              ) : (
                isPirate 
                  ? t('listing.create.submit_pirate')
                  : t('listing.create.submit')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
