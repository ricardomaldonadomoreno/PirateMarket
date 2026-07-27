import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../pirata-market/src/lib/supabase'
import CityAutocomplete from '../components/CityAutocomplete'
import {
  Package, MapPin, Clock, DollarSign, FileText,
  AlertTriangle, CheckCircle2, Info, ShieldAlert,
  Home, Truck, Users
} from 'lucide-react'
import './PublicarService.css'

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

export default function PublicarCompactador({ user }) {
  const navigate = useNavigate()
  const [origin, setOrigin] = useState(null)
  const [destination, setDestination] = useState(null)
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE)
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

  const toggleDay = (i) => {
    setSchedule(prev => prev.map((d, idx) => idx === i ? { ...d, active: !d.active } : d))
  }

  const updateDayHours = (i, field, value) => {
    setSchedule(prev => prev.map((d, idx) => idx === i ? { ...d, [field]: value } : d))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) return navigate('/auth')
    if (!origin) {
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

    const payload = {
      user_id: user.id,
      type: 'compactador',
      status: 'activo',
      origin_city: origin.city,
      origin_country: origin.country,
      origin_lat: origin.lat,
      origin_lng: origin.lng,
      destination_city: destination?.city || null,
      destination_country: destination?.country || null,
      destination_lat: destination?.lat || null,
      destination_lng: destination?.lng || null,
      currency,
      description,
      price: price ? parseFloat(price) : null,
      departure_date: null,
      arrival_date: null,
      transport_mode: null,
      max_weight_kg: null,
      accepted_types: [],
      rejected_types: [],
    }

    if (activeDays.length > 0) {
      const scheduleStr = activeDays
        .map(d => `${DAYS[schedule.indexOf(d)]}: ${d.open}-${d.close}`)
        .join(' | ')
      payload.description = payload.description
        ? `${payload.description}\n\nHorario: ${scheduleStr}`
        : `Horario de recepción: ${scheduleStr}`
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

            {/* Origen (punto de recepción) */}
            <div className="pub-section">
              <div className="pub-section-label"><Home size={14} /> ¿Dónde recibes los paquetes?</div>
              <CityAutocomplete
                label="Tu ciudad de recepción"
                placeholder="Escribe tu ciudad"
                value={origin}
                onChange={setOrigin}
                useVerifiedAddress
                verifiedAddress={verifiedAddr}
                fieldKey="origin"
                verifiedFieldUsed={verifiedFieldUsed}
                onVerifiedUsed={handleVerifiedUsed}
              />
            </div>

            {/* Destino (opcional) */}
            <div className="pub-section">
              <div className="pub-section-label"><MapPin size={14} /> ¿A dónde envías consolidado? <small style={{color: 'var(--text-muted)', fontWeight: 400}}>(opcional)</small></div>
              <CityAutocomplete
                label="Ciudad de destino"
                placeholder="Ej: La Paz, Bolivia"
                value={destination}
                onChange={setDestination}
                useVerifiedAddress
                verifiedAddress={verifiedAddr}
                fieldKey="destination"
                verifiedFieldUsed={verifiedFieldUsed}
                onVerifiedUsed={handleVerifiedUsed}
              />
            </div>

            {/* Horario */}
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
                  <label>Precio por sobre/unidad</label>
                  <input className="input" type="number" min="0" step="0.5" placeholder="Ej: 5" value={price} onChange={e => setPrice(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Descripción */}
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
