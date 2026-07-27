import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../../pirata-market/src/lib/supabase'
import {
  Search, MapPin, Calendar, Plane, Car, Package,
  Shield, ShieldCheck, Star, Check, ArrowRight,
  Filter, X, SlidersHorizontal
} from 'lucide-react'
import './Buscar.css'

/* ── Helpers ── */
const formatPrice = (price, currency = 'USD') => {
  if (!price) return '—'
  return `${Number(price).toLocaleString('es')} ${currency}`
}

const formatDate = (d) => {
  if (!d) return '—'
  const date = new Date(d + 'T00:00:00')
  return date.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

const getLevelLabel = (user) => {
  if (!user) return { label: 'Básico', color: '#888' }
  if (user.traficante_address_verified && user.traficante_bank_verified) {
    return { label: 'Elite', color: '#784212' }
  }
  if (user.traficante_address_verified) {
    return { label: 'PRO', color: '#8E44AD' }
  }
  if (user.traficante_identity_verified) {
    return { label: 'Medio', color: '#2980B9' }
  }
  return { label: 'Básico', color: '#888' }
}

/* ── Supabase client ── */
const sb = supabase

export default function TraficanteBuscar() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Params desde URL
  const [origin, setOrigin] = useState(searchParams.get('origen') || '')
  const [destination, setDestination] = useState(searchParams.get('destino') || '')

  // Filtros
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState('date') // date | price | reviews
  const [transportMode, setTransportMode] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')

  // Resultados
  const [trips, setTrips] = useState([])
  const [users, setUsers] = useState({})
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  /* ── Ejecutar búsqueda ── */
  const doSearch = useCallback(async () => {
    setLoading(true)
    setSearched(true)

    let query = sb
      .from('traficante_trips')
      .select('*')
      .eq('status', 'activo')

    if (origin) query = query.ilike('origin_city', `%${origin}%`)
    if (destination) query = query.ilike('destination_city', `%${destination}%`)
    if (transportMode) query = query.eq('transport_mode', transportMode)

    if (sortBy === 'date') query = query.order('departure_date', { ascending: true })
    if (sortBy === 'price') query = query.order('price', { ascending: true })

    const { data, error } = await query.limit(50)

    if (error) {
      console.error('Buscar trips error:', error)
      setTrips([])
    } else {
      // Filtrar por precio manualmente
      let filtered = data || []
      if (minPrice) filtered = filtered.filter(t => Number(t.price) >= Number(minPrice))
      if (maxPrice) filtered = filtered.filter(t => Number(t.price) <= Number(maxPrice))

      setTrips(filtered)

      // Cargar datos de los usuarios
      const userIds = [...new Set(filtered.map(t => t.user_id))]
      if (userIds.length > 0) {
        const { data: usersData } = await sb
          .from('users')
          .select('id, display_name, avatar_url, traficante_identity_verified, traficante_address_verified, traficante_bank_verified')
          .in('id', userIds)
        const usersMap = {}
        usersData?.forEach(u => { usersMap[u.id] = u })
        setUsers(usersMap)
      }
    }

    setLoading(false)
  }, [origin, destination, transportMode, sortBy, minPrice, maxPrice])

  // Búsqueda automática al cargar con params
  useEffect(() => {
    if (searchParams.get('origen') || searchParams.get('destino')) {
      doSearch()
    }
  }, []) // eslint-disable-line

  /* ── Handlers ── */
  const handleSearch = (e) => {
    e?.preventDefault()
    const params = new URLSearchParams()
    if (origin) params.set('origen', origin)
    if (destination) params.set('destino', destination)
    setSearchParams(params)
    doSearch()
  }

  const clearFilters = () => {
    setTransportMode('')
    setMinPrice('')
    setMaxPrice('')
    setSortBy('date')
  }

  return (
    <div className="t-buscar-page">
      <div className="container">

        {/* ── Buscador principal ── */}
        <div className="t-buscar-header">
          <h1 className="t-buscar-title">Buscar transportadores</h1>
          <p className="t-buscar-subtitle">Encuentra el viajero perfecto para tu envío</p>

          <form className="t-buscar-form" onSubmit={handleSearch}>
            <div className="t-buscar-fields">
              <div className="t-buscar-field">
                <label><MapPin size={14} /> Origen</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Ciudad de origen"
                  value={origin}
                  onChange={e => setOrigin(e.target.value)}
                />
              </div>
              <div className="t-buscar-field">
                <label><MapPin size={14} /> Destino</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Ciudad de destino"
                  value={destination}
                  onChange={e => setDestination(e.target.value)}
                />
              </div>
            </div>
            <div className="t-buscar-actions">
              <button
                type="button"
                className={`t-filter-toggle ${showFilters ? 'active' : ''}`}
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal size={14} /> Filtros
              </button>
              <button type="submit" className="btn btn-primary t-btn-primary">
                <Search size={14} /> Buscar
              </button>
            </div>
          </form>

          {/* ── Filtros ── */}
          {showFilters && (
            <div className="t-filters-panel">
              <div className="t-filter-group">
                <label>Modo de transporte</label>
                <select className="input" value={transportMode} onChange={e => setTransportMode(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="avion">Avión</option>
                  <option value="bus">Bus</option>
                  <option value="auto">Auto</option>
                  <option value="tren">Tren</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div className="t-filter-group">
                <label>Precio min</label>
                <input className="input" type="number" placeholder="0" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
              </div>
              <div className="t-filter-group">
                <label>Precio max</label>
                <input className="input" type="number" placeholder="Sin límite" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
              </div>
              <div className="t-filter-group">
                <label>Ordenar por</label>
                <select className="input" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  <option value="date">Fecha de salida</option>
                  <option value="price">Precio (menor primero)</option>
                </select>
              </div>
              <button className="t-clear-filters" onClick={clearFilters}>
                <X size={12} /> Limpiar
              </button>
            </div>
          )}
        </div>

        {/* ── Resultados ── */}
        <div className="t-buscar-results">
          {loading ? (
            <div className="t-buscar-loading">
              <div className="loading-spinner" />
              <p>Buscando transportadores...</p>
            </div>
          ) : searched && trips.length === 0 ? (
            <div className="t-buscar-empty">
              <Package size={48} className="t-empty-icon" />
              <h3>No hay transportadores disponibles</h3>
              <p>No encontramos viajes que coincidan con tu búsqueda. Prueba cambiar los filtros o publicar tu propia ruta.</p>
              <button className="btn btn-outline t-btn-outline" onClick={() => navigate('/traficante/publicar-viaje')}>
                <Plane size={14} /> Publicar mi viaje
              </button>
            </div>
          ) : trips.length === 0 ? (
            <div className="t-buscar-welcome">
              <Search size={48} className="t-empty-icon" />
              <h3>¿Necesitas enviar algo?</h3>
              <p>Ingresa la ciudad de origen y destino para encontrar transportadores disponibles.</p>
            </div>
          ) : (
            <>
              <div className="t-results-header">
                <p className="t-results-count">{trips.length} transporte{trips.length !== 1 ? 's' : ''} disponible{trips.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="t-results-grid">
                {trips.map(trip => {
                  const usr = users[trip.user_id] || {}
                  const level = getLevelLabel(usr)
                  return (
                    <div key={trip.id} className="t-trip-card">
                      {/* Header: viajero + nivel */}
                      <div className="t-trip-header">
                        <div className="t-trip-user">
                          {usr.avatar_url ? (
                            <img src={usr.avatar_url} alt="" className="t-trip-avatar" />
                          ) : (
                            <div className="t-trip-avatar-placeholder">
                              {(usr.display_name || '?')[0].toUpperCase()}
                            </div>
                          )}
                          <div className="t-trip-user-info">
                            <span className="t-trip-name">{usr.display_name || 'Viajero'}</span>
                            <span className="t-trip-level" style={{ color: level.color }}>{level.label}</span>
                          </div>
                        </div>
                        {usr.traficante_identity_verified && (
                          <span className="t-trip-verified" title="Identidad verificada">
                            <ShieldCheck size={14} />
                          </span>
                        )}
                      </div>

                      {/* Ruta */}
                      <div className="t-trip-route">
                        <div className="t-trip-city">
                          <MapPin size={12} />
                          <span>{trip.origin_city}</span>
                        </div>
                        <div className="t-trip-arrow">
                          <ArrowRight size={14} />
                        </div>
                        <div className="t-trip-city t-trip-destination">
                          <MapPin size={12} />
                          <span>{trip.destination_city}</span>
                        </div>
                      </div>

                      {/* Datos clave para comparar */}
                      <div className="t-trip-specs">
                        <div className="t-trip-spec">
                          <Calendar size={13} />
                          <span>{formatDate(trip.departure_date)}</span>
                        </div>
                        <div className="t-trip-spec">
                          {trip.transport_mode === 'avion' ? <Plane size={13} /> :
                           trip.transport_mode === 'auto' ? <Car size={13} /> :
                           <Package size={13} />}
                          <span>{trip.transport_mode === 'avion' ? 'Avión' : trip.transport_mode === 'bus' ? 'Bus' : trip.transport_mode === 'auto' ? 'Auto' : trip.transport_mode === 'tren' ? 'Tren' : 'Otro'}</span>
                        </div>
                        {trip.max_weight_kg && (
                          <div className="t-trip-spec">
                            <Package size={13} />
                            <span>{trip.max_weight_kg}kg max</span>
                          </div>
                        )}
                      </div>

                      {/* Precio destacado */}
                      <div className="t-trip-footer">
                        <div className="t-trip-price">
                          <span className="t-trip-price-value">{formatPrice(trip.price, trip.currency)}</span>
                        </div>
                        <button
                          className="btn btn-primary t-btn-primary t-trip-btn"
                          onClick={() => navigate(`/traficante/envio/${trip.id}`)}
                        >
                          Contactar
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
