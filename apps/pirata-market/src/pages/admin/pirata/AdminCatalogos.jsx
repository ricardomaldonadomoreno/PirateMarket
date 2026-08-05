import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import AdminNavbarPirata from '../../../components/AdminNavbarPirata'
import './AdminCatalogos.css'

export default function AdminCatalogos() {
  const [shops, setShops] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterPremium, setFilterPremium] = useState('all') // all | active | inactive

  useEffect(() => { loadShops() }, [])

  const loadShops = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id, email, display_name, user_type, is_premium, premium_until, created_at,
          pirata_profiles(
            shop_name, shop_bio, shop_link, shop_hours, shop_color, shop_logo_url, shop_banner_url
          )
        `)
        .in('user_type', ['shop', 'wholesale'])
        .order('is_premium', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) setShops(data)
    } catch (error) {
      console.error('Error cargando catálogos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTogglePremium = async (userId, currentStatus, currentUntil) => {
    if (!confirm(currentStatus ? '¿Desactivar catálogo premium?' : '¿Activar catálogo premium?')) return
    try {
      const update = currentStatus
        ? { is_premium: false, premium_until: null }
        : { is_premium: true, premium_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() }

      const { error } = await supabase
        .from('users')
        .update(update)
        .eq('id', userId)

      if (error) throw error
      loadShops()
    } catch (error) {
      alert('Error: ' + error.message)
    }
  }

  const handleExtendPremium = async (userId) => {
    const extraDays = parseInt(prompt('Días adicionales a agregar:', '30'))
    if (!extraDays || extraDays <= 0) return
    try {
      const { data: shop } = shops.find(s => s.id === userId) || {}
      const currentUntil = shop?.premium_until
      const baseDate = currentUntil && new Date(currentUntil) > new Date()
        ? new Date(currentUntil)
        : new Date()
      baseDate.setDate(baseDate.getDate() + extraDays)

      const { error } = await supabase
        .from('users')
        .update({ is_premium: true, premium_until: baseDate.toISOString() })
        .eq('id', userId)

      if (error) throw error
      loadShops()
    } catch (error) {
      alert('Error: ' + error.message)
    }
  }

  const isPremiumActive = (shop) =>
    shop.is_premium && shop.premium_until && new Date(shop.premium_until) > new Date()

  const filtered = shops.filter(s => {
    const matchSearch = s.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase()) ||
      s.pirata_profiles?.shop_name?.toLowerCase().includes(search.toLowerCase())
    const matchPremium = filterPremium === 'all' ||
      (filterPremium === 'active' && isPremiumActive(s)) ||
      (filterPremium === 'inactive' && !isPremiumActive(s))
    return matchSearch && matchPremium
  })

  const fmt = (date) => date ? new Date(date).toLocaleDateString('es-BO', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }) : '—'

  const premiumExpired = (shop) =>
    shop.is_premium && shop.premium_until && new Date(shop.premium_until) <= new Date()

  return (
    <div className="admin-page">
      <AdminNavbarPirata />
      <div className="admin-content">
        <div className="admin-page-header">
          <h1 className="serif luxury-gold">Catálogos Premium</h1>
          <p className="admin-page-sub">
            {shops.length} tiendas/mayoristas · {shops.filter(isPremiumActive).length} premium activos
          </p>
        </div>

        <div className="admin-filters-bar">
          <input
            type="text" className="input" placeholder="Buscar por nombre, email o tienda..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: '300px' }}
          />
          <div className="admin-filter-btns">
            {['all', 'active', 'inactive'].map(f => (
              <button key={f} className={`filter-btn ${filterPremium === f ? 'active' : ''}`}
                onClick={() => setFilterPremium(f)}>
                {f === 'all' ? 'Todos' : f === 'active' ? '✓ Premium activo' : '✗ Sin premium'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="admin-loading">
            {[...Array(5)].map((_, i) => <div key={i} className="skeleton-row" style={{ height: '60px' }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty">
            <span className="admin-empty-icon">🏪</span>
            <p>No se encontraron tiendas/mayoristas</p>
          </div>
        ) : (
          <div className="admin-catalogs-table">
            <div className="admin-catalogs-header">
              <span>Tienda</span>
              <span>Tipo</span>
              <span>Datos tienda</span>
              <span>Premium</span>
              <span>Acciones</span>
            </div>
            {filtered.map(shop => {
              const pp = shop.pirata_profiles || {}
              const active = isPremiumActive(shop)
              const expired = premiumExpired(shop)
              return (
                <div key={shop.id} className={`admin-catalog-row ${!active ? 'inactive' : ''}`}>
                  <div className="catalog-info">
                    <div className="catalog-logo">
                      {pp.shop_logo_url ? (
                        <img src={pp.shop_logo_url} alt={pp.shop_name || shop.display_name} />
                      ) : (
                        <span>{shop.display_name?.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <div className="catalog-name">{shop.display_name}</div>
                      <div className="catalog-email">{shop.email}</div>
                    </div>
                  </div>
                  <div className="catalog-cell">
                    <span className={`admin-type-label admin-type-${shop.user_type}`}>
                      {shop.user_type === 'shop' ? '🏪 Tienda' : '📦 Mayorista'}
                    </span>
                  </div>
                  <div className="catalog-cell">
                    {pp.shop_name ? (
                      <>
                        <div className="catalog-shop-name">{pp.shop_name}</div>
                        {pp.shop_link && <div className="catalog-link">🔗 {pp.shop_link}</div>}
                        {pp.shop_hours && <div className="catalog-hours">🕐 {pp.shop_hours}</div>}
                      </>
                    ) : (
                      <span className="admin-cell-muted">Sin datos de tienda</span>
                    )}
                  </div>
                  <div className="catalog-cell">
                    {active ? (
                      <div className="badge-premium">
                        <span>⭐ Premium</span>
                        <span className="badge-premium-date">hasta {fmt(shop.premium_until)}</span>
                      </div>
                    ) : expired ? (
                      <div className="badge-expired">
                        <span>⚠️ Expirado</span>
                        <span className="badge-premium-date">{fmt(shop.premium_until)}</span>
                      </div>
                    ) : (
                      <span className="badge-free">Sin premium</span>
                    )}
                  </div>
                  <div className="catalog-actions">
                    <button
                      className={`btn ${active ? 'btn-danger' : 'btn-primary'} btn-sm`}
                      onClick={() => handleTogglePremium(shop.id, active)}>
                      {active ? 'Desactivar' : 'Activar premium'}
                    </button>
                    {active && (
                      <button className="btn btn-secondary btn-sm"
                        onClick={() => handleExtendPremium(shop.id)}>
                        Extender
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
