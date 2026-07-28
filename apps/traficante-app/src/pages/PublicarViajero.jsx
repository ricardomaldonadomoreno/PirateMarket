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
  const [identityVerified, setIdentityVerified] = useState(false)
  const [verifiedAddr, setVerifiedAddr] = useState(null)
  const [verifiedUsedFor, setVerifiedUsedFor] = useState(null) // 'origin' | 'destination' | null
  const [loadingProfile, setLoadingProfile] = useState(true)

  useEffect(() => {
    if (!user) { navigate('/auth'); return }
    setLoadingProfile(true)
    supabase
      .from('users')
      .select('traficante_address_city, traficante_address_country, traficante_address_text, traficante_address_lat, traficante_address_lng, traficante_address_locked, traficante_identity_verified')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setIdentityVerified(!!data.traficante_identity_verified)
          if (data.traficante_address_city && data.traficante_address_locked) {
            setVerifiedAddr({
              city: data.traficante_address_city,
              country: data.traficante_address_country,
              lat: data.traficante_address_lat,
              lng: data.traficante_address_lng,
            })
          }
        }
        setLoadingProfile(false)
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
      setOriginCoords({ lat: verifiedAddr.lat, lng: verifiedAddr.lng })
      setVerifiedUsedFor('origin')
    } else if (target === 'destination' && !destinationCity) {
      setDestinationCity({ city: verifiedAddr.city, country: verifiedAddr.country, lat: verifiedAddr.lat, lng: verifiedAddr.lng })
      setDestinationCoords({ lat: verifiedAddr.lat, lng: verifiedAddr.lng })
      setVerifiedUsedFor('destination')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!identityVerified) {
      setError('Debes verificar tu identidad antes de publicar un servicio. Ve a Mi Cuenta > Verificación.')
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
      origin_country: originCity.country,
      origin_lat: originCoords?.lat || originCity.lat,
      origin_lng: originCoords?.lng || originCity.lng,
      origin_address: originAddress,
      destination_city: destinationCity.city,
      destination_country: destinationCity.country,
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

    const { error: dbError } = await supabase.from('traficante_trips').insert(payload)
    setLoading(false)

    if (dbError) {
      setError(dbError.message)
    } else {
      navigate('/traficante/mi-cuenta/viajes')
    }
  }

  if (loadingProfile) return <div className="pub-page"><div className="loading" style={{ width: 40, height: 40, margin: '4rem auto' }} /></div>

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

            {/* ORIGEN */}
            <div className="pub-section">
              <div className="pub-section-label"><MapPin size={14} /> ¿Dónde puedes recibir el paquete?</div>
              <p className="pub-hint">Indica tu domicilio o un punto de encuentro cercano donde el remitente te entregará el paquete.</p>
              <div className="pub-address-block">
                <CityAutocomplete
                  label="Ciudad y país"
                  placeholder="Escribe la ciudad de origen"
                  value={originCity}
                  onChange={setOriginCity}
                />
                <button type="button" className="pub-verified-inline-btn" onClick={() => fillWithVerifiedAddress('origin')} disabled={!verifiedAddr || verifiedUsedFor === 'destination'}>
                  <MapPin size={12} /> Usar mi dirección oficial
                </button>
                {verifiedUsedFor === 'destination' && verifiedAddr && (
                  <span className="pub-verified-inline-used">Ya usada en destino</span>
                )}
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
            </div>

            {/* DESTINO */}
            <div className="pub-section">
              <div className="pub-section-label"><MapPin size={14} /> ¿Dónde entregarás el paquete?</div>
              <p className="pub-hint">Indica dónde estarás al llegar — tu hotel, domicilio o un punto acordado donde el receptor pueda recoger.</p>
              <div className="pub-address-block">
                <CityAutocomplete
                  label="Ciudad y país"
                  placeholder="Escribe la ciudad de destino"
                  value={destinationCity}
                  onChange={setDestinationCity}
                />
                <button type="button" className="pub-verified-inline-btn" onClick={() => fillWithVerifiedAddress('destination')} disabled={!verifiedAddr || verifiedUsedFor === 'origin'}>
                  <MapPin size={12} /> Usar mi dirección oficial
                </button>
                {verifiedUsedFor === 'origin' && verifiedAddr && (
                  <span className="pub-verified-inline-used">Ya usada en origen</span>
                )}
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
            </div>

            {/* FECHAS */}
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
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/traficante')}>
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
