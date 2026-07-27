import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../pirata-market/src/lib/supabase'
import CityAutocomplete from '../components/CityAutocomplete'
import {
  Car, MapPin, Repeat, Weight, DollarSign, FileText,
  AlertTriangle, CheckCircle2, Info, ShieldAlert,
  Truck
} from 'lucide-react'
import './PublicarService.css'

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

export default function PublicarFlete({ user }) {
  const navigate = useNavigate()
  const [origin, setOrigin] = useState(null)
  const [destination, setDestination] = useState(null)
  const [frequency, setFrequency] = useState('')
  const [vehicleType, setVehicleType] = useState('')
  const [capacity, setCapacity] = useState('')
  const [pricePerKg, setPricePerKg] = useState('')
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [verifiedAddr, setVerifiedAddr] = useState(null)
  const [verifiedFieldUsed, setVerifiedFieldUsed] = useState(null)

  useEffect(() => {
    if (user?.id) {
      supabase
        .from('users')
        .select('traficante_address_city, traficante_address_text, traficante_address_lat, traficante_address_lng, traficante_address_locked')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data && data.traficante_address_city && data.traficante_address_locked) {
            setVerifiedAddr({
              country: '',
              city: data.traficante_address_city,
              lat: data.traficante_address_lat,
              lng: data.traficante_address_lng,
              address: data.traficante_address_text,
            })
          }
        })
    }
  }, [user])

  const handleVerifiedUsed = (fieldKey) => {
    setVerifiedFieldUsed(fieldKey)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) return navigate('/auth')
    if (!origin || !destination) {
      setError('Completa el origen y destino de tu ruta')
      return
    }
    if (!frequency || !vehicleType) {
      setError('Selecciona la frecuencia y tipo de vehículo')
      return
    }

    setLoading(true)
    setError('')

    const payload = {
      user_id: user.id,
      type: 'flete',
      status: 'activo',
      origin_city: origin.city,
      origin_country: origin.country,
      origin_lat: origin.lat,
      origin_lng: origin.lng,
      destination_city: destination.city,
      destination_country: destination.country,
      destination_lat: destination.lat,
      destination_lng: destination.lng,
      currency,
      description,
      price: price ? parseFloat(price) : null,
      price_per_kg: pricePerKg ? parseFloat(pricePerKg) : null,
      departure_date: null,
      arrival_date: null,
      transport_mode: vehicleType,
      max_weight_kg: capacity ? parseFloat(capacity) : null,
      accepted_types: [],
      rejected_types: [],
    }

    const freqLabel = FREQUENCIES.find(f => f.value === frequency)?.label || ''
    payload.description = payload.description
      ? `${payload.description}\n\nFrecuencia: ${freqLabel}`
      : `Frecuencia del servicio: ${freqLabel}`

    const { error: dbError } = await supabase.from('traficante_trips').insert(payload)
    setLoading(false)

    if (dbError) {
      setError(dbError.message)
    } else {
      navigate('/traficante/mi-cuenta/viajes')
    }
  }

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

            {/* Origen */}
            <div className="pub-section">
              <div className="pub-section-label"><MapPin size={14} /> ¿Desde dónde sale tu vehículo?</div>
              <CityAutocomplete
                label="Ciudad de origen"
                placeholder="Escribe la ciudad de origen"
                value={origin}
                onChange={setOrigin}
                useVerifiedAddress
                verifiedAddress={verifiedAddr}
                fieldKey="origin"
                verifiedFieldUsed={verifiedFieldUsed}
                onVerifiedUsed={handleVerifiedUsed}
              />
            </div>

            {/* Destino */}
            <div className="pub-section">
              <div className="pub-section-label"><MapPin size={14} /> ¿A dónde va tu vehículo?</div>
              <CityAutocomplete
                label="Ciudad de destino"
                placeholder="Escribe la ciudad de destino"
                value={destination}
                onChange={setDestination}
                useVerifiedAddress
                verifiedAddress={verifiedAddr}
                fieldKey="destination"
                verifiedFieldUsed={verifiedFieldUsed}
                onVerifiedUsed={handleVerifiedUsed}
              />
            </div>

            {/* Frecuencia */}
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

            {/* Tipo de vehículo */}
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

            {/* Capacidad */}
            <div className="pub-section">
              <div className="pub-section-label"><Weight size={14} /> Capacidad de carga</div>
              <div className="pub-field">
                <label>Capacidad máxima disponible (kg)</label>
                <input className="input" type="number" min="0" step="1" placeholder="Ej: 500" value={capacity} onChange={e => setCapacity(e.target.value)} />
              </div>
            </div>

            {/* Precio */}
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

            {/* Descripción */}
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
