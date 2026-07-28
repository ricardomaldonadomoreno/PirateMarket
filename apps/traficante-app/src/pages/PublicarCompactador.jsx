import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import { supabase } from '../../../pirata-market/src/lib/supabase'
import CityAutocomplete from '../../../pirata-market/src/components/CityAutocomplete'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Package, MapPin, Clock, DollarSign, FileText,
  AlertTriangle, CheckCircle2, Info, ShieldAlert,
  Home, Truck, Users
} from 'lucide-react'
import './PublicarService.css'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const CURRENCIES = ['USD', 'BOB', 'BRL', 'ARS', 'PEN', 'CLP', 'PYG']
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const ADVANTAGES = [
  {
    Icon: Home,
    title: 'Recibes paquetes en tu casa',
    desc: 'Juntas todo y haces un solo envío consolidado. No necesitas viajar, todo desde tu domicilio verificado.'
  },
  {
    Icon: Users,
    title: 'Facilitas la vida de otros',
    desc: 'Tu punto de compactación ayuda a muchas personas que no tienen que ir hasta una terminal. Puedes recibir entregas por delivery y ellos se olvidan del protocolo de ir personalmente.'
  },
  {
    Icon: Truck,
    title: 'Envíos locales son menos exigentes',
    desc: 'Este servicio es ideal para envíos dentro de un mismo país. Menos burocracia, menos costos, más velocidad.'
  },
]

const WARNINGS = [
  'Revisa cada paquete que vas a enviar. El descompactador no te puede fallar y tú no puedes fallar al dar el servicio.',
  'No envíes nada ilegal. Eres responsable del contenido de cada paquete que consolidas.',
  'Este servicio es recomendado para envíos dentro de un mismo país.',
  'Define bien tus horarios de recepción para que los remitentes sepan cuándo pueden entregar.',
]

const DEFAULT_SCHEDULE = Array(7).fill(null).map(() => ({ active: false, open: '08:00', close: '18:00' }))

function MapPicker({ onSelect }) {
  useMapEvents({
    click(e) { onSelect({ lat: e.latlng.lat, lng: e.latlng.lng }) }
  })
  return null
}

export default function PublicarCompactador({ user }) {
  const navigate = useNavigate()

  // Origen (punto de recepción)
  const [originCity, setOriginCity] = useState(null)
  const [originAddress, setOriginAddress] = useState('')
  const [originCoords, setOriginCoords] = useState(null)
  const [showOriginMap, setShowOriginMap] = useState(false)

  // Destino (opcional)
  const [destinationCity, setDestinationCity] = useState(null)
  const [destinationAddress, setDestinationAddress] = useState('')
  const [destinationCoords, setDestinationCoords] = useState(null)
  const [showDestMap, setShowDestMap] = useState(false)

  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE)
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

  const toggleDay = (i) => {
    setSchedule(prev => prev.map((d, idx) => idx === i ? { ...d, active: !d.active } : d))
  }

  const updateDayHours = (i, field, value) => {
    setSchedule(prev => prev.map((d, idx) => idx === i ? { ...d, [field]: value } : d))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!identityVerified) {
      setError('Debes verificar tu identidad antes de publicar un servicio. Ve a Mi Cuenta > Verificación.')
      return
    }
    if (!originCity) {
      setError('Completa tu punto de recepción')
      return
    }
    if (!schedule.some(d => d.active)) {
      setError('Selecciona al menos un día de recepción')
      return
    }

    setLoading(true)
    setError('')

    const activeDays = schedule.filter(d => d.active)
    const scheduleStr = activeDays
      .map(d => `${DAYS[schedule.indexOf(d)]}: ${d.open}-${d.close}`)
      .join(' | ')

    const fullDesc = description
      ? `${description}\n\nHorario: ${scheduleStr}`
      : `Horario de recepción: ${scheduleStr}`

    const payload = {
      user_id: user.id,
      type: 'compactador',
      status: 'activo',
      origin_city: originCity.city,
      origin_country: originCity.country,
      origin_lat: originCoords?.lat || originCity.lat,
      origin_lng: originCoords?.lng || originCity.lng,
      origin_address: originAddress,
      destination_city: destinationCity?.city || null,
      destination_country: destinationCity?.country || null,
      destination_lat: destinationCoords?.lat || destinationCity?.lat || null,
      destination_lng: destinationCoords?.lng || destinationCity?.lng || null,
      destination_address: destinationAddress,
      currency,
      description: fullDesc,
      price: price ? parseFloat(price) : null,
      departure_date: null,
      arrival_date: null,
      transport_mode: null,
      max_weight_kg: null,
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
            <div className="pub-header-icon"><Package size={24} /></div>
            <h1 className="pub-title">Publicar servicio de compactación</h1>
            <p className="pub-subtitle">Recibes paquetes en tu casa, los juntas y envías un solo envío consolidado.</p>
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
              <ShieldAlert size={15} /> Lo que debes sabes
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
                <span className="pub-verified-hint">Rellena tu punto de recepción con tu ciudad verificada</span>
              ) : (
                <span className="pub-verified-hint pub-verified-hint-warn">No tienes dirección fijada. Fíjala en Mi Cuenta primero.</span>
              )}
            </div>

            {/* ORIGEN (punto de recepción) */}
            <div className="pub-section">
              <div className="pub-section-label"><Home size={14} /> ¿Dónde recibes los paquetes?</div>
              <p className="pub-hint">Esta es la dirección donde los remitentes llevarán sus paquetes para que tú los consolides y envíes.</p>
              <div className="pub-address-block">
                <CityAutocomplete
                  label="Ciudad y país"
                  placeholder="Escribe tu ciudad"
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

            {/* DESTINO (opcional) */}
            <div className="pub-section">
              <div className="pub-section-label"><MapPin size={14} /> ¿A dónde envías consolidado? <small style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opcional)</small></div>
              <div className="pub-address-block">
                <CityAutocomplete
                  label="Ciudad y país"
                  placeholder="Ej: La Paz, Bolivia"
                  value={destinationCity}
                  onChange={setDestinationCity}
                />
                <div className="pub-field" style={{ marginTop: '0.75rem' }}>
                  <label>Dirección exacta</label>
                  <input className="input" placeholder="Ej: Terminal Tietê / Punto de distribución"
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

            {/* HORARIO */}
            <div className="pub-section">
              <div className="pub-section-label"><Clock size={14} /> Horario de recepción</div>
              <p className="pub-hint">Selecciona los días y horas que recibes paquetes en tu domicilio.</p>
              <div className="pub-days-grid">
                {DAYS.map((day, i) => (
                  <div key={day} className="pub-day-row">
                    <button
                      type="button"
                      className={`pub-chip pub-day-chip ${schedule[i].active ? 'active' : ''}`}
                      onClick={() => toggleDay(i)}
                    >
                      {day}
                    </button>
                    {schedule[i].active && (
                      <div className="pub-day-hours">
                        <input className="input pub-time-input" type="time"
                          value={schedule[i].open}
                          onChange={e => updateDayHours(i, 'open', e.target.value)} />
                        <span className="pub-time-sep">—</span>
                        <input className="input pub-time-input" type="time"
                          value={schedule[i].close}
                          onChange={e => updateDayHours(i, 'close', e.target.value)} />
                      </div>
                    )}
                  </div>
                ))}
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
                  <label>Precio por sobre/unidad</label>
                  <input className="input" type="number" min="0" step="0.5" placeholder="Ej: 5" value={price} onChange={e => setPrice(e.target.value)} />
                </div>
              </div>
            </div>

            {/* DESCRIPCIÓN */}
            <div className="pub-section">
              <div className="pub-section-label"><FileText size={14} /> Descripción y condiciones</div>
              <textarea
                className="input textarea"
                rows={4}
                placeholder="Ej: Envío los paquetes cada lunes. Embalaje incluido. El receptor recoge en terminal. Acepto ropa, documentos, cosméticos. No acepto líquidos ni alimentos perecederos."
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
                {loading ? 'Publicando...' : 'Publicar compactación'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  )
}
