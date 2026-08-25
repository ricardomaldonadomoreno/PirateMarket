import { useEffect, useMemo, useState } from 'react'
import AdminNavbarPacker from '../../../components/AdminNavbarPacker'
import { supabase } from '../../../lib/supabase'
import './PackerAdminVerificaciones.css'

const STATUS_LABELS = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
}

const DOCUMENT_GROUPS = [
  { key: 'identity_docs', label: 'Identidad', shortLabel: 'ID' },
  { key: 'domicile_docs', label: 'Domicilio', shortLabel: 'DOM' },
  { key: 'bank_docs', label: 'Banco', shortLabel: 'BANCO' },
  { key: 'selfie_url', label: 'Selfie', shortLabel: 'FOTO' },
]

const formatDate = (value, withTime = false) => {
  if (!value) return '—'
  return new Date(value).toLocaleString('es-BO', withTime
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const getDisplayName = (item) => (
  item?.user?.display_name ||
  item?.user?.full_name ||
  item?.user?.email ||
  item?.user_id ||
  'Usuario sin identificar'
)

const getInitial = (item) => getDisplayName(item).charAt(0).toUpperCase()

const getDocumentValues = (request, key) => {
  if (!request) return []
  if (key === 'selfie_url') return request.selfie_url ? [request.selfie_url] : []
  return Array.isArray(request[key]) ? request[key].filter(Boolean) : []
}

const isUrl = (value) => /^https?:\/\//i.test(value)

const getFileName = (value) => {
  if (!value) return 'Documento'
  try {
    const path = isUrl(value) ? new URL(value).pathname : value
    return decodeURIComponent(path.split('/').pop() || 'Documento')
  } catch {
    return value.split('/').pop() || 'Documento'
  }
}

const resolveDocument = async (value) => {
  if (isUrl(value)) return { value, url: value, name: getFileName(value) }

  const { data, error } = await supabase.storage
    .from('packer-docs')
    .createSignedUrl(value, 300)

  if (error) throw error
  return { value, url: data?.signedUrl || '', name: getFileName(value) }
}

const DataItem = ({ label, value, locked = false }) => (
  <div className="pv-data-item">
    <span className="pv-data-label">{label}</span>
    <span className="pv-data-value">{value || '—'}</span>
    {locked && <span className="pv-locked-tag">Fijado</span>}
  </div>
)

const DocumentGallery = ({ group, values, resolved, loading, onPreview }) => (
  <section className="pv-section pv-doc-section">
    <div className="pv-section-heading">
      <div>
        <h3>{group.label}</h3>
        <p>{values.length} archivo{values.length === 1 ? '' : 's'} enviado{values.length === 1 ? '' : 's'}</p>
      </div>
    </div>

    {loading ? (
      <div className="pv-doc-empty">Generando acceso privado...</div>
    ) : values.length === 0 ? (
      <div className="pv-doc-empty">No se envió este documento.</div>
    ) : (
      <div className="pv-document-grid">
        {(resolved || []).map((document, index) => (
          <div key={`${document.value}-${index}`} className="pv-document-card">
            {document.url ? (
              document.name.toLowerCase().endsWith('.pdf') ? (
                <button type="button" className="pv-pdf-card" onClick={() => onPreview(document)}>
                  <span className="pv-pdf-icon">PDF</span>
                  <span>{document.name}</span>
                </button>
              ) : (
                <button type="button" className="pv-image-card" onClick={() => onPreview(document)}>
                  <img src={document.url} alt={`${group.label} ${index + 1}`} />
                </button>
              )
            ) : (
              <div className="pv-doc-unavailable">Sin acceso al archivo</div>
            )}
            <span className="pv-document-name">{document.name}</span>
          </div>
        ))}
      </div>
    )}
  </section>
)

export default function PackerAdminVerificaciones() {
  const [requests, setRequests] = useState([])
  const [filterStatus, setFilterStatus] = useState('all')
  const [selected, setSelected] = useState(null)
  const [resolvedDocuments, setResolvedDocuments] = useState({})
  const [documentLoading, setDocumentLoading] = useState(false)
  const [lightbox, setLightbox] = useState(null)
  const [rejectNote, setRejectNote] = useState('')
  const [adminNote, setAdminNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadRequests = async () => {
    setLoading(true)
    setError('')

    const { data, error: requestError } = await supabase
      .from('packer_verification_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (requestError) {
      setError(`No se pudieron cargar las solicitudes: ${requestError.message}`)
      setRequests([])
      setLoading(false)
      return
    }

    const rows = data || []
    const userIds = [...new Set(rows.map(request => request.user_id).filter(Boolean))]

    if (userIds.length === 0) {
      setRequests([])
      setLoading(false)
      return
    }

    const [{ data: usersData, error: usersError }, { data: profilesData, error: profilesError }] = await Promise.all([
      supabase
        .from('users')
        .select('id, display_name, email, whatsapp, avatar_url')
        .in('id', userIds),
      supabase
        .from('packer_profiles')
        .select('id, full_name, phone, birth_country, doc_type, doc_number, personal_locked, phone_locked, address_city, address_country, address_text, address_lat, address_lng, address_locked, identity_verified, address_verified, bank_verified, level')
        .in('id', userIds),
    ])

    if (usersError || profilesError) {
      setError(`No se pudieron completar los datos del cotejo: ${(usersError || profilesError).message}`)
    }

    const usersMap = Object.fromEntries((usersData || []).map(user => [user.id, user]))
    const profilesMap = Object.fromEntries((profilesData || []).map(profile => [profile.id, profile]))
    const merged = rows.map(request => ({
      ...request,
      user: {
        ...(usersMap[request.user_id] || {}),
        ...(profilesMap[request.user_id] || {}),
      },
    }))

    setRequests(merged)
    setLoading(false)
  }

  useEffect(() => {
    loadRequests()
  }, [])

  useEffect(() => {
    if (!selected) return undefined

    let cancelled = false
    const loadDocumentUrls = async () => {
      setDocumentLoading(true)
      setResolvedDocuments({})
      try {
        const entries = DOCUMENT_GROUPS.flatMap(group => (
          getDocumentValues(selected, group.key).map((value, index) => ({ groupKey: group.key, value, index }))
        ))
        const resolved = await Promise.all(entries.map(async entry => ({
          ...entry,
          document: await resolveDocument(entry.value),
        })))

        if (cancelled) return
        const grouped = {}
        resolved.forEach(({ groupKey, document }) => {
          if (!grouped[groupKey]) grouped[groupKey] = []
          grouped[groupKey].push(document)
        })
        setResolvedDocuments(grouped)
      } catch (documentError) {
        if (!cancelled) setError(`No se pudieron abrir todos los documentos: ${documentError.message}`)
      } finally {
        if (!cancelled) setDocumentLoading(false)
      }
    }

    loadDocumentUrls()
    return () => { cancelled = true }
  }, [selected])

  useEffect(() => {
    if (!lightbox) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setLightbox(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightbox])

  const visibleRequests = useMemo(() => (
    filterStatus === 'all'
      ? requests
      : requests.filter(request => request.status === filterStatus)
  ), [filterStatus, requests])

  const openRequest = (request) => {
    setSelected(request)
    setRejectNote('')
    setAdminNote(request.admin_note || '')
    setSuccess('')
    setError('')
  }

  const updateRequestInState = (requestId, patch) => {
    setRequests(previous => previous.map(request => (
      request.id === requestId
        ? { ...request, ...patch }
        : request
    )))
    setSelected(previous => previous && previous.id === requestId ? { ...previous, ...patch } : previous)
  }

  const handleApprove = async () => {
    if (!selected || actionLoading) return
    setActionLoading(true)
    setError('')
    setSuccess('')
    const now = new Date().toISOString()

    const { error: profileError } = await supabase
      .from('packer_profiles')
      .update({
        level: selected.identity_docs?.length && selected.domicile_docs?.length && selected.bank_docs?.length && selected.selfie_url
          ? 'elite'
          : selected.identity_docs?.length && selected.domicile_docs?.length && selected.bank_docs?.length
            ? 'pro'
            : selected.identity_docs?.length
              ? 'medio'
              : 'basico',
        identity_verified: true,
        address_verified: true,
        bank_verified: true,
      })
      .eq('id', selected.user_id)

    if (profileError) {
      setError(`No se pudo actualizar el perfil Packer: ${profileError.message}`)
      setActionLoading(false)
      return
    }

    const { error: requestError } = await supabase
      .from('packer_verification_requests')
      .update({ status: 'approved', reviewed_at: now })
      .eq('id', selected.id)

    if (requestError) {
      setError(`El perfil se actualizó, pero la solicitud no pudo aprobarse: ${requestError.message}`)
      setActionLoading(false)
      return
    }

    updateRequestInState(selected.id, {
      status: 'approved',
      reviewed_at: now,
      user: { ...selected.user, identity_verified: true, address_verified: true, bank_verified: true },
    })
    setSuccess('Solicitud aprobada correctamente.')
    setActionLoading(false)
  }

  const handleReject = async () => {
    if (!selected || actionLoading) return
    if (!rejectNote.trim()) {
      setError('Escribe el motivo del rechazo antes de continuar.')
      return
    }

    setActionLoading(true)
    setError('')
    setSuccess('')
    const now = new Date().toISOString()
    const { error: requestError } = await supabase
      .from('packer_verification_requests')
      .update({ status: 'rejected', admin_note: rejectNote.trim(), reviewed_at: now })
      .eq('id', selected.id)

    if (requestError) {
      setError(`No se pudo rechazar la solicitud: ${requestError.message}`)
      setActionLoading(false)
      return
    }

    updateRequestInState(selected.id, {
      status: 'rejected',
      admin_note: rejectNote.trim(),
      reviewed_at: now,
    })
    setSuccess('Solicitud rechazada y motivo guardado.')
    setActionLoading(false)
  }

  const handleRevoke = async () => {
    if (!selected || actionLoading) return
    setActionLoading(true)
    setError('')
    setSuccess('')

    const { error: profileError } = await supabase
      .from('packer_profiles')
      .update({
        level: 'basico',
        identity_verified: false,
        address_verified: false,
        bank_verified: false,
      })
      .eq('id', selected.user_id)

    if (profileError) {
      setError(`No se pudo revocar la verificación: ${profileError.message}`)
      setActionLoading(false)
      return
    }

    updateRequestInState(selected.id, {
      user: { ...selected.user, identity_verified: false, address_verified: false, bank_verified: false, level: 'basico' },
    })
    setSuccess('Verificación revocada del perfil Packer.')
    setActionLoading(false)
  }

  const handleSaveNote = async () => {
    if (!selected || actionLoading || !adminNote.trim()) return
    setActionLoading(true)
    setError('')
    setSuccess('')

    const note = adminNote.trim()
    const { error: noteError } = await supabase
      .from('packer_verification_requests')
      .update({ admin_note: note })
      .eq('id', selected.id)

    if (noteError) {
      setError(`No se pudo guardar la nota: ${noteError.message}`)
      setActionLoading(false)
      return
    }

    updateRequestInState(selected.id, { admin_note: note })
    setSuccess('Nota guardada correctamente.')
    setActionLoading(false)
  }

  return (
    <div className="pv-page">
      <AdminNavbarPacker />

      <main className="pv-shell">
        <header className="pv-header">
          <div>
            <p className="pv-kicker">Packer · Backoffice</p>
            <h1>Verificaciones</h1>
            <p className="pv-subtitle">Revisa la solicitud, coteja los datos declarados y valida los documentos enviados.</p>
          </div>
          <div className="pv-total-card">
            <strong>{requests.length}</strong>
            <span>solicitudes registradas</span>
          </div>
        </header>

        {error && <div className="pv-alert pv-alert-error" role="alert">{error}</div>}
        {success && <div className="pv-alert pv-alert-success" role="status">{success}</div>}

        <div className="pv-toolbar">
          <div className="pv-filters" role="tablist" aria-label="Filtrar solicitudes">
            {['all', 'pending', 'approved', 'rejected'].map(status => (
              <button
                key={status}
                type="button"
                role="tab"
                aria-selected={filterStatus === status}
                className={`pv-filter ${filterStatus === status ? 'is-active' : ''}`}
                onClick={() => setFilterStatus(status)}
              >
                {status === 'all' ? 'Todas' : STATUS_LABELS[status]}
                <span>{status === 'all' ? requests.length : requests.filter(request => request.status === status).length}</span>
              </button>
            ))}
          </div>
          <button type="button" className="pv-refresh" onClick={loadRequests} disabled={loading}>
            {loading ? 'Cargando…' : 'Actualizar solicitudes'}
          </button>
        </div>

        {loading ? (
          <div className="pv-empty-state">Cargando solicitudes de verificación…</div>
        ) : visibleRequests.length === 0 ? (
          <div className="pv-empty-state">
            <strong>No hay solicitudes en este filtro.</strong>
            <span>Cuando un usuario envíe su verificación, aparecerá aquí.</span>
          </div>
        ) : (
          <section className="pv-request-list" aria-label="Solicitudes de verificación">
            {visibleRequests.map(request => (
              <article key={request.id} className="pv-request-card">
                <div className="pv-request-person">
                  <div className="pv-avatar">
                    {request.user?.avatar_url
                      ? <img src={request.user.avatar_url} alt="" />
                      : getInitial(request)}
                  </div>
                  <div>
                    <h2>{getDisplayName(request)}</h2>
                    <p>{request.user?.email || 'Email no disponible'}</p>
                    {request.user?.full_name && <span>{request.user.full_name}</span>}
                  </div>
                </div>

                <div className="pv-request-status">
                  <span className={`pv-status pv-status-${request.status || 'pending'}`}>
                    {STATUS_LABELS[request.status] || request.status || 'Pendiente'}
                  </span>
                  <small>{formatDate(request.created_at, true)}</small>
                </div>

                <div className="pv-document-summary">
                  {DOCUMENT_GROUPS.map(group => {
                    const count = getDocumentValues(request, group.key).length
                    return count > 0 ? <span key={group.key}>{group.shortLabel} {count}</span> : null
                  })}
                  {DOCUMENT_GROUPS.every(group => getDocumentValues(request, group.key).length === 0) && <span>Sin archivos</span>}
                </div>

                <button type="button" className="pv-review-button" onClick={() => openRequest(request)}>
                  Revisar solicitud
                </button>
              </article>
            ))}
          </section>
        )}
      </main>

      {selected && (
        <div className="pv-modal-backdrop" onClick={() => setSelected(null)}>
          <section className="pv-modal" role="dialog" aria-modal="true" aria-labelledby="pv-modal-title" onClick={event => event.stopPropagation()}>
            <header className="pv-modal-header">
              <div>
                <p className="pv-kicker">Cotejo de verificación</p>
                <h2 id="pv-modal-title">{getDisplayName(selected)}</h2>
                <span>{selected.user?.email || selected.user_id}</span>
              </div>
              <button type="button" className="pv-close-button" onClick={() => setSelected(null)} aria-label="Cerrar revisión">×</button>
            </header>

            <div className="pv-modal-body">
              <div className="pv-review-meta">
                <span className={`pv-status pv-status-${selected.status || 'pending'}`}>
                  {STATUS_LABELS[selected.status] || selected.status || 'Pendiente'}
                </span>
                <span>Enviada: {formatDate(selected.created_at, true)}</span>
                {selected.reviewed_at && <span>Revisada: {formatDate(selected.reviewed_at, true)}</span>}
              </div>

              <div className="pv-review-grid">
                <section className="pv-panel">
                  <div className="pv-panel-heading">
                    <div>
                      <p className="pv-kicker">Origen · Mi Cuenta</p>
                      <h3>Datos declarados</h3>
                    </div>
                    <span className="pv-panel-source">packer_profiles</span>
                  </div>
                  <div className="pv-data-grid">
                    <DataItem label="Nombre real" value={selected.user?.full_name} locked={selected.user?.personal_locked} />
                    <DataItem label="Teléfono" value={selected.user?.phone} locked={selected.user?.phone_locked} />
                    <DataItem label="País de nacimiento" value={selected.user?.birth_country} />
                    <DataItem label="Tipo de documento" value={selected.user?.doc_type === 'ci' ? 'Cédula de Identidad (CI)' : selected.user?.doc_type === 'pasaporte' ? 'Pasaporte' : selected.user?.doc_type} />
                    <DataItem label="Número de documento" value={selected.user?.doc_number} />
                    <DataItem label="Nivel actual" value={selected.user?.level} />
                    <DataItem label="Ciudad" value={selected.user?.address_city} locked={selected.user?.address_locked} />
                    <DataItem label="País del domicilio" value={selected.user?.address_country} />
                    <DataItem label="Domicilio exacto" value={selected.user?.address_text} />
                    <DataItem label="Coordenadas" value={selected.user?.address_lat && selected.user?.address_lng ? `${Number(selected.user.address_lat).toFixed(5)}, ${Number(selected.user.address_lng).toFixed(5)}` : ''} />
                  </div>
                  <div className="pv-verification-flags">
                    <span className={selected.user?.identity_verified ? 'is-verified' : ''}>Identidad {selected.user?.identity_verified ? 'verificada' : 'pendiente'}</span>
                    <span className={selected.user?.address_verified ? 'is-verified' : ''}>Domicilio {selected.user?.address_verified ? 'verificado' : 'pendiente'}</span>
                    <span className={selected.user?.bank_verified ? 'is-verified' : ''}>Banco {selected.user?.bank_verified ? 'verificado' : 'pendiente'}</span>
                  </div>
                </section>

                <section className="pv-panel">
                  <div className="pv-panel-heading">
                    <div>
                      <p className="pv-kicker">Origen · Verificación</p>
                      <h3>Solicitud enviada</h3>
                    </div>
                    <span className="pv-panel-source">packer_verification_requests</span>
                  </div>
                  <div className="pv-request-facts">
                    <div><span>Usuario UUID</span><strong>{selected.user_id}</strong></div>
                    <div><span>Documentos de identidad</span><strong>{getDocumentValues(selected, 'identity_docs').length}</strong></div>
                    <div><span>Comprobantes de domicilio</span><strong>{getDocumentValues(selected, 'domicile_docs').length}</strong></div>
                    <div><span>Documentos bancarios</span><strong>{getDocumentValues(selected, 'bank_docs').length}</strong></div>
                    <div><span>Selfie</span><strong>{selected.selfie_url ? 'Enviada' : 'No enviada'}</strong></div>
                  </div>
                  <div className="pv-cotejo-note">
                    <strong>Cotejo manual</strong>
                    <p>Compara nombre, documento, teléfono, ciudad y domicilio declarados con la información visible en los archivos enviados.</p>
                  </div>
                </section>
              </div>

              <div className="pv-document-sections">
                {DOCUMENT_GROUPS.map(group => (
                  <DocumentGallery
                    key={group.key}
                    group={group}
                    values={getDocumentValues(selected, group.key)}
                    resolved={resolvedDocuments[group.key]}
                    loading={documentLoading}
                    onPreview={setLightbox}
                  />
                ))}
              </div>

              <section className="pv-panel pv-note-panel">
                <div className="pv-panel-heading">
                  <div>
                    <p className="pv-kicker">Comunicación</p>
                    <h3>Nota para el usuario</h3>
                  </div>
                </div>
                {selected.admin_note && <div className="pv-current-note">Nota guardada: “{selected.admin_note}”</div>}
                <div className="pv-note-form">
                  <textarea
                    value={adminNote}
                    onChange={event => setAdminNote(event.target.value)}
                    rows={3}
                    placeholder="Escribe una indicación para el usuario..."
                  />
                  <button type="button" className="pv-secondary-button" onClick={handleSaveNote} disabled={actionLoading || !adminNote.trim()}>
                    Guardar nota
                  </button>
                </div>
              </section>

              <section className="pv-actions-panel">
                {selected.status === 'pending' && (
                  <>
                    <button type="button" className="pv-approve-button" onClick={handleApprove} disabled={actionLoading}>
                      {actionLoading ? 'Procesando…' : 'Aprobar verificación'}
                    </button>
                    <div className="pv-reject-form">
                      <input
                        value={rejectNote}
                        onChange={event => setRejectNote(event.target.value)}
                        placeholder="Motivo obligatorio para rechazar"
                      />
                      <button type="button" className="pv-reject-button" onClick={handleReject} disabled={actionLoading}>
                        Rechazar
                      </button>
                    </div>
                  </>
                )}
                {selected.status === 'approved' && (
                  <button type="button" className="pv-revoke-button" onClick={handleRevoke} disabled={actionLoading}>
                    {actionLoading ? 'Procesando…' : 'Revocar verificación'}
                  </button>
                )}
                {selected.status === 'rejected' && <p className="pv-rejected-copy">El usuario puede enviar una nueva solicitud corregida.</p>}
              </section>
            </div>
          </section>
        </div>
      )}

      {lightbox && (
        <div className="pv-lightbox-backdrop" onClick={() => setLightbox(null)}>
          <div className="pv-lightbox-content" onClick={event => event.stopPropagation()}>
            <button type="button" className="pv-lightbox-close" onClick={() => setLightbox(null)} aria-label="Cerrar documento">×</button>
            {lightbox.name.toLowerCase().endsWith('.pdf') ? (
              <iframe src={lightbox.url} title={lightbox.name} className="pv-pdf-viewer" />
            ) : (
              <img src={lightbox.url} alt={lightbox.name} />
            )}
            <span>{lightbox.name}</span>
          </div>
        </div>
      )}
    </div>
  )
}
