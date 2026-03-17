import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase, uploadImage, uploadVideo, getCategories } from '../lib/supabase'
import { validateImage, validateVideo, compressImage } from '../lib/utils'
import './CreateListing.css'

export default function CreateListing({ user }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploadingMedia, setUploadingMedia] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category_id: '',
    photos: [],
    video: null,
    whatsapp_number: user?.whatsapp || '',
    accepts_offers: false,
    location: ''
  })

  const [photoFiles, setPhotoFiles] = useState([])
  const [videoFile, setVideoFile] = useState(null)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const cats = await getCategories()
      setCategories(cats)
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  const handlePhotoChange = async (e) => {
    const files = Array.from(e.target.files)
    const newErrors = {}

    if (photoFiles.length + files.length > 5) {
      newErrors.photos = t('listing.create.max_photos_error')
      setErrors(prev => ({ ...prev, ...newErrors }))
      return
    }

    // Validate each file
    for (const file of files) {
      const error = validateImage(file)
      if (error) {
        newErrors.photos = error
        setErrors(prev => ({ ...prev, ...newErrors }))
        return
      }
    }

    // Compress images
    const compressedFiles = await Promise.all(
      files.map(file => compressImage(file))
    )

    setPhotoFiles(prev => [...prev, ...compressedFiles])
  }

  const handleVideoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const error = validateVideo(file)
    if (error) {
      setErrors(prev => ({ ...prev, video: error }))
      return
    }

    setVideoFile(file)
    setErrors(prev => ({ ...prev, video: null }))
  }

  const removePhoto = (index) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index))
  }

  const removeVideo = () => {
    setVideoFile(null)
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.title || formData.title.length < 10) {
      newErrors.title = t('listing.create.title_min_error')
    }

    if (!formData.price || formData.price <= 0) {
      newErrors.price = t('listing.create.price_error')
    }

    if (!formData.category_id) {
      newErrors.category_id = t('listing.create.category_error')
    }

    if (!formData.description) {
      newErrors.description = t('listing.create.description_error')
    }

    // For registered users, require WhatsApp
    if (user && !formData.whatsapp_number) {
      newErrors.whatsapp_number = t('listing.create.whatsapp_error')
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
    setUploadingMedia(true)

    try {
      // Upload photos
      const photoUrls = []
      for (const file of photoFiles) {
        const url = await uploadImage(file)
        photoUrls.push(url)
      }

      // Upload video
      let videoUrl = null
      if (videoFile) {
        videoUrl = await uploadVideo(videoFile)
      }

      setUploadingMedia(false)

      // Create listing
      const listingData = {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        category_id: formData.category_id,
        photos: photoUrls,
        video_url: videoUrl,
        accepts_offers: formData.accepts_offers,
        display_location: formData.location || 'Santa Cruz',
        is_ghost: !user,
        user_id: user?.id || null,
        whatsapp_number: user ? formData.whatsapp_number : null,
        status: 'active'
      }

      const { data, error } = await supabase
        .from('listings')
        .insert([listingData])
        .select()
        .single()

      if (error) throw error

      // Success
      alert(t('listing.create.success'))
      navigate(`/ficha/${data.slug}`)

    } catch (error) {
      console.error('Error creating listing:', error)
      alert(t('listing.create.error'))
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
          {/* Basic Info */}
          <div className="form-section card">
            <h3>{t('listing.create.basic_info')}</h3>
            
            <div className="form-group">
              <label>{t('listing.create.fields.title')} *</label>
              <input
                type="text"
                name="title"
                className="input"
                placeholder={t('listing.create.fields.title_placeholder')}
                value={formData.title}
                onChange={handleInputChange}
                maxLength={100}
              />
              {errors.title && <span className="error">{errors.title}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>{t('listing.create.fields.price')} (BOB) *</label>
                <input
                  type="number"
                  name="price"
                  className="input"
                  placeholder="0.00"
                  value={formData.price}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                />
                {errors.price && <span className="error">{errors.price}</span>}
              </div>

              <div className="form-group">
                <label>{t('listing.create.fields.category')} *</label>
                <select
                  name="category_id"
                  className="input select"
                  value={formData.category_id}
                  onChange={handleInputChange}
                >
                  <option value="">{t('listing.create.select_category')}</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {t(`categories.${cat.slug}`)}
                    </option>
                  ))}
                </select>
                {errors.category_id && <span className="error">{errors.category_id}</span>}
              </div>
            </div>

            <div className="form-group">
              <label>{t('listing.create.fields.description')} *</label>
              <textarea
                name="description"
                className="input textarea"
                placeholder={t('listing.create.fields.description_placeholder')}
                value={formData.description}
                onChange={handleInputChange}
                rows={6}
              />
              {errors.description && <span className="error">{errors.description}</span>}
            </div>

            {!isPirate && (
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
            )}
          </div>

          {/* Media */}
          <div className="form-section card">
            <h3>{t('listing.create.media')}</h3>
            
            {/* Photos */}
            <div className="form-group">
              <label>{t('listing.create.fields.photos')}</label>
              <div className="photo-upload">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoChange}
                  disabled={photoFiles.length >= 5}
                  id="photo-input"
                  style={{ display: 'none' }}
                />
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
                      <button
                        type="button"
                        className="photo-remove"
                        onClick={() => removePhoto(index)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Video */}
            <div className="form-group">
              <label>{t('listing.create.fields.video')}</label>
              {!videoFile ? (
                <>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoChange}
                    id="video-input"
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="video-input" className="btn btn-secondary upload-btn">
                    🎥 {t('listing.create.upload_video')}
                  </label>
                </>
              ) : (
                <div className="video-preview">
                  <video src={URL.createObjectURL(videoFile)} controls />
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={removeVideo}
                  >
                    {t('buttons.delete')}
                  </button>
                </div>
              )}
              {errors.video && <span className="error">{errors.video}</span>}
            </div>
          </div>

          {/* Contact (for registered users) */}
          {!isPirate && (
            <div className="form-section card">
              <h3>{t('listing.create.contact')}</h3>
              
              <div className="form-group">
                <label>{t('listing.create.fields.whatsapp')} *</label>
                <input
                  type="tel"
                  name="whatsapp_number"
                  className="input"
                  placeholder="+591 7XXXXXXX"
                  value={formData.whatsapp_number}
                  onChange={handleInputChange}
                />
                {errors.whatsapp_number && <span className="error">{errors.whatsapp_number}</span>}
              </div>
            </div>
          )}

          {/* Location */}
          <div className="form-section card">
            <h3>📍 {t('listing.create.fields.location')}</h3>
            
            <div className="form-group">
              <input
                type="text"
                name="location"
                className="input"
                placeholder="Ej: Equipetrol, Santa Cruz"
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
          </div>

          {/* Submit */}
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/')}
              disabled={loading}
            >
              {t('buttons.cancel')}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading"></span>
                  {uploadingMedia ? t('listing.create.uploading') : t('listing.create.publishing')}
                </>
              ) : (
                <>
                  🏴‍☠️ {isPirate ? t('listing.create.submit_pirate') : t('listing.create.submit')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
