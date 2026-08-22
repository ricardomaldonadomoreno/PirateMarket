import { useState, useEffect } from 'react'
import { useNavigate, Outlet, useLocation } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import { supabase } from '../../../pirata-market/src/lib/supabase'
import 'leaflet/dist/leaflet.css'
import './MiCuenta.css'
import MiCuentaSidebar from './MiCuentaSidebar'
import MiCuentaMisViajes from './MiCuentaMisViajes'
import CityAutocomplete from '../../../pirata-market/src/components/CityAutocomplete'
import CountrySelect from '../components/CountrySelect'

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

  // Campos de información personal (fijos una vez guardados)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [birthCountry, setBirthCountry] = useState('')
  const [docType, setDocType] = useState('') // 'ci' o 'pasaporte'
  const [docNumber, setDocNumber] = useState('')

  // Campos de dirección
  const [addressCity, setAddressCity] = useState('')
  const [addressCountry, setAddressCountry] = useState('')
  const [addressCityObj, setAddressCityObj] = useState(null)
  const [addressText, setAddressText] = useState('')
  const [addressCoords, setAddressCoords] = useState(null)
  const [addressCoordsFromCity, setAddressCoordsFromCity] = useState(null)

  // Para sidebar
  const [verifRequest, setVerifRequest] = useState(null)
  const [reviews, setReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(true)

  useEffect(() => {
    if (!user) return navigate('/auth')
    loadProfile()
    loadReviews()
    loadVerification()
  }, [user])

  const loadProfile = async () => {
    setLoading(true)
    const { data: userData } = await supabase
      .from('users')
      .select('display_name, avatar_url')
      .eq('id', user.id)
      .single()
    const { data: profileData } = await supabase
      .from('traficante_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
    if (userData) {
      const merged = { ...userData, ...(profileData || {}) }
      setProfile(merged)
      setFullName(merged.full_name || '')
      setPhone(merged.phone || '')
      setBirthCountry(merged.birth_country || '')
      setDocType(merged.doc_type || '')
      setDocNumber(merged.doc_number || '')
      setAddressCity(merged.address_city || '')
      setAddressCountry(merged.address_country || '')
      setAddressText(merged.address_text || '')
      if (merged.address_city) {
        setAddressCityObj({ city: merged.address_city, country: merged.address_country, lat: merged.address_lat, lng: merged.address_lng })
      }
      if (merged.address_lat && merged.address_lng) {
        setAddressCoords({ lat: merged.address_lat, lng: merged.address_lng })
      }
    }
    setLoading(false)
  }

  const loadReviews = async () => {
    setReviewsLoading(true)
    const { data } = await supabase
      .from('traficante_reviews')
      .select('id, rating, comment, reviewer_role, created_at, reviewer:reviewer_id(display_name, avatar_url)')
      .eq('reviewed_id', user.id)
      .order('created_at', { ascending: false })
    setReviews(data || [])
    setReviewsLoading(false)
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

  // ── GUARDAR INFORMACIÓN PERSONAL ──
  const isPersonalLocked = profile?.personal_locked

  const savePersonal = async () => {
    if (isPersonalLocked) return
    if (!fullName.trim()) return setError('El nombre completo es obligatorio')
    if (!phone.trim()) return setError('El teléfono es obligatorio')
    if (!birthCountry.trim()) return setError('El país de nacimiento es obligatorio')
    if (!docType) return setError('Elige el tipo de documento')
    if (!docNumber.trim()) return setError('El número de documento es obligatorio')

    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('traficante_profiles').update({
      full_name: fullName.trim(),
      phone: phone.trim(),
      birth_country: birthCountry.trim(),
      doc_type: docType,
      doc_number: docNumber.trim(),
      personal_locked: true,
    }).eq('id', user.id)
    setSaving(false)
    if (err) return setError(err.message)
    setProfile(prev => ({
      ...prev,
      full_name: fullName.trim(),
      phone: phone.trim(),
      birth_country: birthCountry.trim(),
      doc_type: docType,
      doc_number: docNumber.trim(),
      personal_locked: true,
    }))
    if (onProfileUpdate) onProfileUpdate(prev => ({ ...prev, display_name: profile?.display_name }))
    setSaved('personal')
    setTimeout(() => setSaved(''), 3000)
  }

  // ── GUARDAR DIRECCIÓN ──
  const saveAddress = async () => {
    if (profile?.address_locked) return
    if (!addressCity || !addressText) return setError('Completa la ciudad y dirección')
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('traficante_profiles').update({
      address_city: addressCityObj?.city || addressCity,
      address_country: addressCityObj?.country || addressCountry,
      address_text: addressText,
      address_lat: addressCoords?.lat || addressCoordsFromCity?.lat || addressCityObj?.lat || null,
      address_lng: addressCoords?.lng || addressCoordsFromCity?.lng || addressCityObj?.lng || null,
      address_locked: true,
    }).eq('id', user.id)
    setSaving(false)
    if (err) return setError(err.message)
    setProfile(prev => ({ ...prev, address_locked: true }))
    setSaved('address')
    setTimeout(() => setSaved(''), 3000)
  }

  // Sincronizar coords de referencia cuando cambia la ciudad seleccionada
  useEffect(() => {
    if (addressCityObj?.lat && addressCityObj?.lng && !addressCoords) {
      setAddressCoordsFromCity({ lat: addressCityObj.lat, lng: addressCityObj.lng })
    }
  }, [addressCityObj])

  const getGPS = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(pos => {
      setAddressCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
    })
  }

  // ── DETERMINAR SI ESTAMOS EN RUTA HIJA (verificacion, resenas, nivel) ──
  const path = location.pathname
  const showChildRoute = path !== '/packer/mi-cuenta'

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

            {/* ══ INFORMACIÓN PERSONAL ══ */}
            {!showChildRoute && (
              <div className="mc-section">
                <div className="mc-section-header">
                  <h2>Información personal</h2>
                  <p>Estos datos identifican tu perfil de transportador. Una vez guardados quedan fijos.</p>
                </div>

                {isPersonalLocked ? (
                  /* ── DATOS FIJOS ── */
                  <div className="mc-locked-personal">
                    <div className="mc-locked-badge-lg">Datos personales fijos</div>
                    <div className="real-data-grid">
                      <div className="data-item">
                        <label>Nombre completo real</label>
                        <span>{profile?.full_name || '—'}</span>
                      </div>
                      <div className="data-item">
                        <label>Teléfono</label>
                        <span>{profile?.phone || '—'}</span>
                      </div>
                      <div className="data-item">
                        <label>País de nacimiento</label>
                        <span>{profile?.birth_country || '—'}</span>
                      </div>
                      <div className="data-item">
                        <label>Tipo de documento</label>
                        <span>{profile?.doc_type === 'ci' ? 'Cédula de Identidad' : profile?.doc_type === 'pasaporte' ? 'Pasaporte' : '—'}</span>
                      </div>
                      <div className="data-item traf-data-full">
                        <label>Número de documento</label>
                        <span>{profile?.doc_number || '—'}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ── FORMULARIO EDITABLE ── */
                  <>
                    <div className="mc-notice info">
                      Tu <strong>nombre completo</strong>, <strong>teléfono</strong>, <strong>país de nacimiento</strong>, <strong>tipo de documento</strong> y <strong>número de documento</strong> son datos fijos. Una vez guardados, solo el equipo de soporte puede modificarlos.
                    </div>

                    <div className="real-data-grid">
                      <div className="form-group">
                        <label>Nombre completo real *</label>
                        <p className="verif-hint">Debe coincidir exactamente con tu documento de identidad.</p>
                        <input className="input" value={fullName}
                          onChange={e => setFullName(e.target.value)}
                          placeholder="Ej: Ricardo Maldonado Moreno" />
                      </div>
                      <div className="form-group">
                        <label>Teléfono de contacto *</label>
                        <p className="verif-hint">Será tu canal de comunicación con remitentes.</p>
                        <input className="input" value={phone}
                          onChange={e => setPhone(e.target.value)}
                          placeholder="Ej: +591 70000000" />
                      </div>
                      <div className="form-group">
                        <label>País de nacimiento *</label>
                        <p className="verif-hint">País donde naciste según tu documento.</p>
                        <CountrySelect
                          label=""
                          value={birthCountry}
                          onChange={(val) => setBirthCountry(val)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Tipo de documento *</label>
                        <p className="verif-hint">Elige el tipo de documento de identidad.</p>
                        <select className="input" value={docType} onChange={e => setDocType(e.target.value)}>
                          <option value="">— Selecciona —</option>
                          <option value="ci">Cédula de Identidad (CI)</option>
                          <option value="pasaporte">Pasaporte</option>
                        </select>
                      </div>
                      <div className="form-group traf-data-full">
                        <label>Número de documento *</label>
                        <p className="verif-hint">Número tal cual aparece en tu documento de identidad o pasaporte.</p>
                        <input className="input" value={docNumber}
                          onChange={e => setDocNumber(e.target.value)}
                          placeholder="Ej: 12345678" />
                      </div>
                    </div>
                  </>
                )}

                {error && <div className="mc-error">{error}</div>}
                {saved === 'personal' && <div className="mc-success">Datos personales guardados y fijados</div>}

                {!isPersonalLocked && (
                  <div className="verif-footer">
                    <button className="btn btn-primary t-btn-primary" onClick={savePersonal} disabled={saving}>
                      {saving ? <><span className="loading" style={{ width: 16, height: 16 }} /> Guardando...</> : 'Guardar y fijar datos personales'}
                    </button>
                  </div>
                )}
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

                {profile?.address_locked ? (
                  <div className="mc-locked-address">
                    <div className="mc-locked-address-icon">📍</div>
                    <div>
                      <div className="mc-locked-address-city">{profile.address_city}</div>
                      <div className="mc-locked-address-text">{profile.address_text}</div>
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
                        {(addressCoords || addressCoordsFromCity) && (
                          <span className="mc-coords-badge">
                            {(addressCoords || addressCoordsFromCity).lat.toFixed(5)}, {(addressCoords || addressCoordsFromCity).lng.toFixed(5)}
                          </span>
                        )}
                      </div>
                      {showMap && (
                        <div className="mc-map">
                          <MapContainer center={addressCoords || addressCoordsFromCity || [-17.8, -63.18]} zoom={13}
                            style={{ height: '280px', borderRadius: '12px' }}>
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <MapPicker onSelect={(coords) => { setAddressCoords(coords) }} />
                            {(addressCoords || addressCoordsFromCity) && <Marker position={[(addressCoords || addressCoordsFromCity).lat, (addressCoords || addressCoordsFromCity).lng]} />}
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
            {location.pathname === '/packer/mi-cuenta/viajes' && (
              <MiCuentaMisViajes user={user} />
            )}

            {/* ══ RUTAS HIJAS (Verificación / Reseñas / Nivel) ══ */}
            {location.pathname !== '/packer/mi-cuenta' && location.pathname !== '/packer/mi-cuenta/viajes' && (
              <Outlet context={{ profile, reviews, reviewsLoading }} />
            )}

          </main>
        </div>
      </div>
    </div>
  )
}
