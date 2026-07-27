import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../../pirata-market/src/lib/supabase'
import CityAutocomplete from '../components/CityAutocomplete'
import {
  Plane, Package, Truck, MapPin, Calendar, Car,
  Clock, Weight, DollarSign, FileText, AlertTriangle
} from 'lucide-react'
import './Publicar.css'

const CURRENCIES = ['BOB', 'USD', 'BRL', 'ARS', 'PEN', 'CLP', 'PYG']
const TRANSPORT_MODES = [
  { value: 'avion', label: 'Avión' },
  { value: 'bus',   label: 'Bus' },
  { value: 'auto',  label: 'Auto' },
  { value: 'tren',  label: 'Tren' },
  { value: 'otro',  label: 'Otro' },
]
const PACKAGE_TYPES = ['documentos', 'ropa', 'electronica', 'alimentos', 'cosmeticos', 'libros', 'juguetes', 'otro']
const FREQUENCIES = ['diario', 'semanal', 'quincenal', 'mensual']
const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const TYPES = [
  { value: 'viajero', label: 'Viajero', icon: Plane, desc: 'Tengo un viaje programado y puedo llevar paquetes' },
  { value: 'compactador', label: 'Compactador', icon: Package, desc: 'Recibo paquetes, los junto y envío consolidado' },
  { value: 'flete', label: 'Flete', icon: Truck, desc: 'Tengo un vehículo que hace rutas fijas entre ciudades' },
]

function toggleItem(list, setList, item) {
  setList(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item])
}

export default function Publicar({ user }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Tipo (desde URL o selector)
  const urlType = searchParams.get('type')
  const [type, setType] = useState(urlType || 'viajero')

  // Ciudades
  const [origin, setOrigin] = useState(null)
  const [destination, setDestination] = useState(null)

  // Viajero
  const [departureDate, setDepartureDate] = useState('')
  const [arrivalDate, setArrivalDate] = useState('')
  const [transportMode, setTransportMode] = useState('')
  const [maxWeight, setMaxWeight] = useState('')

  // Compactador
  const [schedule, setSchedule] = useState(
    Array(7).fill(null).map(() => ({ active: false, open: '08:00', close: '18:00' }))
  )

  // Flete
  const [frequency, setFrequency] = useState('')
  const [vehicleCapacity, setVehicleCapacity] = useState('')
  const [vehicleType, setVehicleType] = useState('')

  // Precio
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [pricePerKg, setPricePerKg] = useState('')

  // Descripción
  const [description, setDescription] = useState('')

  // Submit
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Dirección verificada del usuario
  const [verifiedAddr, setVerifiedAddr] = useState(null)

  useEffect(() => {
    if (user?.id) {
      supabase
        .from('traficante_profiles')
        .select('address_country, address_city, address_lat, address_lng, address_line')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data && data.address_city) {
            setVerifiedAddr({
              country: data.address_country,
              city: data.address_city,
              lat: data.address_lat,
              lng: data.address_lng,
              address: data.address_line,
            })
          }
        })
    }
  }, [user])

  // Cambiar tipo desde URL
  useEffect(() => {
    if (urlType && ['viajero', 'compactador', 'flete'].includes(urlType)) {
      setType(urlType)
    }
  }, [urlType])

  const toggleDay = (i) => {
    setSchedule(prev => prev.map((d, idx) => idx === i ? { ...d, active: !d.active } : d))
  }

  const updateDayHours = (i, field, value) => {
    setSchedule(prev => prev.map((d, idx) => idx === i ? { ...d, [field]: value } : d))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) return navigate('/auth')
    if (!origin || !destination) {
      setError('Completa el origen y destino')
      return
    }

    setLoading(true)
    setError('')

    const payload = {
      user_id: user.id,
      type,
      status: 'activo',
      origin_city: origin.city,
      origin_address: origin.displayName || origin.address || '',
      origin_lat: origin.lat,
      origin_lng: origin.lng,
      destination_city: destination.city,
      destination_address: destination.displayName || destination.address || '',
      destination_lat: destination.lat,
      destination_lng: destination.lng,
      currency,
      description,
      // Precio
      price: price ? parseFloat(price) : null,
      price_per_kg: pricePerKg ? parseFloat(pricePerKg) : null,
      price_per_unit: null,
      price_table: null,
      // Viajero
      departure_date: type === 'viajero' ? departureDate || null : null,
      arrival_date: type === 'viajero' ? arrivalDate || null : null,
      transport_mode: type === 'viajero' ? transportMode : null,
      max_weight_kg: type === 'viajero' && maxWeight ? parseFloat(maxWeight) : null,
      // Compactador
      schedule: type === 'compactador' ? schedule.filter(d => d.active) : null,
      // Flete
      package_sizes: type === 'flete' ? [frequency] : null,
      max_units: type === 'flete' && vehicleCapacity ? parseInt(vehicleCapacity) : null,
      accepted_types: [],
      rejected_types: [],
    }

    const { error: dbError } = await supabase
      .from('traficante_trips')
      .insert(payload)

    setLoading(false)

    if (dbError) {
      setError(dbError.message)
    } else {
      navigate('/traficante/mi-cuenta/viajes')
    }
  }

  const SelectedIcon = TYPES.find(t => t.value === type)?.icon || Plane

  return (
    <div className="pub-page">
      <div className="container">
        <div className="pub-card">

          {/* ── Header ── */}
          <div className="pub-header">
            <h1 className="pub-title">Publicar servicio</h1>
            <p className="pub-subtitle">Ofrece tu espacio de viaje o servicio de transporte</p>
          </div>

          {/* ── Selector de tipo ── */}
          <div className="pub-type-grid">
            {TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                className={`pub-type-btn ${type === t.value ? 'active' : ''}`}
                onClick={() => setType(t.value)}
              >
                <t.icon size={20} />
                <span>{t.label}</span>
                <small>{t.desc}</small>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="pub-form">

            {/* ── Origen ── */}
            <div className="pub-section">
              <div className="pub-section-label">
                <MapPin size={14} />
                {type === 'viajero' ? '¿Dónde puedes recibir el paquete?' : '¿Cuál es tu punto de recepción?'}
              </div>
              <CityAutocomplete
                label="Ciudad de origen"
                placeholder="Escribe la ciudad de origen"
                value={origin}
                onChange={setOrigin}
                useVerifiedAddress
                verifiedAddress={verifiedAddr}
              />
            </div>

            {/* ── Destino ── */}
            <div className="pub-section">
              <div className="pub-section-label">
                <MapPin size={14} />
                {type === 'viajero' ? '¿Dónde entregarás el paquete?' : '¿Cuál es el punto de entrega?'}
              </div>
              <CityAutocomplete
                label="Ciudad de destino"
                placeholder="Escribe la ciudad de destino"
                value={destination}
                onChange={setDestination}
              />
            </div>

            {/* ── Campos por tipo ── */}
            {type === 'viajero' && (
              <>
                {/* Fechas */}
                <div className="pub-section">
                  <div className="pub-section-label">
                    <Calendar size={14} /> Fechas del viaje
                  </div>
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
                  <div className="pub-section-label">
                    <Plane size={14} /> ¿Cómo viajas?
                  </div>
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
                  <div className="pub-section-label">
                    <Weight size={14} /> Peso disponible
                  </div>
                  <div className="pub-field">
                    <label>Peso máximo que puedes llevar (kg)</label>
                    <input className="input" type="number" min="0" step="0.5" placeholder="Ej: 10" value={maxWeight} onChange={e => setMaxWeight(e.target.value)} />
                  </div>
                </div>
              </>
            )}

            {type === 'compactador' && (
              <>
                {/* Horario */}
                <div className="pub-section">
                  <div className="pub-section-label">
                    <Clock size={14} /> Horario de recepción
                  </div>
                  <p className="pub-hint">Selecciona los días que recibes paquetes.</p>
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
              </>
            )}

            {type === 'flete' && (
              <>
                {/* Frecuencia */}
                <div className="pub-section">
                  <div className="pub-section-label">
                    <Clock size={14} /> Frecuencia del servicio
                  </div>
                  <div className="pub-chips">
                    {FREQUENCIES.map(f => (
                      <button
                        key={f}
                        type="button"
                        className={`pub-chip ${frequency === f ? 'active' : ''}`}
                        onClick={() => setFrequency(f)}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vehículo */}
                <div className="pub-section">
                  <div className="pub-section-label">
                    <Truck size={14} /> Información del vehículo
                  </div>
                  <div className="pub-row">
                    <div className="pub-field">
                      <label>Tipo de vehículo</label>
                      <input className="input" type="text" placeholder="Ej: Camioneta, Furgón" value={vehicleType} onChange={e => setVehicleType(e.target.value)} />
                    </div>
                    <div className="pub-field">
                      <label>Capacidad (kg)</label>
                      <input className="input" type="number" min="0" placeholder="Ej: 500" value={vehicleCapacity} onChange={e => setVehicleCapacity(e.target.value)} />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── Precio ── */}
            <div className="pub-section">
              <div className="pub-section-label">
                <DollarSign size={14} /> Precio
              </div>
              <div className="pub-row">
                <div className="pub-field">
                  <label>Moneda</label>
                  <select className="input" value={currency} onChange={e => setCurrency(e.target.value)}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="pub-field">
                  <label>{type === 'viajero' ? 'Precio por paquete' : type === 'compactador' ? 'Precio por sobre/unidad' : 'Precio por kg'}</label>
                  <input className="input" type="number" min="0" step="0.5" placeholder="Ej: 15" value={price} onChange={e => setPrice(e.target.value)} />
                </div>
                <div className="pub-field">
                  <label>Precio por kg (opcional)</label>
                  <input className="input" type="number" min="0" step="0.5" placeholder="Ej: 5" value={pricePerKg} onChange={e => setPricePerKg(e.target.value)} />
                </div>
              </div>
            </div>

            {/* ── Descripción ── */}
            <div className="pub-section">
              <div className="pub-section-label">
                <FileText size={14} /> Descripción y condiciones
              </div>
              <textarea
                className="input textarea"
                rows={4}
                placeholder={type === 'viajero'
                  ? 'Ej: Solo acepto paquetes bien embalados. Me reúno en el aeropuerto 2 horas antes...'
                  : type === 'compactador'
                  ? 'Ej: Envío los paquetes cada lunes. Embalaje incluido. El receptor recoge en terminal...'
                  : 'Ej: Ruta fija SCZ → BUE. Salida los lunes. Capacidad para 200kg por viaje...'}
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            {error && (
              <div className="pub-error">
                <AlertTriangle size={14} /> {error}
              </div>
            )}

            {/* ── Acciones ── */}
            <div className="pub-actions">
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/traficante')}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary t-btn-primary" disabled={loading}>
                {loading ? 'Publicando...' : 'Publicar servicio'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  )
}
