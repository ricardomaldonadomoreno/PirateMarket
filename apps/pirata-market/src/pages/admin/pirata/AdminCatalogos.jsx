import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import AdminNavbarPirata from '../../../components/AdminNavbarPirata'
import './AdminCatalogos.css'

export default function AdminCatalogos() {
  const [search, setSearch] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)

  // Buscar usuario por email o display_name
  const handleSearch = async () => {
    const q = search.trim()
    if (!q) return
    setLoading(true)
    setResult(null)
    try {
      // Buscar en users
      const { data: usersData } = await supabase
        .from('users')
        .select('id, email, display_name, avatar_url, whatsapp, country, is_banned, created_at, user_type')
        .or(`email.ilike.%${q}%,display_name.ilike.%${q}%`)
        .limit(10)

      if (!usersData || usersData.length === 0) {
        setResult({ notFound: true, query: q })
        setLoading(false)
        return
      }

      // Para cada usuario encontrado, cargar pirata_profiles (identity, verificación) Y shop_profiles (premium, datos tienda)
      const userIds = usersData.map(u => u.id)

      // Cargar pirata_profiles (identity, verificación)
      const { data: pirataData } = await supabase
        .from('pirata_profiles')
        .select('user_id, identity, identity_verified, business_verified')
        .in('user_id', userIds)

      // Cargar shop_profiles (premium, datos tienda)
      const { data: shopData } = await supabase
        .from('shop_profiles')
        .select('user_id, shop_name, shop_logo_url, shop_banner_url, shop_color, is_premium, premium_until')
        .in('user_id', userIds)

      // Fusionar
      const pirataMap = {}
      if (pirataData) {
        pirataData.forEach(p => { pirataMap[p.user_id] = p })
      }

      const shopMap = {}
      if (shopData) {
        shopData.forEach(s => { shopMap[s.user_id] = s })
      }

      const merged = usersData.map(u => ({
        ...u,
        pirata: pirataMap[u.id] || null,
        shop: shopMap[u.id] || null,
      }))

      setResult({ users: merged, query: q })
    } catch (error) {
      console.error('Error buscando:', error)
      setResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  // Activar/Desactivar premium
  const handleTogglePremium = async (userId, isCurrentlyPremium) => {
    if (!confirm(isCurrentlyPremium ? '¿Desactivar catálogo premium?' : '¿Activar catálogo premium?')) return
    setUpdating(true)
    try {
      if (isCurrentlyPremium) {
        // Desactivar
        await supabase.from('shop_profiles').update({
          is_premium: false,
          premium_until: null,
        }).eq('user_id', userId)
      } else {
        // Activar con duración seleccionable
        const days = parseInt(prompt('Días de duración del premium (ej: 30, 60, 90):', '30'))
        if (!days || days <= 0) { setUpdating(false); return }
        const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()

        // Upsert: si ya existe shop_profile, update; si no, insert
        const { data: existing } = await supabase
          .from('shop_profiles')
          .select('id')
          .eq('user_id', userId)
          .single()

        if (existing) {
          await supabase.from('shop_profiles').update({
            is_premium: true,
            premium_until: until,
          }).eq('user_id', userId)
        } else {
          await supabase.from('shop_profiles').insert({
            user_id: userId,
            is_premium: true,
            premium_until: until,
          })
        }
      }
      // Recargar resultado
      await handleSearch()
    } catch (error) {
      alert('Error: ' + error.message)
    } finally {
      setUpdating(false)
    }
  }

  // Extender premium
  const handleExtend = async (userId, premiumUntil) => {
    const days = parseInt(prompt('Días adicionales a extender:', '30'))
    if (!days || days <= 0) return
    setUpdating(true)
    try {
      const baseDate = premiumUntil && new Date(premiumUntil) > new Date()
        ? new Date(premiumUntil)
        : new Date()
      baseDate.setDate(baseDate.getDate() + days)

      // Upsert
      const { data: existing } = await supabase
        .from('shop_profiles')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (existing) {
        await supabase.from('shop_profiles').update({
          is_premium: true,
          premium_until: baseDate.toISOString(),
        }).eq('user_id', userId)
      } else {
        await supabase.from('shop_profiles').insert({
          user_id: userId,
          is_premium: true,
          premium_until: baseDate.toISOString(),
        })
      }
      await handleSearch()
    } catch (error) {
      alert('Error: ' + error.message)
    } finally {
      setUpdating(false)
    }
  }

  const isPremiumActive = (shop) =>
    shop?.is_premium && shop?.premium_until && new Date(shop.premium_until) > new Date()

  const fmt = (date) => date ? new Date(date).toLocaleDateString('es-BO', {
    day: '2-digit', month: 'short', year: 'numeric'
  }) : '—'

  const fmtShort = (date) => date ? new Date(date).toLocaleDateString('es-BO', {
    day: '2-digit', month: 'short'
  }) : '—'

  return (
    <div className="admin-page">
      <AdminNavbarPirata />
      <div className="admin-content">
        <div className="admin-page-header">
          <h1 className="serif luxury-gold">Catálogos Premium</h1>
          <p className="admin-page-sub">Busca un usuario y activa o desactiva su catálogo premium</p>
        </div>

        {/* Buscador */}
        <div className="catalog-search-section">
          <div className="catalog-search-row">
            <input
              type="text"
              className="input catalog-search-input"
              placeholder="Buscar por email o nombre de usuario..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
            />
            <button
              className="btn btn-primary"
              onClick={handleSearch}
              disabled={loading || updating}
              style={{ marginLeft: '0.5rem' }}
            >
              {loading ? 'Buscando...' : '🔍 Buscar'}
            </button>
          </div>
        </div>

        {/* Resultados */}
        {result && (
          <div className="catalog-results">
            {result.notFound ? (
              <div className="catalog-empty">
                <span className="catalog-empty-icon">🔍</span>
                <p>No se encontró ningún usuario con "{result.query}"</p>
              </div>
            ) : result.error ? (
              <div className="catalog-error">
                <p>Error: {result.error}</p>
              </div>
            ) : (
              <>
                <p className="catalog-results-count">
                  {result.users.length} resultado{result.users.length !== 1 ? 's' : ''} para "{result.query}"
                </p>
                <div className="catalog-users-grid">
                  {result.users.map(u => {
                    const pirata = u.pirata
                    const shop = u.shop
                    const premiumActive = isPremiumActive(shop)
                    const isShop = pirata?.identity === 'shop' || pirata?.identity === 'wholesale'
                    return (
                      <div key={u.id} className="catalog-user-card">
                        {/* Header */}
                        <div className="card-header-row">
                          <div className="card-user-info">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt="" className="card-avatar" />
                            ) : (
                              <div className="card-avatar-placeholder">
                                {u.display_name?.charAt(0).toUpperCase() || '?'}
                              </div>
                            )}
                            <div>
                              <div className="card-display-name">{u.display_name}</div>
                              <div className="card-email">{u.email}</div>
                              {shop?.shop_name && <div className="card-shop-name">{shop.shop_name}</div>}
                            </div>
                          </div>
                          <div className="card-type-badge">
                            {pirata?.identity === 'shop' && <span className="type-badge-shop">🏪 Tienda</span>}
                            {pirata?.identity === 'wholesale' && <span className="type-badge-wholesale">📦 Mayorista</span>}
                            {pirata?.identity === 'person' && <span className="type-badge-person">👤 Persona</span>}
                            {!pirata && <span className="type-badge-none">Sin perfil pirata</span>}
                          </div>
                        </div>

                        {/* Premium status */}
                        <div className="card-premium-section">
                          {premiumActive ? (
                            <div className="premium-badge-active">
                              <span className="premium-star">⭐</span>
                              <span className="premium-label">Premium activo</span>
                              <span className="premium-date">hasta {fmt(shop.premium_until)}</span>
                            </div>
                          ) : shop?.is_premium && shop?.premium_until && new Date(shop.premium_until) <= new Date() ? (
                            <div className="premium-badge-expired">
                              <span>⚠️ Premium expirado ({fmtShort(shop.premium_until)})</span>
                            </div>
                          ) : (
                            <div className="premium-badge-none">Sin premium</div>
                          )}
                        </div>

                        {/* Acciones */}
                        {isShop && (
                          <div className="card-actions">
                            {premiumActive ? (
                              <>
                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => handleTogglePremium(u.id, true)}
                                  disabled={updating}
                                >
                                  Desactivar premium
                                </button>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleExtend(u.id, shop?.premium_until)}
                                  disabled={updating}
                                >
                                  Extender
                                </button>
                              </>
                            ) : (
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => handleTogglePremium(u.id, false)}
                                disabled={updating}
                              >
                                ⭐ Activar premium
                              </button>
                            )}
                          </div>
                        )}

                        {/* Nota si no es tienda/mayorista */}
                        {!isShop && pirata && (
                          <div className="card-note">
                            Es persona — no necesita catálogo premium
                          </div>
                        )}
                        {!pirata && (
                          <div className="card-note">
                            No tiene perfil pirata (no ha iniciado verificación)
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Estado inicial */}
        {!result && !loading && (
          <div className="catalog-empty">
            <span className="catalog-empty-icon">⭐</span>
            <p>Escribe el email o nombre de usuario para buscar y gestionar su catálogo premium</p>
            <p className="catalog-hint">Los usuarios solicitan premium por WhatsApp. Busca aquí y actívalo.</p>
          </div>
        )}
      </div>
    </div>
  )
}
