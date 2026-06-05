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
    shop_name: '', shop_bio: '', shop_link: '', shop_hours: '',
    shop_color: '#B8985F', shop_logo_url: '', shop_banner_url: '',
  })
  const [savingShop, setSavingShop] = useState(false)
  const [shopSaved, setShopSaved] = useState(false)

  // Verificación
  const [verificationRequest, setVerificationRequest] = useState(null)
  const [uploadingDocs, setUploadingDocs] = useState(false)
  const [identityFiles, setIdentityFiles] = useState([])
  const [businessFiles, setBusinessFiles] = useState([])
  const [verifSaved, setVerifSaved] = useState(false)

  useEffect(() => {
    if (!user) { navigate('/auth'); return }
    loadProfile()
    loadDashboard()
    loadVerification()
  }, [user, filter])

  const loadProfile = async () => {
    try {
      const { data } = await supabase
        .from('users')
        .select('display_name, user_type, avatar_url, is_verified, is_premium, premium_until, shop_name, shop_bio, shop_link, shop_hours, shop_color, shop_logo_url, shop_banner_url')
        .eq('id', user.id)
        .single()
      if (data) {
        setProfile(data)
        setShopForm({
          shop_name: data.shop_name || '', shop_bio: data.shop_bio || '',
          shop_link: data.shop_link || '', shop_hours: data.shop_hours || '',
          shop_color: data.shop_color || '#B8985F',
          shop_logo_url: data.shop_logo_url || '', shop_banner_url: data.shop_banner_url || '',
        })
      }
    } catch (error) { console.error('Error loading profile:', error) }
  }

  const loadDashboard = async () => {
    setLoading(true)
    try {
      let query = supabase.from('listings').select(`*, category:categories(name, slug, icon)`)
        .eq('user_id', user.id).order('created_at', { ascending: false })
      if (filter !== 'all') query = query.eq('status', filter)
      const { data: listingsData, error: listingsError } = await query
      if (listingsError) throw listingsError
      setListings(listingsData)
      setStats({
        total_views: listingsData.reduce((sum, l) => sum + (l.views_count || 0), 0),
        total_contacts: listingsData.reduce((sum, l) => sum + (l.contacts_count || 0), 0),
        active_listings: listingsData.filter(l => l.status === 'active').length
      })
    } catch (error) { console.error('Error loading dashboard:', error) }
    finally { setLoading(false) }
  }

  const loadVerification = async () => {
    const { data } = await supabase.from('verification_requests')
      .select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(1).single()
    if (data) setVerificationRequest(data)
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
      const { error: uploadError } = await supabase.storage.from('avatars').upload(newFilePath, file, { contentType: file.type })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(newFilePath)
      const urlWithCache = `${publicUrl}?t=${Date.now()}`
      await supabase.from('users').update({ avatar_url: urlWithCache }).eq('id', user.id)
      setProfile(prev => ({ ...prev, avatar_url: urlWithCache }))
      e.target.value = ''
    } catch (error) { alert('Error al subir la foto: ' + error.message) }
    finally { setUploadingAvatar(false) }
  }

  const handleAvatarDelete = async () => {
    if (!confirm('¿Eliminar tu foto de perfil?')) return
    setUploadingAvatar(true)
    try {
      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/avatars/')[1]?.split('?')[0]
        if (oldPath) await supabase.storage.from('avatars').remove([oldPath])
      }
      await supabase.from('users').update({ avatar_url: null }).eq('id', user.id)
      setProfile(prev => ({ ...prev, avatar_url: null }))
    } catch (error) { alert('Error al eliminar la foto') }
    finally { setUploadingAvatar(false) }
  }

  const handleStatusChange = async (listingId, newStatus) => {
    try {
      await supabase.from('listings').update({ status: newStatus }).eq('id', listingId)
      loadDashboard()
    } catch (error) { alert(t('messages.error')) }
  }

  const handleDelete = async (listingId) => {
    if (!confirm(t('messages.confirm_delete'))) return
    try {
      await supabase.from('listings').delete().eq('id', listingId)
      loadDashboard()
    } catch (error) { alert(t('messages.error')) }
  }

  const handleShopSave = async () => {
    setSavingShop(true)
    try {
      await supabase.from('users').update({
        shop_name: shopForm.shop_name || null, shop_bio: shopForm.shop_bio || null,
        shop_link: shopForm.shop_link || null, shop_hours: shopForm.shop_hours || null,
        shop_color: shopForm.shop_color || '#B8985F',
        shop_logo_url: shopForm.shop_logo_url || null, shop_banner_url: shopForm.shop_banner_url || null,
      }).eq('id', user.id)
      setShopSaved(true)
      setTimeout(() => setShopSaved(false), 3000)
      loadProfile()
    } catch (error) { alert('Error al guardar: ' + error.message) }
    finally { setSavingShop(false) }
  }

  // Upload docs de verificación
  const uploadDocFiles = async (files, folder) => {
    const urls = []
    for (const file of files) {
      const fileExt = file.name.split('.').pop()
      const path = `${user.id}/${folder}/${Date.now()}.${fileExt}`
      const { error } = await supabase.storage.from('verification-docs').upload(path, file, { contentType: file.type })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('verification-docs').getPublicUrl(path)
      urls.push(publicUrl)
    }
    return urls
  }

  const handleSubmitVerification = async () => {
    if (identityFiles.length === 0) { alert('Sube al menos una foto de identidad'); return }
    setUploadingDocs(true)
    try {
      const identityUrls = await uploadDocFiles(identityFiles, 'identity')
      const businessUrls = businessFiles.length > 0 ? await uploadDocFiles(businessFiles, 'business') : []

      const payload = {
        user_id: user.id,
        status: 'pending',
        identity_docs: identityUrls,
        business_docs: businessUrls,
      }

      if (verificationRequest) {
        await supabase.from('verification_requests').update(payload).eq('id', verificationRequest.id)
      } else {
        await supabase.from('verification_requests').insert([payload])
      }

      setVerifSaved(true)
      setIdentityFiles([])
      setBusinessFiles([])
      setTimeout(() => setVerifSaved(false), 4000)
      loadVerification()
    } catch (error) { alert('Error al enviar documentos: ' + error.message) }
    finally { setUploadingDocs(false) }
  }

  if (!user) return null

  const displayName = profile?.display_name || user.email?.split('@')[0]
  const userType = profile?.user_type || 'person'
  const avatarUrl = profile?.avatar_url
  const userTypeIcon = userType === 'shop' ? '🏪' : userType === 'wholesale' ? '📦' : userType === 'admin' ? '🔐' : '👤'
  const isPremium = profile?.is_premium && profile?.premium_until && new Date(profile.premium_until) > new Date()
  const isShopOrWholesale = userType === 'shop' || userType === 'wholesale'
  const isVerified = profile?.is_verified

  const verifStatusLabel = {
    pending: { text: '⏳ Revisión pendiente', cls: 'verif-pending' },
    approved: { text: '✓ Verificado', cls: 'verif-approved' },
    rejected: { text: '✗ Rechazado', cls: 'verif-rejected' },
  }

  return (
    <div className="dashboard">
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <div className="dashboard-profile">
            <div className="avatar-section">
              <div className="avatar-wrapper">
                {avatarUrl ? <img src={avatarUrl} alt={displayName} className="avatar-img" />
                  : <div className="avatar-placeholder">{displayName?.charAt(0).toUpperCase()}</div>}
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
              <span className={`user-type-badge user-type-${userType}`}>{userTypeIcon} {t(`auth.${userType}`)}</span>
              {isPremium && <span className="premium-badge-dashboard">⭐ Premium — hasta {new Date(profile.premium_until).toLocaleDateString()}</span>}
            </div>
          </div>
          <Link to="/publicar" className="btn btn-primary">+ {t('navbar.publish')}</Link>
        </div>

        {/* Stats */}
        <div className="dashboard-stats">
          {[
            { icon: '👁️', value: stats.total_views.toLocaleString(), label: t('dashboard.stats.total_views') },
            { icon: '📱', value: stats.total_contacts.toLocaleString(), label: t('dashboard.stats.total_contacts') },
            { icon: '🏴‍☠️', value: stats.active_listings, label: t('dashboard.stats.active_listings') },
          ].map((s, i) => (
            <div key={i} className="stat-card">
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-info">
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="dashboard-filters">
          {['all', 'active', 'sold', 'paused'].map(f => (
            <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? t('dashboard.filters.all') : t(`dashboard.listing_status.${f}`)}
            </button>
          ))}
        </div>

        {/* Listings */}
        <div className="dashboard-listings">
          <h2>{t('dashboard.my_listings')}</h2>
          {loading ? (
            <div className="listings-loading">{[...Array(3)].map((_, i) => <div key={i} className="listing-row skeleton" style={{ height: '120px' }}></div>)}</div>
          ) : listings.length === 0 ? (
            <div className="no-listings">
              <span className="no-listings-icon">🏴‍☠️</span>
              <p>{t('dashboard.no_listings')}</p>
              <Link to="/publicar" className="btn btn-primary">{t('dashboard.create_first')}</Link>
            </div>
          ) : (
            <div className="listings-list">
              {listings.map(listing => (
                <div key={listing.id} className="listing-row card">
                  <div className="listing-row-image">
                    {listing.photos?.length > 0
                      ? <img src={listing.photos[0]} alt={listing.title} />
                      : <div className="listing-row-no-image">{listing.category?.icon || '📦'}</div>}
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
                    <Link to={`/ficha/${listing.slug}`} className="btn-icon">👁️</Link>
                    {listing.status === 'active' && <button className="btn-icon" onClick={() => handleStatusChange(listing.id, 'paused')}>⏸️</button>}
                    {listing.status === 'paused' && <button className="btn-icon" onClick={() => handleStatusChange(listing.id, 'active')}>▶️</button>}
                    {listing.status === 'active' && <button className="btn-icon" onClick={() => handleStatusChange(listing.id, 'sold')}>✓</button>}
                    <button className="btn-icon btn-icon-danger" onClick={() => handleDelete(listing.id)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ===== VERIFICACIÓN ===== */}
        <div className="verification-section">
          <div className="verification-header">
            <div>
              <h2 className="serif">🏅 Verificación de cuenta</h2>
              <p>Verifica tu identidad para obtener el badge ✓ Verificado en tu perfil y catálogo</p>
            </div>
            {isVerified ? (
              <span className="verif-badge verif-approved">✓ Cuenta verificada</span>
            ) : verificationRequest ? (
              <span className={`verif-badge ${verifStatusLabel[verificationRequest.status]?.cls}`}>
                {verifStatusLabel[verificationRequest.status]?.text}
              </span>
            ) : (
              <span className="verif-badge verif-none">Sin verificar</span>
            )}
          </div>

          {isVerified ? (
            <div className="verif-verified-msg">
              <span>🎉</span>
              <p>Tu cuenta está verificada. El badge ✓ aparece en tu perfil y catálogo.</p>
            </div>
          ) : verificationRequest?.status === 'pending' ? (
            <div className="verif-pending-msg">
              <span>⏳</span>
              <p>Tus documentos están siendo revisados. Te notificaremos cuando estén aprobados.</p>
              {verificationRequest.admin_note && (
                <p className="verif-admin-note">📝 Nota del admin: {verificationRequest.admin_note}</p>
              )}
            </div>
          ) : (
            <div className="verif-form">
              {verificationRequest?.status === 'rejected' && (
                <div className="verif-rejected-msg">
                  <p>✗ Tu solicitud anterior fue rechazada.</p>
                  {verificationRequest.admin_note && (
                    <p className="verif-admin-note">📝 Motivo: {verificationRequest.admin_note}</p>
                  )}
                  <p>Puedes volver a enviar documentos corregidos.</p>
                </div>
              )}

              {/* Documentos de identidad — todos */}
              <div className="verif-field">
                <label>📄 Documento de identidad</label>
                <p className="verif-hint">Foto del DNI/CI anverso y reverso + selfie sosteniendo el documento</p>
                <input type="file" accept="image/*" multiple id="identity-input" style={{ display: 'none' }}
                  onChange={e => setIdentityFiles(Array.from(e.target.files))} />
                <label htmlFor="identity-input" className="btn btn-secondary verif-upload-btn">
                  📷 Seleccionar fotos ({identityFiles.length} seleccionadas)
                </label>
                {identityFiles.length > 0 && (
                  <div className="verif-preview-grid">
                    {identityFiles.map((f, i) => (
                      <div key={i} className="verif-preview-item">
                        <img src={URL.createObjectURL(f)} alt={`doc ${i}`} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Documentos del negocio — solo shop/wholesale */}
              {isShopOrWholesale && (
                <div className="verif-field">
                  <label>🏪 Documentos del negocio</label>
                  <p className="verif-hint">
                    Foto exterior del negocio · Foto del mural de certificaciones · Documento legal (NIT, matrícula de comercio, etc.)
                    <br />El nombre del titular debe coincidir con tu documento de identidad.
                  </p>
                  <input type="file" accept="image/*" multiple id="business-input" style={{ display: 'none' }}
                    onChange={e => setBusinessFiles(Array.from(e.target.files))} />
                  <label htmlFor="business-input" className="btn btn-secondary verif-upload-btn">
                    🏪 Seleccionar fotos del negocio ({businessFiles.length} seleccionadas)
                  </label>
                  {businessFiles.length > 0 && (
                    <div className="verif-preview-grid">
                      {businessFiles.map((f, i) => (
                        <div key={i} className="verif-preview-item">
                          <img src={URL.createObjectURL(f)} alt={`biz ${i}`} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="verif-actions">
                {verifSaved && <span className="premium-saved">✓ Documentos enviados — en revisión</span>}
                <button className="btn btn-primary" onClick={handleSubmitVerification} disabled={uploadingDocs || identityFiles.length === 0}>
                  {uploadingDocs ? <><span className="loading"></span> Enviando...</> : '📤 Enviar para verificación'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ===== CATÁLOGO PREMIUM ===== */}
        {isShopOrWholesale && (
          <div className="premium-catalog-section">
            <div className="premium-catalog-header">
              <div>
                <h2 className="serif">⭐ Catálogo Premium</h2>
                <p>Personaliza tu página de catálogo con tu marca x solo 5$ anual</p>
              </div>
              {isPremium
                ? <span className="premium-active-badge">✓ Activo hasta {new Date(profile.premium_until).toLocaleDateString()}</span>
                : <span className="premium-inactive-badge">🔒 No activo</span>}
            </div>

            {!isPremium ? (
              <div className="premium-locked">
                <div className="premium-locked-icon">🔒</div>
                <h3>Catálogo Premium no activado</h3>
                <p>Contacta al administrador para activar tu catálogo premium y personalizar tu página de vendedor con tu marca, banner, logo, descripción y más.</p>
                <a href="https://api.whatsapp.com/send?phone=+59175109694&text=Hola,%20Soy%20Usuario%20de%20Pirata%20Marketplace%20y%20quiero%20tener%20mi%20catalogo%20premium..%20"
                  target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                  📱 Solicitar activación
                </a>
              </div>
            ) : (
              <div className="premium-form">
                <div className="premium-form-preview">
                  <p className="premium-form-hint">💡 Estos datos aparecerán en tu página de catálogo en <strong>/vendedor/{user.id}</strong></p>
                </div>
                <div className="premium-form-grid">
                  <div className="premium-field">
                    <label>Nombre de tu tienda</label>
                    <input type="text" className="input" placeholder="Ej: Tienda Maldonado"
                      value={shopForm.shop_name} onChange={e => setShopForm(p => ({ ...p, shop_name: e.target.value }))} />
                  </div>
                  <div className="premium-field">
                    <label>Color de marca</label>
                    <div className="color-picker-row">
                      <input type="color" className="color-input" value={shopForm.shop_color}
                        onChange={e => setShopForm(p => ({ ...p, shop_color: e.target.value }))} />
                      <span className="color-value">{shopForm.shop_color}</span>
                      <div className="color-preview" style={{ background: shopForm.shop_color }}></div>
                    </div>
                  </div>
                  <div className="premium-field full-width">
                    <label>Descripción / Bio</label>
                    <textarea className="input textarea" rows={3} placeholder="Cuéntale a tus clientes sobre tu tienda..."
                      value={shopForm.shop_bio} onChange={e => setShopForm(p => ({ ...p, shop_bio: e.target.value }))} />
                  </div>
                  <div className="premium-field">
                    <label>Link externo</label>
                    <input type="url" className="input" placeholder="https://..."
                      value={shopForm.shop_link} onChange={e => setShopForm(p => ({ ...p, shop_link: e.target.value }))} />
                  </div>
                  <div className="premium-field">
                    <label>Horarios de atención</label>
                    <input type="text" className="input" placeholder="Ej: Lun-Vie 9am-6pm"
                      value={shopForm.shop_hours} onChange={e => setShopForm(p => ({ ...p, shop_hours: e.target.value }))} />
                  </div>
                  <div className="premium-field">
                    <label>URL del logo</label>
                    <input type="url" className="input" placeholder="https://..."
                      value={shopForm.shop_logo_url} onChange={e => setShopForm(p => ({ ...p, shop_logo_url: e.target.value }))} />
                  </div>
                  <div className="premium-field">
                    <label>URL del banner</label>
                    <input type="url" className="input" placeholder="https://... (imagen horizontal)"
                      value={shopForm.shop_banner_url} onChange={e => setShopForm(p => ({ ...p, shop_banner_url: e.target.value }))} />
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
