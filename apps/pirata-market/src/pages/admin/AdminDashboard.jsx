import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import AdminNavbarPirata from '../../components/AdminNavbarPirata'
import './AdminDashboard.css'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    total_users: 0,
    total_listings: 0,
    active_listings: 0,
    pirate_listings: 0,
    pending_reports: 0,
    total_views: 0
  })
  const [recentListings, setRecentListings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
    loadRecentListings()
  }, [])

  const loadStats = async () => {
    try {
      const [users, listings, reports] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact' }),
        supabase.from('listings').select('id, status, is_ghost, views_count', { count: 'exact' }),
        supabase.from('reports').select('id', { count: 'exact' }).eq('status', 'pending')
      ])

      const allListings = listings.data || []
      setStats({
        total_users: users.count || 0,
        total_listings: listings.count || 0,
        active_listings: allListings.filter(l => l.status === 'active').length,
        pirate_listings: allListings.filter(l => l.is_ghost && l.status === 'active').length,
        pending_reports: reports.count || 0,
        total_views: allListings.reduce((sum, l) => sum + (l.views_count || 0), 0)
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadRecentListings = async () => {
    const { data } = await supabase
      .from('listings')
      .select('id, title, status, is_ghost, created_at, views_count')
      .order('created_at', { ascending: false })
      .limit(5)
    if (data) setRecentListings(data)
  }

  const statCards = [
    { icon: '👥', value: stats.total_users, label: 'Usuarios', color: 'gold' },
    { icon: '📋', value: stats.total_listings, label: 'Anuncios totales', color: 'gold' },
    { icon: '✅', value: stats.active_listings, label: 'Anuncios activos', color: 'success' },
    { icon: '🏴‍☠️', value: stats.pirate_listings, label: 'Piratas activos', color: 'warning' },
    { icon: '🚨', value: stats.pending_reports, label: 'Reportes pendientes', color: 'danger' },
    { icon: '👁️', value: stats.total_views.toLocaleString(), label: 'Vistas totales', color: 'gold' },
  ]

  return (
    <div className="admin-page">
      <AdminNavbarPirata />
      <div className="admin-content">
        <div className="admin-page-header">
          <h1 className="serif luxury-gold">Dashboard</h1>
          <p className="admin-page-sub">Resumen general de Pirata Market</p>
        </div>

        {/* Stats */}
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

        <div className="admin-grid">
          {/* Anuncios recientes */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h2>📋 Anuncios recientes</h2>
              <Link to="/admin/pirata/anuncios" className="admin-link">Ver todos →</Link>
            </div>
            <div className="admin-table">
              {recentListings.map(listing => (
                <div key={listing.id} className="admin-table-row">
                  <span className="admin-table-title">{listing.title}</span>
                  <span className={`admin-badge ${listing.is_ghost ? 'badge-pirate' : 'badge-verified'}`}>
                    {listing.is_ghost ? '🏴‍☠️' : '✓'}
                  </span>
                  <span className={`admin-status status-${listing.status}`}>{listing.status}</span>
                  <span className="admin-table-meta">👁️ {listing.views_count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
