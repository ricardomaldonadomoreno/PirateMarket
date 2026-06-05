import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import AdminNavbar from '../../components/AdminNavbar'
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
  const [categories, setCategories] = useState([])
  const [recentListings, setRecentListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [newCat, setNewCat] = useState({ name: '', slug: '', icon: '' })
  const [catLoading, setCatLoading] = useState(false)

  useEffect(() => {
    loadStats()
    loadCategories()
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

  const loadCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name')
    if (data) setCategories(data)
  }

  const loadRecentListings = async () => {
    const { data } = await supabase
      .from('listings')
      .select('id, title, status, is_ghost, created_at, views_count')
      .order('created_at', { ascending: false })
      .limit(5)
    if (data) setRecentListings(data)
  }

  const handleAddCategory = async (e) => {
    e.preventDefault()
    if (!newCat.name || !newCat.slug) return
    setCatLoading(true)
    try {
      const { error } = await supabase.from('categories').insert([{
        name: newCat.name,
        slug: newCat.slug.toLowerCase().replace(/\s+/g, '-'),
        icon: newCat.icon || '📦'
      }])
      if (error) throw error
      setNewCat({ name: '', slug: '', icon: '' })
      loadCategories()
    } catch (error) {
      alert('Error: ' + error.message)
    } finally {
      setCatLoading(false)
    }
  }

  const handleToggleCategory = async (cat) => {
    await supabase.from('categories').update({ is_active: !cat.is_active }).eq('id', cat.id)
    loadCategories()
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
      <AdminNavbar />
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

        <div className="admin-grid-2">
          {/* Anuncios recientes */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h2>📋 Anuncios recientes</h2>
              <Link to="/admin/anuncios" className="admin-link">Ver todos →</Link>
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

          {/* Categorías */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h2>🗂️ Categorías</h2>
            </div>

            <form onSubmit={handleAddCategory} className="admin-cat-form">
              <input
                type="text" className="input" placeholder="Icono emoji"
                value={newCat.icon} onChange={e => setNewCat(p => ({ ...p, icon: e.target.value }))}
                style={{ width: '70px' }}
              />
              <input
                type="text" className="input" placeholder="Nombre"
                value={newCat.name} onChange={e => setNewCat(p => ({ ...p, name: e.target.value }))}
              />
              <input
                type="text" className="input" placeholder="slug"
                value={newCat.slug} onChange={e => setNewCat(p => ({ ...p, slug: e.target.value }))}
              />
              <button type="submit" className="btn btn-primary" disabled={catLoading}>+</button>
            </form>

            <div className="admin-cat-list">
              {categories.map(cat => (
                <div key={cat.id} className={`admin-cat-item ${!cat.is_active ? 'inactive' : ''}`}>
                  <span>{cat.icon} {cat.name}</span>
                  <button
                    className={`btn-small ${cat.is_active ? 'btn-danger' : 'btn-success'}`}
                    onClick={() => handleToggleCategory(cat)}
                  >
                    {cat.is_active ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
