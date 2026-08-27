import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import { supabase } from '../../../pirata-market/src/lib/supabase'
import CityAutocomplete from '../../../pirata-market/src/components/CityAutocomplete'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Plane, MapPin, Calendar, Weight, DollarSign, FileText,
  AlertTriangle, CheckCircle2, Info, ShieldAlert, ArrowRight
} from 'lucide-react'
import './PublicarService.css'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const CURRENCIES = ['USD', 'BOB', 'BRL', 'ARS', 'PEN', 'CLP', 'PYG']
const TRANSPORT_MODES = [
  { value: 'avion', label: 'Avión' },
  { value: 'bus',   label: 'Bus' },
  { value: 'auto',  label: 'Auto' },
  { value: 'tren',  label: 'Tren' },
  { value: 'otro',  label: 'Otro' },
]

const ADVANTAGES = [
  { Icon: DollarSign, title: 'Monetiza tu equipaje', desc: 'Tienes espacio libre en tu maleta y ya ibas a viajar de todas formas. Cada paquete es ingreso extra.' },
  { Icon: CheckCircle2, title: 'Verificación te da confianza', desc: 'Tu dirección verificada es tu garantía. El remitente sabe exactamente desde dónde sale el paquete.' },
  { Icon: ArrowRight, title: 'Sin complicaciones', desc: 'Publicas tu ruta, recibes solicitudes, aceptas las que quieras. Tú decides cuánto llevas y a qué precio.' },
  { Icon: ShieldAlert, title: 'Dedícate a esto', desc: 'Transporta objetos de valor de ciudad a ciudad. Gana dinero fijo ofreciendo garantía a través de nuestra plataforma.' },
]

const WARNINGS = [
  'Solo acepta paquetes bien embalados y sellados.',
  'Verifica que no contengan productos ilegales.',
  'Cumple la legislación aduanera del país de destino.',
  'Tu nivel de confianza sube con cada entrega exitosa.',
]

function MapPicker({ onSelect }) {
  useMapEvents({
    click(e) { onSelect({ lat: e.latlng.lat, lng: e.latlng.lng }) }
  })
  return null
}

export default function PublicarViajero({ user }) {
  const navigate = useNavigate()
  const [originCity, setOriginCity] = useState(null)
  const [originAddress, setOriginAddress] = useState('')
  const [originCoords, setOriginCoords] = useState(null)
  const [showOriginMap, setShowOriginMap] = useState(false)

  const [destinationCity, setDestinationCity] = useState(null)
  const [destinationAddress, setDestinationAddress] = useState('')
  const [destinationCoords, setDestinationCoords] = useState(null)
  const [showDestMap, setShowDestMap] = useState(false)

  const [departureDate, setDepartureDate] = useState('')
  const [arrivalDate, setArrivalDate] = useState('')
  const [transportMode, setTransportMode] = useState('')
  const [maxWeight, setMaxWeight] = useState('')
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [pricePerKg, setPricePerKg] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [verificationApproved, setVerificationApproved] = useState(false)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [verifiedAddr, setVerifiedAddr] = useState(null)
  const [verifiedUsedFor, setVerifiedUsedFor] = useState(null) // 'origin' | 'destination' | null

  useEffect(() => {
    if (!user) { navigate('/auth'); return }
    Promise.all([
      supabase
        .from('packer_profiles')
        .select('address_city, address_country, address_text, address_lat, address_lng, address_locked')
        .eq('id', user.id)
        .maybeSingle(),
      supabase
        .from('packer_verification_requests')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]).then(([{ data: profileData }, { data: verificationData }]) => {
      if (profileData?.address_city && profileData.address_text && profileData.address_locked) {
        setVerifiedAddr({
          city: profileData.address_city,
          country: profileData.address_country,
          addressText: profileData.address_text,
          lat: profileData.address_lat,
          lng: profileData.address_lng,
        })
      }
      setVerificationApproved(verificationData?.status === 'approved')
      setProfileLoaded(true)
    })
  }, [user])

  // Al seleccionar ciudad, mostrar sus coords como referencia (solo si no hay coords manuales previas)
  const [originCoordsFromCity, setOriginCoordsFromCity] = useState(null)
  const [destinationCoordsFromCity, setDestinationCoordsFromCity] = useState(null)

  useEffect(() => {
    if (originCity?.lat && originCity?.lng) {
      setOriginCoordsFromCity({ lat: originCity.lat, lng: originCity.lng })
    }
  }, [originCity])

  useEffect(() => {
    if (destinationCity?.lat && destinationCity?.lng) {
      setDestinationCoordsFromCity({ lat: destinationCity.lat, lng: destinationCity.lng })
    }
  }, [destinationCity])

  const getGPS = (setCoords) => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(pos => {
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
    })
  }

  const fillWithVerifiedAddress = (target) => {
    if (!verifiedAddr) return
    if (target === 'origin' && !originCity) {
      setOriginCity({ city: verifiedAddr.city, country: verifiedAddr.country, lat: verifiedAddr.lat, lng: verifiedAddr.lng })
      setOriginAddress(verifiedAddr.addressText)
      setOriginCoords({ lat: verifiedAddr.lat, lng: verifiedAddr.lng })
      setVerifiedUsedFor('origin')
    } else if (target === 'destination' && !destinationCity) {
      setDestinationCity({ city: verifiedAddr.city, country: verifiedAddr.country, lat: verifiedAddr.lat, lng: verifiedAddr.lng })
      setDestinationAddress(verifiedAddr.addressText)
      setDestinationCoords({ lat: verifiedAddr.lat, lng: verifiedAddr.lng })
      setVerifiedUsedFor('destination')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!verificationApproved) {
      setError('Debes verificar tu identidad y domicilio físico antes de publicar un servicio. Ve a Mi Cuenta > Verificación.')
      return
    }
    if (!originCity || !destinationCity) {
      setError('Completa el origen y destino')
      return
    }
    if (!departureDate) {
      setError('Indica la fecha de salida')
      return
    }

    setLoading(true)
    setError('')

    const payload = {
      user_id: user.id,
      type: 'viajero',
      status: 'activo',
      origin_city: originCity.city,
      origin_lat: originCoords?.lat || originCity.lat,
      origin_lng: originCoords?.lng || originCity.lng,
      origin_address: originAddress,
      destination_city: destinationCity.city,
      destination_lat: destinationCoords?.lat || destinationCity.lat,
      destination_lng: destinationCoords?.lng || destinationCity.lng,
      destination_address: destinationAddress,
      currency,
      description,
      price: price ? parseFloat(price) : null,
      price_per_kg: pricePerKg ? parseFloat(pricePerKg) : null,
      departure_date: departureDate,
      arrival_date: arrivalDate || null,
      transport_mode: transportMode,
      max_weight_kg: maxWeight ? parseFloat(maxWeight) : null,
      accepted_types: [],
      rejected_types: [],
    }

    const { error: dbError } = await supabase.from('packer_trips').insert(payload)
    setLoading(false)

    if (dbError) {
      setError(dbError.message)
    } else {
      navigate('/packer/mi-cuenta/viajes')
    }
  }

  const renderFixedAddress = (city, address, coords) => {
    const hasCoordinates = coords
      && Number.isFinite(Number(coords.lat))
      && Number.isFinite(Number(coords.lng))

    return (
      <div className="pub-fixed-address-card">
        <div className="pub-fixed-address-icon"><MapPin size={20} /></div>
        <div className="pub-fixed-address-content">
          <div className="pub-fixed-address-city">{city?.city || city}</div>
          <div className="pub-fixed-address-text">{address}</div>
          {hasCoordinates && (
            <div className="pub-fixed-address-coords">
              {Number(coords.lat).toFixed(5)}, {Number(coords.lng).toFixed(5)}
            </div>
          )}
        </div>
        <div className="pub-fixed-address-badge">Dirección fija</div>
      </div>
    )
  }

  return (
    <div className="pub-page">
      <div className="pub-layout container">
        {/* ── Columna izquierda: descripción ── */}
        <div className="pub-info-col">
          <div className="pub-header">
            <div className="pub-header-icon"><Plane size={24} /></div>
            <h1 className="pub-title">Publicar viaje como viajero</h1>
            <p className="pub-subtitle">Tienes un viaje programado y espacio libre en tu equipaje. Monétizalo.</p>
          </div>

          <div className="pub-info-grid">
            {ADVANTAGES.map((a, i) => (
              <div key={i} className="pub-info-card">
                <a.Icon size={18} className="pub-info-icon" />
                <strong className="pub-info-title">{a.title}</strong>
                <span className="pub-info-desc">{a.desc}</span>
              </div>
            ))}
          </div>

          <div className="pub-warnings">
            <h3 className="pub-warnings-title">
              <ShieldAlert size={15} /> Lo que debes saber
            </h3>
            <ul className="pub-warnings-list">
              {WARNINGS.map((w, i) => (
                <li key={i}>
                  <Info size={13} className="pub-warn-icon" />
                  {w}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Columna derecha: formulario ── */}
        <div className="pub-form-col">
          <form onSubmit={handleSubmit} className="pub-form">
            {profileLoaded && !verificationApproved && (
              <div className="pub-verification-notice" role="status">
                <ShieldAlert size={17} />
                <span>Debes verificar tu identidad y domicilio físico antes de publicar un servicio. Ve a Mi Cuenta &gt; Verificación.</span>
              </div>
            )}

            {/* ORIGEN */}
            <div className="pub-section">
              <div className="pub-section-label"><MapPin size={14} /> ¿Dónde puedes recibir el paquete?</div>
              <p className="pub-hint">Indica tu domicilio o un punto de encuentro cercano donde el remitente te entregará el paquete.</p>
              {verifiedUsedFor === 'origin' ? (
                renderFixedAddress(originCity, originAddress, originCoords || originCoordsFromCity)
              ) : (
                <>
                  <div className="pub-verified-section-row">
                    <button type="button" className="pub-verified-section-btn" onClick={() => fillWithVerifiedAddress('origin')} disabled={!verifiedAddr}>
                  <MapPin size={13} /> Usar mi dirección oficial
                </button>

              </div>
              <div className="pub-address-block">
                <CityAutocomplete
                  label="Ciudad y país"
                  placeholder="Escribe la ciudad de origen"
                  value={originCity}
                  onChange={setOriginCity}
                />
                <div className="pub-field" style={{ marginTop: '0.75rem' }}>
                  <label>Dirección exacta</label>
                  <input className="input" placeholder="Ej: Av. Roca y Coronado #450, Villa 1ro de Mayo"
                    value={originAddress} onChange={e => setOriginAddress(e.target.value)} />
                </div>
                <div className="pub-gps-row">
                  <button type="button" className="btn btn-secondary pub-gps-btn" onClick={() => getGPS(setOriginCoords)}>
                    Usar mi ubicación actual
                  </button>
                  <button type="button" className="btn btn-secondary pub-gps-btn" onClick={() => setShowOriginMap(!showOriginMap)}>
                    {showOriginMap ? 'Cerrar mapa' : 'Pinchar en mapa'}
                  </button>
                  {(originCoords || originCoordsFromCity) && (
                    <span className="pub-coords-badge">
                      {(originCoords || originCoordsFromCity).lat.toFixed(5)}, {(originCoords || originCoordsFromCity).lng.toFixed(5)}
                    </span>
                  )}
                </div>
                {showOriginMap && (
                  <div className="pub-map">
                    <MapContainer center={originCoords || originCoordsFromCity || [-17.8, -63.18]} zoom={13}
                      style={{ height: '280px', borderRadius: '12px' }}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <MapPicker onSelect={(coords) => setOriginCoords(coords)} />
                      {(originCoords || originCoordsFromCity) && <Marker position={[(originCoords || originCoordsFromCity).lat, (originCoords || originCoordsFromCity).lng]} />}
                    </MapContainer>
                    <p className="pub-map-hint">Haz clic en el mapa para marcar el punto exacto</p>
                  </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* DESTINO */}
            <div className="pub-section">
              <div className="pub-section-label"><MapPin size={14} /> ¿Dónde entregarás el paquete?</div>
              <p className="pub-hint">Indica dónde estarás al llegar — tu hotel, domicilio o un punto acordado donde el receptor pueda recoger.</p>
              {verifiedUsedFor === 'destination' ? (
                renderFixedAddress(destinationCity, destinationAddress, destinationCoords || destinationCoordsFromCity)
              ) : (
                <>
                  <div className="pub-verified-section-row">
                    <button type="button" className="pub-verified-section-btn" onClick={() => fillWithVerifiedAddress('destination')} disabled={!verifiedAddr}>
                  <MapPin size={13} /> Usar mi dirección oficial
                </button>

              </div>
              <div className="pub-address-block">
                <CityAutocomplete
                  label="Ciudad y país"
                  placeholder="Escribe la ciudad de destino"
                  value={destinationCity}
                  onChange={setDestinationCity}
                />
                <div className="pub-field" style={{ marginTop: '0.75rem' }}>
                  <label>Dirección exacta</label>
                  <input className="input" placeholder="Ej: Terminal Tietê / Mi hotel en Liberdade"
                    value={destinationAddress} onChange={e => setDestinationAddress(e.target.value)} />
                </div>
                <div className="pub-gps-row">
                  <button type="button" className="btn btn-secondary pub-gps-btn" onClick={() => getGPS(setDestinationCoords)}>
                    Usar mi ubicación actual
                  </button>
                  <button type="button" className="btn btn-secondary pub-gps-btn" onClick={() => setShowDestMap(!showDestMap)}>
                    {showDestMap ? 'Cerrar mapa' : 'Pinchar en mapa'}
                  </button>
                  {(destinationCoords || destinationCoordsFromCity) && (
                    <span className="pub-coords-badge">
                      {(destinationCoords || destinationCoordsFromCity).lat.toFixed(5)}, {(destinationCoords || destinationCoordsFromCity).lng.toFixed(5)}
                    </span>
                  )}
                </div>
                {showDestMap && (
                  <div className="pub-map">
                    <MapContainer center={destinationCoords || destinationCoordsFromCity || [-17.8, -63.18]} zoom={13}
                      style={{ height: '280px', borderRadius: '12px' }}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <MapPicker onSelect={(coords) => setDestinationCoords(coords)} />
                      {(destinationCoords || destinationCoordsFromCity) && <Marker position={[(destinationCoords || destinationCoordsFromCity).lat, (destinationCoords || destinationCoordsFromCity).lng]} />}
                    </MapContainer>
                    <p className="pub-map-hint">Haz clic en el mapa para marcar el punto exacto</p>
                  </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* FECHA */}
            <div className="pub-section">
              <div className="pub-section-label"><Calendar size={14} /> Fechas del viaje</div>
              <p className="pub-hint">La fecha de llegada ayuda al receptor a saber cuándo estará disponible su paquete.</p>
              <div className="pub-row">
                <div className="pub-field">
                  <label>Fecha de salida</label>
                  <input className="input" type="date" value={departureDate} onChange={e => setDepartureDate(e.target.value)} />
                </div>
                <div className="pub-field">
                  <label>Fecha de llegada</label>
                  <input className="input" type="date" value={arrivalDate} onChange={e => setArrivalDate(e.target.value)} />
                </div>
              </div>
            </div>

            {/* TRANSPORTE */}
            <div className="pub-section">
              <div className="pub-section-label"><Plane size={14} /> ¿Cómo viajas?</div>
              <div className="pub-chips">
                {TRANSPORT_MODES.map(m => (
                  <button
                    key={m.value}
                    type="button"
                    className={`pub-chip ${transportMode === m.value ? 'active' : ''}`}
                    onClick={() => setTransportMode(m.value)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* PESO */}
            <div className="pub-section">
              <div className="pub-section-label"><Weight size={14} /> Peso disponible</div>
              <div className="pub-field">
                <label>Peso máximo que puedes llevar (kg)</label>
                <input className="input" type="number" min="0" step="0.5" placeholder="Ej: 10" value={maxWeight} onChange={e => setMaxWeight(e.target.value)} />
              </div>
            </div>

            {/* PRECIO */}
            <div className="pub-section">
              <div className="pub-section-label"><DollarSign size={14} /> Precio</div>
              <div className="pub-row">
                <div className="pub-field">
                  <label>Moneda</label>
                  <select className="input" value={currency} onChange={e => setCurrency(e.target.value)}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="pub-field">
                  <label>Precio por paquete</label>
                  <input className="input" type="number" min="0" step="0.5" placeholder="Ej: 15" value={price} onChange={e => setPrice(e.target.value)} />
                </div>
                <div className="pub-field">
                  <label>Precio por kg (opcional)</label>
                  <input className="input" type="number" min="0" step="0.5" placeholder="Ej: 5" value={pricePerKg} onChange={e => setPricePerKg(e.target.value)} />
                </div>
              </div>
            </div>

            {/* DESCRIPCIÓN */}
            <div className="pub-section">
              <div className="pub-section-label"><FileText size={14} /> Descripción y condiciones</div>
              <textarea
                className="input textarea"
                rows={4}
                placeholder="Ej: Solo acepto paquetes bien embalados. Me reúno en el aeropuerto 2 horas antes del vuelo. No acepto líquidos ni electrónicos."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            {error && (
              <div className="pub-error">
                <AlertTriangle size={14} /> {error}
              </div>
            )}

            <div className="pub-actions">
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/packer')}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary t-btn-primary" disabled={loading}>
                {loading ? 'Publicando...' : 'Publicar viaje'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  )
}
