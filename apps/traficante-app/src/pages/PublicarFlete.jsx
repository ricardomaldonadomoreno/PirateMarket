import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import { supabase } from '../../../pirata-market/src/lib/supabase'
import CityAutocomplete from '../../../pirata-market/src/components/CityAutocomplete'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Car, MapPin, Repeat, Weight, DollarSign, FileText,
  AlertTriangle, CheckCircle2, Info, ShieldAlert,
  Truck
} from 'lucide-react'
import './PublicarService.css'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const CURRENCIES = ['USD', 'BOB', 'BRL', 'ARS', 'PEN', 'CLP', 'PYG']
const FREQUENCIES = [
  { value: 'diario',   label: 'Diario' },
  { value: 'semanal',  label: 'Semanal' },
  { value: 'quincenal', label: 'Quincenal' },
  { value: 'mensual',  label: 'Mensual' },
]
const VEHICLE_TYPES = [
  { value: 'auto',       label: 'Auto' },
  { value: 'camioneta',  label: 'Camioneta' },
  { value: 'van',        label: 'Van / Minibús' },
  { value: 'camion',     label: 'Camión' },
  { value: 'moto',       label: 'Moto' },
  { value: 'otro',       label: 'Otro' },
]

const ADVANTAGES = [
  {
    Icon: Repeat,
    title: 'Ruta fija, ingreso constante',
    desc: 'Tienes un vehículo y viajas siempre entre las mismas ciudades. Cada viaje es una oportunidad de llenar el espacio vacío con carga que genera ingresos.'
  },
  {
    Icon: Truck,
    title: 'Mayor capacidad que un viajero',
    desc: 'Tu vehículo transporta más que el equipaje de un viajero. Puedes ofrecer espacio por kg o por volumen, lo que atrae a clientes con cargas más grandes.'
  },
  {
    Icon: CheckCircle2,
    title: 'Servicio recurrente',
    desc: 'Los clientes saben que siempre estarás disponible en tu ruta. Pueden planificar envíos con confianza y tú tienes demanda constante.'
  },
]

const WARNINGS = [
  'Verifica la documentación de la carga antes de aceptarla.',
  'No transportes mercancía ilegal ni sin documentación aduanera.',
  'Define claramente los límites de peso y volumen que acepta tu vehículo.',
  'Cumple con las regulaciones de transporte de tu país.',
]

function MapPicker({ onSelect }) {
  useMapEvents({
    click(e) { onSelect({ lat: e.latlng.lat, lng: e.latlng.lng }) }
  })
  return null
}

export default function PublicarFlete({ user }) {
  const navigate = useNavigate()

  // Origen
  const [originCity, setOriginCity] = useState(null)
  const [originAddress, setOriginAddress] = useState('')
  const [originCoords, setOriginCoords] = useState(null)
  const [showOriginMap, setShowOriginMap] = useState(false)

  // Destino
  const [destinationCity, setDestinationCity] = useState(null)
  const [destinationAddress, setDestinationAddress] = useState('')
  const [destinationCoords, setDestinationCoords] = useState(null)
  const [showDestMap, setShowDestMap] = useState(false)

  const [frequency, setFrequency] = useState('')
  const [vehicleType, setVehicleType] = useState('')
  const [capacity, setCapacity] = useState('')
  const [pricePerKg, setPricePerKg] = useState('')
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [identityVerified, setIdentityVerified] = useState(false)
  const [verifiedAddr, setVerifiedAddr] = useState(null)
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

  const getGPS = (setCoords) => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(pos => {
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
    })
  }

  const fillWithVerifiedAddress = () => {
    if (!verifiedAddr) return
    if (!originCity) {
      setOriginCity({ city: verifiedAddr.city, country: verifiedAddr.country, lat: verifiedAddr.lat, lng: verifiedAddr.lng })
      setOriginCoords({ lat: verifiedAddr.lat, lng: verifiedAddr.lng })
    }
    if (!destinationCity) {
      setDestinationCity({ city: verifiedAddr.city, country: verifiedAddr.country, lat: verifiedAddr.lat, lng: verifiedAddr.lng })
      setDestinationCoords({ lat: verifiedAddr.lat, lng: verifiedAddr.lng })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!identityVerified) {
      setError('Debes verificar tu identidad antes de publicar un servicio. Ve a Mi Cuenta > Verificación.')
      return
    }
    if (!originCity || !destinationCity) {
      setError('Completa el origen y destino de tu ruta')
      return
    }
    if (!frequency || !vehicleType) {
      setError('Selecciona la frecuencia y tipo de vehículo')
      return
    }

    setLoading(true)
    setError('')

    const freqLabel = FREQUENCIES.find(f => f.value === frequency)?.label || ''
    const fullDesc = description
      ? `${description}\n\nFrecuencia: ${freqLabel}`
      : `Frecuencia del servicio: ${freqLabel}`

    const payload = {
      user_id: user.id,
      type: 'flete',
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
      description: fullDesc,
      price: price ? parseFloat(price) : null,
      price_per_kg: pricePerKg ? parseFloat(pricePerKg) : null,
      departure_date: null,
      arrival_date: null,
      transport_mode: vehicleType,
      max_weight_kg: capacity ? parseFloat(capacity) : null,
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
            <div className="pub-header-icon"><Car size={24} /></div>
            <h1 className="pub-title">Publicar servicio de flete</h1>
            <p className="pub-subtitle">Tienes un vehículo y una ruta fija. Llena tu espacio vacío con carga pagada.</p>
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

            {/* ── BOTÓN USAR DIRECCIÓN OFICIAL ── */}
            <div className="pub-verified-row">
              <button type="button" className="pub-verified-btn" onClick={fillWithVerifiedAddress} disabled={!verifiedAddr}>
                <MapPin size={14} /> Usar mi dirección oficial
              </button>
              {verifiedAddr ? (
                <span className="pub-verified-hint">Rellena origen y destino con tu ciudad verificada</span>
              ) : (
                <span className="pub-verified-hint pub-verified-hint-warn">No tienes dirección fijada. Fíjala en Mi Cuenta primero.</span>
              )}
            </div>

            {/* ORIGEN */}
            <div className="pub-section">
              <div className="pub-section-label"><MapPin size={14} /> ¿Desde dónde sale tu vehículo?</div>
              <p className="pub-hint">Indica tu punto de partida — almacén, terminal o domicilio.</p>
              <div className="pub-address-block">
                <CityAutocomplete
                  label="Ciudad y país"
                  placeholder="Escribe la ciudad de origen"
                  value={originCity}
                  onChange={setOriginCity}
                />
                <div className="pub-field" style={{ marginTop: '0.75rem' }}>
                  <label>Dirección exacta</label>
                  <input className="input" placeholder="Ej: Terminal de cargas, Av. Principal #200"
                    value={originAddress} onChange={e => setOriginAddress(e.target.value)} />
                </div>
                <div className="pub-gps-row">
                  <button type="button" className="btn btn-secondary pub-gps-btn" onClick={() => getGPS(setOriginCoords)}>
                    Usar mi ubicación actual
                  </button>
                  <button type="button" className="btn btn-secondary pub-gps-btn" onClick={() => setShowOriginMap(!showOriginMap)}>
                    {showOriginMap ? 'Cerrar mapa' : 'Pinchar en mapa'}
                  </button>
                  {originCoords && (
                    <span className="pub-coords-badge">
                      {originCoords.lat.toFixed(5)}, {originCoords.lng.toFixed(5)}
                    </span>
                  )}
                </div>
                {showOriginMap && (
                  <div className="pub-map">
                    <MapContainer center={originCoords || [-17.8, -63.18]} zoom={13}
                      style={{ height: '280px', borderRadius: '12px' }}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <MapPicker onSelect={(coords) => { setOriginCoords(coords); setShowOriginMap(false) }} />
                      {originCoords && <Marker position={[originCoords.lat, originCoords.lng]} />}
                    </MapContainer>
                    <p className="pub-map-hint">Haz clic en el mapa para marcar el punto exacto</p>
                  </div>
                )}
              </div>
            </div>

            {/* DESTINO */}
            <div className="pub-section">
              <div className="pub-section-label"><MapPin size={14} /> ¿A dónde va tu vehículo?</div>
              <p className="pub-hint">Indica el punto de entrega — almacén, terminal o domicilio del receptor.</p>
              <div className="pub-address-block">
                <CityAutocomplete
                  label="Ciudad y país"
                  placeholder="Escribe la ciudad de destino"
                  value={destinationCity}
                  onChange={setDestinationCity}
                />
                <div className="pub-field" style={{ marginTop: '0.75rem' }}>
                  <label>Dirección exacta</label>
                  <input className="input" placeholder="Ej: Terminal de cargas, Zona Industrial"
                    value={destinationAddress} onChange={e => setDestinationAddress(e.target.value)} />
                </div>
                <div className="pub-gps-row">
                  <button type="button" className="btn btn-secondary pub-gps-btn" onClick={() => getGPS(setDestinationCoords)}>
                    Usar mi ubicación actual
                  </button>
                  <button type="button" className="btn btn-secondary pub-gps-btn" onClick={() => setShowDestMap(!showDestMap)}>
                    {showDestMap ? 'Cerrar mapa' : 'Pinchar en mapa'}
                  </button>
                  {destinationCoords && (
                    <span className="pub-coords-badge">
                      {destinationCoords.lat.toFixed(5)}, {destinationCoords.lng.toFixed(5)}
                    </span>
                  )}
                </div>
                {showDestMap && (
                  <div className="pub-map">
                    <MapContainer center={destinationCoords || [-17.8, -63.18]} zoom={13}
                      style={{ height: '280px', borderRadius: '12px' }}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <MapPicker onSelect={(coords) => { setDestinationCoords(coords); setShowDestMap(false) }} />
                      {destinationCoords && <Marker position={[destinationCoords.lat, destinationCoords.lng]} />}
                    </MapContainer>
                    <p className="pub-map-hint">Haz clic en el mapa para marcar el punto exacto</p>
                  </div>
                )}
              </div>
            </div>

            {/* FRECUENCIA */}
            <div className="pub-section">
              <div className="pub-section-label"><Repeat size={14} /> ¿Con qué frecuencia viajas esta ruta?</div>
              <div className="pub-chips">
                {FREQUENCIES.map(f => (
                  <button
                    key={f.value}
                    type="button"
                    className={`pub-chip ${frequency === f.value ? 'active' : ''}`}
                    onClick={() => setFrequency(f.value)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* TIPO DE VEHÍCULO */}
            <div className="pub-section">
              <div className="pub-section-label"><Car size={14} /> ¿Qué tipo de vehículo usas?</div>
              <div className="pub-chips">
                {VEHICLE_TYPES.map(v => (
                  <button
                    key={v.value}
                    type="button"
                    className={`pub-chip ${vehicleType === v.value ? 'active' : ''}`}
                    onClick={() => setVehicleType(v.value)}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* CAPACIDAD */}
            <div className="pub-section">
              <div className="pub-section-label"><Weight size={14} /> Capacidad de carga</div>
              <div className="pub-field">
                <label>Capacidad máxima disponible (kg)</label>
                <input className="input" type="number" min="0" step="1" placeholder="Ej: 500" value={capacity} onChange={e => setCapacity(e.target.value)} />
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
                  <label>Precio por carga completa</label>
                  <input className="input" type="number" min="0" step="1" placeholder="Ej: 200" value={price} onChange={e => setPrice(e.target.value)} />
                </div>
                <div className="pub-field">
                  <label>Precio por kg</label>
                  <input className="input" type="number" min="0" step="0.5" placeholder="Ej: 2" value={pricePerKg} onChange={e => setPricePerKg(e.target.value)} />
                </div>
              </div>
            </div>

            {/* DESCRIPCIÓN */}
            <div className="pub-section">
              <div className="pub-section-label"><FileText size={14} /> Descripción y condiciones</div>
              <textarea
                className="input textarea"
                rows={4}
                placeholder="Ej: Viajo cada lunes. Recibo carga en mi almacén el domingo por la tarde. Acepto carga seca, no peligrosa. Entrega en terminal de destino."
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
                {loading ? 'Publicando...' : 'Publicar flete'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  )
}
