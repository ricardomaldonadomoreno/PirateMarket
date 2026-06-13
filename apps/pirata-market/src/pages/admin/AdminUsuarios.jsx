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
        .select('id, display_name, email, user_type, is_verified, is_banned, is_premium, premium_until, created_at, avatar_url, whatsapp, shop_name, identity_verified, identity_locked, business_verified, allow_identity_edit')
        .order('created_at', { ascending: false })
      if (data) {
        setUsers(data)
        const { data: requests } = await supabase
          .from('verification_requests')
          .select('*')
          .eq('source', 'pirata')
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
    // Si no tiene negocio pendiente, marcar verificado general
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
      await supabase.from('users').update({
        identity_verified: false,
      }).eq('id', docsModal.user.id)
    }
    if (layer === 'business') {
      await supabase.from('users').update({
        business_verified: false,
        is_verified: false,
      }).eq('id', docsModal.user.id)
    }
    setDocsModal(null)
    setRejectNote('')
    setRejectLayer('')
    loadUsers()
  }

  const handleAllowIdentityEdit = async (userId, currentValue) => {
    await supabase.from('users').update({
      allow_identity_edit: !currentValue,
      identity_locked: currentValue, // si permite editar, desbloquea
    }).eq('id', userId)
    loadUsers()
  }

  // ── EXPORTAR CSV ──
  const exportCSV = () => {
    const headers = ['Nombre', 'Email', 'WhatsApp', 'Tipo', 'Nombre Tienda', 'Verificado', 'Premium', 'Fecha Registro']
    const rows = filtered.map(u => [
      u.display_name || '',
      u.email || '',
      u.whatsapp || '',
      u.user_type || '',
      u.shop_name || '',
      u.is_verified ? 'Sí' : 'No',
      u.is_premium ? 'Sí' : 'No',
      new Date(u.created_at).toLocaleDateString(),
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `usuarios_pirata_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = users.filter(u => {
    const matchSearch = u.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
    const matchType = filterType === 'all' || u.user_type === filterType
    return matchSearch && matchType
  })

  const typeIcon = (type) => type === 'shop' ? '🏪' : type === 'wholesale' ? '📦' : type === 'admin' ? '🔐' : '👤'
  const premiumExpiry = (until) => until ? new Date(until).toLocaleDateString() : ''

  return (
    <div className="admin-page">
      <AdminNavbar />
      <div className="admin-content">
        <div className="admin-page-header">
          <h1 className="serif luxury-gold">Usuarios</h1>
          <p className="admin-page-sub">{users.length} usuarios registrados</p>
        </div>

        <div className="admin-filters-bar">
          <input type="text" className="input" placeholder="Buscar por nombre o email..."
            value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: '320px' }} />
          <div className="admin-filter-btns">
            {['all', 'person', 'shop', 'wholesale', 'admin'].map(type => (
              <button key={type}
                className={`filter-btn ${filterType === type ? 'active' : ''}`}
                onClick={() => setFilterType(type)}>
                {type === 'all' ? 'Todos' : typeIcon(type) + ' ' + type}
              </button>
            ))}
          </div>
          <button className="btn-export" onClick={exportCSV}>
            ⬇️ Exportar CSV ({filtered.length})
          </button>
        </div>

        <div className="admin-card">
          {loading ? <div className="admin-loading">Cargando usuarios...</div> : (
            <div className="admin-users-table">
              <div className="admin-users-header">
                <span>Usuario</span>
                <span>Tipo</span>
                <span>Estado</span>
                <span>Premium</span>
                <span>Registro</span>
                <span>Acciones</span>
              </div>
              {filtered.map(user => {
                const vReq = verificationRequests[user.id]
                const hasPendingDocs = vReq?.status === 'pending'
                const isPremiumActive = user.is_premium && user.premium_until && new Date(user.premium_until) > new Date()
                const isShopOrWholesale = user.user_type === 'shop' || user.user_type === 'wholesale'

                return (
                  <div key={user.id} className={`admin-user-row ${user.is_banned ? 'banned' : ''}`}>

                    {/* ── USUARIO ── */}
                    <div className="admin-user-info">
                      <div className="admin-user-avatar">
                        {user.avatar_url
                          ? <img src={user.avatar_url} alt={user.display_name} />
                          : <span>{user.display_name?.charAt(0).toUpperCase()}</span>}
                      </div>
                      <div>
                        <div className="admin-user-name">
                          {user.display_name}
                          {hasPendingDocs && <span className="verif-pending-dot" title="Docs pendientes">📄</span>}
                        </div>
                        {isShopOrWholesale && user.shop_name && (
                          <div className="admin-user-shop">{user.shop_name}</div>
                        )}
                        <div className="admin-user-email">{user.email}</div>
                        {user.whatsapp && <div className="admin-user-whatsapp">📱 {user.whatsapp}</div>}
                      </div>
                    </div>

                    {/* ── TIPO ── */}
                    <div>
                      <select className="admin-type-select" value={user.user_type}
                        onChange={e => handleChangeType(user.id, e.target.value)}>
                        <option value="person">👤 Persona</option>
                        <option value="shop">🏪 Tienda</option>
                        <option value="wholesale">📦 Mayorista</option>
                        <option value="admin">🔐 Admin</option>
                      </select>
                    </div>

                    {/* ── ESTADO ── */}
                    <div className="admin-user-badges">
                      {user.is_verified
                        ? <span className="admin-badge badge-verified">✓ Verificado</span>
                        : <span className="admin-badge badge-free">Sin verificar</span>
                      }
                      {user.identity_verified && (
                        <span className="admin-badge badge-identity">🪪 ID ✓</span>
                      )}
                      {isShopOrWholesale && user.business_verified && (
                        <span className="admin-badge badge-business">🏪 Neg ✓</span>
                      )}
                      {user.is_banned && <span className="admin-badge badge-banned">🚫 Baneado</span>}
                      {hasPendingDocs && <span className="admin-badge badge-pending">⏳ Docs</span>}
                      {vReq?.status === 'rejected' && <span className="admin-badge badge-rejected">✗ Rechazado</span>}
                      {user.allow_identity_edit && <span className="admin-badge badge-edit">✏️ Edición permitida</span>}
                    </div>

                    {/* ── PREMIUM ── */}
                    <div className="admin-premium-cell">
                      {isPremiumActive ? (
                        <div>
                          <span className="admin-badge badge-premium">⭐ Premium</span>
                          <div className="premium-expiry">hasta {premiumExpiry(user.premium_until)}</div>
                        </div>
                      ) : <span className="admin-badge badge-free">Básico</span>}
                    </div>

                    {/* ── FECHA ── */}
                    <div className="admin-user-date">{new Date(user.created_at).toLocaleDateString()}</div>

                    {/* ── ACCIONES ── */}
                    <div className="admin-user-actions">
                      <button className="btn-small btn-docs"
                        onClick={() => { setDocsModal({ user, request: vReq || null }); setRejectNote(''); setRejectLayer('') }}>
                        Documentos
                      </button>
                      <button className={`btn-small ${isPremiumActive ? 'btn-danger' : 'btn-premium'}`}
                        onClick={() => handleTogglePremium(user.id, isPremiumActive)}>
                        {isPremiumActive ? 'Quitar Premium' : 'Dar Premium'}
                      </button>
                      <button className={`btn-small ${user.is_banned ? 'btn-success' : 'btn-danger'}`}
                        onClick={() => handleBan(user.id, user.is_banned)}>
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

      {/* ══ MODAL DE DOCUMENTOS ══ */}
      {docsModal && (
        <div className="docs-modal-overlay" onClick={() => setDocsModal(null)}>
          <div className="docs-modal" onClick={e => e.stopPropagation()}>
            <div className="docs-modal-header">
              <div>
                <h3>Documentos — {docsModal.user.display_name}</h3>
                {docsModal.user.shop_name && (
                  <div className="docs-modal-shop">{docsModal.user.shop_name}</div>
                )}
              </div>
              <button className="docs-modal-close" onClick={() => setDocsModal(null)}>✕</button>
            </div>

            <div className="docs-modal-body">

              {/* ── CAPA 1 — IDENTIDAD ── */}
              <div className={`docs-layer ${docsModal.user.identity_verified ? 'layer-approved' : ''}`}>
                <div className="docs-layer-header">
                  <div className="docs-layer-title">
                    <span>🪪</span>
                    <strong>Identidad personal</strong>
                    {docsModal.user.identity_verified
                      ? <span className="admin-badge badge-verified">✓ Verificada</span>
                      : <span className="admin-badge badge-pending">Pendiente</span>
                    }
                  </div>
                  {docsModal.user.identity_verified && (
                    <button
                      className={`btn-small ${docsModal.user.allow_identity_edit ? 'btn-success' : 'btn-warning'}`}
                      onClick={() => handleAllowIdentityEdit(docsModal.user.id, docsModal.user.allow_identity_edit)}>
                      {docsModal.user.allow_identity_edit ? '🔓 Edición activa' : '✏️ Permitir edición'}
                    </button>
                  )}
                </div>

                <div className="docs-grid-labeled">
                  {docsModal.request?.identity_docs?.length > 0 ? (
                    docsModal.request.identity_docs.map((url, i) => (
                      <div key={i} className="doc-item">
                        <div className="doc-label">
                          🪪 {i === 0 ? 'CI / Pasaporte — Frontal' : i === 1 ? 'CI / Pasaporte — Dorsal' : `Documento ${i + 1}`}
                        </div>
                        <img src={url} alt={`identity-${i}`} className="doc-thumb-fixed"
                          onClick={() => { setLightboxImg(url); setLightboxTitle(i === 0 ? 'CI Frontal' : i === 1 ? 'CI Dorsal' : `Documento ${i + 1}`) }} />
                      </div>
                    ))
                  ) : (
                    <p className="docs-empty">⚠️ Sin documentos de identidad subidos aún</p>
                  )}
                </div>

                {!docsModal.user.identity_verified && docsModal.request?.identity_docs?.length > 0 && docsModal.request?.status === 'pending' && (
                  <div className="docs-layer-actions">
                    <button className="btn btn-primary btn-sm"
                      onClick={() => handleApproveIdentity(docsModal.request.id, docsModal.user.id)}>
                      ✓ Verificar identidad
                    </button>
                    <div className="docs-reject">
                      <input type="text" className="input" placeholder="Motivo del rechazo..."
                        value={rejectLayer === 'identity' ? rejectNote : ''}
                        onChange={e => { setRejectNote(e.target.value); setRejectLayer('identity') }} />
                      <button className="btn btn-secondary btn-sm"
                        onClick={() => handleRejectLayer(docsModal.request.id, 'identity')}>
                        ✗ Rechazar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── CAPA 2 — NEGOCIO (solo shop/wholesale) ── */}
              {(docsModal.user.user_type === 'shop' || docsModal.user.user_type === 'wholesale') && (
                <div className={`docs-layer ${docsModal.user.business_verified ? 'layer-approved' : ''}`}>
                  <div className="docs-layer-header">
                    <div className="docs-layer-title">
                      <span>🏪</span>
                      <strong>Verificación de negocio</strong>
                      {docsModal.user.business_verified
                        ? <span className="admin-badge badge-verified">✓ Verificado</span>
                        : <span className="admin-badge badge-pending">Pendiente</span>
                      }
                    </div>
                  </div>

                  <div className="docs-grid-labeled">
                    {docsModal.request?.business_docs?.length > 0 ? (
                      docsModal.request.business_docs.map((url, i) => (
                        <div key={i} className="doc-item">
                          <div className="doc-label">
                            🏪 {i === 0 ? 'Foto exterior del negocio' : i === 1 ? 'Mural de certificaciones' : `Documento legal ${i}`}
                          </div>
                          <img src={url} alt={`business-${i}`} className="doc-thumb-fixed"
                            onClick={() => { setLightboxImg(url); setLightboxTitle(i === 0 ? 'Exterior negocio' : i === 1 ? 'Certificaciones' : `Doc legal ${i}`) }} />
                        </div>
                      ))
                    ) : (
                      <p className="docs-empty">⚠️ Sin documentos de negocio subidos aún</p>
                    )}
                  </div>

                  {!docsModal.user.business_verified && docsModal.request?.business_docs?.length > 0 && (
                    <div className="docs-layer-actions">
                      <button className="btn btn-primary btn-sm"
                        onClick={() => handleApproveBusiness(docsModal.request.id, docsModal.user.id)}>
                        ✓ Verificar negocio
                      </button>
                      <div className="docs-reject">
                        <input type="text" className="input" placeholder="Motivo del rechazo..."
                          value={rejectLayer === 'business' ? rejectNote : ''}
                          onChange={e => { setRejectNote(e.target.value); setRejectLayer('business') }} />
                        <button className="btn btn-secondary btn-sm"
                          onClick={() => handleRejectLayer(docsModal.request.id, 'business')}>
                          ✗ Rechazar negocio
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── ESTADO GENERAL ── */}
              <div className="docs-status-row">
                <span>Estado general:</span>
                <span className={`admin-badge ${docsModal.user.is_verified ? 'badge-verified' : 'badge-free'}`}>
                  {docsModal.user.is_verified ? '✓ Verificado' : 'Sin verificar'}
                </span>
                {docsModal.request?.status && (
                  <span className={`admin-badge ${docsModal.request.status === 'pending' ? 'badge-pending' : docsModal.request.status === 'approved' ? 'badge-verified' : 'badge-rejected'}`}>
                    Docs: {docsModal.request.status}
                  </span>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── LIGHTBOX ── */}
      {lightboxImg && (
        <div className="docs-lightbox" onClick={() => setLightboxImg(null)}>
          <div className="docs-lightbox-title">{lightboxTitle}</div>
          <img src={lightboxImg} alt="doc" />
          <button onClick={() => setLightboxImg(null)}>✕</button>
        </div>
      )}
    </div>
  )
}
