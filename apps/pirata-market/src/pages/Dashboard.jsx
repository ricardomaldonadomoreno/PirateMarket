import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { formatPrice, timeAgo } from '../lib/utils'
import './Dashboard.css'

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB

const SECTIONS = [
  { key: 'anuncios',     icon: '📋', label: 'Mis anuncios' },
  { key: 'verificacion', icon: '🏅', label: 'Verificación' },
  { key: 'catalogo',     icon: '⭐', label: 'Catálogo Premium' },
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
  const [fileError, setFileError] = useState('')

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
          shop_name: data.shop_name || '',
          shop_bio: data.shop_bio || '',
          shop_link: data.shop_link || '',
          shop_hours: data.shop_hours || '',
          shop_color: data.shop_color || '#B8985F',
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
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (data) setVerificationRequest(data)
  }

  const handleChangeType = async (newType) => {
    if (newType === profile?.user_type) return
    const label = newType === 'shop' ? 'Tienda' : newType === 'wholesale' ? 'Mayorista' : 'Persona'
    if (!confirm(`¿Cambiar tu tipo de cuenta a ${label}? Tu verificación se reseteará y deberás verificarte de nuevo.`)) return
    setChangingType(true)
    try {
      await supabase.from('users').update({
        user_type: newType,
        is_verified: false,
      }).eq('id', user.id)
      if (verificationRequest) {
        await supabase.from('verification_requests').update({
          status: 'pending',
          identity_docs: [],
          business_docs: [],
          admin_note: null,
        }).eq('id', verificationRequest.id)
      }
      setIdentityFiles([])
      setBusinessFiles([])
      setVerificationRequest(null)
      await loadProfile()
      await loadVerification()
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
        shop_color: shopForm.shop_color || '#B8985F',
        shop_logo_url: shopForm.shop_logo_url || null,
        shop_banner_url: shopForm.shop_banner_url || null,
      }).eq('id', user.id)
      setShopSaved(true)
      setTimeout(() => setShopSaved(false), 3000)
      loadProfile()
    } catch (error) { alert('Error al guardar: ' + error.message) }
    finally { setSavingShop(false) }
  }

  const validateFiles = (files) => {
    const oversized = files.filter(f => f.size > MAX_FILE_SIZE)
    if (oversized.length > 0) {
      setFileError(`${oversized.length} archivo(s) superan el límite de 2MB`)
      return false
    }
    setFileError('')
    return true
  }

  const handleIdentityFiles = (e) => {
    const files = Array.from(e.target.files)
    if (validateFiles(files)) setIdentityFiles(files)
  }

  const handleBusinessFiles = (e) => {
    const files = Array.from(e.target.files)
    if (validateFiles(files)) setBusinessFiles(files)
  }

  const uploadDocFiles = async (files, folder) => {
    const urls = []
    for (const file of files) {
      const fileExt = file.name.split('.').pop()
      const path = `${user.id}/${folder}/${Date.now()}.${fileExt}`
      const { error } = await supabase.storage
        .from('verification-docs').upload(path, file, { contentType: file.type })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage
        .from('verification-docs').getPublicUrl(path)
      urls.push(publicUrl)
    }
    return urls
  }

  const handleSubmitVerification = async () => {
    if (identityFiles.length === 0) { alert('Sube al menos una foto de identidad'); return }
    if (!validateFiles([...identityFiles, ...businessFiles])) return
    setUploadingDocs(true)
    try {
      const identityUrls = await uploadDocFiles(identityFiles, 'identity')
      const businessUrls = businessFiles.length > 0
        ? await uploadDocFiles(businessFiles, 'business') : []
      const payload = {
        user_id: user.id,
        status: 'pending',
        source: 'pirata',
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
  const identityAlreadySubmitted = verificationRequest?.identity_docs?.length > 0

  const verifStatusLabel = {
    pending:  { text: '⏳ Revisión pendiente', cls: 'verif-pending' },
    approved: { text: '✓ Verificado',          cls: 'verif-approved' },
    rejected: { text: '✗ Rechazado',           cls: 'verif-rejected' },
  }

  // Secciones visibles en sidebar
  const visibleSections = SECTIONS.filter(s =>
    s.key !== 'catalogo' || isShopOrWholesale
  )

  return (
    <div className="dashboard">
      <div className="dashboard-container">

        {/* ── STATS — siempre visibles ── */}
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

        {/* ── LAYOUT CON SIDEBAR ── */}
        <div className="db-layout">

          {/* ── SIDEBAR ── */}
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
                <div className="db-premium-badge">
                  ⭐ Premium — hasta {new Date(profile.premium_until).toLocaleDateString()}
                </div>
              )}
              <Link to="/publicar" className="btn btn-primary db-publish-btn">
                + {t('navbar.publish')}
              </Link>
            </div>

            <nav className="db-nav">
              {visibleSections.map(s => (
                <button key={s.key}
                  className={`db-nav-item ${activeSection === s.key ? 'active' : ''}`}
                  onClick={() => setActiveSection(s.key)}
                >
                  <span>{s.icon}</span>
                  <span>{s.label}</span>
                  {s.key === 'verificacion' && !isVerified && (
                    <span className="db-nav-dot" />
                  )}
                </button>
              ))}
            </nav>
          </aside>

          {/* ── CONTENIDO ── */}
          <main className="db-main">

            {/* ══ MIS ANUNCIOS ══ */}
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
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="listing-row skeleton" style={{ height: '100px' }} />
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
                    {listings.map(listing => (
                      <div key={listing.id} className="listing-row card">
                        <div className="listing-row-image">
                          {listing.photos?.length > 0
                            ? <img src={listing.photos[0]} alt={listing.title} />
                            : <div className="listing-row-no-image">{listing.category?.icon || '📦'}</div>}
                        </div>
                        <div className="listing-row-info">
                          <Link to={`/ficha/${listing.slug}`} className="listing-row-title">
                            {listing.title}
                          </Link>
                          <div className="listing-row-meta">
                            <span className="listing-row-price luxury-gold">
                              {formatPrice(listing.price, listing.currency)}
                            </span>
                            <span className="listing-row-category">
                              {listing.category?.icon} {t(`categories.${listing.category?.slug}`)}
                            </span>
                            <span className="listing-row-date">{timeAgo(listing.created_at, t)}</span>
                          </div>
                          <div className="listing-row-stats">
                            <span>👁️ {listing.views_count}</span>
                            <span>📱 {listing.contacts_count}</span>
                            <span>🔗 {listing.shares_count}</span>
                          </div>
                        </div>
                        <div className="listing-row-status">
                          <span className={`status-badge status-${listing.status}`}>
                            {t(`dashboard.listing_status.${listing.status}`)}
                          </span>
                        </div>
                        <div className="listing-row-actions">
                          <Link to={`/ficha/${listing.slug}`} className="db-action-btn">
                            Ver
                          </Link>
                          {listing.status === 'active' && (
                            <button className="db-action-btn"
                              onClick={() => handleStatusChange(listing.id, 'paused')}>
                              Pausar
                            </button>
                          )}
                          {listing.status === 'paused' && (
                            <button className="db-action-btn db-action-success"
                              onClick={() => handleStatusChange(listing.id, 'active')}>
                              Activar
                            </button>
                          )}
                          {listing.status === 'active' && (
                            <button className="db-action-btn db-action-success"
                              onClick={() => handleStatusChange(listing.id, 'sold')}>
                              Vendido
                            </button>
                          )}
                          <button className="db-action-btn db-action-danger"
                            onClick={() => handleDelete(listing.id)}>
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ══ VERIFICACIÓN ══ */}
            {activeSection === 'verificacion' && (
              <div className="db-section">
                <div className="db-section-header">
                  <h2>🏅 Verificación de cuenta</h2>
                  <div>
                    {isVerified ? (
                      <span className="verif-badge verif-approved">✓ Verificado</span>
                    ) : verificationRequest ? (
                      <span className={`verif-badge ${verifStatusLabel[verificationRequest.status]?.cls}`}>
                        {verifStatusLabel[verificationRequest.status]?.text}
                      </span>
                    ) : (
                      <span className="verif-badge verif-none">Sin verificar</span>
                    )}
                  </div>
                </div>

                {/* Tipo de cuenta */}
                <div className="account-type-section">
                  <div className="account-type-header">
                    <h3>¿Qué tipo de vendedor eres?</h3>
                    <p>Cambiar de tipo reseteará tu verificación.</p>
                  </div>
                  <div className="account-type-grid">
                    {[
                      { key: 'person',    icon: '👤', label: 'Persona',   desc: 'Vendo ocasionalmente' },
                      { key: 'shop',      icon: '🏪', label: 'Tienda',    desc: 'Tengo un negocio' },
                      { key: 'wholesale', icon: '📦', label: 'Mayorista', desc: 'Distribuidor o importador' },
                    ].map(type => (
                      <button key={type.key}
                        className={`account-type-btn ${userType === type.key ? 'active' : ''}`}
                        onClick={() => handleChangeType(type.key)}
                        disabled={changingType || userType === type.key}
                      >
                        <span className="account-type-icon">{type.icon}</span>
                        <strong>{type.label}</strong>
                        <small>{type.desc}</small>
                        {userType === type.key && <span className="account-type-current">✓ Actual</span>}
                      </button>
                    ))}
                  </div>
                  {!isVerified && verificationRequest?.status !== 'pending' && (
                    <div className="account-type-notice account-type-warning">
                      ⚠️ Para ser un vendedor verificado completa la verificación
                      {isShopOrWholesale ? ' de identidad y negocio' : ' de identidad'} abajo.
                    </div>
                  )}
                </div>

                {/* Formulario verificación */}
                {isVerified ? (
                  <div className="verif-verified-msg">
                    <span>🎉</span>
                    <p>Tu cuenta está verificada. El badge ✓ aparece en tu perfil y catálogo.</p>
                  </div>
                ) : verificationRequest?.status === 'pending' ? (
                  <div className="verif-pending-msg">
                    <span>⏳</span>
                    <p>Tus documentos están siendo revisados.</p>
                    {verificationRequest.admin_note && (
                      <p className="verif-admin-note">📝 {verificationRequest.admin_note}</p>
                    )}
                  </div>
                ) : (
                  <div className="verif-form">
                    {verificationRequest?.status === 'rejected' && (
                      <div className="verif-rejected-msg">
                        <p>✗ Tu solicitud fue rechazada.</p>
                        {verificationRequest.admin_note && (
                          <p className="verif-admin-note">📝 Motivo: {verificationRequest.admin_note}</p>
                        )}
                      </div>
                    )}

                    {fileError && <div className="verif-file-error">⚠️ {fileError}</div>}

                    <div className="verif-field">
                      <label>
                        📄 Documento de identidad
                        {identityAlreadySubmitted && <span className="verif-submitted-badge">✅ Ya enviado</span>}
                      </label>
                      <p className="verif-hint">CI/DNI anverso y reverso + selfie con el documento. Máx. 2MB por foto.</p>
                      {!identityAlreadySubmitted && (
                        <>
                          <input type="file" accept="image/*" multiple
                            id="identity-input" style={{ display: 'none' }}
                            onChange={handleIdentityFiles} />
                          <label htmlFor="identity-input" className="btn btn-secondary verif-upload-btn">
                            Seleccionar fotos ({identityFiles.length} seleccionadas)
                          </label>
                          {identityFiles.length > 0 && (
                            <div className="verif-preview-grid">
                              {identityFiles.map((f, i) => (
                                <div key={i} className="verif-preview-item">
                                  <img src={URL.createObjectURL(f)} alt={`doc ${i}`} />
                                  <span className="verif-file-size">
                                    {(f.size / 1024 / 1024).toFixed(1)}MB
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {isShopOrWholesale && (
                      <div className="verif-field">
                        <label>🏪 Documentos del negocio</label>
                        <p className="verif-hint">
                          Foto exterior · Certificaciones · Documento legal (NIT, matrícula, etc.). Máx. 2MB por foto.
                        </p>
                        <input type="file" accept="image/*" multiple
                          id="business-input" style={{ display: 'none' }}
                          onChange={handleBusinessFiles} />
                        <label htmlFor="business-input" className="btn btn-secondary verif-upload-btn">
                          Seleccionar fotos ({businessFiles.length} seleccionadas)
                        </label>
                        {businessFiles.length > 0 && (
                          <div className="verif-preview-grid">
                            {businessFiles.map((f, i) => (
                              <div key={i} className="verif-preview-item">
                                <img src={URL.createObjectURL(f)} alt={`biz ${i}`} />
                                <span className="verif-file-size">
                                  {(f.size / 1024 / 1024).toFixed(1)}MB
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="verif-actions">
                      {verifSaved && <span className="premium-saved">✓ Documentos enviados — en revisión</span>}
                      <button className="btn btn-primary"
                        onClick={handleSubmitVerification}
                        disabled={uploadingDocs || identityFiles.length === 0}>
                        {uploadingDocs
                          ? <><span className="loading" /> Enviando...</>
                          : 'Enviar para verificación'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══ CATÁLOGO PREMIUM ══ */}
            {activeSection === 'catalogo' && isShopOrWholesale && (
              <div className="db-section">
                <div className="db-section-header">
                  <h2>⭐ Catálogo Premium</h2>
                  {isPremium
                    ? <span className="premium-active-badge">✓ Activo hasta {new Date(profile.premium_until).toLocaleDateString()}</span>
                    : <span className="premium-inactive-badge">🔒 No activo</span>}
                </div>

                {!isPremium ? (
                  <div className="premium-locked">
                    <div className="premium-locked-icon">🔒</div>
                    <h3>Catálogo Premium no activado</h3>
                    <p>Contacta al administrador para activar tu catálogo premium — solo $5 anual.</p>
                    <a href="https://api.whatsapp.com/send?phone=+59175109694&text=Hola,%20quiero%20activar%20mi%20catalogo%20premium%20en%20Pirata%20Market"
                      target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                      Solicitar activación por WhatsApp
                    </a>
                  </div>
                ) : (
                  <div className="premium-form">
                    <p className="premium-form-hint">
                      💡 Estos datos aparecerán en tu página de catálogo en <strong>/vendedor/{user.id}</strong>
                    </p>
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
                          <input type="color" className="color-input" value={shopForm.shop_color}
                            onChange={e => setShopForm(p => ({ ...p, shop_color: e.target.value }))} />
                          <span className="color-value">{shopForm.shop_color}</span>
                          <div className="color-preview" style={{ background: shopForm.shop_color }} />
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
                        <label>Link externo</label>
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
                        <input type="url" className="input" placeholder="https://..."
                          value={shopForm.shop_banner_url}
                          onChange={e => setShopForm(p => ({ ...p, shop_banner_url: e.target.value }))} />
                      </div>
                    </div>
                    <div className="premium-form-actions">
                      {shopSaved && <span className="premium-saved">✓ Guardado correctamente</span>}
                      <button className="btn btn-primary" onClick={handleShopSave} disabled={savingShop}>
                        {savingShop ? <><span className="loading" /> Guardando...</> : 'Guardar cambios'}
                      </button>
                    </div>
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
