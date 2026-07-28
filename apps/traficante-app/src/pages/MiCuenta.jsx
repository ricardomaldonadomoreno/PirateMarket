import { useState, useEffect } from 'react'
import { useNavigate, Outlet, useLocation } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import { supabase } from '../../../pirata-market/src/lib/supabase'
import 'leaflet/dist/leaflet.css'
import './MiCuenta.css'
import MiCuentaSidebar from './MiCuentaSidebar'
import MiCuentaMisViajes from './MiCuentaMisViajes'
import CityAutocomplete from '../../../pirata-market/src/components/CityAutocomplete'

function MapPicker({ onSelect }) {
  useMapEvents({
    click(e) { onSelect({ lat: e.latlng.lat, lng: e.latlng.lng }) }
  })
  return null
}

export default function MiCuenta({ user, onProfileUpdate }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState('')
  const [error, setError] = useState('')
  const [showMap, setShowMap] = useState(false)

  // Perfil
  const [profile, setProfile] = useState(null)

  // Campos editables
  const [bio, setBio] = useState('')
  const [frequentRoutes, setFrequentRoutes] = useState('')

  // Campos fijos
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [addressCity, setAddressCity] = useState('')
  const [addressCountry, setAddressCountry] = useState('')
  const [addressCityObj, setAddressCityObj] = useState(null) // { city, country, lat, lng }
  const [addressText, setAddressText] = useState('')
  const [addressCoords, setAddressCoords] = useState(null)

  // Para sidebar (cargados aquí, pasados por props)
  const [verifRequest, setVerifRequest] = useState(null)
  const [reviews, setReviews] = useState([])

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
        display_name, avatar_url,
        traficante_full_name, traficante_phone,
        traficante_address_city, traficante_address_country, traficante_address_state,
        traficante_address_state_code, traficante_address_country_code,
        traficante_address_text,
        traficante_address_lat, traficante_address_lng,
        traficante_address_locked, traficante_phone_locked,
        traficante_bio, traficante_frequent_routes,
        traficante_identity_verified, traficante_address_verified,
        traficante_bank_verified
      `)
      .eq('id', user.id)
      .single()
    if (data) {
      setProfile(data)
      setBio(data.traficante_bio || '')
      setFrequentRoutes(data.traficante_frequent_routes || '')
      setFullName(data.traficante_full_name || '')
      setPhone(data.traficante_phone || '')
      setAddressCity(data.traficante_address_city || '')
      setAddressCountry(data.traficante_address_country || '')
      setAddressText(data.traficante_address_text || '')
      if (data.traficante_address_city) {
        setAddressCityObj({ city: data.traficante_address_city, country: data.traficante_address_country, country_code: data.traficante_address_country_code, state: data.traficante_address_state, state_code: data.traficante_address_state_code, lat: data.traficante_address_lat, lng: data.traficante_address_lng })
      }
      if (data.traficante_address_lat && data.traficante_address_lng) {
        setAddressCoords({ lat: data.traficante_address_lat, lng: data.traficante_address_lng })
      }
    }
    setLoading(false)
  }

  const loadReviews = async () => {
    const { data } = await supabase
      .from('traficante_reviews')
      .select('*')
      .eq('reviewed_id', user.id)
    setReviews(data || [])
  }

  const loadVerification = async () => {
    const { data } = await supabase
      .from('traficante_verification_requests')
      .select('*')
      .eq('user_id', user.id)
      .single()
    if (data) setVerifRequest(data)
  }

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null

  // ── GUARDAR PERSONAL ──
  const savePersonal = async () => {
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('users').update({
      display_name: profile?.display_name,
      traficante_bio: bio,
      traficante_frequent_routes: frequentRoutes,
    }).eq('id', user.id)
    setSaving(false)
    if (err) return setError(err.message)
    setSaved('personal')
    if (onProfileUpdate) onProfileUpdate(prev => ({ ...prev, display_name: profile?.display_name }))
    setTimeout(() => setSaved(''), 3000)
  }

  // ── GUARDAR NOMBRE Y TELÉFONO ──
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

  // ── GUARDAR DIRECCIÓN ──
  const saveAddress = async () => {
    if (profile?.traficante_address_locked) return
    if (!addressCityObj || !addressText) return setError('Completa la ciudad y dirección')
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('users').update({
      traficante_address_city: addressCityObj.city,
      traficante_address_country: addressCityObj.country,
      traficante_address_text: addressText,
      traficante_address_lat: addressCityObj.lat || addressCoords?.lat || null,
      traficante_address_lng: addressCityObj.lng || addressCoords?.lng || null,
      traficante_address_state: addressCityObj.state || null,
      traficante_address_state_code: addressCityObj.state_code || null,
      traficante_address_country_code: addressCityObj.country_code || null,
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

  // ── DETERMINAR SI ESTAMOS EN RUTA HIJA (verificacion, resenas, nivel) ──
  const path = location.pathname
  const showChildRoute = path !== '/traficante/mi-cuenta'

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
          <MiCuentaSidebar
            user={user}
            profile={profile}
            verifRequest={verifRequest}
            avgRating={avgRating}
            reviewsCount={reviews.length}
          />

          {/* ── CONTENIDO ── */}
          <main className="mc-main">

            {/* ══ INFORMACIÓN PERSONAL + DIRECCIÓN ══ */}
            {!showChildRoute && (
              <div className="mc-section">
                <div className="mc-section-header">
                  <h2>Información personal</h2>
                  <p>Estos datos son visibles públicamente en tu perfil de transportador.</p>
                </div>

                <div className="mc-notice info">
                  Tu <strong>nombre completo real</strong> y <strong>teléfono</strong> son datos fijos que solo el equipo de soporte puede modificar.
                </div>

                <div className="real-data-grid">
                  <div className="form-group">
                    <label>Rutas frecuentes</label>
                    <p className="verif-hint">Indica las rutas que haces regularmente.</p>
                    <input className="input" value={frequentRoutes}
                      onChange={e => setFrequentRoutes(e.target.value)}
                      placeholder="Ej: SCZ → SP, SCZ → BsAs" />
                  </div>
                  <div className="form-group">
                    <label>
                      Nombre completo real
                      {profile?.traficante_phone_locked && <span className="mc-locked-badge">Fijo</span>}
                    </label>
                    <p className="verif-hint">Debe coincidir exactamente con tu documento de identidad.</p>
                    {profile?.traficante_phone_locked
                      ? <div className="mc-locked-field">{profile.traficante_full_name || '—'}</div>
                      : <input className="input" value={fullName}
                          onChange={e => setFullName(e.target.value)}
                          placeholder="Ej: Ricardo Maldonado Moreno" />
                    }
                  </div>
                  <div className="form-group">
                    <label>
                      Teléfono de contacto
                      {profile?.traficante_phone_locked && <span className="mc-locked-badge">Fijo</span>}
                    </label>
                    <p className="verif-hint">
                      {profile?.traficante_phone_locked
                        ? 'Para cambiar este dato contacta a soporte.'
                        : 'Una vez guardado, solo soporte puede modificarlo.'}
                    </p>
                    {profile?.traficante_phone_locked
                      ? <div className="mc-locked-field">{profile.traficante_phone || '—'}</div>
                      : <input className="input" value={phone}
                          onChange={e => setPhone(e.target.value)}
                          placeholder="Ej: +591 70000000" />
                    }
                  </div>
                </div>

                <div className="mc-field-group">
                  <label className="mc-label">Bio pública</label>
                  <p className="mc-hint">Cuéntale a los remitentes quién eres y por qué pueden confiar en ti.</p>
                  <textarea className="input textarea" value={bio}
                    onChange={e => setBio(e.target.value)}
                    placeholder="Ej: Viajo frecuentemente entre Santa Cruz y São Paulo..."
                    rows={3} />
                </div>

                {error && <div className="mc-error">{error}</div>}
                {saved === 'personal' && <div className="mc-success">Datos guardados correctamente</div>}
                {saved === 'fixed' && <div className="mc-success">Nombre y teléfono guardados y fijados</div>}

                <div className="verif-footer">
                  <button className="btn btn-primary t-btn-primary" onClick={savePersonal} disabled={saving}>
                    {saving ? <span className="loading" style={{ width: 16, height: 16 }} /> : 'Guardar cambios'}
                  </button>
                  {!profile?.traficante_phone_locked && (fullName || phone) && (
                    <button className="btn btn-outline t-btn-outline" onClick={saveFixed} disabled={saving}>
                      Fijar nombre y teléfono
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ══ DIRECCIÓN ══ */}
            {!showChildRoute && (
              <div className="mc-section">
                <div className="mc-section-header">
                  <h2>Mi dirección</h2>
                  <p>Tu punto oficial de recepción y entrega de paquetes.</p>
                </div>

                <div className="mc-notice warning">
                  <strong>Lee antes de guardar:</strong> Una vez confirmada, tu dirección principal quedará fija y no podrá editarse. Debe coincidir exactamente con tu documento de identidad.
                </div>

                {profile?.traficante_address_locked ? (
                  <div className="mc-locked-address">
                    <div className="mc-locked-address-icon">📍</div>
                    <div>
                      <div className="mc-locked-address-city">{profile.traficante_address_city}</div>
                      <div className="mc-locked-address-text">{profile.traficante_address_text}</div>
                      {addressCoords && (
                        <div className="mc-locked-address-coords">
                          {addressCoords.lat.toFixed(5)}, {addressCoords.lng.toFixed(5)}
                        </div>
                      )}
                    </div>
                    <div className="mc-locked-badge-lg">Dirección fija</div>
                  </div>
                ) : (
                  <>
                    <div className="mc-field-group">
                      <label className="mc-label">Ciudad y país *</label>
                      <CityAutocomplete
                        label=""
                        placeholder="Escribe tu ciudad para buscarla"
                        value={addressCityObj}
                        onChange={(val) => {
                          setAddressCityObj(val)
                          setAddressCity(val?.city || '')
                          setAddressCountry(val?.country || '')
                          if (val?.lat && val?.lng) {
                            setAddressCoords({ lat: val.lat, lng: val.lng })
                          }
                        }}
                      />
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
                      <p className="mc-hint">Marca tu punto exacto en el mapa.</p>
                      <div className="mc-gps-row">
                        <button type="button" className="btn btn-secondary" onClick={getGPS}>
                          Usar mi ubicación actual
                        </button>
                        <button type="button" className="btn btn-secondary"
                          onClick={() => setShowMap(!showMap)}>
                          {showMap ? 'Cerrar mapa' : 'Pinchar en mapa'}
                        </button>
                        {addressCoords && (
                          <span className="mc-coords-badge">
                            {addressCoords.lat.toFixed(5)}, {addressCoords.lng.toFixed(5)}
                          </span>
                        )}
                      </div>
                      {showMap && (
                        <div className="mc-map">
                          <MapContainer center={addressCoords || [-17.8, -63.18]} zoom={13}
                            style={{ height: '280px', borderRadius: '12px' }}>
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <MapPicker onSelect={(coords) => { setAddressCoords(coords) }} />
                            {addressCoords && <Marker position={[addressCoords.lat, addressCoords.lng]} />}
                          </MapContainer>
                          <p className="mc-map-hint">Haz clic en el mapa para marcar el punto exacto</p>
                        </div>
                      )}
                    </div>

                    <div className="mc-notice danger">
                      Al guardar tu dirección quedará fija. Contacta a soporte para cualquier cambio posterior.
                    </div>

                    {error && <div className="mc-error">{error}</div>}
                    {saved === 'address' && <div className="mc-success">Dirección guardada y fijada correctamente</div>}

                    <div className="verif-footer">
                      <button className="btn btn-primary t-btn-primary" onClick={saveAddress} disabled={saving}>
                        {saving ? <span className="loading" style={{ width: 16, height: 16 }} /> : 'Confirmar y fijar dirección'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ══ MIS VIAJES ══ */}
            {location.pathname === '/traficante/mi-cuenta/viajes' && (
              <MiCuentaMisViajes user={user} />
            )}

            {/* ══ RUTAS HIJAS (Verificación / Reseñas / Nivel) ══ */}
            {location.pathname !== '/traficante/mi-cuenta' && location.pathname !== '/traficante/mi-cuenta/viajes' && <Outlet />}

          </main>
        </div>
      </div>
    </div>
  )
}
