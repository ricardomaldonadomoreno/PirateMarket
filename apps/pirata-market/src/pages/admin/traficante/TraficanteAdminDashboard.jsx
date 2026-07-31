import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import AdminNavbarTraficante from '../../../components/AdminNavbarTraficante'

export default function TraficanteAdminDashboard() {
  const [stats, setStats] = useState({
    total_traficantes: 0,
    trips: 0,
    trips_active: 0,
    pending_verifications: 0,
    pending_destacados: 0,
    total_reviews: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    setLoading(true)
    try {
      const [
        { count: userCount },
        { data: trips },
        { count: verifCount },
        { count: featCount },
        { count: reviewCount }
      ] = await Promise.all([
        supabase.from('traficante_profiles').select('id', { count: 'exact' }),
        supabase.from('traficante_trips').select('id, status'),
        supabase.from('traficante_verification_requests').select('id', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('featured_trips').select('id', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('traficante_reviews').select('id', { count: 'exact' })
      ])

      const activeTrips = trips?.filter(t => t.status === 'activo').length || 0

      setStats({
        total_traficantes: userCount || 0,
        trips: trips?.length || 0,
        trips_active: activeTrips,
        pending_verifications: verifCount || 0,
        pending_destacados: featCount || 0,
        total_reviews: reviewCount || 0
      })
    } catch (error) {
      console.error('Error loading traficante stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { icon: '🚛', value: stats.total_traficantes, label: 'Traficantes', color: 'gold' },
    { icon: '🗺️', value: stats.trips, label: 'Viajes totales', color: 'gold' },
    { icon: '✅', value: stats.trips_active, label: 'Viajes activos', color: 'success' },
    { icon: '📄', value: stats.pending_verifications, label: 'Verificaciones pendientes', color: 'warning' },
    { icon: '⭐', value: stats.pending_destacados, label: 'Destacados pendientes', color: 'gold' },
    { icon: '⭐', value: stats.total_reviews, label: 'Reseñas', color: 'gold' },
  ]

  return (
    <div className="admin-page">
      <AdminNavbarTraficante />
      <div className="admin-content">
        <div className="admin-page-header">
          <h1 className="serif luxury-gold">Dashboard Traficante</h1>
          <p className="admin-page-sub">Resumen de la app Traficante</p>
        </div>

        <div className="admin-stats-grid">
          {statCards.map((card, i) => (
            <div key={i} className={`admin-stat-card stat-${card.color}`}>
              <span className="admin-stat-icon">{card.icon}</span>
              <div>
                <div className="admin-stat-value">{loading ? '...' : card.value}</div>
                <div className="admin-stat-label">{card.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
