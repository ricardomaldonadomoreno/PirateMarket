import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import AdminNavbar from '../../components/AdminNavbar'
import './AdminUsuarios.css'

export default function AdminUsuarios() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [verificationRequests, setVerificationRequests] = useState({})
  const [docsModal, setDocsModal] = useState(null)
  const [rejectNote, setRejectNote] = useState('')
  const [rejectLayer, setRejectLayer] = useState('') // 'identity' | 'business'
  const [lightboxImg, setLightboxImg] = useState(null)
  const [lightboxTitle, setLightboxTitle] = useState('')

  useEffect(() => { loadUsers() }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('users')
        .select(`
          id, display_name, email, user_type, is_verified, is_banned, is_premium, premium_until, 
          created_at, avatar_url, whatsapp, shop_name, 
          full_name, country, city, phone,
          identity_verified, identity_locked, business_verified, allow_identity_edit
        `)
        .order('created_at', { ascending: false })
      if (data) {
        setUsers(data)
        const { data: requests } = await supabase
          .from('verification_requests')
          .select('*')
          .eq('app_source', 'pirata')
          .in('user_id', data.map(u => u.id))
          .order('created_at', { ascending: false })
        if (requests) {
          const map = {}
          requests.forEach(r => { if (!map[r.user_id]) map[r.user_id] = r })
          setVerificationRequests(map)
        }
      }
    } catch (error) { console.error(error) }
    finally { setLoading(false) }
  }

  // ── ACCIONES DE USUARIO ──
  const handleBan = async (userId, isBanned) => {
    if (!confirm(isBanned ? '¿Desbanear este usuario?' : '¿Banear este usuario?')) return
    await supabase.from('users').update({ is_banned: !isBanned }).eq('id', userId)
    loadUsers()
  }

  const handleChangeType = async (userId, newType) => {
    await supabase.from('users').update({ user_type: newType }).eq('id', userId)
    loadUsers()
  }

  const handleTogglePremium = async (userId, isPremium) => {
    if (isPremium) {
      await supabase.from('users').update({ is_premium: false, premium_until: null }).eq('id', userId)
    } else {
      const until = new Date()
      until.setFullYear(until.getFullYear() + 1)
      await supabase.from('users').update({ is_premium: true, premium_until: until.toISOString() }).eq('id', userId)
    }
    loadUsers()
  }

  // ── VERIFICACIÓN EN CAPAS ──
  const handleApproveIdentity = async (requestId, userId) => {
    await supabase.from('verification_requests').update({
      status: 'approved', reviewed_at: new Date().toISOString()
    }).eq('id', requestId)
    await supabase.from('users').update({
      identity_verified: true,
      identity_locked: true,
      allow_identity_edit: false,
    }).eq('id', userId)
    
    // Verificación general si es tipo persona
    const user = users.find(u => u.id === userId)
    if (user?.user_type === 'person') {
      await supabase.from('users').update({ is_verified: true }).eq('id', userId)
    }
    
    setDocsModal(null)
    loadUsers()
  }

  const handleApproveBusiness = async (requestId, userId) => {
    await supabase.from('users').update({
      business_verified: true,
      is_verified: true,
    }).eq('id', userId)
    setDocsModal(null)
    loadUsers()
  }

  const handleRejectLayer = async (requestId, layer) => {
    if (!rejectNote.trim()) { alert('Escribe un motivo de rechazo'); return }
    await supabase.from('verification_requests').update({
      status: 'rejected',
      admin_note: rejectNote,
      reviewed_at: new Date().toISOString()
    }).eq('id', requestId)
    
    if (layer === 'identity') {
      await supabase.from('users').update({ identity_verified: false }).eq('id', docsModal.user.id)
    } else {
      await supabase.from('users').update({ business_verified: false, is_verified: false }).eq('id', docsModal.user.id)
    }
    
    setDocsModal(null)
    setRejectNote('')
    setRejectLayer('')
    loadUsers()
  }

  const handleRevokeVerification = async (userId, layer) => {
    if (!confirm(`¿Revocar verificación de ${layer === 'identity' ? 'Identidad' : 'Negocio'}?`)) return
    if (layer === 'identity') {
      await supabase.from('users').update({ identity_verified: false, identity_locked: false, is_verified: false }).eq('id', userId)
    } else {
      await supabase.from('users').update({ business_verified: false, is_verified: false }).eq('id', userId)
    }
    loadUsers()
  }

  const handleAllowIdentityEdit = async (userId, currentValue) => {
    await supabase.from('users').update({
      allow_identity_edit: !currentValue,
      identity_locked: currentValue,
    }).eq('id', userId)
    loadUsers()
  }

  const exportCSV = () => {
    const headers = ['Nombre', 'Email', 'WhatsApp', 'Tipo', 'Tienda', 'ID Verif', 'Neg Verif', 'Premium', 'Registro']
    const rows = filtered.map(u => [
      u.display_name || '', u.email || '', u.whatsapp || '', u.user_type || '', u.shop_name || '',
      u.identity_verified ? 'Sí' : 'No', u.business_verified ? 'Sí' : 'No', u.is_premium ? 'Sí' : 'No',
      new Date(u.created_at).toLocaleDateString()
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `usuarios_pirata_${Date.now()}.csv`; a.click()
  }

  const filtered = users.filter(u => {
    const matchSearch = u.display_name?.toLowerCase().includes(search.toLowerCase()) ||
                        u.email?.toLowerCase().includes(search.toLowerCase()) ||
                        u.shop_name?.toLowerCase().includes(search.toLowerCase())
    const matchType = filterType === 'all' || u.user_type === filterType
    return matchSearch && matchType
  })

  return (
    <div className="admin-page">
      <AdminNavbar />
      <div className="admin-content">
        <div className="admin-page-header">
          <h1 className="serif luxury-gold">Gestión de Usuarios — Pirata Market</h1>
          <button className="btn btn-secondary btn-sm" onClick={exportCSV}>Exportar CSV</button>
        </div>

        <div className="admin-filters-bar">
          <input type="text" className="input" placeholder="Buscar usuario o tienda..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <div className="admin-filter-btns">
            {['all', 'person', 'shop', 'wholesale'].map(t => (
              <button key={t} className={`filter-btn ${filterType === t ? 'active' : ''}`} onClick={() => setFilterType(t)}>
                {t === 'all' ? 'Todos' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="admin-card">
          {loading ? <div className="admin-loading">Cargando...</div> : (
            <div className="admin-users-table">
              <div className="admin-users-header">
                <span>Usuario / Tienda</span>
                <span>Tipo</span>
                <span>Identidad</span>
                <span>Negocio</span>
                <span>Premium</span>
                <span>Acciones</span>
              </div>
              {filtered.map(user => {
                const vReq = verificationRequests[user.id]
                const isPremium = user.is_premium && user.premium_until && new Date(user.premium_until) > new Date()
                return (
                  <div key={user.id} className={`admin-user-row ${user.is_banned ? 'banned' : ''}`}>
                    <div className="admin-user-info">
                      <div className="admin-user-avatar">
                        {user.avatar_url ? <img src={user.avatar_url} /> : <span>{user.display_name?.[0]}</span>}
                      </div>
                      <div>
                        <div className="admin-user-name">{user.display_name}</div>
                        {user.shop_name && <div className="admin-user-shop">🏪 {user.shop_name}</div>}
                        <div className="admin-user-email">{user.email}</div>
                      </div>
                    </div>
                    <div>
                      <select className="admin-type-select" value={user.user_type} onChange={e => handleChangeType(user.id, e.target.value)}>
                        <option value="person">Persona</option>
                        <option value="shop">Tienda</option>
                        <option value="wholesale">Mayorista</option>
                      </select>
                    </div>
                    <div>
                      <span className={`admin-badge ${user.identity_verified ? 'badge-verified' : vReq?.identity_docs?.length ? 'badge-pending' : 'badge-free'}`}>
                        {user.identity_verified ? 'Verificada' : vReq?.identity_docs?.length ? 'Pendiente' : 'Sin datos'}
                      </span>
                    </div>
                    <div>
                      {user.user_type !== 'person' ? (
                        <span className={`admin-badge ${user.business_verified ? 'badge-verified' : vReq?.business_docs?.length ? 'badge-pending' : 'badge-free'}`}>
                          {user.business_verified ? 'Verificado' : vReq?.business_docs?.length ? 'Pendiente' : 'Sin datos'}
                        </span>
                      ) : <span className="admin-badge-none">—</span>}
                    </div>
                    <div>
                      <span className={`admin-badge ${isPremium ? 'badge-premium' : 'badge-free'}`}>
                        {isPremium ? 'Premium' : 'Básico'}
                      </span>
                    </div>
                    <div className="admin-user-actions">
                      <button className="btn-action" onClick={() => setDocsModal({ user, request: vReq })}>Revisar Docs</button>
                      <button className={`btn-action ${isPremium ? 'btn-danger' : 'btn-success'}`} onClick={() => handleTogglePremium(user.id, isPremium)}>
                        {isPremium ? 'Quitar Premium' : 'Dar Premium'}
                      </button>
                      <button className="btn-action btn-danger" onClick={() => handleBan(user.id, user.is_banned)}>
                        {user.is_banned ? 'Desbanear' : 'Banear'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {docsModal && (
        <div className="docs-modal-overlay" onClick={() => setDocsModal(null)}>
          <div className="docs-modal" onClick={e => e.stopPropagation()}>
            <div className="docs-modal-header">
              <h3>Verificación: {docsModal.user.display_name}</h3>
              <button className="close-btn" onClick={() => setDocsModal(null)}>✕</button>
            </div>
            <div className="docs-modal-body">
              
              {/* DATOS REALES */}
              <div className="docs-section">
                <h4>👤 Datos de Identidad Real</h4>
                <div className="real-data-grid">
                  <div className="data-item"><label>Nombre:</label> <span>{docsModal.user.full_name || '—'}</span></div>
                  <div className="data-item"><label>País:</label> <span>{docsModal.user.country || '—'}</span></div>
                  <div className="data-item"><label>Ciudad:</label> <span>{docsModal.user.city || '—'}</span></div>
                  <div className="data-item"><label>Teléfono:</label> <span>{docsModal.user.phone || '—'}</span></div>
                </div>
              </div>

              {/* CAPA 1: IDENTIDAD */}
              <div className="docs-section">
                <div className="section-title">
                  <h4>🪪 Capa 1: Documentos de Identidad</h4>
                  {docsModal.user.identity_verified && (
                    <div className="section-actions">
                      <button className="btn-small btn-warning" onClick={() => handleRevokeVerification(docsModal.user.id, 'identity')}>Revocar</button>
                      <button className="btn-small btn-secondary" onClick={() => handleAllowIdentityEdit(docsModal.user.id, docsModal.user.allow_identity_edit)}>
                        {docsModal.user.allow_identity_edit ? 'Bloquear Edición' : 'Permitir Edición'}
                      </button>
                    </div>
                  )}
                </div>
                <div className="docs-grid">
                  {docsModal.request?.identity_docs?.map((url, i) => (
                    <div key={i} className="doc-card" onClick={() => setLightboxImg(url)}>
                      <img src={url} />
                      <span>{i === 0 ? 'Anverso' : 'Reverso'}</span>
                    </div>
                  ))}
                </div>
                {!docsModal.user.identity_verified && docsModal.request?.identity_docs?.length > 0 && (
                  <div className="approval-actions">
                    <button className="btn btn-success" onClick={() => handleApproveIdentity(docsModal.request.id, docsModal.user.id)}>Aprobar Identidad</button>
                    <div className="reject-box">
                      <input type="text" placeholder="Motivo rechazo..." onChange={e => {setRejectNote(e.target.value); setRejectLayer('identity')}} />
                      <button className="btn btn-danger" onClick={() => handleRejectLayer(docsModal.request.id, 'identity')}>Rechazar</button>
                    </div>
                  </div>
                )}
              </div>

              {/* CAPA 2: NEGOCIO */}
              {docsModal.user.user_type !== 'person' && (
                <div className="docs-section">
                  <div className="section-title">
                    <h4>🏪 Capa 2: Documentos de Negocio</h4>
                    {docsModal.user.business_verified && (
                      <button className="btn-small btn-warning" onClick={() => handleRevokeVerification(docsModal.user.id, 'business')}>Revocar</button>
                    )}
                  </div>
                  <div className="docs-grid">
                    {docsModal.request?.business_docs?.map((url, i) => (
                      <div key={i} className="doc-card" onClick={() => setLightboxImg(url)}>
                        <img src={url} />
                        <span>Documento {i + 1}</span>
                      </div>
                    ))}
                  </div>
                  {!docsModal.user.business_verified && docsModal.request?.business_docs?.length > 0 && (
                    <div className="approval-actions">
                      <button className="btn btn-success" onClick={() => handleApproveBusiness(docsModal.request.id, docsModal.user.id)}>Aprobar Negocio</button>
                      <div className="reject-box">
                        <input type="text" placeholder="Motivo rechazo..." onChange={e => {setRejectNote(e.target.value); setRejectLayer('business')}} />
                        <button className="btn btn-danger" onClick={() => handleRejectLayer(docsModal.request.id, 'business')}>Rechazar</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {lightboxImg && (
        <div className="lightbox-overlay" onClick={() => setLightboxImg(null)}>
          <img src={lightboxImg} />
          <button className="close-lightbox">✕</button>
        </div>
      )}
    </div>
  )
}
