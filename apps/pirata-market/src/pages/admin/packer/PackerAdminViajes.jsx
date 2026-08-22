import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import AdminNavbarPacker from '../../../components/AdminNavbarPacker'

export default function PackerAdminViajes() {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => { loadTrips() }, [filterStatus])

  const loadTrips = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('packer_trips')
        .select('*')
        .order('created_at', { ascending: false })

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus)
      }

      const { data, error } = await query
      if (error) { console.error(error); return }
      if (data) {
        const userIds = [...new Set(data.map(trip => trip.user_id).filter(Boolean))]
        const [{ data: usersData }, { data: profilesData }] = await Promise.all([
          supabase.from('users').select('id, display_name, email').in('id', userIds),
          supabase.from('packer_profiles').select('id, identity_verified').in('id', userIds),
        ])
        const usersMap = Object.fromEntries((usersData || []).map(user => [user.id, user]))
        const profilesMap = Object.fromEntries((profilesData || []).map(profile => [profile.id, profile]))
        setTrips(data.map(trip => ({
          ...trip,
          user: usersMap[trip.user_id]
            ? { ...usersMap[trip.user_id], packer_profiles: profilesMap[trip.user_id] ? [profilesMap[trip.user_id]] : [] }
            : null,
        })))
      }
    } catch (error) {
      console.error('loadTrips error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTrip = async (id) => {
    if (!confirm('¿Eliminar este viaje?')) return
    await supabase.from('packer_trips').delete().eq('id', id)
    loadTrips()
  }

  const handleStatusChange = async (id, status) => {
    await supabase.from('packer_trips').update({ status }).eq('id', id)
    loadTrips()
  }

  const fmt = (date) => date ? new Date(date).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'

  return (
    <div className="admin-page">
      <AdminNavbarPacker />
      <div className="admin-content">
        <div className="admin-page-header">
          <h1 className="serif luxury-gold">Viajes</h1>
          <p className="admin-page-sub">{trips.length} viajes registrados</p>
        </div>

        <div className="admin-filters-bar">
          <div className="admin-filter-btns">
            {['all', 'activo', 'pausado', 'cancelado', 'completado'].map(s => (
              <button key={s} className={`filter-btn ${filterStatus === s ? 'active' : ''}`} onClick={() => setFilterStatus(s)}>
                {s === 'all' ? 'Todos' : s}
              </button>
            ))}
          </div>
        </div>

        <div className="admin-card">
          {loading ? (
            <div className="admin-loading">Cargando viajes...</div>
          ) : trips.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No hay viajes.
            </div>
          ) : (
            <div className="admin-listings-table">
              <div className="admin-listings-header">
                <span>Viaje</span>
                <span>Packer</span>
                <span>Tipo</span>
                <span>Origen → Destino</span>
                <span>Estado</span>
                <span>Fecha</span>
                <span>Acciones</span>
              </div>
              {trips.map(trip => (
                <div key={trip.id} className="admin-listing-row">
                  <div className="admin-listing-info">
                    <div className="admin-listing-thumb">
                      <span>{trip.type === 'viajero' ? '🧳' : '📦'}</span>
                    </div>
                    <div>
                      <div className="admin-listing-title">{trip.type === 'viajero' ? 'Viajero' : 'Compactador'}</div>
                      <div className="admin-listing-meta">
                        {trip.currency || 'BOB'} · {trip.transport_mode || '—'}
                      </div>
                    </div>
                  </div>

                  <div className="admin-cell-muted">
                    {trip.user?.display_name || '—'}
                    {trip.user?.packer_profiles?.identity_verified && <span style={{ marginLeft: '0.3rem', fontSize: '0.7rem' }}>✓</span>}
                  </div>

                  <div>{trip.type}</div>

                  <div style={{ fontSize: '0.85rem' }}>
                    <div>{trip.origin_city || trip.origin_address || '—'}</div>
                    <div style={{ color: 'var(--text-muted)' }}>→ {trip.destination_city || trip.destination_address || '—'}</div>
                  </div>

                  <div>
                    <select
                      className="admin-type-select"
                      value={trip.status}
                      onChange={e => handleStatusChange(trip.id, e.target.value)}
                    >
                      <option value="activo">Activo</option>
                      <option value="pausado">Pausado</option>
                      <option value="cancelado">Cancelado</option>
                      <option value="completado">Completado</option>
                    </select>
                  </div>

                  <div className="admin-cell-muted">{fmt(trip.created_at)}</div>

                  <div className="admin-user-actions">
                    <button className="btn-small btn-danger" onClick={() => handleDeleteTrip(trip.id)}>
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
