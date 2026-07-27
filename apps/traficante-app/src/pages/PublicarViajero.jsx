import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../pirata-market/src/lib/supabase'
import CityAutocomplete from '../../../pirata-market/src/components/CityAutocomplete'
import {
  Plane, MapPin, Calendar, Weight, DollarSign, FileText,
  AlertTriangle, CheckCircle2, Info, ShieldAlert, ArrowRight
} from 'lucide-react'
import './PublicarService.css'

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
]

const WARNINGS = [
  'Solo acepta paquetes bien embalados y sellados.',
  'Verifica que no contengan productos ilegales.',
  'Cumple la legislación aduanera del país de destino.',
  'Tu nivel de confianza sube con cada entrega exitosa.',
]

export default function PublicarViajero({ user }) {
  const navigate = useNavigate()
  const [origin, setOrigin] = useState(null)
  const [destination, setDestination] = useState(null)
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
  const [verifiedAddr, setVerifiedAddr] = useState(null)

  useEffect(() => {
    if (user?.id) {
      supabase
        .from('users')
        .select('traficante_address_city, traficante_address_country, traficante_address_text, traficante_address_lat, traficante_address_lng, traficante_address_locked')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data && data.traficante_address_city && data.traficante_address_locked) {
            setVerifiedAddr({
              city: data.traficante_address_city,
              country: data.traficante_address_country,
              lat: data.traficante_address_lat,
              lng: data.traficante_address_lng,
            })
          }
        })
    }
  }, [user])

  // Botón que rellena origen y destino con la dirección oficial del usuario
  const fillWithVerifiedAddress = () => {
    if (!verifiedAddr) return
    if (!origin) setOrigin({ city: verifiedAddr.city, country: verifiedAddr.country, lat: verifiedAddr.lat, lng: verifiedAddr.lng })
    if (!destination) setDestination({ city: verifiedAddr.city, country: verifiedAddr.country, lat: verifiedAddr.lat, lng: verifiedAddr.lng })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) return navigate('/auth')
    if (!origin || !destination) {
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

            {verifiedAddr && (
              <div className="pub-verified-row">
                <button type="button" className="btn pub-verified-btn" onClick={fillWithVerifiedAddress}>
                  <MapPin size={14} /> Usar mi dirección oficial
                </button>
                <span className="pub-verified-hint">Rellena origen y destino con tu ciudad verificada</span>
              </div>
            )}

            {/* Origen */}
            <div className="pub-section">
              <div className="pub-section-label"><MapPin size={14} /> ¿Dónde puedes recibir el paquete?</div>
              <CityAutocomplete
                label="Ciudad de origen"
                placeholder="Escribe la ciudad de origen"
                value={origin}
                onChange={setOrigin}
              />
            </div>

            {/* Destino */}
            <div className="pub-section">
              <div className="pub-section-label"><MapPin size={14} /> ¿Dónde entregarás el paquete?</div>
              <CityAutocomplete
                label="Ciudad de destino"
                placeholder="Escribe la ciudad de destino"
                value={destination}
                onChange={setDestination}
              />
            </div>

            {/* Fechas */}
            <div className="pub-section">
              <div className="pub-section-label"><Calendar size={14} /> Fechas del viaje</div>
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

            {/* Transporte */}
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

            {/* Peso */}
            <div className="pub-section">
              <div className="pub-section-label"><Weight size={14} /> Peso disponible</div>
              <div className="pub-field">
                <label>Peso máximo que puedes llevar (kg)</label>
                <input className="input" type="number" min="0" step="0.5" placeholder="Ej: 10" value={maxWeight} onChange={e => setMaxWeight(e.target.value)} />
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
                  <label>Precio por paquete</label>
                  <input className="input" type="number" min="0" step="0.5" placeholder="Ej: 15" value={price} onChange={e => setPrice(e.target.value)} />
                </div>
                <div className="pub-field">
                  <label>Precio por kg (opcional)</label>
                  <input className="input" type="number" min="0" step="0.5" placeholder="Ej: 5" value={pricePerKg} onChange={e => setPricePerKg(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Descripción */}
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
