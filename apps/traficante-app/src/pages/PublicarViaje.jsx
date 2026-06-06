import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import { supabase } from '../../../pirata-market/src/lib/supabase'
import 'leaflet/dist/leaflet.css'
import './PublicarViaje.css'

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
const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function MapPicker({ onSelect }) {
  useMapEvents({
    click(e) { onSelect({ lat: e.latlng.lat, lng: e.latlng.lng }) }
  })
  return null
}

export default function PublicarViaje({ user }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ── TIPO ──
  const [type, setType] = useState('viajero')

  // ── ORIGEN ──
  const [originCity, setOriginCity] = useState('')
  const [originAddress, setOriginAddress] = useState('')
  const [originCoords, setOriginCoords] = useState(null)
  const [showOriginMap, setShowOriginMap] = useState(false)

  // ── DESTINO ──
  const [destCity, setDestCity] = useState('')
  const [destAddress, setDestAddress] = useState('')
  const [destCoords, setDestCoords] = useState(null)
  const [showDestMap, setShowDestMap] = useState(false)

  // ── FECHAS (viajero) ──
  const [departureDate, setDepartureDate] = useState('')
  const [arrivalDate, setArrivalDate] = useState('')

  // ── HORARIO (compactador) ──
  const [schedule, setSchedule] = useState(
    Array(7).fill(null).map(() => ({ active: false, open: '08:00', close: '18:00' }))
  )

  // ── TRANSPORTE (viajero) ──
  const [transportMode, setTransportMode] = useState('avion')

  // ── CAPACIDAD ──
  const [maxWeight, setMaxWeight] = useState('')
  const [selectedSizes, setSelectedSizes] = useState([])
  const [acceptedTypes, setAcceptedTypes] = useState([])
  const [rejectedTypes, setRejectedTypes] = useState([])

  // ── PRECIO COMPACTADOR ──
  const [currency, setCurrency] = useState('USD')
  const [pricePerUnit, setPricePerUnit] = useState('')
  const [pricePerKg, setPricePerKg] = useState('')

  // ── PRECIO VIAJERO ──
  const [priceType, setPriceType] = useState('simple') // 'simple' | 'tabla'
  const [simplePrice, setSimplePrice] = useState('')
  const [priceTable, setPriceTable] = useState([
    { item: '', price: '', currency: 'USD' }
  ])

  // ── DESCRIPCIÓN ──
  const [description, setDescription] = useState('')

  // ── HELPERS ──
  const toggleItem = (list, setList, item) => {
    setList(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item])
  }

  const toggleDay = (i) => {
    setSchedule(prev => prev.map((d, idx) => idx === i ? { ...d, active: !d.active } : d))
  }

  const updateDayHours = (i, field, value) => {
    setSchedule(prev => prev.map((d, idx) => idx === i ? { ...d, [field]: value } : d))
  }

  const getGPS = (setCoords) => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(pos => {
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
    })
  }

  const addPriceRow = () => {
    setPriceTable(prev => [...prev, { item: '', price: '', currency: 'USD' }])
  }

  const removePriceRow = (i) => {
    setPriceTable(prev => prev.filter((_, idx) => idx !== i))
  }

  const updatePriceRow = (i, field, value) => {
    setPriceTable(prev => prev.map((row, idx) => idx === i ? { ...row, [field]: value } : row))
  }

  // ── SUBMIT ──
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) return navigate('/auth')
    if (!originCity || !destCity) {
      setError('Completa la ciudad de origen y destino')
      return
    }
    if (type === 'viajero' && !departureDate) {
      setError('Ingresa la fecha de salida')
      return
    }

    setLoading(true)
    setError('')

    const priceData = type === 'viajero'
      ? {
          price: priceType === 'simple' && simplePrice ? parseFloat(simplePrice) : null,
          price_table: priceType === 'tabla' ? priceTable : null,
          price_per_kg: null,
          price_per_unit: null,
        }
      : {
          price: null,
          price_table: null,
          price_per_kg: pricePerKg ? parseFloat(pricePerKg) : null,
          price_per_unit: pricePerUnit ? parseFloat(pricePerUnit) : null,
        }

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

        departure_date: type === 'viajero' ? departureDate : null,
        arrival_date: type === 'viajero' ? arrivalDate || null : null,
        schedule: type === 'compactador' ? schedule : null,

        transport_mode: type === 'viajero' ? transportMode : null,

        max_weight_kg: type === 'viajero' && maxWeight ? parseFloat(maxWeight) : null,
        package_sizes: selectedSizes,
        accepted_types: acceptedTypes,
        rejected_types: rejectedTypes,

        currency,
        description,
        ...priceData
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
            <h1>🚐 Publicar servicio</h1>
            <p>Ofrece tu espacio de viaje o tu servicio de compactación a quienes necesitan enviar</p>
          </div>

          <form onSubmit={handleSubmit} className="pv-form">

            {/* ══ SECCIÓN 1 — TIPO ══ */}
            <div className="pv-section">
              <div className="pv-section-label">Paso 1 — ¿Qué tipo de servicio ofreces?</div>
              <div className="pv-type-grid">
                <button type="button"
                  className={`pv-type-btn ${type === 'viajero' ? 'active' : ''}`}
                  onClick={() => setType('viajero')}
                >
                  <span className="pv-type-icon">🧳</span>
                  <strong>Viajero</strong>
                  <small>Tengo un viaje programado y puedo llevar paquetes en mi equipaje</small>
                </button>
                <button type="button"
                  className={`pv-type-btn ${type === 'compactador' ? 'active' : ''}`}
                  onClick={() => setType('compactador')}
                >
                  <span className="pv-type-icon">📦</span>
                  <strong>Compactador</strong>
                  <small>Recibo múltiples paquetes, los consolido en una caja y los envío</small>
                </button>
              </div>
            </div>

            {/* ══ SECCIÓN 2 — ORIGEN ══ */}
            <div className="pv-section">
              <div className="pv-section-label">
                Paso 2 — {type === 'viajero'
                  ? '¿Dónde puedes recibir el paquete antes de tu viaje?'
                  : '¿Cuál es tu dirección de recepción de paquetes?'}
              </div>
              <p className="pv-hint">
                {type === 'viajero'
                  ? 'Indica tu domicilio o un punto de encuentro cercano donde el remitente te entregará el paquete.'
                  : 'Esta es la dirección donde los remitentes llevarán sus paquetes para que tú los consolides y envíes.'}
              </p>
              <div className="pv-field-row">
                <div className="pv-field">
                  <label>Ciudad *</label>
                  <input className="input" placeholder="Ej: Santa Cruz, Bolivia"
                    value={originCity} onChange={e => setOriginCity(e.target.value)} required />
                </div>
                <div className="pv-field">
                  <label>Dirección exacta</label>
                  <input className="input" placeholder="Ej: Av. Roca y Coronado #450, Villa 1ro de Mayo"
                    value={originAddress} onChange={e => setOriginAddress(e.target.value)} />
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
                  <MapContainer center={originCoords || [-17.8, -63.18]} zoom={13}
                    style={{ height: '280px', borderRadius: '12px' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapPicker onSelect={(coords) => { setOriginCoords(coords); setShowOriginMap(false) }} />
                    {originCoords && <Marker position={[originCoords.lat, originCoords.lng]} />}
                  </MapContainer>
                  <p className="pv-map-hint">Haz clic en el mapa para marcar el punto exacto</p>
                </div>
              )}
            </div>

            {/* ══ SECCIÓN 3 — DESTINO ══ */}
            <div className="pv-section">
              <div className="pv-section-label">
                Paso 3 — {type === 'viajero'
                  ? '¿Dónde puedes entregar el paquete en destino?'
                  : '¿Cuál es la dirección de descompactación en destino?'}
              </div>
              <p className="pv-hint">
                {type === 'viajero'
                  ? 'Indica dónde estarás al llegar — tu hotel, domicilio o un punto acordado donde el receptor pueda recoger.'
                  : 'Dirección en destino donde se recibirá la caja consolidada y se distribuirán los paquetes a cada receptor.'}
              </p>
              <div className="pv-field-row">
                <div className="pv-field">
                  <label>Ciudad *</label>
                  <input className="input" placeholder="Ej: São Paulo, Brasil"
                    value={destCity} onChange={e => setDestCity(e.target.value)} required />
                </div>
                <div className="pv-field">
                  <label>Dirección exacta</label>
                  <input className="input" placeholder="Ej: Terminal Tietê / Mi hotel en Liberdade"
                    value={destAddress} onChange={e => setDestAddress(e.target.value)} />
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
                  <MapContainer center={destCoords || [-17.8, -63.18]} zoom={13}
                    style={{ height: '280px', borderRadius: '12px' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapPicker onSelect={(coords) => { setDestCoords(coords); setShowDestMap(false) }} />
                    {destCoords && <Marker position={[destCoords.lat, destCoords.lng]} />}
                  </MapContainer>
                  <p className="pv-map-hint">Haz clic en el mapa para marcar el punto exacto</p>
                </div>
              )}
            </div>

            {/* ══ SECCIÓN 4 — FECHAS / HORARIO ══ */}
            <div className="pv-section">
              {type === 'viajero' ? (
                <>
                  <div className="pv-section-label">Paso 4 — ¿Cuándo es tu viaje?</div>
                  <p className="pv-hint">La fecha de llegada ayuda al receptor a saber cuándo estará disponible su paquete.</p>
                  <div className="pv-field-row">
                    <div className="pv-field">
                      <label>Fecha de salida *</label>
                      <input className="input" type="date"
                        value={departureDate} onChange={e => setDepartureDate(e.target.value)} required />
                    </div>
                    <div className="pv-field">
                      <label>Fecha de llegada</label>
                      <input className="input" type="date"
                        value={arrivalDate} onChange={e => setArrivalDate(e.target.value)} />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="pv-section-label">Paso 4 — ¿Cuándo atiendes?</div>
                  <p className="pv-hint">Selecciona los días que recibes paquetes y tu horario de atención. Los remitentes verán esto en tu anuncio.</p>
                  <div className="pv-days-grid">
                    {DAYS.map((day, i) => (
                      <div key={day} className="pv-day-row">
                        <button type="button"
                          className={`pv-chip pv-day-chip ${schedule[i].active ? 'active' : ''}`}
                          onClick={() => toggleDay(i)}
                        >
                          {day}
                        </button>
                        {schedule[i].active && (
                          <div className="pv-day-hours">
                            <input className="input pv-time-input" type="time"
                              value={schedule[i].open}
                              onChange={e => updateDayHours(i, 'open', e.target.value)} />
                            <span className="pv-time-sep">—</span>
                            <input className="input pv-time-input" type="time"
                              value={schedule[i].close}
                              onChange={e => updateDayHours(i, 'close', e.target.value)} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* ══ SECCIÓN 5 — TRANSPORTE (solo viajero) ══ */}
            {type === 'viajero' && (
              <div className="pv-section">
                <div className="pv-section-label">Paso 5 — ¿Cómo viajas?</div>
                <p className="pv-hint">El medio de transporte indica al remitente qué tipo de equipaje llevas y las restricciones aplicables.</p>
                <div className="pv-chips">
                  {TRANSPORT_MODES.map(m => (
                    <button key={m.value} type="button"
                      className={`pv-chip ${transportMode === m.value ? 'active' : ''}`}
                      onClick={() => setTransportMode(m.value)}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ══ SECCIÓN 6 — CAPACIDAD ══ */}
            <div className="pv-section">
              <div className="pv-section-label">
                {type === 'viajero' ? 'Paso 6' : 'Paso 5'} — ¿Qué tamaños aceptas?
              </div>
              {type === 'viajero' && (
                <>
                  <p className="pv-hint">Indica cuánto peso disponible tienes en tu equipaje.</p>
                  <div className="pv-field-row" style={{ marginBottom: '1rem' }}>
                    <div className="pv-field">
                      <label>Peso máximo disponible (kg)</label>
                      <input className="input" type="number" min="0" step="0.5"
                        placeholder="Ej: 10"
                        value={maxWeight} onChange={e => setMaxWeight(e.target.value)} />
                    </div>
                  </div>
                </>
              )}
              {type === 'compactador' && (
                <p className="pv-hint">Selecciona qué tamaños de paquetes puedes recibir y consolidar.</p>
              )}
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

            {/* ══ SECCIÓN 7 — TIPOS DE PAQUETES ══ */}
            <div className="pv-section">
              <div className="pv-section-label">
                {type === 'viajero' ? 'Paso 7' : 'Paso 6'} — ¿Qué tipo de contenido aceptas?
              </div>
              <p className="pv-hint">Sé claro sobre qué puedes y no puedes transportar. Esto protege a ambas partes.</p>
              <label className="pv-sublabel">✅ Acepto</label>
              <div className="pv-chips">
                {PACKAGE_TYPES.map(pt => (
                  <button key={pt} type="button"
                    className={`pv-chip pv-chip-accept ${acceptedTypes.includes(pt) ? 'active' : ''}`}
                    onClick={() => toggleItem(acceptedTypes, setAcceptedTypes, pt)}
                  >
                    {pt}
                  </button>
                ))}
              </div>
              <label className="pv-sublabel" style={{ marginTop: '1rem' }}>❌ No acepto</label>
              <div className="pv-chips">
                {PACKAGE_TYPES.map(pt => (
                  <button key={pt} type="button"
                    className={`pv-chip pv-chip-reject ${rejectedTypes.includes(pt) ? 'active' : ''}`}
                    onClick={() => toggleItem(rejectedTypes, setRejectedTypes, pt)}
                  >
                    {pt}
                  </button>
                ))}
              </div>
            </div>

            {/* ══ SECCIÓN 8 — PRECIO ══ */}
            <div className="pv-section">
              <div className="pv-section-label">
                {type === 'viajero' ? 'Paso 8' : 'Paso 7'} — ¿Cuánto cobras?
              </div>

              {type === 'compactador' ? (
                <>
                  <p className="pv-hint">Define tu tarifa por sobre/unidad y/o por kg. Los remitentes verán esto al buscar tu servicio.</p>
                  <div className="pv-field-row">
                    <div className="pv-field">
                      <label>Moneda</label>
                      <select className="input select" value={currency} onChange={e => setCurrency(e.target.value)}>
                        {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="pv-field">
                      <label>Precio por sobre / unidad</label>
                      <input className="input" type="number" min="0" step="0.5"
                        placeholder="Ej: 10"
                        value={pricePerUnit} onChange={e => setPricePerUnit(e.target.value)} />
                    </div>
                    <div className="pv-field">
                      <label>Precio por kg</label>
                      <input className="input" type="number" min="0" step="0.5"
                        placeholder="Ej: 5"
                        value={pricePerKg} onChange={e => setPricePerKg(e.target.value)} />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="pv-hint">Puedes poner un precio simple o una tabla con tarifas por tipo de artículo.</p>
                  <div className="pv-price-type-row">
                    <button type="button"
                      className={`pv-chip ${priceType === 'simple' ? 'active' : ''}`}
                      onClick={() => setPriceType('simple')}
                    >
                      💵 Precio simple
                    </button>
                    <button type="button"
                      className={`pv-chip ${priceType === 'tabla' ? 'active' : ''}`}
                      onClick={() => setPriceType('tabla')}
                    >
                      📋 Tabla de precios
                    </button>
                  </div>

                  {priceType === 'simple' && (
                    <div className="pv-field-row" style={{ marginTop: '1rem' }}>
                      <div className="pv-field">
                        <label>Moneda</label>
                        <select className="input select" value={currency} onChange={e => setCurrency(e.target.value)}>
                          {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="pv-field">
                        <label>Precio por paquete</label>
                        <input className="input" type="number" min="0" step="0.5"
                          placeholder="Ej: 15"
                          value={simplePrice} onChange={e => setSimplePrice(e.target.value)} />
                      </div>
                    </div>
                  )}

                  {priceType === 'tabla' && (
                    <div className="pv-price-table">
                      <div className="pv-price-table-header">
                        <span>Artículo / descripción</span>
                        <span>Precio</span>
                        <span>Moneda</span>
                        <span></span>
                      </div>
                      {priceTable.map((row, i) => (
                        <div key={i} className="pv-price-table-row">
                          <input className="input" placeholder="Ej: Celular, Ropa (kg), Zapatos..."
                            value={row.item} onChange={e => updatePriceRow(i, 'item', e.target.value)} />
                          <input className="input" type="number" min="0" step="0.5"
                            placeholder="0"
                            value={row.price} onChange={e => updatePriceRow(i, 'price', e.target.value)} />
                          <select className="input select" value={row.currency}
                            onChange={e => updatePriceRow(i, 'currency', e.target.value)}>
                            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <button type="button" className="pv-remove-row"
                            onClick={() => removePriceRow(i)}
                            disabled={priceTable.length === 1}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <button type="button" className="btn btn-secondary pv-add-row"
                        onClick={addPriceRow}>
                        + Agregar artículo
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ══ SECCIÓN 9 — DESCRIPCIÓN ══ */}
            <div className="pv-section">
              <div className="pv-section-label">
                {type === 'viajero' ? 'Paso 9' : 'Paso 8'} — Descripción y condiciones
              </div>
              <p className="pv-hint">
                {type === 'viajero'
                  ? 'Describe condiciones especiales, restricciones adicionales o cualquier detalle útil para el remitente.'
                  : 'Explica cómo funciona tu servicio, tiempos de envío, condiciones de embalaje o cualquier detalle relevante.'}
              </p>
              <textarea className="input textarea"
                placeholder={type === 'viajero'
                  ? 'Ej: Solo acepto paquetes bien embalados. Me reúno en el aeropuerto 2 horas antes del vuelo...'
                  : 'Ej: Envío los paquetes cada lunes por bus. El receptor debe recoger en terminal. Embalaje incluido...'}
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            {error && <div className="pv-error">⚠️ {error}</div>}

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
