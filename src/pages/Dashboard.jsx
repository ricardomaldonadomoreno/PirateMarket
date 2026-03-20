import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { formatPrice, timeAgo } from '../lib/utils'
import './Dashboard.css'

export default function Dashboard({ user }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [listings, setListings] = useState([])
  const [stats, setStats] = useState({ total_views: 0, total_contacts: 0, active_listings: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('active')
  const [profile, setProfile] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Premium shop form
  const [shopForm, setShopForm] = useState({
    shop_name: '',
    shop_bio: '',
    shop_link: '',
    shop_hours: '',
    shop_color: '#B8985F',
    shop_logo_url: '',
    shop_banner_url: '',
  })
  const [savingShop, setSavingShop] = useState(false)
  const [shopSaved, setShopSaved] = useState(false)

  useEffect(() => {
    if (!user) { navigate('/auth'); return }
    loadProfile()
    loadDashboard()
  }, [user, filter])

  const loadProfile = async () => {
    try {
      const { data } = await supabase
        .from('users')
        .select('display_name, user_type, avatar_url, is_premium, premium_until, shop_name, shop_bio, shop_link, shop_hours, shop_color, shop_logo_url, shop_banner_url')
        .eq('id', user.id)
        .single()
      if (data) {
        setProfile(data)
        setShopForm({
          shop_name: data.shop_name || '',
          shop_bio: data.shop_bio || '',
          shop_link: data.shop_link || '',
          shop_hours: data.shop_hours || '',
          shop_color: data.shop_color || '#B8985F',
          shop_logo_url: data.shop_logo_url || '',
          shop_banner_url: data.shop_banner_url || '',
        })
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const loadDashboard = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('listings')
        .select(`*, category:categories(name, slug, icon)`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (filter !== 'all') query = query.eq('status', filter)
      const { data: listingsData, error: listingsError } = await query
      if (listingsError) throw listingsError
      setListings(listingsData)
      const totalViews = listingsData.reduce((sum, l) => sum + (l.views_count || 0), 0)
      const totalContacts = listingsData.reduce((sum, l) => sum + (l.contacts_count || 0), 0)
      const activeCount = listingsData.filter(l => l.status === 'active').length
      setStats({ total_views: totalViews, total_contacts: totalContacts, active_listings: activeCount })
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadingAvatar(true)
    try {
      const fileExt = file.name.split('.').pop()
      const newFilePath = `${user.id}.${fileExt}`
      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/avatars/')[1]?.split('?')[0]
        if (oldPath) await supabase.storage.from('avatars').remove([oldPath])
      }
      const { error: uploadError } = await supabase.storage
        .from('avatars').upload(newFilePath, file, { contentType: file.type })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(newFilePath)
      const urlWithCache = `${publicUrl}?t=${Date.now()}`
      const { error: updateError } = await supabase
        .from('users').update({ avatar_url: urlWithCache }).eq('id', user.id)
      if (updateError) throw updateError
      setProfile(prev => ({ ...prev, avatar_url: urlWithCache }))
      e.target.value = ''
    } catch (error) {
      console.error('Error uploading avatar:', error)
      alert('Error al subir la foto: ' + error.message)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleAvatarDelete = async () => {
    if (!confirm('¿Eliminar tu foto de perfil?')) return
    setUploadingAvatar(true)
    try {
      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/avatars/')[1]?.split('?')[0]
        if (oldPath) await supabase.storage.from('avatars').remove([oldPath])
      }
      const { error } = await supabase.from('users').update({ avatar_url: null }).eq('id', user.id)
      if (error) throw error
      setProfile(prev => ({ ...prev, avatar_url: null }))
    } catch (error) {
      console.error('Error deleting avatar:', error)
      alert('Error al eliminar la foto')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleStatusChange = async (listingId, newStatus) => {
    try {
      const { error } = await supabase.from('listings').update({ status: newStatus }).eq('id', listingId)
      if (error) throw error
      loadDashboard()
    } catch (error) {
      console.error('Error updating status:', error)
      alert(t('messages.error'))
    }
  }

  const handleDelete = async (listingId) => {
    if (!confirm(t('messages.confirm_delete'))) return
    try {
      const { error } = await supabase.from('listings').delete().eq('id', listingId)
      if (error) throw error
      loadDashboard()
    } catch (error) {
      console.error('Error deleting listing:', error)
      alert(t('messages.error'))
    }
  }

  const handleShopSave = async () => {
    setSavingShop(true)
    try {
      const { error } = await supabase.from('users').update({
        shop_name: shopForm.shop_name || null,
        shop_bio: shopForm.shop_bio || null,
        shop_link: shopForm.shop_link || null,
        shop_hours: shopForm.shop_hours || null,
        shop_color: shopForm.shop_color || '#B8985F',
        shop_logo_url: shopForm.shop_logo_url || null,
        shop_banner_url: shopForm.shop_banner_url || null,
      }).eq('id', user.id)
      if (error) throw error
      setShopSaved(true)
      setTimeout(() => setShopSaved(false), 3000)
      loadProfile()
    } catch (error) {
      alert('Error al guardar: ' + error.message)
    } finally {
      setSavingShop(false)
    }
  }

  if (!user) return null

  const displayName = profile?.display_name || user.email?.split('@')[0]
  const userType = profile?.user_type || 'person'
  const avatarUrl = profile?.avatar_url
  const userTypeIcon = userType === 'shop' ? '🏪' : userType === 'wholesale' ? '📦' : userType === 'admin' ? '🔐' : '👤'
  const isPremium = profile?.is_premium && profile?.premium_until && new Date(profile.premium_until) > new Date()
  const isShopOrWholesale = userType === 'shop' || userType === 'wholesale'

  return (
    <div className="dashboard">
      <div className="dashboard-container">
        {/* Header — sin cambios */}
        <div className="dashboard-header">
          <div className="dashboard-profile">
            <div className="avatar-section">
              <div className="avatar-wrapper">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="avatar-img" />
                ) : (
                  <div className="avatar-placeholder">{displayName?.charAt(0).toUpperCase()}</div>
                )}
                {uploadingAvatar && <div className="avatar-loading">⏳</div>}
              </div>
              <div className="avatar-actions">
                <button className="avatar-btn" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}>
                  📷 {avatarUrl ? 'Cambiar' : 'Subir foto'}
                </button>
                {avatarUrl && (
                  <button className="avatar-btn avatar-btn-delete" onClick={handleAvatarDelete} disabled={uploadingAvatar}>🗑️</button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
              </div>
            </div>
            <div>
              <h1 className="serif luxury-gold">{t('dashboard.title')}</h1>
              <p className="dashboard-subtitle">{displayName}</p>
              <span className={`user-type-badge user-type-${userType}`}>
                {userTypeIcon} {t(`auth.${userType}`)}
              </span>
              {isPremium && (
                <span className="premium-badge-dashboard">
                  ⭐ Premium — hasta {new Date(profile.premium_until).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <Link to="/publicar" className="btn btn-primary">+ {t('navbar.publish')}</Link>
        </div>

        {/* Stats — sin cambios */}
        <div className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-icon">👁️</div>
            <div className="stat-info">
              <div className="stat-value">{stats.total_views.toLocaleString()}</div>
              <div className="stat-label">{t('dashboard.stats.total_views')}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📱</div>
            <div className="stat-info">
              <div className="stat-value">{stats.total_contacts.toLocaleString()}</div>
              <div className="stat-label">{t('dashboard.stats.total_contacts')}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🏴‍☠️</div>
            <div className="stat-info">
              <div className="stat-value">{stats.active_listings}</div>
              <div className="stat-label">{t('dashboard.stats.active_listings')}</div>
            </div>
          </div>
        </div>

        {/* Filters — sin cambios */}
        <div className="dashboard-filters">
          <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>{t('dashboard.filters.all')}</button>
          <button className={`filter-btn ${filter === 'active' ? 'active' : ''}`} onClick={() => setFilter('active')}>{t('dashboard.listing_status.active')}</button>
          <button className={`filter-btn ${filter === 'sold' ? 'active' : ''}`} onClick={() => setFilter('sold')}>{t('dashboard.listing_status.sold')}</button>
          <button className={`filter-btn ${filter === 'paused' ? 'active' : ''}`} onClick={() => setFilter('paused')}>{t('dashboard.listing_status.paused')}</button>
        </div>

        {/* Listings — sin cambios */}
        <div className="dashboard-listings">
          <h2>{t('dashboard.my_listings')}</h2>
          {loading ? (
            <div className="listings-loading">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="listing-row skeleton" style={{ height: '120px' }}></div>
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="no-listings">
              <span className="no-listings-icon">🏴‍☠️</span>
              <p>{t('dashboard.no_listings')}</p>
              <Link to="/publicar" className="btn btn-primary">{t('dashboard.create_first')}</Link>
            </div>
          ) : (
            <div className="listings-list">
              {listings.map((listing) => (
                <div key={listing.id} className="listing-row card">
                  <div className="listing-row-image">
                    {listing.photos && listing.photos.length > 0 ? (
                      <img src={listing.photos[0]} alt={listing.title} />
                    ) : (
                      <div className="listing-row-no-image">{listing.category?.icon || '📦'}</div>
                    )}
                  </div>
                  <div className="listing-row-info">
                    <Link to={`/ficha/${listing.slug}`} className="listing-row-title">{listing.title}</Link>
                    <div className="listing-row-meta">
                      <span className="listing-row-price luxury-gold">{formatPrice(listing.price, listing.currency)}</span>
                      <span className="listing-row-category">{listing.category?.icon} {t(`categories.${listing.category?.slug}`)}</span>
                      <span className="listing-row-date">{timeAgo(listing.created_at, t)}</span>
                    </div>
                    <div className="listing-row-stats">
                      <span>👁️ {listing.views_count}</span>
                      <span>📱 {listing.contacts_count}</span>
                      <span>🔗 {listing.shares_count}</span>
                    </div>
                  </div>
                  <div className="listing-row-status">
                    <span className={`status-badge status-${listing.status}`}>{t(`dashboard.listing_status.${listing.status}`)}</span>
                  </div>
                  <div className="listing-row-actions">
                    <Link to={`/ficha/${listing.slug}`} className="btn-icon" title={t('dashboard.actions.view')}>👁️</Link>
                    {listing.status === 'active' && (
                      <button className="btn-icon" onClick={() => handleStatusChange(listing.id, 'paused')} title={t('dashboard.actions.pause')}>⏸️</button>
                    )}
                    {listing.status === 'paused' && (
                      <button className="btn-icon" onClick={() => handleStatusChange(listing.id, 'active')} title={t('dashboard.actions.activate')}>▶️</button>
                    )}
                    {listing.status === 'active' && (
                      <button className="btn-icon" onClick={() => handleStatusChange(listing.id, 'sold')} title={t('dashboard.actions.mark_sold')}>✓</button>
                    )}
                    <button className="btn-icon btn-icon-danger" onClick={() => handleDelete(listing.id)} title={t('dashboard.actions.delete')}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ===== CATÁLOGO PREMIUM — solo shop/wholesale ===== */}
        {isShopOrWholesale && (
          <div className="premium-catalog-section">
            <div className="premium-catalog-header">
              <div>
                <h2 className="serif">⭐ Catálogo Premium</h2>
                <p>Personaliza tu página de catálogo con tu marca x solo 5$ anual</p>
              </div>
              {isPremium ? (
                <span className="premium-active-badge">✓ Activo hasta {new Date(profile.premium_until).toLocaleDateString()}</span>
              ) : (
                <span className="premium-inactive-badge">🔒 No activo</span>
              )}
            </div>

            {!isPremium ? (
              <div className="premium-locked">
                <div className="premium-locked-icon">🔒</div>
                <h3>Catálogo Premium no activado</h3>
                <p>Contacta al administrador para activar tu catálogo premium y personalizar tu página de vendedor con tu marca, banner, logo, descripción y más.</p>
                <a
                  href="https://api.whatsapp.com/send?phone=+59175109694&text=Hola,%20Soy%20Usuario%20de%20Pirata%20Marketplace%20y%20quiero%20tener%20mi%20catalogo%20premium..%20"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  📱 Solicitar activación
                </a>
              </div>
            ) : (
              <div className="premium-form">
                <div className="premium-form-preview">
                  <p className="premium-form-hint">
                    💡 Estos datos aparecerán en tu página de catálogo en <strong>/vendedor/{user.id}</strong>
                  </p>
                </div>

                <div className="premium-form-grid">
                  <div className="premium-field">
                    <label>Nombre de tu tienda</label>
                    <input type="text" className="input" placeholder="Ej: Tienda Maldonado"
                      value={shopForm.shop_name}
                      onChange={e => setShopForm(p => ({ ...p, shop_name: e.target.value }))} />
                  </div>

                  <div className="premium-field">
                    <label>Color de marca</label>
                    <div className="color-picker-row">
                      <input type="color" className="color-input"
                        value={shopForm.shop_color}
                        onChange={e => setShopForm(p => ({ ...p, shop_color: e.target.value }))} />
                      <span className="color-value">{shopForm.shop_color}</span>
                      <div className="color-preview" style={{ background: shopForm.shop_color }}></div>
                    </div>
                  </div>

                  <div className="premium-field full-width">
                    <label>Descripción / Bio</label>
                    <textarea className="input textarea" rows={3}
                      placeholder="Cuéntale a tus clientes sobre tu tienda..."
                      value={shopForm.shop_bio}
                      onChange={e => setShopForm(p => ({ ...p, shop_bio: e.target.value }))} />
                  </div>

                  <div className="premium-field">
                    <label>Link externo (web, Instagram, etc.)</label>
                    <input type="url" className="input" placeholder="https://..."
                      value={shopForm.shop_link}
                      onChange={e => setShopForm(p => ({ ...p, shop_link: e.target.value }))} />
                  </div>

                  <div className="premium-field">
                    <label>Horarios de atención</label>
                    <input type="text" className="input" placeholder="Ej: Lun-Vie 9am-6pm"
                      value={shopForm.shop_hours}
                      onChange={e => setShopForm(p => ({ ...p, shop_hours: e.target.value }))} />
                  </div>

                  <div className="premium-field">
                    <label>URL del logo</label>
                    <input type="url" className="input" placeholder="https://..."
                      value={shopForm.shop_logo_url}
                      onChange={e => setShopForm(p => ({ ...p, shop_logo_url: e.target.value }))} />
                  </div>

                  <div className="premium-field">
                    <label>URL del banner</label>
                    <input type="url" className="input" placeholder="https://... (imagen horizontal)"
                      value={shopForm.shop_banner_url}
                      onChange={e => setShopForm(p => ({ ...p, shop_banner_url: e.target.value }))} />
                  </div>
                </div>

                <div className="premium-form-actions">
                  {shopSaved && <span className="premium-saved">✓ Guardado correctamente</span>}
                  <button className="btn btn-primary" onClick={handleShopSave} disabled={savingShop}>
                    {savingShop ? <><span className="loading"></span> Guardando...</> : '💾 Guardar cambios'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
