import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import './Dashboard.css'

export default function DashboardTienda({ user, profile }) {
  const { t } = useTranslation()
  const [shopData, setShopData] = useState(null)
  const [pirataIdentity, setPirataIdentity] = useState('person')
  const [shopForm, setShopForm] = useState({
    shop_name: '', shop_bio: '', shop_link: '', shop_hours: '',
    shop_color: '#D4AF37', shop_logo_url: '', shop_banner_url: '',
  })
  const [savingShop, setSavingShop] = useState(false)
  const [shopSaved, setShopSaved] = useState(false)
  const [editing, setEditing] = useState(false)

  // Cargar shop_profiles y identity de pirata_profiles directamente
  useEffect(() => {
    if (!user) return
    const load = async () => {
      try {
        const { data: shop } = await supabase
          .from('shop_profiles')
          .select('shop_name, shop_bio, shop_link, shop_hours, shop_color, shop_logo_url, shop_banner_url, is_premium, premium_until')
          .eq('user_id', user.id)
          .single()
        if (shop) setShopData(shop)

        const { data: pirata } = await supabase
          .from('pirata_profiles')
          .select('identity')
          .eq('user_id', user.id)
          .single()
        if (pirata) setPirataIdentity(pirata.identity || 'person')
      } catch (err) { console.error(err) }
    }
    load()
  }, [user])

  // Si ya tiene datos guardados, no mostrar formulario en edición por defecto
  useEffect(() => {
    if (shopData) {
      setShopForm({
        shop_name: shopData.shop_name || '',
        shop_bio: shopData.shop_bio || '',
        shop_link: shopData.shop_link || '',
        shop_hours: shopData.shop_hours || '',
        shop_color: shopData.shop_color || '#D4AF37',
        shop_logo_url: shopData.shop_logo_url || '',
        shop_banner_url: shopData.shop_banner_url || '',
      })
      // Si ya tiene datos, ocultar formulario (solo mostrar botón editar)
      const hasData = shopData.shop_name || shopData.shop_banner_url || shopData.shop_link
      if (hasData) setEditing(false)
    }
  }, [shopData])

  const handleShopSave = async () => {
    setSavingShop(true)
    try {
      // Upsert: si ya existe, update; si no, insert
      const { data: existing } = await supabase
        .from('shop_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (existing) {
        await supabase.from('shop_profiles').update({
          shop_name: shopForm.shop_name || null,
          shop_bio: shopForm.shop_bio || null,
          shop_link: shopForm.shop_link || null,
          shop_hours: shopForm.shop_hours || null,
          shop_color: shopForm.shop_color || '#D4AF37',
          shop_logo_url: shopForm.shop_logo_url || null,
          shop_banner_url: shopForm.shop_banner_url || null,
          updated_at: new Date().toISOString(),
        }).eq('user_id', user.id)
      } else {
        await supabase.from('shop_profiles').insert({
          user_id: user.id,
          shop_name: shopForm.shop_name || null,
          shop_bio: shopForm.shop_bio || null,
          shop_link: shopForm.shop_link || null,
          shop_hours: shopForm.shop_hours || null,
          shop_color: shopForm.shop_color || '#D4AF37',
          shop_logo_url: shopForm.shop_logo_url || null,
          shop_banner_url: shopForm.shop_banner_url || null,
        })
      }
      setShopSaved(true)
      setTimeout(() => setShopSaved(false), 3000)
      // Recargar datos y volver a modo visualización
      await refreshData()
      setEditing(false)
    } catch (error) { alert('Error al guardar: ' + error.message) }
    finally { setSavingShop(false) }
  }

  const refreshData = async () => {
    if (!user) return
    try {
      const { data: shop } = await supabase
        .from('shop_profiles')
        .select('shop_name, shop_bio, shop_link, shop_hours, shop_color, shop_logo_url, shop_banner_url, is_premium, premium_until')
        .eq('user_id', user.id)
        .single()
      if (shop) setShopData(shop)
    } catch (err) { console.error(err) }
  }

  if (!user) return null

  const userType = pirataIdentity || 'person'
  const isPremium = shopData?.is_premium && shopData?.premium_until && new Date(shopData.premium_until) > new Date()

  return (
    <div className="db-section">
      {/* ── CATÁLOGO PREMIUM ── */}
      <div className="db-section-header">
        <h2>🏪 Catálogo Premium</h2>
        {isPremium ? <span className="premium-active-badge">✓ Activo</span> : <span className="premium-inactive-badge">🔒 Inactivo</span>}
      </div>
      {!isPremium ? (
        <div className="premium-locked">
          <p>Activa tu catálogo premium para personalizar tu tienda.</p>
          <a href="https://wa.me/59175109694" className="btn btn-primary">Solicitar por WhatsApp</a>
        </div>
      ) : editing ? (
        /* ── MODO EDICIÓN ── */
        <div className="premium-form">
          <div className="premium-form-grid">
            <div className="form-group">
              <label>Nombre de Tienda</label>
              <input type="text" className="input" value={shopForm.shop_name} onChange={e => setShopForm(p => ({ ...p, shop_name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Color de Marca</label>
              <input type="color" className="color-input" value={shopForm.shop_color} onChange={e => setShopForm(p => ({ ...p, shop_color: e.target.value }))} />
            </div>
            <div className="form-group full-width">
              <label>Enlace Web</label>
              <input type="text" className="input" value={shopForm.shop_link} onChange={e => setShopForm(p => ({ ...p, shop_link: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="form-group full-width">
              <label>URL del Banner de Tienda</label>
              <input type="text" className="input" value={shopForm.shop_banner_url} onChange={e => setShopForm(p => ({ ...p, shop_banner_url: e.target.value }))} placeholder="https://...imagen.jpg" />
              <small className="field-hint">Pega la URL directa de tu imagen de banner (1200×300 px recomendado)</small>
            </div>
            <div className="form-group full-width">
              <label>URL del Logo de Tienda</label>
              <input type="text" className="input" value={shopForm.shop_logo_url} onChange={e => setShopForm(p => ({ ...p, shop_logo_url: e.target.value }))} placeholder="https://...logo.png" />
              <small className="field-hint">Pega la URL directa de tu logo (cuadrado recomendado)</small>
            </div>
            <div className="form-group">
              <label>Horario de Atención</label>
              <input type="text" className="input" value={shopForm.shop_hours} onChange={e => setShopForm(p => ({ ...p, shop_hours: e.target.value }))} placeholder="Ej: Lun-Sáb 9:00-18:00" />
            </div>
            <div className="form-group full-width">
              <label>Bio / Descripción</label>
              <textarea className="input" rows={3} value={shopForm.shop_bio} onChange={e => setShopForm(p => ({ ...p, shop_bio: e.target.value }))} />
            </div>
          </div>
          <div className="premium-form-actions">
            <button className="btn btn-primary" onClick={handleShopSave} disabled={savingShop}>
              {savingShop ? 'Guardando...' : 'Guardar Cambios'}
            </button>
            <button className="btn btn-secondary" onClick={() => { setEditing(false); refreshData() }}>
              Cancelar
            </button>
          </div>
          {shopSaved && <p className="success-msg">✓ Tienda actualizada correctamente</p>}
        </div>
      ) : (
        /* ── MODO VISUALIZACIÓN (datos guardados, botón editar) ── */
        <div className="premium-view">
          <div className="premium-view-grid">
            <div className="premium-view-item">
              <span className="premium-view-label">Nombre de Tienda</span>
              <span className="premium-view-value">{shopData?.shop_name || '—'}</span>
            </div>
            <div className="premium-view-item">
              <span className="premium-view-label">Color de Marca</span>
              <span className="premium-view-value" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: shopData?.shop_color || '#D4AF37', display: 'inline-block' }} />
                {shopData?.shop_color || '#D4AF37'}
              </span>
            </div>
            <div className="premium-view-item full-width">
              <span className="premium-view-label">Enlace Web</span>
              <span className="premium-view-value">{shopData?.shop_link ? <a href={shopData.shop_link} target="_blank" rel="noopener noreferrer">{shopData.shop_link}</a> : '—'}</span>
            </div>
            <div className="premium-view-item full-width">
              <span className="premium-view-label">Banner de Tienda</span>
              <span className="premium-view-value">{shopData?.shop_banner_url ? <a href={shopData.shop_banner_url} target="_blank" rel="noopener noreferrer">Ver banner</a> : '—'}</span>
            </div>
            <div className="premium-view-item full-width">
              <span className="premium-view-label">Logo de Tienda</span>
              <span className="premium-view-value">{shopData?.shop_logo_url ? <a href={shopData.shop_logo_url} target="_blank" rel="noopener noreferrer">Ver logo</a> : '—'}</span>
            </div>
            <div className="premium-view-item">
              <span className="premium-view-label">Horario de Atención</span>
              <span className="premium-view-value">{shopData?.shop_hours || '—'}</span>
            </div>
            <div className="premium-view-item full-width">
              <span className="premium-view-label">Bio / Descripción</span>
              <span className="premium-view-value">{shopData?.shop_bio || '—'}</span>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => setEditing(true)}>
            ✏️ Editar
          </button>
        </div>
      )}
    </div>
  )
}
