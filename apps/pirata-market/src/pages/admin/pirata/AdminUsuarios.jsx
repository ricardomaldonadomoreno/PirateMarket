import { useEffect, useMemo, useState } from 'react'
import AdminNavbarPirata from '../../../components/AdminNavbarPirata'
import { supabase } from '../../../lib/supabase'
import './AdminUsuariosRebuild.css'

const STATUS_LABELS = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
}

const typeLabel = (type) => (
  type === 'shop' ? 'Tienda' : type === 'wholesale' ? 'Mayorista' : 'Persona'
)

const formatDate = (value, withTime = false) => {
  if (!value) return '—'
  return new Date(value).toLocaleString('es-BO', withTime
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const getDisplayName = (user) => user?.display_name || user?.full_name || user?.email || 'Usuario sin nombre'
const getInitial = (user) => getDisplayName(user).charAt(0).toUpperCase()
const validDocs = (docs) => Array.isArray(docs) ? docs.filter(Boolean) : []

const DataItem = ({ label, value }) => (
  <div className="pau-data-item">
    <span className="pau-data-label">{label}</span>
    <span className="pau-data-value">{value || '—'}</span>
  </div>
)

const DocumentSection = ({ title, description, documents, labels, emptyText, onPreview }) => (
  <section className="pau-section pau-document-section">
    <div className="pau-section-heading">
      <div>
        <p className="pau-kicker">Documentos de Pirata</p>
        <h3>{title}</h3>
        <span>{description}</span>
      </div>
      <strong>{documents.length}</strong>
    </div>

    {documents.length === 0 ? (
      <div className="pau-empty-document">{emptyText}</div>
    ) : (
      <div className="pau-document-grid">
        {documents.map((url, index) => (
          <button
            key={`${url}-${index}`}
            type="button"
            className="pau-document-card"
            onClick={() => onPreview(documents, index)}
          >
            <img src={url} alt={`${title} ${index + 1}`} />
            <span>{labels?.[index] || `Documento ${index + 1}`}</span>
          </button>
        ))}
      </div>
    )}
  </section>
)

export default function AdminUsuarios() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [docsModal, setDocsModal] = useState(null)
  const [rejectNotes, setRejectNotes] = useState({ identity: '', business: '' })
  const [infoNote, setInfoNote] = useState('')
  const [sendingNote, setSendingNote] = useState(false)
  const [noteSent, setNoteSent] = useState(false)
  const [lightbox, setLightbox] = useState(null)
  const [loadError, setLoadError] = useState('')

  const processUsers = async (profilesData) => {
    const userIds = profilesData.map(profile => profile.user_id).filter(Boolean)
    const { data: usersRoot } = userIds.length > 0
      ? await supabase.from('users').select('id, display_name, email').in('id', userIds)
      : { data: [] }

    const usersMap = Object.fromEntries((usersRoot || []).map(user => [user.id, user]))
    setUsers(profilesData.map(profile => {
      const root = usersMap[profile.user_id] || {}
      return {
        id: profile.id,
        user_id: profile.user_id,
        identity: profile.identity,
        full_name: profile.full_name || null,
        country: profile.country || null,
        city: profile.city || null,
        phone: profile.phone || null,
        whatsapp: profile.whatsapp || null,
        identity_verified: profile.identity_verified || false,
        business_verified: profile.business_verified || false,
        identity_locked: profile.identity_locked || false,
        allow_identity_edit: profile.allow_identity_edit || false,
        verif_status: profile.verif_status || null,
        identity_docs: profile.identity_docs || [],
        business_docs: profile.business_docs || [],
        selfie_url: profile.selfie_url || null,
        admin_note: profile.admin_note || null,
        reviewed_at: profile.reviewed_at || null,
        created_at: profile.created_at,
        display_name: root.display_name || null,
        email: root.email || null,
      }
    }))
  }

  const loadUsers = async () => {
    setLoading(true)
    setLoadError('')
    try {
      const { data: profiles, error } = await supabase
        .from('pirata_profiles')
        .select('*')
        .not('verif_status', 'is', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      await processUsers(profiles || [])
    } catch (error) {
      console.error('loadUsers error:', error)
      setUsers([])
      setLoadError(`No se pudieron cargar los usuarios: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const refreshAll = async (userId) => {
    await loadUsers()
    if (docsModal?.user?.user_id !== userId) return

    const [{ data: freshProfile }, { data: freshRoot }] = await Promise.all([
      supabase.from('pirata_profiles').select('*').eq('user_id', userId).single(),
      supabase.from('users').select('display_name, email').eq('id', userId).single(),
    ])

    if (freshProfile) {
      const refreshedUser = {
        ...freshProfile,
        display_name: freshRoot?.display_name || null,
        email: freshRoot?.email || null,
        identity_docs: freshProfile.identity_docs || [],
        business_docs: freshProfile.business_docs || [],
      }
      setDocsModal({ user: refreshedUser })
    }
  }

  const handleApproveIdentity = async (userId) => {
    const now = new Date().toISOString()
    await supabase.from('pirata_profiles').update({
      identity_verified: true,
      identity_locked: true,
      allow_identity_edit: false,
      verif_status: 'approved',
      reviewed_at: now,
    }).eq('user_id', userId)
    await refreshAll(userId)
  }

  const handleApproveBusiness = async (userId) => {
    const now = new Date().toISOString()
    await supabase.from('pirata_profiles').update({
      business_verified: true,
      reviewed_at: now,
    }).eq('user_id', userId)
    await refreshAll(userId)
  }

  const handleApproveVerification = async (userId) => {
    await supabase.from('pirata_profiles').update({
      identity_verified: true,
      identity_locked: true,
      verif_status: 'approved',
      reviewed_at: new Date().toISOString(),
    }).eq('user_id', userId)
    await refreshAll(userId)
  }

  const handleRejectLayer = async (layer) => {
    const note = rejectNotes[layer]
    if (!note.trim()) {
      alert('Escribe un motivo de rechazo')
      return
    }

    const userId = docsModal.user.user_id
    const now = new Date().toISOString()
    const values = layer === 'identity'
      ? {
          identity_verified: false,
          identity_locked: false,
          verif_status: 'rejected',
          admin_note: note,
          reviewed_at: now,
        }
      : {
          business_verified: false,
          admin_note: note,
          reviewed_at: now,
        }

    await supabase.from('pirata_profiles').update(values).eq('user_id', userId)
    setRejectNotes(previous => ({ ...previous, [layer]: '' }))
    await refreshAll(userId)
  }

  const handleAllowIdentityEdit = async (userId, current) => {
    await supabase.from('pirata_profiles').update({
      allow_identity_edit: !current,
      identity_locked: current,
    }).eq('user_id', userId)
    await refreshAll(userId)
  }

  const openLightbox = (images, index) => setLightbox({ images, index })

  const handleSendInfoNote = async () => {
    if (!infoNote.trim()) {
      alert('Escribe un mensaje')
      return
    }

    setSendingNote(true)
    await supabase.from('pirata_profiles').update({
      admin_note: infoNote.trim(),
    }).eq('user_id', docsModal.user.user_id)
    setSendingNote(false)
    setNoteSent(true)
    setInfoNote('')
    setTimeout(() => setNoteSent(false), 3000)
    await refreshAll(docsModal.user.user_id)
  }

  useEffect(() => {
    if (!lightbox) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setLightbox(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightbox])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return users.filter(user => {
      const matchesSearch = !query || [user.display_name, user.email, user.full_name, user.country, user.city]
        .filter(Boolean)
        .some(value => value.toLowerCase().includes(query))
      const matchesType = filterType === 'all' || user.identity === filterType
      const matchesStatus = filterStatus === 'all' || user.verif_status === filterStatus
      return matchesSearch && matchesType && matchesStatus
    })
  }, [filterStatus, filterType, search, users])

  const openUser = (user) => {
    setRejectNotes({ identity: '', business: '' })
    setInfoNote('')
    setNoteSent(false)
    setLoadError('')
    setDocsModal({ user })
  }

  const identityDocs = validDocs(docsModal?.user?.identity_docs)
  const businessDocs = validDocs(docsModal?.user?.business_docs)

  return (
    <div className="pau-page">
      <AdminNavbarPirata />

      <main className="pau-shell">
        <header className="pau-header">
          <div>
            <p className="pau-kicker">Pirata · Backoffice</p>
            <h1>Usuarios</h1>
            <p className="pau-subtitle">Revisa los datos del perfil, coteja los documentos y gestiona la verificación de cada usuario Pirata.</p>
          </div>
          <div className="pau-total-card">
            <strong>{users.length}</strong>
            <span>usuarios con solicitud</span>
          </div>
        </header>

        {loadError && <div className="pau-alert pau-alert-error" role="alert">{loadError}</div>}

        <div className="pau-toolbar">
          <input
            type="search"
            className="pau-search"
            placeholder="Buscar nombre, email, país o ciudad..."
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
          <div className="pau-filter-group" role="tablist" aria-label="Filtrar por tipo">
            {['all', 'person', 'shop', 'wholesale'].map(type => (
              <button
                key={type}
                type="button"
                role="tab"
                aria-selected={filterType === type}
                className={`pau-filter ${filterType === type ? 'is-active' : ''}`}
                onClick={() => setFilterType(type)}
              >
                {type === 'all' ? 'Todos' : typeLabel(type)}
                <span>{type === 'all' ? users.length : users.filter(user => user.identity === type).length}</span>
              </button>
            ))}
          </div>
          <div className="pau-filter-group" role="tablist" aria-label="Filtrar por estado">
            {['all', 'pending', 'approved', 'rejected'].map(status => (
              <button
                key={status}
                type="button"
                role="tab"
                aria-selected={filterStatus === status}
                className={`pau-filter ${filterStatus === status ? 'is-active' : ''}`}
                onClick={() => setFilterStatus(status)}
              >
                {status === 'all' ? 'Todos estados' : STATUS_LABELS[status]}
                <span>{status === 'all' ? users.length : users.filter(user => user.verif_status === status).length}</span>
              </button>
            ))}
          </div>
          <button type="button" className="pau-refresh" onClick={loadUsers} disabled={loading}>
            {loading ? 'Cargando…' : 'Actualizar'}
          </button>
        </div>

        {loading ? (
          <div className="pau-empty-state">Cargando usuarios Pirata…</div>
        ) : filtered.length === 0 ? (
          <div className="pau-empty-state">
            <strong>No se encontraron usuarios.</strong>
            <span>Prueba otro texto o cambia los filtros de verificación.</span>
          </div>
        ) : (
          <section className="pau-user-list" aria-label="Usuarios Pirata con solicitud">
            {filtered.map(user => (
              <article key={user.id} className="pau-user-card">
                <div className="pau-user-person">
                  <div className="pau-avatar">{getInitial(user)}</div>
                  <div>
                    <h2>{getDisplayName(user)}</h2>
                    <p>{user.email || 'Email no disponible'}</p>
                    {user.full_name && <span>{user.full_name}</span>}
                  </div>
                </div>

                <div className="pau-user-type">
                  <span className="pau-type-badge">{typeLabel(user.identity)}</span>
                  <small>{formatDate(user.created_at)}</small>
                </div>

                <div className="pau-user-status">
                  <span className={`pau-status pau-status-${user.verif_status || 'none'}`}>
                    {STATUS_LABELS[user.verif_status] || 'Sin solicitud'}
                  </span>
                  <div className="pau-status-badges">
                    {user.identity_verified && <span className="pau-mini-badge pau-mini-id">Identidad</span>}
                    {user.business_verified && <span className="pau-mini-badge pau-mini-business">Negocio</span>}
                  </div>
                </div>

                <div className="pau-document-summary">
                  <span>ID {validDocs(user.identity_docs).length}</span>
                  <span>NEG {validDocs(user.business_docs).length}</span>
                  {user.selfie_url && <span>FOTO</span>}
                </div>

                <button type="button" className="pau-review-button" onClick={() => openUser(user)}>
                  Revisar perfil
                </button>
              </article>
            ))}
          </section>
        )}
      </main>

      {docsModal && (
        <div className="pau-modal-backdrop" onClick={() => setDocsModal(null)}>
          <section className="pau-modal" role="dialog" aria-modal="true" aria-labelledby="pau-modal-title" onClick={event => event.stopPropagation()}>
            <header className="pau-modal-header">
              <div>
                <p className="pau-kicker">Cotejo de usuario Pirata</p>
                <h2 id="pau-modal-title">{getDisplayName(docsModal.user)}</h2>
                <span>{docsModal.user.email || docsModal.user.user_id}</span>
              </div>
              <button type="button" className="pau-close-button" onClick={() => setDocsModal(null)} aria-label="Cerrar revisión">×</button>
            </header>

            <div className="pau-modal-body">
              <div className="pau-review-meta">
                <span className={`pau-status pau-status-${docsModal.user.verif_status || 'none'}`}>
                  {STATUS_LABELS[docsModal.user.verif_status] || 'Sin solicitud'}
                </span>
                <span>Registro: {formatDate(docsModal.user.created_at, true)}</span>
                {docsModal.user.reviewed_at && <span>Revisado: {formatDate(docsModal.user.reviewed_at, true)}</span>}
              </div>

              <div className="pau-review-grid">
                <section className="pau-panel">
                  <div className="pau-panel-heading">
                    <div>
                      <p className="pau-kicker">Origen · Perfil Pirata</p>
                      <h3>Datos declarados</h3>
                    </div>
                    <span className="pau-panel-source">pirata_profiles</span>
                  </div>
                  <div className="pau-data-grid">
                    <DataItem label="Nombre completo" value={docsModal.user.full_name} />
                    <DataItem label="Tipo de usuario" value={typeLabel(docsModal.user.identity)} />
                    <DataItem label="País" value={docsModal.user.country} />
                    <DataItem label="Ciudad" value={docsModal.user.city} />
                    <DataItem label="Teléfono" value={docsModal.user.phone} />
                    <DataItem label="WhatsApp" value={docsModal.user.whatsapp} />
                    <DataItem label="Email de cuenta" value={docsModal.user.email} />
                    <DataItem label="User ID" value={docsModal.user.user_id} />
                  </div>
                </section>

                <section className="pau-panel">
                  <div className="pau-panel-heading">
                    <div>
                      <p className="pau-kicker">Estado de revisión</p>
                      <h3>Verificación y control</h3>
                    </div>
                  </div>
                  <div className="pau-verification-grid">
                    <span className={docsModal.user.identity_verified ? 'is-verified' : ''}>Identidad {docsModal.user.identity_verified ? 'verificada' : 'pendiente'}</span>
                    <span className={docsModal.user.business_verified ? 'is-verified' : ''}>Negocio {docsModal.user.business_verified ? 'verificado' : 'pendiente'}</span>
                    <span className={docsModal.user.identity_locked ? 'is-verified' : ''}>Identidad {docsModal.user.identity_locked ? 'fijada' : 'editable'}</span>
                    <span className={docsModal.user.allow_identity_edit ? 'is-editable' : ''}>{docsModal.user.allow_identity_edit ? 'Edición permitida' : 'Edición bloqueada'}</span>
                  </div>
                  <div className="pau-cotejo-note">
                    <strong>Cotejo manual</strong>
                    <p>Compara nombre, país, ciudad, teléfono y tipo de usuario con los documentos cargados en el perfil Pirata.</p>
                  </div>
                </section>
              </div>

              {docsModal.user.selfie_url && (
                <DocumentSection
                  title="Foto personal"
                  description="Selfie asociada al perfil Pirata."
                  documents={[docsModal.user.selfie_url]}
                  labels={['Selfie']}
                  emptyText="Sin selfie cargada."
                  onPreview={openLightbox}
                />
              )}

              <DocumentSection
                title="Identidad personal"
                description="Documentos guardados en el perfil de identidad."
                documents={identityDocs}
                labels={['Anverso', 'Reverso']}
                emptyText="Sin documentos de identidad subidos aún."
                onPreview={setLightbox}
              />

              {docsModal.user.identity !== 'person' && (
                <DocumentSection
                  title="Documentación de negocio"
                  description="Documentos cargados para tiendas y mayoristas."
                  documents={businessDocs}
                  emptyText="Sin documentos de negocio."
                  onPreview={openLightbox}
                />
              )}

              <section className="pau-panel pau-action-panel">
                <div className="pau-panel-heading">
                  <div>
                    <p className="pau-kicker">Acciones de revisión</p>
                    <h3>Identidad y negocio</h3>
                  </div>
                </div>

                <div className="pau-action-block">
                  <div className="pau-action-heading">
                    <strong>Identidad personal</strong>
                    {docsModal.user.identity_verified && (
                      <button type="button" className="pau-secondary-button" onClick={() => handleAllowIdentityEdit(docsModal.user.user_id, docsModal.user.allow_identity_edit)}>
                        {docsModal.user.allow_identity_edit ? 'Bloquear edición' : 'Permitir edición'}
                      </button>
                    )}
                  </div>
                  {identityDocs.length > 0 && !docsModal.user.identity_verified && (
                    <div className="pau-action-row">
                      <button type="button" className="pau-approve-button" onClick={() => handleApproveIdentity(docsModal.user.user_id)}>Aprobar identidad</button>
                      <div className="pau-reject-form">
                        <input
                          value={rejectNotes.identity}
                          onChange={event => setRejectNotes(previous => ({ ...previous, identity: event.target.value }))}
                          placeholder="Motivo de rechazo"
                        />
                        <button type="button" className="pau-reject-button" onClick={() => handleRejectLayer('identity')}>Rechazar</button>
                      </div>
                    </div>
                  )}
                  {identityDocs.length === 0 && docsModal.user.verif_status === 'pending' && (
                    <div className="pau-action-row">
                      <button type="button" className="pau-approve-button" onClick={() => handleApproveVerification(docsModal.user.user_id)}>Aprobar verificación</button>
                      <div className="pau-reject-form">
                        <input
                          value={rejectNotes.identity}
                          onChange={event => setRejectNotes(previous => ({ ...previous, identity: event.target.value }))}
                          placeholder="Motivo de rechazo"
                        />
                        <button type="button" className="pau-reject-button" onClick={() => handleRejectLayer('identity')}>Rechazar</button>
                      </div>
                    </div>
                  )}
                  {identityDocs.length === 0 && docsModal.user.verif_status !== 'pending' && (
                    <p className="pau-action-muted">No hay una acción de identidad pendiente.</p>
                  )}
                </div>

                {docsModal.user.identity !== 'person' && (
                  <div className="pau-action-block">
                    <div className="pau-action-heading"><strong>Negocio</strong></div>
                    {businessDocs.length > 0 && !docsModal.user.business_verified ? (
                      <div className="pau-action-row">
                        <button type="button" className="pau-approve-button" onClick={() => handleApproveBusiness(docsModal.user.user_id)}>Aprobar negocio</button>
                        <div className="pau-reject-form">
                          <input
                            value={rejectNotes.business}
                            onChange={event => setRejectNotes(previous => ({ ...previous, business: event.target.value }))}
                            placeholder="Motivo de rechazo"
                          />
                          <button type="button" className="pau-reject-button" onClick={() => handleRejectLayer('business')}>Rechazar</button>
                        </div>
                      </div>
                    ) : (
                      <p className="pau-action-muted">{businessDocs.length === 0 ? 'Sin documentos de negocio pendientes.' : 'El negocio ya está verificado.'}</p>
                    )}
                  </div>
                )}
              </section>

              <section className="pau-panel pau-note-panel">
                <div className="pau-panel-heading">
                  <div>
                    <p className="pau-kicker">Comunicación</p>
                    <h3>Nota para el usuario</h3>
                  </div>
                </div>
                <p className="pau-note-help">La nota se guarda en `pirata_profiles.admin_note` y el usuario la verá en su panel.</p>
                {docsModal.user.admin_note && <div className="pau-current-note">Nota actual: “{docsModal.user.admin_note}”</div>}
                <div className="pau-note-form">
                  <textarea
                    value={infoNote}
                    onChange={event => setInfoNote(event.target.value)}
                    rows={3}
                    placeholder="Escribe una indicación para el usuario..."
                  />
                  <button type="button" className="pau-secondary-button" onClick={handleSendInfoNote} disabled={sendingNote || !infoNote.trim()}>
                    {sendingNote ? 'Enviando…' : 'Guardar nota'}
                  </button>
                </div>
                {noteSent && <p className="pau-note-success">Nota enviada correctamente.</p>}
              </section>
            </div>
          </section>
        </div>
      )}

      {lightbox && (
        <div className="pau-lightbox-backdrop" onClick={() => setLightbox(null)}>
          <div className="pau-lightbox-content" onClick={event => event.stopPropagation()}>
            <button type="button" className="pau-lightbox-close" onClick={() => setLightbox(null)} aria-label="Cerrar documento">×</button>
            <img src={lightbox.images[lightbox.index]} alt="Documento Pirata" />
            <span>{lightbox.index + 1} / {lightbox.images.length}</span>
          </div>
        </div>
      )}
    </div>
  )
}
