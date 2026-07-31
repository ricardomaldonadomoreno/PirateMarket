import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase, uploadImage } from '../lib/supabase'
import { compressImage } from '../lib/utils'
import './Dashboard.css'

export default function DashboardTienda({ user, profile }) {
  const { t } = useTranslation()
  const [shopForm, setShopForm] = useState({
    shop_name: '', shop_bio: '', shop_link: '', shop_hours: '',
    shop_color: '#D4AF37', shop_logo_url: '', shop_banner_url: '',
  })
  const [savingShop, setSavingShop] = useState(false)
  const [shopSaved, setShopSaved] = useState(false)

  // Destacados
  const [listings, setListings] = useState([])
  const [featuredRequests, setFeaturedRequests] = useState([])
  const [selectedListingId, setSelectedListingId] = useState('')
  const [bannerFile, setBannerFile] = useState(null)
  const [bannerPreview, setBannerPreview] = useState(null)
  const [submittingFeatured, setSubmittingFeatured] = useState(false)

  useEffect(() => {
    if (profile) {
      setShopForm({
        shop_name: profile.shop_name || '',
        shop_bio: profile.shop_bio || '',
        shop_link: profile.shop_link || '',
        shop_hours: profile.shop_hours || '',
        shop_color: profile.shop_color || '#D4AF37',
        shop_logo_url: profile.shop_logo_url || '',
        shop_banner_url: profile.shop_banner_url || '',
      })
    }
  }, [profile])

  // Cargar listings activos del usuario y solicitudes de destacados
  useEffect(() => {
    if (!user) return
    loadListings()
    loadFeaturedRequests()
  }, [user])

  const loadListings = async () => {
    const { data } = await supabase
      .from('listings')
      .select('id, title, photos, slug, price, currency, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    if (data) setListings(data)
  }

  const loadFeaturedRequests = async () => {
    const { data } = await supabase
      .from('featured_listings')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setFeaturedRequests(data)
  }

  const handleShopSave = async () => {
    setSavingShop(true)
    try {
      await supabase.from('pirata_profiles').update({
        shop_name: shopForm.shop_name || null,
        shop_bio: shopForm.shop_bio || null,
        shop_link: shopForm.shop_link || null,
        shop_hours: shopForm.shop_hours || null,
        shop_color: shopForm.shop_color || '#D4AF37',
        shop_logo_url: shopForm.shop_logo_url || null,
        shop_banner_url: shopForm.shop_banner_url || null,
      }).eq('user_id', user.id)
      setShopSaved(true)
      setTimeout(() => setShopSaved(false), 3000)
    } catch (error) { alert('Error al guardar: ' + error.message) }
    finally { setSavingShop(false) }
  }

  const handleBannerChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setBannerFile(file)
    const compressed = await compressImage(file)
    setBannerPreview(URL.createObjectURL(compressed))
  }

  const handleRequestFeatured = async () => {
    if (!selectedListingId) { alert('Selecciona un anuncio'); return }
    setSubmittingFeatured(true)
    try {
      let bannerImageUrl = null
      if (bannerFile) {
        const compressed = await compressImage(bannerFile)
        const url = await uploadImage(compressed)
        bannerImageUrl = url
      }
      await supabase.from('featured_listings').insert([{
        listing_id: selectedListingId,
        user_id: user.id,
        banner_image_url: bannerImageUrl,
        status: 'pending',
        price_per_week: 1.00,
      }])
      setSelectedListingId('')
      setBannerFile(null)
      setBannerPreview(null)
      loadFeaturedRequests()
      alert('Solicitud enviada. Solicita el pago por WhatsApp para activar tu destacado.')
    } catch (error) {
      alert('Error: ' + error.message)
    } finally {
      setSubmittingFeatured(false)
    }
  }

  if (!user) return null

  const userType = profile?.user_type || 'person'
  const isPremium = profile?.is_premium && profile?.premium_until && new Date(profile.premium_until) > new Date()

  const statusLabels = {
    pending: '⏳ Pendiente de pago',
    active: '✅ Activo',
    expired: '⚠️ Expirado',
    cancelled: '❌ Cancelado',
  }

  return (
    <div className="db-section">
      {/* ── CATÁLOGO PREMIUM ── */}
      <div className="db-section-header">
        <h2>🏪 Catálogo Premium</h2>
        {isPremium ? <span className="premium-active-badge">✓ Activo</span> : <span className="premium-inactive-badge">🔒 Inactivo</span>}
      </div>
      {!isPremium ? (
        <div className="premium-locked">
          <p>Activa tu catálogo premium para personalizar tu tienda.</p>
          <a href="https://wa.me/59175109694" className="btn btn-primary">Solicitar por WhatsApp</a>
        </div>
      ) : (
        <div className="premium-form">
          <div className="premium-form-grid">
            <div className="form-group">
              <label>Nombre de Tienda</label>
              <input type="text" className="input" value={shopForm.shop_name} onChange={e => setShopForm(p => ({ ...p, shop_name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Color de Marca</label>
              <input type="color" className="color-input" value={shopForm.shop_color} onChange={e => setShopForm(p => ({ ...p, shop_color: e.target.value }))} />
            </div>
            <div className="form-group full-width">
              <label>Enlace Web</label>
              <input type="text" className="input" value={shopForm.shop_link} onChange={e => setShopForm(p => ({ ...p, shop_link: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="form-group">
              <label>Horario de Atención</label>
              <input type="text" className="input" value={shopForm.shop_hours} onChange={e => setShopForm(p => ({ ...p, shop_hours: e.target.value }))} placeholder="Ej: Lun-Sáb 9:00-18:00" />
            </div>
            <div className="form-group full-width">
              <label>Bio / Descripción</label>
              <textarea className="input" rows={3} value={shopForm.shop_bio} onChange={e => setShopForm(p => ({ ...p, shop_bio: e.target.value }))} />
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleShopSave} disabled={savingShop}>
            {savingShop ? 'Guardando...' : 'Guardar Cambios'}
          </button>
          {shopSaved && <p className="success-msg">✓ Tienda actualizada correctamente</p>}
        </div>
      )}

      {/* ── DESTACAR ANUNCIO ── */}
      <div className="db-section-header" style={{ marginTop: '2rem' }}>
        <h2>⭐ Destacar Anuncio — $1.00/semana</h2>
      </div>

      <div className="featured-section">
        <p className="featured-info">
          Tu anuncio aparecerá con un badge <strong>“⭐ Oferta”</strong>, se mostrará <strong>primero en las búsquedas</strong>,
          y podrá aparecer en el <strong>banner rotatorio</strong> del Home.
        </p>

        {/* Lista de destacados activos */}
        {featuredRequests.length > 0 && (
          <div className="featured-list">
            <h4>Mis destacados:</h4>
            {featuredRequests.map(fr => (
              <div key={fr.id} className="featured-list-item">
                <span className="featured-status">{statusLabels[fr.status] || fr.status}</span>
                <a href={`/ficha/${listings.find(l => l.id === fr.listing_id)?.slug || '#'}`} className="featured-link">
                  {listings.find(l => l.id === fr.listing_id)?.title || 'Anuncio'}
                </a>
                {fr.status === 'active' && fr.expires_at && (
                  <span className="featured-expires">
                    Expira: {new Date(fr.expires_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Formulario para solicitar nuevo destacado */}
        <div className="featured-request-form">
          <label className="form-label">Seleccionar anuncio:</label>
          <select className="input select" value={selectedListingId}
            onChange={e => setSelectedListingId(e.target.value)}>
            <option value="">— Elige un anuncio —</option>
            {listings.map(l => (
              <option key={l.id} value={l.id}>{l.title}</option>
            ))}
          </select>

          {selectedListingId && (
            <>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">Imagen de banner (opcional):</label>
                <p className="form-hint">Recomendado: 1200×300px. Si no subes, se usará la primera foto del anuncio.</p>
                {!bannerPreview ? (
                  <label className="btn btn-secondary upload-btn" style={{ marginTop: '0.5rem' }}>
                    🖼️ Subir imagen de banner
                    <input type="file" accept="image/*" onChange={handleBannerChange}
                      style={{ display: 'none' }} />
                  </label>
                ) : (
                  <div className="banner-preview" style={{ marginTop: '0.5rem' }}>
                    <img src={bannerPreview} alt="Banner preview" />
                    <button type="button" className="btn btn-ghost"
                      onClick={() => { setBannerFile(null); setBannerPreview(null) }}>
                      Quitar
                    </button>
                  </div>
                )}
              </div>

              <div className="featured-payment-notice">
                <p>💬 Tras enviar, <strong>solicita el pago por WhatsApp</strong> para activar tu destacado.</p>
              </div>

              <button className="btn btn-primary" onClick={handleRequestFeatured}
                disabled={submittingFeatured}>
                {submittingFeatured ? 'Enviando...' : 'Solicitar destacado'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
