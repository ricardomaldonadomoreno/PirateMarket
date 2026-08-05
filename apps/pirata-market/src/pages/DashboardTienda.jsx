import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import './Dashboard.css'

export default function DashboardTienda({ user, profile }) {
  const { t } = useTranslation()
  const [shopForm, setShopForm] = useState({
    shop_name: '', shop_bio: '', shop_link: '', shop_hours: '',
    shop_color: '#D4AF37', shop_logo_url: '', shop_banner_url: '',
  })
  const [savingShop, setSavingShop] = useState(false)
  const [shopSaved, setShopSaved] = useState(false)

  useEffect(() => {
    if (profile) {
      setShopForm({
        shop_name: profile.shop_name || '',
        shop_bio: profile.shop_bio || '',
        shop_link: profile.shop_link || '',
        shop_hours: profile.shop_hours || '',
        shop_color: profile.shop_color || '#D4AF37',
        shop_logo_url: profile.shop_logo_url || '',
        shop_banner_url: profile.shop_banner_url || '',
      })
    }
  }, [profile])

  const handleShopSave = async () => {
    setSavingShop(true)
    try {
      await supabase.from('pirata_profiles').update({
        shop_name: shopForm.shop_name || null,
        shop_bio: shopForm.shop_bio || null,
        shop_link: shopForm.shop_link || null,
        shop_hours: shopForm.shop_hours || null,
        shop_color: shopForm.shop_color || '#D4AF37',
        shop_logo_url: shopForm.shop_logo_url || null,
        shop_banner_url: shopForm.shop_banner_url || null,
      }).eq('user_id', user.id)
      setShopSaved(true)
      setTimeout(() => setShopSaved(false), 3000)
    } catch (error) { alert('Error al guardar: ' + error.message) }
    finally { setSavingShop(false) }
  }

  if (!user) return null

  const userType = profile?.user_type || 'person'
  const isPremium = profile?.is_premium && profile?.premium_until && new Date(profile.premium_until) > new Date()

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
      ) : (
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
            <div className="form-group">
              <label>Horario de Atención</label>
              <input type="text" className="input" value={shopForm.shop_hours} onChange={e => setShopForm(p => ({ ...p, shop_hours: e.target.value }))} placeholder="Ej: Lun-Sáb 9:00-18:00" />
            </div>
            <div className="form-group full-width">
              <label>Bio / Descripción</label>
              <textarea className="input" rows={3} value={shopForm.shop_bio} onChange={e => setShopForm(p => ({ ...p, shop_bio: e.target.value }))} />
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleShopSave} disabled={savingShop}>
            {savingShop ? 'Guardando...' : 'Guardar Cambios'}
          </button>
          {shopSaved && <p className="success-msg">✓ Tienda actualizada correctamente</p>}
        </div>
      )}
    </div>
  )
}
