import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import AdminNavbar from '../../components/AdminNavbar'
import './AdminAnuncios.css'

export default function AdminAnuncios() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState('all')

  useEffect(() => { loadListings() }, [])

  const loadListings = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('listings')
        .select(`id, title, price, currency, status, is_ghost, created_at, views_count, slug, photos,
          user:users(display_name, email),
          category:categories(name, icon)`)
        .order('created_at', { ascending: false })
      if (data) setListings(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este anuncio?')) return
    await supabase.from('listings').delete().eq('id', id)
    loadListings()
  }

  const handleStatusChange = async (id, status) => {
    await supabase.from('listings').update({ status }).eq('id', id)
    loadListings()
  }

  const filtered = listings.filter(l => {
    const matchSearch = l.title?.toLowerCase().includes(search.toLowerCase()) ||
      l.user?.display_name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || l.status === filterStatus
    const matchType = filterType === 'all' ||
      (filterType === 'pirate' && l.is_ghost) ||
      (filterType === 'registered' && !l.is_ghost)
    return matchSearch && matchStatus && matchType
  })

  return (
    <div className="admin-page">
      <AdminNavbar />
      <div className="admin-content">
        <div className="admin-page-header">
          <h1 className="serif luxury-gold">Anuncios</h1>
          <p className="admin-page-sub">{listings.length} anuncios en total</p>
        </div>

        <div className="admin-filters-bar">
          <input
            type="text" className="input" placeholder="Buscar por título o vendedor..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: '300px' }}
          />
          <div className="admin-filter-btns">
            {['all', 'active', 'paused', 'sold'].map(s => (
              <button key={s} className={`filter-btn ${filterStatus === s ? 'active' : ''}`} onClick={() => setFilterStatus(s)}>
                {s === 'all' ? 'Todos' : s}
              </button>
            ))}
          </div>
          <div className="admin-filter-btns">
            {[['all', 'Todo'], ['pirate', '🏴‍☠️ Piratas'], ['registered', '✓ Registrados']].map(([val, label]) => (
              <button key={val} className={`filter-btn ${filterType === val ? 'active' : ''}`} onClick={() => setFilterType(val)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="admin-card">
          {loading ? (
            <div className="admin-loading">Cargando anuncios...</div>
          ) : (
            <div className="admin-listings-table">
              <div className="admin-listings-header">
                <span>Anuncio</span>
                <span>Vendedor</span>
                <span>Precio</span>
                <span>Estado</span>
                <span>Vistas</span>
                <span>Acciones</span>
              </div>
              {filtered.map(listing => (
                <div key={listing.id} className="admin-listing-row">
                  <div className="admin-listing-info">
                    <div className="admin-listing-thumb">
                      {listing.photos?.[0]
                        ? <img src={listing.photos[0]} alt={listing.title} />
                        : <span>{listing.category?.icon || '📦'}</span>
                      }
                    </div>
                    <div>
                      <div className="admin-listing-title">{listing.title}</div>
                      <div className="admin-listing-meta">
                        {listing.is_ghost ? '🏴‍☠️ Pirata' : `${listing.category?.icon} ${listing.category?.name}`}
                      </div>
                    </div>
                  </div>

                  <div className="admin-cell-muted">
                    {listing.is_ghost ? '—' : listing.user?.display_name || '—'}
                  </div>

                  <div className="admin-cell-gold">
                    {listing.currency || 'BOB'} {Number(listing.price).toLocaleString()}
                  </div>

                  <div>
                    <select
                      className="admin-type-select"
                      value={listing.status}
                      onChange={e => handleStatusChange(listing.id, e.target.value)}
                    >
                      <option value="active">Activo</option>
                      <option value="paused">Pausado</option>
                      <option value="sold">Vendido</option>
                      <option value="deleted">Eliminado</option>
                    </select>
                  </div>

                  <div className="admin-cell-muted">👁️ {listing.views_count}</div>

                  <div className="admin-user-actions">
                    <Link to={`/ficha/${listing.slug}`} target="_blank" className="btn-small btn-success">
                      Ver
                    </Link>
                    <button className="btn-small btn-danger" onClick={() => handleDelete(listing.id)}>
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
