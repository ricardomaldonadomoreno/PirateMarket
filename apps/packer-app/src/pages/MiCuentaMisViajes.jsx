import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../pirata-market/src/lib/supabase'
import { Plane, Package, Truck } from 'lucide-react'
import './MiCuenta.css'

const STATUS_LABELS = {
  activo: 'Activo',
  pausado: 'Pausado',
  cancelado: 'Cancelado',
  completado: 'Completado',
}

const STATUS_COLORS = {
  activo: '#27AE60',
  pausado: '#F39C12',
  cancelado: '#E74C3C',
  completado: '#2980B9',
}

const TRANSPORT_LABELS = {
  avion: 'Avión',
  bus: 'Bus',
  auto: 'Auto',
  camioneta: 'Camioneta',
  van: 'Van / Minibús',
  camion: 'Camión',
  moto: 'Moto',
  tren: 'Tren',
  otro: 'Otro',
}

const TYPE_LABELS = {
  viajero: 'Viajero',
  compactador: 'Compactador',
  flete: 'Flete',
}

export default function MiCuentaMisViajes({ user }) {
  const navigate = useNavigate()
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadTrips()
  }, [user])

  const loadTrips = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('traficante_trips')
        .select('id, type, status, origin_city, destination_city, departure_date, transport_mode, currency, description, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading trips:', error)
      } else {
        setTrips(data || [])
      }
    } catch (err) {
      console.error('loadTrips error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (tripId, newStatus) => {
    const { error } = await supabase
      .from('traficante_trips')
      .update({ status: newStatus })
      .eq('id', tripId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error updating status:', error)
    } else {
      loadTrips()
    }
  }

  const handleDelete = async (tripId) => {
    if (!window.confirm('¿Eliminar este viaje? Esta acción no se puede deshacer.')) return
    const { error } = await supabase
      .from('traficante_trips')
      .delete()
      .eq('id', tripId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting trip:', error)
    } else {
      loadTrips()
    }
  }

  const fmt = (date) => date
    ? new Date(date).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—'

  return (
    <div className="mc-section">
      <div className="mc-section-header">
        <h2>Mis viajes</h2>
        <p>Gestiona los servicios que has publicado. Activa, pausa o elimina los que necesites.</p>
      </div>

      {/* Botones de publicación prominentes */}
      <div className="mc-publish-row">
        <button className="mc-publish-btn-lg" onClick={() => navigate('/packer/publicar-viajero')}>
          <Plane size={18} /> Publicar viaje
        </button>
        <button className="mc-publish-btn-lg" onClick={() => navigate('/packer/publicar-compactador')}>
          <Package size={18} /> Publicar compactación
        </button>
        <button className="mc-publish-btn-lg" onClick={() => navigate('/packer/publicar-flete')}>
          <Truck size={18} /> Publicar flete
        </button>
      </div>

      {/* Estadísticas compactas */}
      <div className="mc-trip-stats-compact">
        <span className="mc-stat-mini">
          <strong>{trips.length}</strong> Total
        </span>
        <span className="mc-stat-mini">
          <strong style={{ color: '#27AE60' }}>{trips.filter(t => t.status === 'activo').length}</strong> Activos
        </span>
        <span className="mc-stat-mini">
          <strong style={{ color: '#F39C12' }}>{trips.filter(t => t.status === 'pausado').length}</strong> Pausados
        </span>
        <span className="mc-stat-mini">
          <strong style={{ color: '#2980B9' }}>{trips.filter(t => t.status === 'completado').length}</strong> Completados
        </span>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="mc-loading" style={{ padding: '2rem' }}>
          <div className="loading" style={{ width: 40, height: 40 }} />
        </div>
      ) : trips.length === 0 ? (
        <div className="mc-empty">
          <p>No tienes viajes publicados.</p>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Publica tu primer viaje para empezar a ofrecer tu servicio.
          </p>
        </div>
      ) : (
        <div className="mc-trips-list">
          {trips.map(trip => (
            <div key={trip.id} className="mc-trip-card">
              <div className="mc-trip-card-header">
                <div className="mc-trip-type">
                  {TYPE_LABELS[trip.type] || trip.type}
                </div>
                <div className="mc-trip-status" style={{ background: STATUS_COLORS[trip.status] }}>
                  {STATUS_LABELS[trip.status] || trip.status}
                </div>
              </div>

              <div className="mc-trip-route">
                <span className="mc-trip-city">{trip.origin_city || 'Sin origen'}</span>
                <span className="mc-trip-arrow">→</span>
                <span className="mc-trip-city">{trip.destination_city || 'Sin destino'}</span>
              </div>

              <div className="mc-trip-details">
                <div className="mc-trip-detail">
                  <span className="mc-trip-detail-label">Fecha</span>
                  <span>{fmt(trip.departure_date)}</span>
                </div>
                <div className="mc-trip-detail">
                  <span className="mc-trip-detail-label">Transporte</span>
                  <span>{TRANSPORT_LABELS[trip.transport_mode] || trip.transport_mode || '—'}</span>
                </div>
                <div className="mc-trip-detail">
                  <span className="mc-trip-detail-label">Moneda</span>
                  <span>{trip.currency || 'BOB'}</span>
                </div>
                <div className="mc-trip-detail">
                  <span className="mc-trip-detail-label">Publicado</span>
                  <span>{fmt(trip.created_at)}</span>
                </div>
              </div>

              {trip.description && (
                <div className="mc-trip-desc">
                  <p>{trip.description.substring(0, 150)}{trip.description.length > 150 ? '...' : ''}</p>
                </div>
              )}

              <div className="mc-trip-actions">
                <select
                  className="mc-trip-status-select"
                  value={trip.status}
                  onChange={e => handleStatusChange(trip.id, e.target.value)}
                >
                  <option value="activo">Activo</option>
                  <option value="pausado">Pausado</option>
                  <option value="cancelado">Cancelado</option>
                  <option value="completado">Completado</option>
                </select>
                <button
                  className="mc-trip-delete-btn"
                  onClick={() => handleDelete(trip.id)}
                  title="Eliminar viaje"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
