import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import { supabase } from '../../../pirata-market/src/lib/supabase'
import 'leaflet/dist/leaflet.css'
import './MiCuenta.css'

import L from 'leaflet'
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const SECTIONS = [
  { key: 'personal',      icon: '👤', label: 'Información personal' },
  { key: 'direccion',     icon: '📍', label: 'Mi dirección' },
  { key: 'verificacion',  icon: '🔒', label: 'Verificación' },
  { key: 'resenas',       icon: '⭐', label: 'Mis reseñas' },
  { key: 'nivel',         icon: '🏆', label: 'Mi nivel' },
]

const LEVEL_INFO = {
  basico:      { label: 'Básico',      color: '#888888', icon: '⚪', next: 'medio' },
  medio:       { label: 'Medio',       color: '#2980B9', icon: '🔵', next: 'pro' },
  pro:         { label: 'PRO',         color: '#8E44AD', icon: '🟣', next: 'elite' },
  elite:       { label: 'Elite',       color: '#784212', icon: '🟤', next: null },
}

const LEVEL_REQUIREMENTS = {
  basico: ['Identidad verificada', 'Dirección verificada', 'Comprobante de viaje'],
  medio:  ['Todo lo anterior', 'Garantía por artículo', 'Escrow habilitado'],
  pro:    ['Todo lo anterior', 'Oficina o domicilio habilitado', 'Rutas frecuentes verificadas'],
  elite:  ['Todo lo anterior', 'Dirección verificada en segundo país', 'Historial sólido de envíos'],
}

function MapPicker({ onSelect }) {
  useMapEvents({
    click(e) { onSelect({ lat: e.latlng.lat, lng: e.latlng.lng }) }
  })
  return null
}

export default function MiCuenta({ user, onProfileUpdate }) {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [activeSection, setActiveSection] = useState('personal')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState('')
  const [error, setError] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [reviews, setReviews] = useState([])

  // Perfil
  const [profile, setProfile] = useState(null)

  // Campos editables
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [frequentRoutes, setFrequentRoutes] = useState('')

  // Campos fijos (solo se guardan una vez)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [addressCity, setAddressCity] = useState('')
  const [addressText, setAddressText] = useState('')
  const [addressCoords, setAddressCoords] = useState(null)

  useEffect(() => {
    if (!user) return navigate('/auth')
    loadProfile()
    loadReviews()
  }, [user])

  const loadProfile = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('users')
      .select(`
        display_name, avatar_url,
        traficante_full_name, traficante_phone,
        traficante_address_city, traficante_address_text,
        traficante_address_lat, traficante_address_lng,
        traficante_address_locked, traficante_phone_locked,
        traficante_bio, traficante_frequent_routes
      `)
      .eq('id', user.id)
      .single()

    if (data) {
      setProfile(data)
      setDisplayName(data.display_name || '')
      setBio(data.traficante_bio || '')
      setFrequentRoutes(data.traficante_frequent_routes || '')
      setFullName(data.traficante_full_name || '')
      setPhone(data.traficante_phone || '')
      setAddressCity(data.traficante_address_city || '')
      setAddressText(data.traficante_address_text || '')
      if (data.traficante_address_lat && data.traficante_address_lng) {
        setAddressCoords({
          lat: data.traficante_address_lat,
          lng: data.traficante_address_lng
        })
      }
    }
    setLoading(false)
  }

  const loadReviews = async () => {
    const { data } = await supabase
      .from('traficante_reviews')
      .select('*, reviewer:reviewer_id(display_name, avatar_url)')
      .eq('reviewed_id', user.id)
      .order('created_at', { ascending: false })
    setReviews(data || [])
  }

  // ── AVATAR ──
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
        .from('avatars').upload(newFilePath, file, { upsert: true, contentType: file.type })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(newFilePath)
      const urlWithCache = `${publicUrl}?t=${Date.now()}`
      await supabase.from('users').update({ avatar_url: urlWithCache }).eq('id', user.id)
      setProfile(prev => ({ ...prev, avatar_url: urlWithCache }))
      if (onProfileUpdate) onProfileUpdate(prev => ({ ...prev, avatar_url: urlWithCache }))
    } catch (err) {
      setError('Error al subir la imagen')
    }
    setUploadingAvatar(false)
  }

  const handleDeleteAvatar = async () => {
    if (!profile?.avatar_url) return
    const oldPath = profile.avatar_url.split('/avatars/')[1]?.split('?')[0]
    if (oldPath) await supabase.storage.from('avatars').remove([oldPath])
    await supabase.from('users').update({ avatar_url: null }).eq('id', user.id)
    setProfile(prev => ({ ...prev, avatar_url: null }))
    if (onProfileUpdate) onProfileUpdate(prev => ({ ...prev, avatar_url: null }))
  }

  // ── GUARDAR PERSONAL ──
  const savePersonal = async () => {
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('users').update({
      display_name: displayName,
      traficante_bio: bio,
      traficante_frequent_routes: frequentRoutes,
    }).eq('id', user.id)
    setSaving(false)
    if (err) return setError(err.message)
    setSaved('personal')
    if (onProfileUpdate) onProfileUpdate(prev => ({ ...prev, display_name: displayName }))
    setTimeout(() => setSaved(''), 3000)
  }

  // ── GUARDAR NOMBRE Y TELÉFONO (solo si no están bloqueados) ──
  const saveFixed = async () => {
    if (profile?.traficante_phone_locked) return
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('users').update({
      traficante_full_name: fullName,
      traficante_phone: phone,
      traficante_phone_locked: true,
    }).eq('id', user.id)
    setSaving(false)
    if (err) return setError(err.message)
    setProfile(prev => ({ ...prev, traficante_phone_locked: true, traficante_full_name: fullName, traficante_phone: phone }))
    setSaved('fixed')
    setTimeout(() => setSaved(''), 3000)
  }

  // ── GUARDAR DIRECCIÓN (solo si no está bloqueada) ──
  const saveAddress = async () => {
    if (profile?.traficante_address_locked) return
    if (!addressCity || !addressText) return setError('Completa la ciudad y dirección')
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('users').update({
      traficante_address_city: addressCity,
      traficante_address_text: addressText,
      traficante_address_lat: addressCoords?.lat || null,
      traficante_address_lng: addressCoords?.lng || null,
      traficante_address_locked: true,
    }).eq('id', user.id)
    setSaving(false)
    if (err) return setError(err.message)
    setProfile(prev => ({ ...prev, traficante_address_locked: true }))
    setSaved('address')
    setTimeout(() => setSaved(''), 3000)
  }

  const getGPS = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(pos => {
      setAddressCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
    })
  }

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null

  const trafProfile = profile ? {
    level: 'basico', // viene de traficante_profiles
    identity_verified: false,
    address_verified: !!profile.traficante_address_locked,
  } : null

  if (loading) return (
    <div className="mc-loading">
      <div className="loading" style={{ width: 40, height: 40 }} />
    </div>
  )

  return (
    <div className="mc-container">
      <div className="container">
        <div className="mc-layout">

          {/* ── SIDEBAR ── */}
          <aside className="mc-sidebar">
            <div className="mc-sidebar-profile">
              <div className="mc-avatar-wrap">
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="avatar" className="mc-avatar" />
                  : <div className="mc-avatar-placeholder">
                      {(profile?.display_name || user.email)?.charAt(0).toUpperCase()}
                    </div>
                }
                <button className="mc-avatar-edit" onClick={() => fileInputRef.current?.click()}>
                  {uploadingAvatar ? <span className="loading" style={{ width: 14, height: 14 }} /> : '📷'}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*"
                  style={{ display: 'none' }} onChange={handleAvatarUpload} />
              </div>
              <div className="mc-sidebar-name">{profile?.display_name || user.email}</div>
              <div className="mc-sidebar-email">{user.email}</div>
              {avgRating && (
                <div className="mc-sidebar-rating">
                  ⭐ {avgRating} <span>({reviews.length} reseñas)</span>
                </div>
              )}
            </div>

            <nav className="mc-nav">
              {SECTIONS.map(s => (
                <button key={s.key}
                  className={`mc-nav-item ${activeSection === s.key ? 'active' : ''}`}
                  onClick={() => { setActiveSection(s.key); setError(''); setSaved('') }}
                >
                  <span>{s.icon}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </nav>
          </aside>

          {/* ── CONTENIDO ── */}
          <main className="mc-main">

            {/* ══ INFORMACIÓN PERSONAL ══ */}
            {activeSection === 'personal' && (
              <div className="mc-section">
                <div className="mc-section-header">
                  <h2>👤 Información personal</h2>
                  <p>Estos datos son visibles públicamente en tu perfil de transportador.</p>
                </div>

                <div className="mc-notice info">
                  ℹ️ Tu nombre para mostrar puede cambiarse cuando quieras. Sin embargo, tu <strong>nombre completo real</strong> y <strong>teléfono</strong> son datos fijos que solo el equipo de soporte puede modificar, ya que se usan para verificación de identidad.
                </div>

                {/* Foto */}
                <div className="mc-field-group">
                  <label className="mc-label">Foto de perfil</label>
                  <p className="mc-hint">Compartida con tu cuenta de Pirata Market.</p>
                  <div className="mc-avatar-actions">
                    <div className="mc-avatar-preview">
                      {profile?.avatar_url
                        ? <img src={profile.avatar_url} alt="avatar" />
                        : <div className="mc-avatar-preview-placeholder">
                            {(profile?.display_name || user.email)?.charAt(0).toUpperCase()}
                          </div>
                      }
                    </div>
                    <div className="mc-avatar-btns">
                      <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
                        {uploadingAvatar ? <span className="loading" style={{ width: 16, height: 16 }} /> : '📷 Cambiar foto'}
                      </button>
                      {profile?.avatar_url && (
                        <button className="btn btn-ghost mc-danger-btn" onClick={handleDeleteAvatar}>
                          🗑️ Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Nombre para mostrar */}
                <div className="mc-field-group">
                  <label className="mc-label">Nombre para mostrar</label>
                  <p className="mc-hint">Este es el nombre que verán los remitentes en tu perfil.</p>
                  <input className="input" value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Ej: Ricardo M." />
                </div>

                {/* Nombre real — fijo */}
                <div className="mc-field-group">
                  <label className="mc-label">
                    Nombre completo real
                    {profile?.traficante_phone_locked && <span className="mc-locked-badge">🔒 Fijo</span>}
                  </label>
                  <p className="mc-hint">Debe coincidir exactamente con tu documento de identidad.</p>
                  {profile?.traficante_phone_locked
                    ? <div className="mc-locked-field">{profile.traficante_full_name || '—'}</div>
                    : <input className="input" value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        placeholder="Ej: Ricardo Maldonado Moreno" />
                  }
                </div>

                {/* Teléfono — fijo */}
                <div className="mc-field-group">
                  <label className="mc-label">
                    Teléfono / WhatsApp
                    {profile?.traficante_phone_locked && <span className="mc-locked-badge">🔒 Fijo</span>}
                  </label>
                  <p className="mc-hint">
                    {profile?.traficante_phone_locked
                      ? 'Para cambiar este dato contacta a soporte.'
                      : 'Una vez guardado, solo soporte puede modificarlo. Se usa para verificación.'}
                  </p>
                  {profile?.traficante_phone_locked
                    ? <div className="mc-locked-field">{profile.traficante_phone || '—'}</div>
                    : <input className="input" value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="Ej: +591 70000000" />
                  }
                </div>

                {!profile?.traficante_phone_locked && (fullName || phone) && (
                  <div className="mc-notice warning">
                    ⚠️ Al guardar el nombre real y teléfono, estos datos quedarán fijos. Solo soporte podrá modificarlos.
                  </div>
                )}

                {/* Bio */}
                <div className="mc-field-group">
                  <label className="mc-label">Bio pública</label>
                  <p className="mc-hint">Cuéntale a los remitentes quién eres y por qué pueden confiar en ti.</p>
                  <textarea className="input textarea" value={bio}
                    onChange={e => setBio(e.target.value)}
                    placeholder="Ej: Viajo frecuentemente entre Santa Cruz y São Paulo. Soy responsable y puntual..."
                    rows={3} />
                </div>

                {/* Rutas frecuentes */}
                <div className="mc-field-group">
                  <label className="mc-label">Rutas frecuentes</label>
                  <p className="mc-hint">Indica las rutas que haces regularmente para que los remitentes te encuentren más fácil.</p>
                  <input className="input" value={frequentRoutes}
                    onChange={e => setFrequentRoutes(e.target.value)}
                    placeholder="Ej: SCZ → SP, SCZ → BsAs" />
                </div>

                {error && <div className="mc-error">⚠️ {error}</div>}
                {saved === 'personal' && <div className="mc-success">✅ Datos guardados correctamente</div>}
                {saved === 'fixed' && <div className="mc-success">✅ Nombre y teléfono guardados y fijados</div>}

                <div className="mc-actions">
                  <button className="btn btn-primary t-btn-primary" onClick={savePersonal} disabled={saving}>
                    {saving ? <span className="loading" style={{ width: 16, height: 16 }} /> : '💾 Guardar cambios'}
                  </button>
                  {!profile?.traficante_phone_locked && (fullName || phone) && (
                    <button className="btn btn-outline t-btn-outline" onClick={saveFixed} disabled={saving}>
                      🔒 Fijar nombre y teléfono
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ══ DIRECCIÓN ══ */}
            {activeSection === 'direccion' && (
              <div className="mc-section">
                <div className="mc-section-header">
                  <h2>📍 Mi dirección principal</h2>
                  <p>Tu punto oficial de recepción y entrega de paquetes.</p>
                </div>

                <div className="mc-notice warning">
                  ⚠️ <strong>Lee antes de guardar:</strong> Una vez confirmada, tu dirección principal quedará fija y no podrá editarse. Debe coincidir exactamente con tu documento de identidad y será verificada por nuestro equipo. Esta dirección es el punto oficial donde los remitentes llevarán sus paquetes.
                </div>

                {profile?.traficante_address_locked ? (
                  <div className="mc-locked-address">
                    <div className="mc-locked-address-icon">📍</div>
                    <div>
                      <div className="mc-locked-address-city">{profile.traficante_address_city}</div>
                      <div className="mc-locked-address-text">{profile.traficante_address_text}</div>
                      {addressCoords && (
                        <div className="mc-locked-address-coords">
                          📡 {addressCoords.lat.toFixed(5)}, {addressCoords.lng.toFixed(5)}
                        </div>
                      )}
                    </div>
                    <div className="mc-locked-badge-lg">🔒 Dirección fija</div>
                  </div>
                ) : (
                  <>
                    <div className="mc-field-group">
                      <label className="mc-label">Ciudad *</label>
                      <input className="input" value={addressCity}
                        onChange={e => setAddressCity(e.target.value)}
                        placeholder="Ej: Santa Cruz de la Sierra, Bolivia" />
                    </div>

                    <div className="mc-field-group">
                      <label className="mc-label">Dirección exacta *</label>
                      <p className="mc-hint">Incluye calle, número, barrio o referencia. Debe coincidir con tus documentos.</p>
                      <input className="input" value={addressText}
                        onChange={e => setAddressText(e.target.value)}
                        placeholder="Ej: Av. Roca y Coronado #450, Villa 1ro de Mayo" />
                    </div>

                    <div className="mc-field-group">
                      <label className="mc-label">Ubicación GPS</label>
                      <p className="mc-hint">Marca tu punto exacto en el mapa para que los remitentes te encuentren fácilmente.</p>
                      <div className="mc-gps-row">
                        <button type="button" className="btn btn-secondary" onClick={getGPS}>
                          📡 Usar mi ubicación actual
                        </button>
                        <button type="button" className="btn btn-secondary"
                          onClick={() => setShowMap(!showMap)}>
                          🗺️ {showMap ? 'Cerrar mapa' : 'Pinchar en mapa'}
                        </button>
                        {addressCoords && (
                          <span className="mc-coords-badge">
                            ✅ {addressCoords.lat.toFixed(5)}, {addressCoords.lng.toFixed(5)}
                          </span>
                        )}
                      </div>
                      {showMap && (
                        <div className="mc-map">
                          <MapContainer
                            center={addressCoords || [-17.8, -63.18]} zoom={13}
                            style={{ height: '280px', borderRadius: '12px' }}
                          >
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <MapPicker onSelect={(coords) => { setAddressCoords(coords); setShowMap(false) }} />
                            {addressCoords && <Marker position={[addressCoords.lat, addressCoords.lng]} />}
                          </MapContainer>
                          <p className="mc-map-hint">Haz clic en el mapa para marcar el punto exacto</p>
                        </div>
                      )}
                    </div>

                    <div className="mc-notice danger">
                      🔒 Al guardar tu dirección quedará fija. Para cualquier cambio posterior deberás contactar a soporte con documentación válida.
                    </div>

                    {error && <div className="mc-error">⚠️ {error}</div>}
                    {saved === 'address' && <div className="mc-success">✅ Dirección guardada y fijada correctamente</div>}

                    <div className="mc-actions">
                      <button className="btn btn-primary t-btn-primary" onClick={saveAddress} disabled={saving}>
                        {saving ? <span className="loading" style={{ width: 16, height: 16 }} /> : '🔒 Confirmar y fijar dirección'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ══ VERIFICACIÓN ══ */}
            {activeSection === 'verificacion' && (
              <div className="mc-section">
                <div className="mc-section-header">
                  <h2>🔒 Verificación de identidad</h2>
                  <p>Aumenta la confianza de los remitentes verificando tu identidad.</p>
                </div>

                <div className="mc-notice info">
                  ℹ️ Los documentos que subas deben mostrar <strong>exactamente la misma dirección</strong> que declaraste en "Mi dirección". Nuestro equipo revisará y verificará en un plazo de 24-48 horas.
                </div>

                <div className="mc-verif-list">
                  {[
                    { key: 'identity', icon: '🪪', label: 'Documento de identidad', desc: 'CI, pasaporte o carnet vigente — foto frontal y dorsal', verified: false },
                    { key: 'address',  icon: '📄', label: 'Comprobante de domicilio', desc: 'Factura de servicio o documento con tu dirección declarada', verified: !!profile?.traficante_address_locked },
                    { key: 'phone',    icon: '📱', label: 'Verificación de WhatsApp', desc: 'Recibirás un código al número registrado', verified: !!profile?.traficante_phone_locked },
                    { key: 'travel',   icon: '✈️', label: 'Comprobante de viaje', desc: 'Pasaje, itinerario o reserva del viaje a declarar', verified: false },
                  ].map(item => (
                    <div key={item.key} className="mc-verif-item">
                      <div className="mc-verif-icon">{item.icon}</div>
                      <div className="mc-verif-info">
                        <div className="mc-verif-label">{item.label}</div>
                        <div className="mc-verif-desc">{item.desc}</div>
                      </div>
                      <div className={`mc-verif-status ${item.verified ? 'verified' : 'pending'}`}>
                        {item.verified ? '✅ Verificado' : '⏳ Pendiente'}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mc-notice warning" style={{ marginTop: '2rem' }}>
                  📧 Para solicitar verificación, envía tus documentos a <strong>verificacion@busesapp.com</strong> junto con tu correo registrado. Nuestro equipo los revisará y actualizará tu estado.
                </div>
              </div>
            )}

            {/* ══ RESEÑAS ══ */}
            {activeSection === 'resenas' && (
              <div className="mc-section">
                <div className="mc-section-header">
                  <h2>⭐ Mis reseñas</h2>
                  <p>Lo que dicen quienes han usado tu servicio.</p>
                </div>

                {reviews.length === 0 ? (
                  <div className="mc-empty">
                    <div className="mc-empty-icon">⭐</div>
                    <p>Aún no tienes reseñas. Completa tu primer envío para comenzar a construir tu reputación.</p>
                  </div>
                ) : (
                  <>
                    <div className="mc-rating-summary">
                      <div className="mc-rating-big">{avgRating}</div>
                      <div className="mc-rating-stars">
                        {'⭐'.repeat(Math.round(avgRating))}
                      </div>
                      <div className="mc-rating-count">{reviews.length} reseñas</div>
                    </div>
                    <div className="mc-reviews-list">
                      {reviews.map(review => (
                        <div key={review.id} className="mc-review-card card">
                          <div className="mc-review-header">
                            <div className="mc-review-avatar">
                              {review.reviewer?.avatar_url
                                ? <img src={review.reviewer.avatar_url} alt="" />
                                : <div>{review.reviewer?.display_name?.charAt(0) || '?'}</div>
                              }
                            </div>
                            <div>
                              <div className="mc-review-name">{review.reviewer?.display_name || 'Usuario'}</div>
                              <div className="mc-review-role">{review.reviewer_role}</div>
                            </div>
                            <div className="mc-review-stars">{'⭐'.repeat(review.rating)}</div>
                          </div>
                          {review.comment && <p className="mc-review-comment">{review.comment}</p>}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ══ NIVEL ══ */}
            {activeSection === 'nivel' && (
              <div className="mc-section">
                <div className="mc-section-header">
                  <h2>🏆 Mi nivel</h2>
                  <p>Tu nivel determina qué tipos de envíos puedes aceptar y cuánto pueden confiar en ti los remitentes.</p>
                </div>

                <div className="mc-level-current">
                  <div className="mc-level-icon" style={{ color: LEVEL_INFO['basico'].color }}>
                    {LEVEL_INFO['basico'].icon}
                  </div>
                  <div>
                    <div className="mc-level-label" style={{ color: LEVEL_INFO['basico'].color }}>
                      Nivel {LEVEL_INFO['basico'].label}
                    </div>
                    <div className="mc-level-desc">Tu nivel es asignado por el equipo de Traficante según tus verificaciones completadas.</div>
                  </div>
                </div>

                <div className="mc-levels-progress">
                  {Object.entries(LEVEL_INFO).map(([key, info]) => (
                    <div key={key} className={`mc-level-row ${key === 'basico' ? 'current' : ''}`}>
                      <div className="mc-level-row-icon" style={{ color: info.color }}>{info.icon}</div>
                      <div className="mc-level-row-info">
                        <div className="mc-level-row-label" style={{ color: info.color }}>{info.label}</div>
                        <div className="mc-level-row-reqs">
                          {LEVEL_REQUIREMENTS[key].map((req, i) => (
                            <span key={i} className="mc-req-chip">{req}</span>
                          ))}
                        </div>
                      </div>
                      {key === 'basico' && <div className="mc-level-current-badge">← Tu nivel actual</div>}
                    </div>
                  ))}
                </div>

                <div className="mc-notice info">
                  ℹ️ Para subir de nivel, completa las verificaciones requeridas y contacta a soporte. Nuestro equipo revisará tu perfil y actualizará tu nivel manualmente.
                </div>
              </div>
            )}

          </main>
        </div>
      </div>
    </div>
  )
}
