import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { formatPrice, timeAgo, compressImage } from '../lib/utils'
import './Dashboard.css'

const COUNTRIES = [
  'Argentina', 'Bolivia', 'Brasil', 'Canadá', 'Chile', 'Colombia', 'Costa Rica',
  'Cuba', 'República Dominicana', 'Ecuador', 'El Salvador', 'Guatemala',
  'Honduras', 'Jamaica', 'México', 'Nicaragua', 'Panamá', 'Paraguay', 'Perú',
  'Puerto Rico', 'Trinidad y Tobago', 'Estados Unidos', 'Uruguay', 'Venezuela'
]

const SECTIONS = [
  { key: 'anuncios',     icon: '📋', label: 'Mis anuncios' },
  { key: 'verificacion', icon: '🏅', label: 'Verificación' },
  { key: 'catalogo',     icon: '⭐', label: 'Catálogo Premium' },
]

const ACCOUNT_TYPES = [
  { value: 'person',    label: 'Persona',   icon: '👤' },
  { value: 'shop',      label: 'Tienda',    icon: '🏪' },
  { value: 'wholesale', label: 'Mayorista', icon: '📦' },
]

export default function Dashboard({ user, onProfileUpdate }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('anuncios')
  const [listings, setListings] = useState([])
  const [stats, setStats] = useState({ total_views: 0, total_contacts: 0, active_listings: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('active')
  const [profile, setProfile] = useState(null)
  const [changingType, setChangingType] = useState(false)

  // Shop form
  const [shopForm, setShopForm] = useState({
    shop_name: '', shop_bio: '', shop_link: '', shop_hours: '',
    shop_color: '#D4AF37', shop_logo_url: '', shop_banner_url: '',
  })
  const [savingShop, setSavingShop] = useState(false)
  const [shopSaved, setShopSaved] = useState(false)

  // Verificación
  const [verificationRequest, setVerificationRequest] = useState(null)
  const [uploadingDocs, setUploadingDocs] = useState(false)
  const [identityFiles, setIdentityFiles] = useState([])
  const [businessFiles, setBusinessFiles] = useState([])
  const [selfieFiles, setSelfieFiles] = useState([])
  const [verifSaved, setVerifSaved] = useState(false)
  const [fileError, setFileError] = useState('')
  const [comprError, setComprError] = useState('')

  // Avatar (solo lectura — se gestiona en MiPerfil o por admin vía verificación)

  // Datos Reales (Identidad personal)
  const [realData, setRealData] = useState({
    full_name: '',
    country: '',
    city: '',
    phone: ''
  })
  const [city, setCity] = useState('')

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
        .select(`
          display_name, user_type, avatar_url, is_verified, is_premium, premium_until, 
          shop_name, shop_bio, shop_link, shop_hours, shop_color, shop_logo_url, shop_banner_url,
          full_name, country, city, phone, identity_verified, business_verified, identity_locked, allow_identity_edit
        `)
        .eq('id', user.id)
        .single()
      if (data) {
        setProfile(data)
        setRealData({
          full_name: data.full_name || '',
          country: data.country || '',
          city: data.city || '',
          phone: data.phone || ''
        })
        setCity(data.city || '')
        setShopForm({
          shop_name: data.shop_name || '',
          shop_bio: data.shop_bio || '',
          shop_link: data.shop_link || '',
          shop_hours: data.shop_hours || '',
          shop_color: data.shop_color || '#D4AF37',
          shop_logo_url: data.shop_logo_url || '',
          shop_banner_url: data.shop_banner_url || '',
        })
      }
    } catch (error) { console.error(error) }
  }

  const loadDashboard = async () => {
    setLoading(true)
    try {
      let query = supabase.from('listings')
        .select(`*, category:categories(name, slug, icon)`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (filter !== 'all') query = query.eq('status', filter)
      const { data: listingsData, error: listingsError } = await query
      if (listingsError) throw listingsError
      setListings(listingsData)
      setStats({
        total_views: listingsData.reduce((sum, l) => sum + (l.views_count || 0), 0),
        total_contacts: listingsData.reduce((sum, l) => sum + (l.contacts_count || 0), 0),
        active_listings: listingsData.filter(l => l.status === 'active').length
      })
    } catch (error) { console.error(error) }
    finally { setLoading(false) }
  }

  const loadVerification = async () => {
    const { data } = await supabase
      .from('verification_requests')
      .select('*')
      .eq('user_id', user.id)
      .eq('source', 'pirata')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (data) setVerificationRequest(data)
  }

  // Avatar: solo lectura aquí. El usuario lo edita en MiPerfil.
  // El admin lo actualiza al aprobar la verificación de identidad.

  // ── CAMBIO DE TIPO DE CUENTA ──
  // Nota: is_verified lo aprueba solo el admin (tras revisar la identidad).
  // Este flujo NUNCA toca is_verified, solo la verificación de negocio.
  //
  // Si el usuario pasa a Tienda/Mayorista: business_verified se resetea y
  // business_docs se limpia para que suba nuevos documentos de negocio.
  const handleChangeType = async (newType) => {
    if (newType === profile?.user_type) return
    const label = ACCOUNT_TYPES.find(o => o.value === newType)?.label || newType
    const requiresBusinessVerification = newType === 'shop' || newType === 'wholesale'
    const confirmMsg = requiresBusinessVerification
      ? `¿Cambiar tu tipo de cuenta a ${label}? Deberás completar una nueva verificación de negocio. Tu verificación de identidad se mantiene.`
      : `¿Cambiar tu tipo de cuenta a ${label}? Tu verificación de negocio se reseteará, pero tu identidad se mantendrá.`
    if (!confirm(confirmMsg)) return

    setChangingType(true)
    try {
      await supabase.from('users').update({
        user_type: newType,
        business_verified: false,
      }).eq('id', user.id)

      if (verificationRequest) {
        await supabase.from('verification_requests').update({
          business_docs: [],
          status: requiresBusinessVerification ? 'pending' : verificationRequest.status
        }).eq('id', verificationRequest.id)
      } else if (requiresBusinessVerification) {
        // No existía solicitud previa (ej. usuario nunca subió documentos todavía);
        // creamos una para que la verificación de negocio quede activa y visible para el admin.
        await supabase.from('verification_requests').insert([{
          user_id: user.id,
          status: 'pending',
          source: 'pirata',
          identity_docs: [],
          business_docs: [],
        }])
      }

      setBusinessFiles([])
      await loadProfile()
      await loadVerification()

      // Llevar al usuario directo a la sección de Verificación para que
      // complete la verificación de negocio recién activada.
      if (requiresBusinessVerification) setActiveSection('verificacion')
    } catch (error) { alert('Error al cambiar tipo: ' + error.message) }
    finally { setChangingType(false) }
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
        shop_name: shopForm.shop_name || null,
        shop_bio: shopForm.shop_bio || null,
        shop_link: shopForm.shop_link || null,
        shop_hours: shopForm.shop_hours || null,
        shop_color: shopForm.shop_color || '#D4AF37',
        shop_logo_url: shopForm.shop_logo_url || null,
        shop_banner_url: shopForm.shop_banner_url || null,
      }).eq('id', user.id)
      setShopSaved(true)
      setTimeout(() => setShopSaved(false), 3000)
      loadProfile()
    } catch (error) { alert('Error al guardar: ' + error.message) }
    finally { setSavingShop(false) }
  }

  // Validar tipo de archivo
  const validateImageType = (files) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    const invalid = files.filter(f => !validTypes.includes(f.type))
    if (invalid.length > 0) {
      setFileError('Solo se permiten imágenes JPG, PNG o WebP')
      return false
    }
    setFileError('')
    return true
  }

  const handleIdentityFiles = async (e) => {
    const files = Array.from(e.target.files)
    if (!validateImageType(files)) return
    try {
      setComprError('')
      const compressed = await Promise.all(files.map(f => compressImage(f)))
      setIdentityFiles(compressed)
    } catch (err) {
      setComprError('Error al comprimir imágenes: ' + err.message)
    }
  }

  const handleBusinessFiles = async (e) => {
    const files = Array.from(e.target.files)
    if (!validateImageType(files)) return
    try {
      setComprError('')
      const compressed = await Promise.all(files.map(f => compressImage(f)))
      setBusinessFiles(compressed)
    } catch (err) {
      setComprError('Error al comprimir imágenes: ' + err.message)
    }
  }

  const handleSelfieFiles = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!validateImageType([file])) return
    try {
      setComprError('')
      const compressed = await compressImage(file)
      setSelfieFiles([compressed])
    } catch (err) {
      setComprError('Error al comprimir imagen: ' + err.message)
    }
  }

  // Eliminar fotos seleccionadas antes de enviar
  const removeIdentityFile = (index) => setIdentityFiles(prev => prev.filter((_, i) => i !== index))
  const removeBusinessFile = (index) => setBusinessFiles(prev => prev.filter((_, i) => i !== index))
  const removeSelfieFile = () => setSelfieFiles([])

  const uploadDocFiles = async (files, folder) => {
    const urls = []
    for (const file of files) {
      const fileExt = file.type === 'image/png' ? 'png' : 'jpg'
      const path = `${user.id}/${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExt}`
      const compressed = await compressImage(file)
      const { error } = await supabase.storage
        .from('verification-docs').upload(path, compressed, { contentType: 'image/jpeg' })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage
        .from('verification-docs').getPublicUrl(path)
      urls.push(publicUrl)
    }
    return urls
  }

  const handleSubmitVerification = async () => {
    // Validar identidad personal si no está verificada
    if (!profile?.identity_verified) {
      if (!realData.full_name || !realData.country || !realData.city || !realData.phone) {
        alert('Completa todos tus datos personales para la verificación.'); return
      }
      if (identityFiles.length < 1) {
        alert('Sube al menos una foto de tu documento de identidad.'); return
      }
    }

    setUploadingDocs(true)
    try {
      let identityUrls = verificationRequest?.identity_docs || []
      if (identityFiles.length > 0) {
        identityUrls = await uploadDocFiles(identityFiles, 'identity')
      }

      let businessUrls = verificationRequest?.business_docs || []
      if (businessFiles.length > 0) {
        businessUrls = await uploadDocFiles(businessFiles, 'business')
      }

      // Subir selfie/foto personal
      let selfieUrl = verificationRequest?.selfie_url || null
      if (selfieFiles.length > 0) {
        const urls = await uploadDocFiles(selfieFiles, 'selfie')
        selfieUrl = urls[0] || null
      }

      const payload = {
        user_id: user.id,
        status: 'pending',
        source: 'pirata',
        identity_docs: identityUrls,
        business_docs: businessUrls,
        selfie_url: selfieUrl,
      }

      // Actualizar datos personales en tabla users
      await supabase.from('users').update({
        full_name: realData.full_name,
        country: realData.country,
        city: realData.city,
        phone: realData.phone,
      }).eq('id', user.id)

      if (verificationRequest) {
        await supabase.from('verification_requests').update(payload).eq('id', verificationRequest.id)
      } else {
        await supabase.from('verification_requests').insert([payload])
      }

      setVerifSaved(true)
      setIdentityFiles([])
      setBusinessFiles([])
      setSelfieFiles([])
      setTimeout(() => setVerifSaved(false), 4000)
      loadVerification()
      loadProfile()
    } catch (error) { alert('Error al enviar: ' + error.message) }
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
  const identityVerified = profile?.identity_verified
  const businessVerified = profile?.business_verified
  const identityLocked = profile?.identity_locked && !profile?.allow_identity_edit

  // Secciones visibles en sidebar
  const visibleSections = SECTIONS.filter(s =>
    s.key !== 'catalogo' || isShopOrWholesale
  )

  return (
    <div className="dashboard">
      <div className="dashboard-container">

        {/* ── STATS ── */}
        <div className="dashboard-stats">
          {[
            { icon: '👁️', value: stats.total_views.toLocaleString(),   label: t('dashboard.stats.total_views') },
            { icon: '📱', value: stats.total_contacts.toLocaleString(), label: t('dashboard.stats.total_contacts') },
            { icon: '🏴‍☠️', value: stats.active_listings,               label: t('dashboard.stats.active_listings') },
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

        <div className="db-layout">
          <aside className="db-sidebar">
            <div className="db-sidebar-profile">
              <div className="db-avatar">
                {avatarUrl
                  ? <img src={avatarUrl} alt={displayName} />
                  : <div className="db-avatar-placeholder">{displayName?.charAt(0).toUpperCase()}</div>
                }
              </div>
              <div className="db-sidebar-name">{displayName}</div>
              <span className={`user-type-badge user-type-${userType}`}>
                {userTypeIcon} {t(`auth.${userType}`)}
              </span>
              {isPremium && (
                <div className="db-premium-badge">⭐ Premium — hasta {new Date(profile.premium_until).toLocaleDateString()}</div>
              )}
              <Link to="/publicar" className="btn btn-primary db-publish-btn">+ {t('navbar.publish')}</Link>
            </div>

            <nav className="db-nav">
              {visibleSections.map(s => (
                <button key={s.key}
                  className={`db-nav-item ${activeSection === s.key ? 'active' : ''}`}
                  onClick={() => setActiveSection(s.key)}
                >
                  <span>{s.icon}</span>
                  <span>{s.label}</span>
                  {s.key === 'verificacion' && (!identityVerified || (isShopOrWholesale && !businessVerified)) && (
                    <span className="db-nav-dot" />
                  )}
                </button>
              ))}
            </nav>
          </aside>

          <main className="db-main">
            {activeSection === 'anuncios' && (
              <div className="db-section">
                <div className="db-section-header">
                  <h2>📋 Mis anuncios</h2>
                  <div className="db-filters">
                    {['all', 'active', 'sold', 'paused'].map(f => (
                      <button key={f}
                        className={`filter-btn ${filter === f ? 'active' : ''}`}
                        onClick={() => setFilter(f)}>
                        {f === 'all' ? t('dashboard.filters.all') : t(`dashboard.listing_status.${f}`)}
                      </button>
                    ))}
                  </div>
                </div>
                {loading ? (
                  <div className="listings-loading">
                    {[...Array(3)].map((_, i) => <div key={i} className="listing-row skeleton" style={{ height: '100px' }} />)}
                  </div>
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
                            <span className="listing-row-category">{listing.category?.icon} {listing.category?.name}</span>
                          </div>
                        </div>
                        <div className="listing-row-actions">
                          {listing.status === 'active' && (
                            <button onClick={() => handleStatusChange(listing.id, 'paused')} className="btn-text-action" title="Pausar">
                              Pausar
                            </button>
                          )}
                          {listing.status === 'paused' && (
                            <button onClick={() => handleStatusChange(listing.id, 'active')} className="btn-text-action" title="Activar">
                              Activar
                            </button>
                          )}
                          <button onClick={() => handleStatusChange(listing.id, 'sold')} className="btn-text-action" title="Vendido">
                            Vendido
                          </button>
                          <button onClick={() => handleDelete(listing.id)} className="btn-text-action delete" title="Eliminar">
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeSection === 'verificacion' && (
              <div className="db-section">
                <div className="db-section-header">
                  <h2>🏅 Verificación de Cuenta</h2>
                  {isVerified && <span className="verif-badge approved">✓ Cuenta Verificada</span>}
                </div>

                {/* INFO: Tipos de verificación */}
                {!isVerified && (
                  <div className="verif-info-box">
                    <p><strong>¿Qué tipo de verificación necesitas?</strong></p>
                    <div className="verif-types-info">
                      <div className="verif-type-card">
                        <span className="verif-type-icon">👤</span>
                        <div>
                          <strong>Persona</strong>
                          <p>Solo tu identidad personal. Para publicar como vendedor individual.</p>
                        </div>
                      </div>
                      <div className="verif-type-card">
                        <span className="verif-type-icon">🏪</span>
                        <div>
                          <strong>Tienda</strong>
                          <p>Identidad + verificación de tu local/negocio físico. Para publicar como tienda.</p>
                        </div>
                      </div>
                      <div className="verif-type-card">
                        <span className="verif-type-icon">📦</span>
                        <div>
                          <strong>Mayorista</strong>
                          <p>Identidad + documentos legales de tu negocio. Para venta al por mayor.</p>
                        </div>
                      </div>
                    </div>
                    <p className="verif-hint">Selecciona tu tipo de cuenta abajo y completa los documentos.</p>
                  </div>
                )}

                <div className="verif-layers">
                  {/* IDENTIDAD PERSONAL */}
                  <div className={`verif-layer ${identityVerified ? 'verified' : ''}`}>
                    <div className="layer-header">
                      <h3>👤 Identidad Personal</h3>
                      <span className={`layer-status ${identityVerified ? 'approved' : verificationRequest?.status === 'pending' ? 'pending' : ''}`}>
                        {identityVerified ? '✓ Verificada' : verificationRequest?.status === 'pending' ? '⏳ En revisión' : '✗ Pendiente'}
                      </span>
                    </div>

                    <div className="layer-content">
                      <div className="real-data-grid">
                        <div className="form-group">
                          <label>Nombre Completo Real</label>
                          <input type="text" className="input" value={realData.full_name} disabled={identityLocked}
                            onChange={e => setRealData(p => ({ ...p, full_name: e.target.value }))} placeholder="Como figura en tu documento" />
                        </div>
                        <div className="form-group">
                          <label>País</label>
                          <select className="input" value={realData.country} disabled={identityLocked}
                            onChange={e => setRealData(p => ({ ...p, country: e.target.value }))}>
                            <option value="">Selecciona tu país</option>
                            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Ciudad</label>
                          <input type="text" className="input" value={realData.city} disabled={identityLocked}
                            onChange={e => setRealData(p => ({ ...p, city: e.target.value }))} placeholder="Ej: Santa Cruz" />
                        </div>
                        <div className="form-group">
                          <label>Teléfono de contacto</label>
                          <input type="tel" className="input" value={realData.phone} disabled={identityLocked}
                            onChange={e => setRealData(p => ({ ...p, phone: e.target.value }))} placeholder="+591 ..." />
                        </div>
                      </div>

                      {!identityVerified && (
                        <>
                          {/* Foto personal (selfie) */}
                          <div className="verif-docs-upload">
                            <label>📸 Tu Foto Personal</label>
                            <p className="verif-hint">Sube una foto clara de tu rostro. Se usará para verificar que eres la misma persona del documento.</p>
                            <input type="file" accept="image/*" id="selfie-input" style={{ display: 'none' }} onChange={handleSelfieFiles} />
                            <label htmlFor="selfie-input" className="btn btn-secondary verif-upload-btn">
                              {selfieFiles.length > 0 ? 'Cambiar foto' : 'Seleccionar foto'}
                            </label>
                            {selfieFiles.length > 0 && (
                              <div className="verif-preview-single">
                                <div className="verif-preview-item verif-preview-single-item">
                                  <img src={URL.createObjectURL(selfieFiles[0])} alt="Tu foto" />
                                  <button className="verif-preview-remove" onClick={removeSelfieFile} title="Eliminar">✕</button>
                                </div>
                              </div>
                            )}
                            {verificationRequest?.selfie_url && selfieFiles.length === 0 && (
                              <p className="verif-hint" style={{color: 'var(--gold)'}}>✓ Foto personal ya enviada anteriormente</p>
                            )}
                          </div>

                          {/* Documentos de identidad */}
                          <div className="verif-docs-upload">
                            <label>📄 Documentos de Identidad (CI/Pasaporte)</label>
                            <p className="verif-hint">Sube fotos de tu documento: Anverso y Reverso. Las imágenes se comprimen automáticamente.</p>
                            <input type="file" accept="image/*" multiple id="id-input" style={{ display: 'none' }} onChange={handleIdentityFiles} />
                            <label htmlFor="id-input" className="btn btn-secondary verif-upload-btn">
                              {identityFiles.length > 0 ? 'Cambiar documentos' : 'Seleccionar documentos'} ({identityFiles.length})
                            </label>
                            {identityFiles.length > 0 && (
                              <div className="verif-preview-grid">
                                {identityFiles.map((f, i) => (
                                  <div key={i} className="verif-preview-item">
                                    <img src={URL.createObjectURL(f)} alt="preview" />
                                    <button className="verif-preview-remove" onClick={() => removeIdentityFile(i)} title="Eliminar">✕</button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* VERIFICACIÓN DE NEGOCIO */}
                  {isShopOrWholesale && (
                    <div className={`verif-layer ${businessVerified ? 'verified' : ''}`}>
                      <div className="layer-header">
                        <h3>🏪 Verificación de Negocio</h3>
                        <span className={`layer-status ${businessVerified ? 'approved' : ''}`}>
                          {businessVerified ? '✓ Verificada' : '✗ Pendiente'}
                        </span>
                      </div>
                      <div className="layer-content">
                        <p className="verif-hint">Sube fotos de tu local, almacén o documentos legales de tu negocio. Las imágenes se comprimen automáticamente.</p>
                        <input type="file" accept="image/*" multiple id="biz-input" style={{ display: 'none' }} onChange={handleBusinessFiles} />
                        <label htmlFor="biz-input" className="btn btn-secondary verif-upload-btn">
                          {businessFiles.length > 0 ? 'Cambiar documentos' : 'Subir documentos'} ({businessFiles.length})
                        </label>
                        {businessFiles.length > 0 && (
                          <div className="verif-preview-grid">
                            {businessFiles.map((f, i) => (
                              <div key={i} className="verif-preview-item">
                                <img src={URL.createObjectURL(f)} alt="preview" />
                                <button className="verif-preview-remove" onClick={() => removeBusinessFile(i)} title="Eliminar">✕</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* TIPO DE CUENTA */}
                <div className="verif-layer account-type-layer">
                  <div className="layer-header">
                    <h3>🔁 Tipo de Cuenta</h3>
                  </div>
                  <div className="layer-content">
                    <p className="verif-hint">
                      Cambiar tu tipo de cuenta reinicia la verificación de negocio. Tu identidad personal no se ve afectada.
                    </p>
                    <div className="type-change-options">
                      {ACCOUNT_TYPES.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => handleChangeType(opt.value)}
                          disabled={changingType || userType === opt.value}
                          className={userType === opt.value ? 'active' : ''}
                        >
                          {opt.icon} {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="verif-footer">
                  {verificationRequest?.admin_note && (
                    <div className="admin-note">
                      <strong>Nota del administrador:</strong> {verificationRequest.admin_note}
                    </div>
                  )}
                  {fileError && <p className="verif-error">{fileError}</p>}
                  {comprError && <p className="verif-error">{comprError}</p>}
                  <button className="btn btn-primary btn-full" onClick={handleSubmitVerification} disabled={identityLocked || uploadingDocs || (!identityFiles.length && !businessFiles.length && !selfieFiles.length)}>
                    {uploadingDocs ? 'Enviando...' : identityLocked ? 'Tu identidad está bloqueada por el administrador' : 'Enviar Solicitud de Verificación'}
                  </button>
                  {verifSaved && <p className="success-msg">✓ Solicitud enviada con éxito. El equipo revisará tus documentos pronto.</p>}
                </div>
              </div>
            )}

            {activeSection === 'catalogo' && isShopOrWholesale && (
              <div className="db-section">
                <div className="db-section-header">
                  <h2>⭐ Catálogo Premium</h2>
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
                        <label>Bio / Descripción</label>
                        <textarea className="input" rows={3} value={shopForm.shop_bio} onChange={e => setShopForm(p => ({ ...p, shop_bio: e.target.value }))} />
                      </div>
                    </div>
                    <button className="btn btn-primary" onClick={handleShopSave} disabled={savingShop}>Guardar Cambios</button>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
