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

  // Verificación
  const [verificationRequest, setVerificationRequest] = useState(null)
  const [uploadingDocs, setUploadingDocs] = useState(false)
  const [identityFiles, setIdentityFiles] = useState([])
  const [addressFiles, setAddressFiles] = useState([])
  const [bankFiles, setBankFiles] = useState([])
  const [verifSaved, setVerifSaved] = useState(false)

  useEffect(() => {
    if (!user) return navigate('/auth')
    loadProfile()
    loadReviews()
    loadVerification()
  }, [user])

  const loadProfile = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('users')
      .select(`
        display_name, avatar_url, is_verified,
        traficante_full_name, traficante_phone,
        traficante_address_city, traficante_address_text,
        traficante_address_lat, traficante_address_lng,
        traficante_address_locked, traficante_phone_locked,
        traficante_bio, traficante_frequent_routes,
        traficante_identity_verified, traficante_address_verified, traficante_bank_verified
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

  // ── VERIFICACIÓN ──
  const uploadDocFiles = async (files, folder) => {
    const urls = []
    for (const file of files) {
      const fileExt = file.name.split('.').pop()
      const path = `${user.id}/${folder}/${Date.now()}.${fileExt}`
      const { error } = await supabase.storage
        .from('verification-docs')
        .upload(path, file, { contentType: file.type })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage
        .from('verification-docs')
        .getPublicUrl(path)
      urls.push(publicUrl)
    }
    return urls
  }

  const handleSubmitVerification = async () => {
    if (identityFiles.length !== 2) {
      setError('Debes subir exactamente 2 fotos de identidad (anverso y reverso)')
      return
    }
    if (addressFiles.length === 0) {
      setError('Debes subir el comprobante de domicilio')
      return
    }
    if (bankFiles.length === 0) {
      setError('Debes subir el extracto bancario')
      return
    }
    setUploadingDocs(true)
    setError('')
    try {
      const identityUrls = await uploadDocFiles(identityFiles, 'identity')
      const addressUrls = await uploadDocFiles(addressFiles, 'address')
      const bankUrls = await uploadDocFiles(bankFiles, 'bank')

      const payload = {
        user_id: user.id,
        status: 'pending',
        app_source: 'traficante',
        identity_docs: identityUrls,
        business_docs: [...addressUrls, ...bankUrls], // Reutilizamos business_docs para Traficante
      }

      if (verificationRequest) {
        await supabase.from('verification_requests').update(payload).eq('id', verificationRequest.id)
      } else {
        await supabase.from('verification_requests').insert([payload])
      }

      setVerifSaved(true)
      setIdentityFiles([])
      setAddressFiles([])
      setBankFiles([])
      setTimeout(() => setVerifSaved(false), 4000)
      loadVerification()
    } catch (err) {
      setError('Error al enviar documentos: ' + err.message)
    } finally {
      setUploadingDocs(false)
    }
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
    identity_verified: !!profile.traficante_identity_verified,
    address_verified: !!profile.traficante_address_verified,
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
                        placeholder="+591 7XXXXXXX" />
                  }
                </div>

                {/* Bio */}
                <div className="mc-field-group">
                  <label className="mc-label">Bio / Descripción</label>
                  <p className="mc-hint">Cuéntale a los usuarios sobre tu experiencia como transportador.</p>
                  <textarea className="input textarea" rows={4} value={bio}
                    onChange={e => setBio(e.target.value)}
                    placeholder="Ej: Viajo semanalmente entre Santa Cruz y La Paz..." />
                </div>

                {/* Rutas */}
                <div className="mc-field-group">
                  <label className="mc-label">Rutas frecuentes</label>
                  <p className="mc-hint">Ej: Santa Cruz ↔ La Paz, Santa Cruz ↔ Puerto Suárez.</p>
                  <input className="input" value={frequentRoutes}
                    onChange={e => setFrequentRoutes(e.target.value)}
                    placeholder="Ej: Santa Cruz - Cochabamba" />
                </div>

                <div className="mc-actions">
                  {saved === 'personal' && <span className="mc-saved-msg">✓ Guardado</span>}
                  <button className="btn btn-primary" onClick={savePersonal} disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                  {!profile?.traficante_phone_locked && (
                    <button className="btn btn-secondary" onClick={saveFixed} disabled={saving || !fullName || !phone} style={{ marginLeft: '1rem' }}>
                      🔒 Fijar nombre y teléfono
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ══ MI DIRECCIÓN ══ */}
            {activeSection === 'direccion' && (
              <div className="mc-section">
                <div className="mc-section-header">
                  <h2>📍 Mi dirección</h2>
                  <p>Tu ubicación base para recibir o entregar paquetes.</p>
                </div>

                {profile?.traficante_address_locked ? (
                  <div className="mc-locked-address">
                    <div className="mc-locked-address-icon">🏠</div>
                    <div className="mc-locked-address-info">
                      <div className="mc-locked-address-city">{profile.traficante_address_city}</div>
                      <div className="mc-locked-address-text">{profile.traficante_address_text}</div>
                      {profile.traficante_address_lat && (
                        <div className="mc-locked-address-coords">
                          📍 {profile.traficante_address_lat.toFixed(4)}, {profile.traficante_address_lng.toFixed(4)}
                        </div>
                      )}
                    </div>
                    <div className="mc-locked-badge-lg">🔒 Dirección fija</div>
                  </div>
                ) : (
                  <>
                    <div className="mc-notice warning">
                      ⚠️ Una vez guardada tu dirección, se bloqueará para verificación. Solo podrás cambiarla contactando a soporte.
                    </div>

                    <div className="mc-field-group">
                      <label className="mc-label">Ciudad</label>
                      <input className="input" value={addressCity}
                        onChange={e => setAddressCity(e.target.value)}
                        placeholder="Ej: Santa Cruz de la Sierra" />
                    </div>

                    <div className="mc-field-group">
                      <label className="mc-label">Dirección exacta</label>
                      <input className="input" value={addressText}
                        onChange={e => setAddressText(e.target.value)}
                        placeholder="Ej: Av. Bush, Calle 4, Edificio..." />
                    </div>

                    <div className="mc-field-group">
                      <label className="mc-label">Ubicación GPS</label>
                      <div className="mc-gps-row">
                        <button className="btn btn-secondary" onClick={getGPS}>
                          📍 Obtener ubicación actual
                        </button>
                        {addressCoords && (
                          <span className="mc-coords-badge">
                            {addressCoords.lat.toFixed(5)}, {addressCoords.lng.toFixed(5)}
                          </span>
                        )}
                        <button className="btn btn-ghost" onClick={() => setShowMap(!showMap)}>
                          {showMap ? 'Ocultar mapa' : '📍 Seleccionar en mapa'}
                        </button>
                      </div>

                      {(showMap || addressCoords) && (
                        <div className="mc-map">
                          <MapContainer
                            center={addressCoords || { lat: -17.7833, lng: -63.1821 }}
                            zoom={13}
                            style={{ height: '300px', borderRadius: '12px' }}
                          >
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <MapPicker onSelect={setAddressCoords} />
                            {addressCoords && <Marker position={[addressCoords.lat, addressCoords.lng]} />}
                          </MapContainer>
                          <p className="mc-map-hint">Haz clic en el mapa para ajustar tu ubicación exacta.</p>
                        </div>
                      )}
                    </div>

                    <div className="mc-actions">
                      {saved === 'address' && <span className="mc-saved-msg">✓ Dirección guardada</span>}
                      <button className="btn btn-primary" onClick={saveAddress} disabled={saving || !addressCity || !addressText}>
                        {saving ? 'Guardando...' : '🔒 Guardar y fijar dirección'}
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
                  <h2>🔒 Verificación de cuenta</h2>
                  <p>Completa las verificaciones para subir de nivel y generar más confianza.</p>
                </div>

                {error && <div className="mc-notice danger">⚠️ {error}</div>}
                {verifSaved && <div className="mc-notice info">✅ Documentos enviados con éxito. Nuestro equipo los revisará pronto.</div>}

                <div className="mc-notice info">
                  ℹ️ Los documentos deben mostrar <strong>exactamente la misma dirección y nombre</strong> que declaraste. Nuestro equipo revisará en 24-48 horas.
                </div>

                <div className="mc-verif-list">
                  {/* Identidad */}
                  <div className="mc-verif-item">
                    <div className="mc-verif-icon">🪪</div>
                    <div className="mc-verif-info">
                      <div className="mc-verif-label">Documento de identidad <span className="mc-required-badge">Obligatorio</span></div>
                      <div className="mc-verif-desc">Carnet de identidad o pasaporte vigente — foto frontal y dorsal (2 fotos).</div>
                      {!profile?.traficante_identity_verified && (
                        <div className="mc-verif-upload-box">
                          <input type="file" accept="image/*" multiple id="ident-input" style={{ display: 'none' }}
                            onChange={e => setIdentityFiles(Array.from(e.target.files))} />
                          <label htmlFor="ident-input" className={`btn btn-secondary btn-small ${identityFiles.length === 2 ? 'btn-success' : ''}`}>
                            📷 {identityFiles.length === 0 ? 'Seleccionar 2 fotos' : identityFiles.length === 2 ? `✓ Anverso y reverso` : `${identityFiles.length} fotos (necesitas 2)`}
                          </label>
                        </div>
                      )}
                    </div>
                    <div className={`mc-verif-status ${profile?.traficante_identity_verified ? 'verified' : 'pending'}`}>
                      {profile?.traficante_identity_verified ? '✅ Verificado' : '⏳ Pendiente'}
                    </div>
                  </div>

                  {/* Domicilio */}
                  <div className="mc-verif-item">
                    <div className="mc-verif-icon">📄</div>
                    <div className="mc-verif-info">
                      <div className="mc-verif-label">Comprobante de domicilio <span className="mc-required-badge">Obligatorio</span></div>
                      <div className="mc-verif-desc">Factura de servicio básico que muestre tu nombre y dirección.</div>
                      {!profile?.traficante_address_verified && (
                        <div className="mc-verif-upload-box">
                          <input type="file" accept="image/*" multiple id="addr-input" style={{ display: 'none' }}
                            onChange={e => setAddressFiles(Array.from(e.target.files))} />
                          <label htmlFor="addr-input" className={`btn btn-secondary btn-small ${addressFiles.length > 0 ? 'btn-success' : ''}`}>
                            📷 {addressFiles.length > 0 ? `✓ ${addressFiles.length} foto(s)` : 'Seleccionar foto'}
                          </label>
                        </div>
                      )}
                    </div>
                    <div className={`mc-verif-status ${profile?.traficante_address_verified ? 'verified' : 'pending'}`}>
                      {profile?.traficante_address_verified ? '✅ Verificado' : '⏳ Pendiente'}
                    </div>
                  </div>

                  {/* Banco */}
                  <div className="mc-verif-item">
                    <div className="mc-verif-icon">🏦</div>
                    <div className="mc-verif-info">
                      <div className="mc-verif-label">Extracto bancario <span className="mc-required-badge">Obligatorio</span></div>
                      <div className="mc-verif-desc">Extracto reciente que muestre tu nombre y dirección.</div>
                      {!profile?.traficante_bank_verified && (
                        <div className="mc-verif-upload-box">
                          <input type="file" accept="image/*" multiple id="bank-input" style={{ display: 'none' }}
                            onChange={e => setBankFiles(Array.from(e.target.files))} />
                          <label htmlFor="bank-input" className={`btn btn-secondary btn-small ${bankFiles.length > 0 ? 'btn-success' : ''}`}>
                            📷 {bankFiles.length > 0 ? `✓ ${bankFiles.length} foto(s)` : 'Seleccionar foto'}
                          </label>
                        </div>
                      )}
                    </div>
                    <div className={`mc-verif-status ${profile?.traficante_bank_verified ? 'verified' : 'pending'}`}>
                      {profile?.traficante_bank_verified ? '✅ Verificado' : '⏳ Pendiente'}
                    </div>
                  </div>

                  {/* WhatsApp */}
                  <div className="mc-verif-item">
                    <div className="mc-verif-icon">📱</div>
                    <div className="mc-verif-info">
                      <div className="mc-verif-label">Verificación de WhatsApp</div>
                      <div className="mc-verif-desc">Confirma que tu número está activo.</div>
                    </div>
                    <div className={`mc-verif-status ${profile?.traficante_phone_locked ? 'verified' : 'pending'}`}>
                      {profile?.traficante_phone_locked ? '✅ Verificado' : '⏳ Pendiente'}
                    </div>
                  </div>
                </div>

                <div className="mc-verif-actions" style={{ marginTop: '2rem' }}>
                  <div className="mc-verif-requirement-note">
                    <span>Identidad: {identityFiles.length}/2</span>
                    <span>Domicilio: {addressFiles.length > 0 ? '✓' : '—'}</span>
                    <span>Banco: {bankFiles.length > 0 ? '✓' : '—'}</span>
                  </div>
                  <button className="btn btn-primary btn-full" onClick={handleSubmitVerification} disabled={uploadingDocs || identityFiles.length !== 2 || addressFiles.length === 0 || bankFiles.length === 0}>
                    {uploadingDocs ? '📤 Subiendo documentos...' : '📤 Enviar documentos para revisión'}
                  </button>
                </div>

                <div className="mc-verif-upload" style={{ marginTop: '3rem' }}>
                  <h3>📤 ¿Cómo verificar mi cuenta?</h3>
                  <p>El proceso es manual y lo realiza nuestro equipo. Una vez que subas los documentos, los revisaremos en un plazo de 24-48 horas.</p>
                  <div className="mc-verif-steps">
                    <div className="mc-verif-step">
                      <div className="mc-verif-step-num">1</div>
                      <div>Sube fotos claras de tus documentos en los botones de arriba.</div>
                    </div>
                    <div className="mc-verif-step">
                      <div className="mc-verif-step-num">2</div>
                      <div>Asegúrate de haber fijado tu <strong>nombre real</strong> y <strong>dirección</strong>.</div>
                    </div>
                    <div className="mc-verif-step">
                      <div className="mc-verif-step-num">3</div>
                      <div>Haz clic en el botón de enviar para que el equipo de soporte los revise.</div>
                    </div>
                  </div>
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
