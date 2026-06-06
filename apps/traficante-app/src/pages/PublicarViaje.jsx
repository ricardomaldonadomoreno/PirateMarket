import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import { supabase } from '../../../pirata-market/src/lib/supabase'
import 'leaflet/dist/leaflet.css'
import './PublicarViaje.css'

// Fix leaflet marker icon
import L from 'leaflet'
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const CURRENCIES = ['BOB', 'USD', 'BRL', 'ARS', 'PEN', 'CLP', 'PYG']
const PACKAGE_TYPES = ['documentos', 'ropa', 'electronica', 'alimentos', 'cosmeticos', 'libros', 'juguetes', 'otro']
const PACKAGE_SIZES = ['sobre', 'pequeño', 'mediano', 'grande']
const TRANSPORT_MODES = [
  { value: 'avion', label: '✈️ Avión' },
  { value: 'bus',   label: '🚌 Bus' },
  { value: 'auto',  label: '🚗 Auto' },
  { value: 'tren',  label: '🚂 Tren' },
  { value: 'otro',  label: '📦 Otro' },
]

function MapPicker({ onSelect }) {
  useMapEvents({
    click(e) {
      onSelect({ lat: e.latlng.lat, lng: e.latlng.lng })
    }
  })
  return null
}

export default function PublicarViaje({ user }) {
  const { t } = useTranslation('traficante')
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Tipo de servicio
  const [type, setType] = useState('viajero')

  // Origen
  const [originCity, setOriginCity] = useState('')
  const [originAddress, setOriginAddress] = useState('')
  const [originCoords, setOriginCoords] = useState(null)
  const [showOriginMap, setShowOriginMap] = useState(false)

  // Destino
  const [destCity, setDestCity] = useState('')
  const [destAddress, setDestAddress] = useState('')
  const [destCoords, setDestCoords] = useState(null)
  const [showDestMap, setShowDestMap] = useState(false)

  // Fechas
  const [departureDate, setDepartureDate] = useState('')
  const [arrivalDate, setArrivalDate] = useState('')
  const [deadlineDate, setDeadlineDate] = useState('')

  // Capacidad
  const [maxWeight, setMaxWeight] = useState('')
  const [selectedSizes, setSelectedSizes] = useState([])
  const [acceptedTypes, setAcceptedTypes] = useState([])
  const [rejectedTypes, setRejectedTypes] = useState([])

  // Solo viajero
  const [transportMode, setTransportMode] = useState('avion')

  // Precio
  const [price, setPrice] = useState('')
  const [pricePerKg, setPricePerKg] = useState('')
  const [pricePerUnit, setPricePerUnit] = useState('')
  const [maxUnits, setMaxUnits] = useState('')
  const [currency, setCurrency] = useState('USD')

  // Descripción
  const [description, setDescription] = useState('')

  const toggleItem = (list, setList, item) => {
    setList(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    )
  }

  const getGPS = (setCoords) => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(pos => {
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) return navigate('/auth')
    if (!originCity || !destCity || !departureDate) {
      setError('Completa origen, destino y fecha de salida')
      return
    }

    setLoading(true)
    setError('')

    const { error: dbError } = await supabase
      .from('traficante_trips')
      .insert({
        user_id: user.id,
        type,
        status: 'activo',

        origin_city: originCity,
        origin_address: originAddress,
        origin_lat: originCoords?.lat || null,
        origin_lng: originCoords?.lng || null,

        destination_city: destCity,
        destination_address: destAddress,
        destination_lat: destCoords?.lat || null,
        destination_lng: destCoords?.lng || null,

        departure_date: departureDate,
        arrival_date: arrivalDate || null,
        deadline_date: type === 'compactador' ? deadlineDate || null : null,

        max_weight_kg: maxWeight ? parseFloat(maxWeight) : null,
        package_sizes: selectedSizes,
        accepted_types: acceptedTypes,
        rejected_types: rejectedTypes,

        transport_mode: type === 'viajero' ? transportMode : null,

        price: price ? parseFloat(price) : null,
        price_per_kg: pricePerKg ? parseFloat(pricePerKg) : null,
        price_per_unit: type === 'compactador' && pricePerUnit ? parseFloat(pricePerUnit) : null,
        max_units: type === 'compactador' && maxUnits ? parseInt(maxUnits) : null,
        currency,
        description
      })

    setLoading(false)

    if (dbError) {
      setError(dbError.message)
    } else {
      navigate('/traficante/dashboard')
    }
  }

  return (
    <div className="pv-container">
      <div className="container">
        <div className="pv-card">

          {/* ── HEADER ── */}
          <div className="pv-header">
            <h1>✈️ Publicar servicio</h1>
            <p>Completa los datos de tu viaje o servicio de compactación</p>
          </div>

          <form onSubmit={handleSubmit} className="pv-form">

            {/* ── TIPO ── */}
            <div className="pv-section">
              <h3>¿Qué tipo de servicio ofreces?</h3>
              <div className="pv-type-grid">
                <button
                  type="button"
                  className={`pv-type-btn ${type === 'viajero' ? 'active' : ''}`}
                  onClick={() => setType('viajero')}
                >
                  <span className="pv-type-icon">🧳</span>
                  <strong>Viajero</strong>
                  <small>Llevo paquetes en mi viaje</small>
                </button>
                <button
                  type="button"
                  className={`pv-type-btn ${type === 'compactador' ? 'active' : ''}`}
                  onClick={() => setType('compactador')}
                >
                  <span className="pv-type-icon">📦</span>
                  <strong>Compactador</strong>
                  <small>Consolido y envío en caja</small>
                </button>
              </div>
            </div>

            {/* ── ORIGEN ── */}
            <div className="pv-section">
              <h3>📍 Origen — ¿Dónde recibes los paquetes?</h3>
              <div className="pv-field-row">
                <div className="pv-field">
                  <label>Ciudad</label>
                  <input
                    className="input"
                    placeholder="Ej: Santa Cruz, Bolivia"
                    value={originCity}
                    onChange={e => setOriginCity(e.target.value)}
                    required
                  />
                </div>
                <div className="pv-field">
                  <label>Dirección exacta</label>
                  <input
                    className="input"
                    placeholder="Ej: Av. Roca y Coronado #450"
                    value={originAddress}
                    onChange={e => setOriginAddress(e.target.value)}
                  />
                </div>
              </div>
              <div className="pv-gps-row">
                <button type="button" className="btn btn-secondary pv-gps-btn"
                  onClick={() => getGPS(setOriginCoords)}>
                  📡 Usar mi ubicación actual
                </button>
                <button type="button" className="btn btn-secondary pv-gps-btn"
                  onClick={() => setShowOriginMap(!showOriginMap)}>
                  🗺️ {showOriginMap ? 'Cerrar mapa' : 'Pinchar en mapa'}
                </button>
                {originCoords && (
                  <span className="pv-coords-badge">
                    ✅ {originCoords.lat.toFixed(5)}, {originCoords.lng.toFixed(5)}
                  </span>
                )}
              </div>
              {showOriginMap && (
                <div className="pv-map">
                  <MapContainer
                    center={originCoords || [-17.8, -63.18]}
                    zoom={13}
                    style={{ height: '280px', borderRadius: '12px' }}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapPicker onSelect={(coords) => {
                      setOriginCoords(coords)
                      setShowOriginMap(false)
                    }} />
                    {originCoords && <Marker position={[originCoords.lat, originCoords.lng]} />}
                  </MapContainer>
                  <p className="pv-map-hint">Haz clic en el mapa para marcar el punto exacto</p>
                </div>
              )}
            </div>

            {/* ── DESTINO ── */}
            <div className="pv-section">
              <h3>🎯 Destino — ¿Dónde entregas los paquetes?</h3>
              <div className="pv-field-row">
                <div className="pv-field">
                  <label>Ciudad</label>
                  <input
                    className="input"
                    placeholder="Ej: São Paulo, Brasil"
                    value={destCity}
                    onChange={e => setDestCity(e.target.value)}
                    required
                  />
                </div>
                <div className="pv-field">
                  <label>Dirección exacta</label>
                  <input
                    className="input"
                    placeholder="Ej: Terminal Tietê o mi hotel"
                    value={destAddress}
                    onChange={e => setDestAddress(e.target.value)}
                  />
                </div>
              </div>
              <div className="pv-gps-row">
                <button type="button" className="btn btn-secondary pv-gps-btn"
                  onClick={() => getGPS(setDestCoords)}>
                  📡 Usar mi ubicación actual
                </button>
                <button type="button" className="btn btn-secondary pv-gps-btn"
                  onClick={() => setShowDestMap(!showDestMap)}>
                  🗺️ {showDestMap ? 'Cerrar mapa' : 'Pinchar en mapa'}
                </button>
                {destCoords && (
                  <span className="pv-coords-badge">
                    ✅ {destCoords.lat.toFixed(5)}, {destCoords.lng.toFixed(5)}
                  </span>
                )}
              </div>
              {showDestMap && (
                <div className="pv-map">
                  <MapContainer
                    center={destCoords || [-17.8, -63.18]}
                    zoom={13}
                    style={{ height: '280px', borderRadius: '12px' }}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapPicker onSelect={(coords) => {
                      setDestCoords(coords)
                      setShowDestMap(false)
                    }} />
                    {destCoords && <Marker position={[destCoords.lat, destCoords.lng]} />}
                  </MapContainer>
                  <p className="pv-map-hint">Haz clic en el mapa para marcar el punto exacto</p>
                </div>
              )}
            </div>

            {/* ── FECHAS ── */}
            <div className="pv-section">
              <h3>📅 Fechas</h3>
              <div className="pv-field-row">
                <div className="pv-field">
                  <label>Fecha de salida *</label>
                  <input className="input" type="date"
                    value={departureDate}
                    onChange={e => setDepartureDate(e.target.value)}
                    required
                  />
                </div>
                {type === 'viajero' && (
                  <div className="pv-field">
                    <label>Fecha de llegada</label>
                    <input className="input" type="date"
                      value={arrivalDate}
                      onChange={e => setArrivalDate(e.target.value)}
                    />
                  </div>
                )}
                {type === 'compactador' && (
                  <div className="pv-field">
                    <label>Fecha límite para recibir paquetes</label>
                    <input className="input" type="date"
                      value={deadlineDate}
                      onChange={e => setDeadlineDate(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ── TRANSPORTE (solo viajero) ── */}
            {type === 'viajero' && (
              <div className="pv-section">
                <h3>🚀 Medio de transporte</h3>
                <div className="pv-chips">
                  {TRANSPORT_MODES.map(m => (
                    <button
                      key={m.value}
                      type="button"
                      className={`pv-chip ${transportMode === m.value ? 'active' : ''}`}
                      onClick={() => setTransportMode(m.value)}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── CAPACIDAD ── */}
            <div className="pv-section">
              <h3>⚖️ Capacidad</h3>
              <div className="pv-field-row">
                <div className="pv-field">
                  <label>Peso máximo (kg)</label>
                  <input className="input" type="number" min="0" step="0.5"
                    placeholder="Ej: 10"
                    value={maxWeight}
                    onChange={e => setMaxWeight(e.target.value)}
                  />
                </div>
                {type === 'compactador' && (
                  <div className="pv-field">
                    <label>Unidades máximas (sobres/paquetes)</label>
                    <input className="input" type="number" min="1"
                      placeholder="Ej: 20"
                      value={maxUnits}
                      onChange={e => setMaxUnits(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <label className="pv-sublabel">Tamaños que aceptas</label>
              <div className="pv-chips">
                {PACKAGE_SIZES.map(s => (
                  <button key={s} type="button"
                    className={`pv-chip ${selectedSizes.includes(s) ? 'active' : ''}`}
                    onClick={() => toggleItem(selectedSizes, setSelectedSizes, s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* ── TIPOS DE PAQUETES ── */}
            <div className="pv-section">
              <h3>📋 Tipos de paquetes</h3>
              <label className="pv-sublabel">✅ Acepto</label>
              <div className="pv-chips">
                {PACKAGE_TYPES.map(t => (
                  <button key={t} type="button"
                    className={`pv-chip pv-chip-accept ${acceptedTypes.includes(t) ? 'active' : ''}`}
                    onClick={() => toggleItem(acceptedTypes, setAcceptedTypes, t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <label className="pv-sublabel mt-2">❌ No acepto</label>
              <div className="pv-chips">
                {PACKAGE_TYPES.map(t => (
                  <button key={t} type="button"
                    className={`pv-chip pv-chip-reject ${rejectedTypes.includes(t) ? 'active' : ''}`}
                    onClick={() => toggleItem(rejectedTypes, setRejectedTypes, t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* ── PRECIO ── */}
            <div className="pv-section">
              <h3>💰 Precio</h3>
              <div className="pv-field-row">
                <div className="pv-field">
                  <label>Moneda</label>
                  <select className="input select"
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                  >
                    {CURRENCIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="pv-field">
                  <label>Precio fijo por paquete</label>
                  <input className="input" type="number" min="0" step="0.5"
                    placeholder="Ej: 15"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                  />
                </div>
                <div className="pv-field">
                  <label>Precio por kg</label>
                  <input className="input" type="number" min="0" step="0.5"
                    placeholder="Ej: 5"
                    value={pricePerKg}
                    onChange={e => setPricePerKg(e.target.value)}
                  />
                </div>
                {type === 'compactador' && (
                  <div className="pv-field">
                    <label>Precio por unidad/sobre</label>
                    <input className="input" type="number" min="0" step="0.5"
                      placeholder="Ej: 10"
                      value={pricePerUnit}
                      onChange={e => setPricePerUnit(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ── DESCRIPCIÓN ── */}
            <div className="pv-section">
              <h3>📝 Descripción</h3>
              <textarea
                className="input textarea"
                placeholder="Describe tu servicio, condiciones especiales, restricciones o cualquier detalle útil para el remitente..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            {/* ── ERROR ── */}
            {error && (
              <div className="pv-error">⚠️ {error}</div>
            )}

            {/* ── SUBMIT ── */}
            <div className="pv-actions">
              <button type="button" className="btn btn-secondary"
                onClick={() => navigate('/traficante')}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary t-btn-primary" disabled={loading}>
                {loading ? <span className="loading" /> : '🚀 Publicar servicio'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  )
}
