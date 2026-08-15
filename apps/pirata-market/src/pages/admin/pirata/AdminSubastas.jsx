import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import AdminNavbarPirata from '../../../components/AdminNavbarPirata'
import './AdminSubastas.css'

const filters = [
  { value: 'all', label: 'Todas' },
  { value: 'active', label: 'Activas' },
  { value: 'finished', label: 'Finalizadas' },
  { value: 'cancelled', label: 'Canceladas' },
]

const statusLabels = {
  active: 'Activa',
  finished: 'Finalizada',
  cancelled: 'Cancelada',
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatMoney(value, currency) {
  if (value === null || value === undefined) return '—'
  return `${currency || 'USD'} ${Number(value).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function getDisplayStatus(auction) {
  if (auction.status === 'active' && new Date(auction.ends_at) <= new Date()) return 'finished'
  return auction.status
}

export default function AdminSubastas() {
  const [auctions, setAuctions] = useState([])
  const [filter, setFilter] = useState('all')
  const [expandedAuction, setExpandedAuction] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadAuctions()
  }, [])

  const loadAuctions = async () => {
    setLoading(true)
    setError('')
    try {
      const { data: auctionData, error: auctionError } = await supabase
        .from('pirata_auctions')
        .select(`
          id,
          listing_id,
          start_price,
          minimum_increment,
          ends_at,
          status,
          winner_id,
          created_at,
          listing:listings (
            id,
            title,
            slug,
            photos,
            price,
            currency,
            seller:users (id, email, display_name)
          )
        `)
        .order('created_at', { ascending: false })

      if (auctionError) throw auctionError

      const ids = (auctionData || []).map(auction => auction.id)
      let bidData = []
      if (ids.length > 0) {
        const { data, error: bidsError } = await supabase
          .from('pirata_auction_bids')
          .select(`
            id,
            auction_id,
            bidder_id,
            amount,
            created_at,
            bidder:users (id, email, display_name)
          `)
          .in('auction_id', ids)
          .order('amount', { ascending: false })

        if (bidsError) throw bidsError
        bidData = data || []
      }

      const bidsByAuction = bidData.reduce((result, bid) => {
        if (!result[bid.auction_id]) result[bid.auction_id] = []
        result[bid.auction_id].push(bid)
        return result
      }, {})

      setAuctions((auctionData || []).map(auction => ({
        ...auction,
        bids: bidsByAuction[auction.id] || [],
      })))
    } catch (loadError) {
      console.error('Error loading auctions:', loadError)
      setError('No se pudieron cargar las subastas.')
    } finally {
      setLoading(false)
    }
  }

  const filteredAuctions = useMemo(() => {
    if (filter === 'all') return auctions
    return auctions.filter(auction => getDisplayStatus(auction) === filter)
  }, [auctions, filter])

  const stats = useMemo(() => ({
    total: auctions.length,
    active: auctions.filter(auction => getDisplayStatus(auction) === 'active').length,
    finished: auctions.filter(auction => getDisplayStatus(auction) === 'finished').length,
    bids: auctions.reduce((total, auction) => total + auction.bids.length, 0),
  }), [auctions])

  return (
    <div className="admin-page">
      <AdminNavbarPirata />
      <div className="admin-content admin-auctions-page">
        <div className="admin-page-header">
          <h1 className="serif luxury-gold">Subastas</h1>
          <p className="admin-page-sub">Supervisión de subastas y pujas de Pirata Market</p>
        </div>

        <div className="admin-auction-stats">
          <div className="admin-stat-card stat-gold"><span className="admin-stat-icon">🔨</span><div><div className="admin-stat-value">{loading ? '...' : stats.total}</div><div className="admin-stat-label">Subastas totales</div></div></div>
          <div className="admin-stat-card stat-success"><span className="admin-stat-icon">●</span><div><div className="admin-stat-value">{loading ? '...' : stats.active}</div><div className="admin-stat-label">Activas</div></div></div>
          <div className="admin-stat-card stat-warning"><span className="admin-stat-icon">◷</span><div><div className="admin-stat-value">{loading ? '...' : stats.finished}</div><div className="admin-stat-label">Finalizadas</div></div></div>
          <div className="admin-stat-card stat-gold"><span className="admin-stat-icon">↗</span><div><div className="admin-stat-value">{loading ? '...' : stats.bids}</div><div className="admin-stat-label">Pujas registradas</div></div></div>
        </div>

        <div className="admin-filters-bar admin-auction-filters">
          <div className="admin-filter-btns">
            {filters.map(option => (
              <button
                key={option.value}
                className={`filter-btn ${filter === option.value ? 'active' : ''}`}
                onClick={() => setFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button className="btn-small btn-secondary" onClick={loadAuctions}>Actualizar</button>
        </div>

        {error && <div className="admin-card admin-auction-error">{error}</div>}

        <div className="admin-auction-list">
          {loading ? (
            <div className="admin-card admin-loading">Cargando subastas...</div>
          ) : filteredAuctions.length === 0 ? (
            <div className="admin-card admin-loading">No hay subastas con este estado.</div>
          ) : filteredAuctions.map(auction => {
            const displayStatus = getDisplayStatus(auction)
            const currentPrice = auction.bids[0]?.amount ?? auction.start_price
            const listing = auction.listing
            const seller = listing?.seller
            const isExpanded = expandedAuction === auction.id

            return (
              <article key={auction.id} className="admin-auction-card">
                <div className="admin-auction-card-header">
                  <span className={`admin-status status-${displayStatus}`}>{statusLabels[displayStatus] || displayStatus}</span>
                  <span className="admin-cell-muted">Creada {formatDate(auction.created_at)}</span>
                </div>

                <div className="admin-auction-main">
                  <div className="admin-auction-thumb">
                    {listing?.photos?.length > 0 ? <img src={listing.photos[0]} alt={listing.title} /> : <span>📦</span>}
                  </div>
                  <div className="admin-auction-info">
                    <h2>{listing?.title || 'Anuncio no disponible'}</h2>
                    <p>Vendedor: {seller?.display_name || seller?.email || '—'}</p>
                    <p className="admin-cell-muted">Cierre: {formatDate(auction.ends_at)}</p>
                  </div>
                  <div className="admin-auction-price">
                    <span>Precio actual</span>
                    <strong>{formatMoney(currentPrice, listing?.currency)}</strong>
                    <small>{auction.bids.length} {auction.bids.length === 1 ? 'puja' : 'pujas'}</small>
                  </div>
                </div>

                <div className="admin-auction-meta">
                  <span>Inicial: {formatMoney(auction.start_price, listing?.currency)}</span>
                  <span>Incremento: {formatMoney(auction.minimum_increment, listing?.currency)}</span>
                  <span>Ganador: {auction.winner_id ? auction.winner_id.slice(0, 8) : 'Pendiente'}</span>
                </div>

                <div className="admin-auction-actions">
                  {listing?.slug && <Link to={`/ficha/${listing.slug}`} target="_blank" className="btn-small btn-secondary">Ver anuncio</Link>}
                  <button className="btn-small btn-secondary" onClick={() => setExpandedAuction(isExpanded ? null : auction.id)}>
                    {isExpanded ? 'Ocultar pujas' : 'Ver pujas'}
                  </button>
                </div>

                {isExpanded && (
                  <div className="admin-auction-bids">
                    <h3>Historial de pujas</h3>
                    {auction.bids.length === 0 ? (
                      <p className="admin-cell-muted">Todavía no hay pujas registradas.</p>
                    ) : auction.bids.map(bid => (
                      <div key={bid.id} className="admin-auction-bid-row">
                        <span>{bid.bidder?.display_name || bid.bidder?.email || bid.bidder_id}</span>
                        <strong>{formatMoney(bid.amount, listing?.currency)}</strong>
                        <time>{formatDate(bid.created_at)}</time>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      </div>
    </div>
  )
}
