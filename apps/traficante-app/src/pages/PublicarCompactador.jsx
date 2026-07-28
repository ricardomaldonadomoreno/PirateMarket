import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import { supabase } from '../../../pirata-market/src/lib/supabase'
import CityAutocomplete from '../../../pirata-market/src/components/CityAutocomplete'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Package, MapPin, Clock, DollarSign, FileText,
  CheckCircle2, Info, ShieldAlert, Home, Truck, Users,
  Navigation, Navigation2
} from 'lucide-react'
import { Country, State } from 'country-state-city'
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
  { Icon: Home, title: 'Recibes paquetes en tu casa', desc: 'Juntas todo y haces un solo envío consolidado. No necesitas viajar, todo desde tu domicilio verificado.' },
  { Icon: Users, title: 'Facilitas la vida de otros', desc: 'Tu punto de compactación ayuda a muchas personas que no tienen que ir hasta una terminal. Puedes recibir entregas por delivery y ellos se olvidan del protocolo de ir personalmente.' },
  { Icon: Truck, title: 'Envíos locales son menos exigentes', desc: 'Este servicio es ideal para envíos dentro de un mismo país. Menos burocracia, menos costos, más velocidad.' },
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

  // Recepción (origen)
  const [receptionLoc, setReceptionLoc] = useState(null)
  const [receptionDetails, setReceptionDetails] = useState('')
  const [receptionCoords, setReceptionCoords] = useState(null)
  const [showReceptionMap, setShowReceptionMap] = useState(false)

  // Envío consolidado (destino)
  const [shipmentLoc, setShipmentLoc] = useState(null)
  const [shipmentDetails, setShipmentDetails] = useState('')
  const [shipmentCoords, setShipmentCoords] = useState(null)
  const [showShipmentMap, setShowShipmentMap] = useState(false)

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
            const countryName = data.traficante_address_country || ''
            const allCountries = Country.getAllCountries()
            const matchedCountry = allCountries.find(c => c.name.toLowerCase() === countryName.toLowerCase())
            const countryCode = matchedCountry?.isoCode || ''
            let stateCode = ''
            let stateName = ''
            if (countryCode) {
              const states = State.getStatesOfCountry(countryCode)
              const stateMatch = states.find(s => data.traficante_address_text?.toLowerCase().includes(s.name.toLowerCase()) || s.name.toLowerCase() === countryName.toLowerCase())
              if (stateMatch) { stateCode = stateMatch.isoCode; stateName = stateMatch.name }
            }
            setVerifiedAddr({
              city: data.traficante_address_city,
              country: countryName,
              country_code: countryCode,
              state: stateName,
              state_code: stateCode,
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

  const fillWithVerified = (target) => {
    if (!verifiedAddr) return
    if (target === 'reception' && !receptionLoc) {
      setReceptionLoc(verifiedAddr)
      setReceptionCoords({ lat: verifiedAddr.lat, lng: verifiedAddr.lng })
    } else if (target === 'shipment' && !shipmentLoc) {
      setShipmentLoc(verifiedAddr)
      setShipmentCoords({ lat: verifiedAddr.lat, lng: verifiedAddr.lng })
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
    if (!receptionLoc) {
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
      origin_city: receptionLoc.city,
      origin_country: receptionLoc.country,
      origin_state: receptionLoc.state || null,
      origin_state_code: receptionLoc.state_code || null,
      origin_country_code: receptionLoc.country_code || null,
      origin_lat: receptionCoords?.lat || receptionLoc.lat,
      origin_lng: receptionCoords?.lng || receptionLoc.lng,
      origin_address: receptionDetails,
      destination_city: shipmentLoc?.city || null,
      destination_country: shipmentLoc?.country || null,
      destination_state: shipmentLoc?.state || null,
      destination_state_code: shipmentLoc?.state_code || null,
      destination_country_code: shipmentLoc?.country_code || null,
      destination_lat: shipmentCoords?.lat || shipmentLoc?.lat || null,
      destination_lng: shipmentCoords?.lng || shipmentLoc?.lng || null,
      destination_address: shipmentDetails || null,
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
                <div className="pub-info-card-inner">
                  <a.Icon size={14} className="pub-info-icon" />
                  <strong className="pub-info-title">{a.title}</strong>
                </div>
                <span className="pub-info-desc">{a.desc}</span>
              </div>
            ))}
          </div>

          <div className="pub-warnings">
            <h3 className="pub-warnings-title"><ShieldAlert size={15} /> Lo que debes saber</h3>
            <ul className="pub-warnings-list">
              {WARNINGS.map((w, i) => (
                <li key={i}><Info size={13} className="pub-warn-icon" />{w}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Columna derecha: formulario ── */}
        <div className="pub-form-col">
          <form onSubmit={handleSubmit} className="pub-form">

            {/* ══════ RECEPCIÓN ══════ */}
            <div className="pub-section">
              <div className="pub-section-label"><Home size={14} /> ¿Dónde recibes los paquetes?</div>
              <p className="pub-hint">Tu punto de recepción. Esta es la dirección donde los remitentes llevarán sus paquetes.</p>
              <div className="pub-address-block">

                <CityAutocomplete
                  label="País, departamento y ciudad"
                  placeholder="Selecciona ubicación"
                  value={receptionLoc}
                  onChange={setReceptionLoc}
                  showVerifiedBtn={true}
                  onVerifiedClick={() => fillWithVerified('reception')}
                  hasVerifiedAddress={!!verifiedAddr}
                />

                <div className="pub-field">
                  <label>Detalles adicionales</label>
                  <input className="input" placeholder="Ej: Av. Roca y Coronado #450, Villa 1ro de Mayo"
                    value={receptionDetails} onChange={e => setReceptionDetails(e.target.value)} />
                </div>

                <div className="pub-gps-row">
                  <button type="button" className="btn btn-secondary pub-gps-btn" onClick={() => getGPS(setReceptionCoords)}>
                    <Navigation2 size={13} /> Usar mi ubicación actual
                  </button>
                  <button type="button" className="btn btn-secondary pub-gps-btn" onClick={() => setShowReceptionMap(!showReceptionMap)}>
                    <Navigation size={13} /> {showReceptionMap ? 'Cerrar mapa' : 'Pinchar en mapa'}
                  </button>
                  {receptionCoords && (
                    <span className="pub-coords-badge">{receptionCoords.lat.toFixed(5)}, {receptionCoords.lng.toFixed(5)}</span>
                  )}
                </div>

                {showReceptionMap && (
                  <div className="pub-map">
                    <MapContainer center={receptionCoords || [-17.8, -63.18]} zoom={13} style={{ height: '280px', borderRadius: '12px' }}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <MapPicker onSelect={(coords) => { setReceptionCoords(coords); setShowReceptionMap(false) }} />
                      {receptionCoords && <Marker position={[receptionCoords.lat, receptionCoords.lng]} />}
                    </MapContainer>
                    <p className="pub-map-hint">Haz clic en el mapa para marcar el punto exacto</p>
                  </div>
                )}
              </div>
            </div>

            {/* ══════ ENVÍO CONSOLIDADO (opcional) ══════ */}
            <div className="pub-section">
              <div className="pub-section-label"><MapPin size={14} /> ¿A dónde envías consolidado? <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(opcional)</span></div>
              <div className="pub-address-block">
                <CityAutocomplete
                  label="País, departamento y ciudad"
                  placeholder="Selecciona ubicación"
                  value={shipmentLoc}
                  onChange={setShipmentLoc}
                  showVerifiedBtn={true}
                  onVerifiedClick={() => fillWithVerified('shipment')}
                  hasVerifiedAddress={!!verifiedAddr}
                />
                <div className="pub-field">
                  <label>Detalles adicionales</label>
                  <input className="input" placeholder="Ej: Terminal Tietê / Punto de distribución"
                    value={shipmentDetails} onChange={e => setShipmentDetails(e.target.value)} />
                </div>
                <div className="pub-gps-row">
                  <button type="button" className="btn btn-secondary pub-gps-btn" onClick={() => getGPS(setShipmentCoords)}>
                    <Navigation2 size={13} /> Usar mi ubicación actual
                  </button>
                  <button type="button" className="btn btn-secondary pub-gps-btn" onClick={() => setShowShipmentMap(!showShipmentMap)}>
                    <Navigation size={13} /> {showShipmentMap ? 'Cerrar mapa' : 'Pinchar en mapa'}
                  </button>
                  {shipmentCoords && (
                    <span className="pub-coords-badge">{shipmentCoords.lat.toFixed(5)}, {shipmentCoords.lng.toFixed(5)}</span>
                  )}
                </div>
                {showShipmentMap && (
                  <div className="pub-map">
                    <MapContainer center={shipmentCoords || [-17.8, -63.18]} zoom={13} style={{ height: '280px', borderRadius: '12px' }}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <MapPicker onSelect={(coords) => { setShipmentCoords(coords); setShowShipmentMap(false) }} />
                      {shipmentCoords && <Marker position={[shipmentCoords.lat, shipmentCoords.lng]} />}
                    </MapContainer>
                    <p className="pub-map-hint">Haz clic en el mapa para marcar el punto exacto</p>
                  </div>
                )}
              </div>
            </div>

            {/* ══════ HORARIO ══════ */}
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

            {/* ══════ PRECIO ══════ */}
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

            {/* ══════ DESCRIPCIÓN ══════ */}
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

            {error && <div className="pub-error"><Info size={14} /> {error}</div>}

            <div className="pub-actions">
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/traficante')}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Publicando...' : 'Publicar compactación'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
