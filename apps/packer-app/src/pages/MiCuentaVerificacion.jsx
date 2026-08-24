import { useState, useEffect } from 'react'
import { supabase } from '../../../pirata-market/src/lib/supabase'
import { compressImage } from '../../../pirata-market/src/lib/utils'
import './MiCuenta.css'

const LEVEL_INFO = {
  basico: { label: 'Básico', color: 'var(--text-muted)', icon: '⚪' },
  medio:  { label: 'Medio',  color: '#2980B9', icon: '🔵' },
  pro:    { label: 'PRO',    color: '#8E44AD', icon: '🟣' },
  elite:  { label: 'Elite',  color: '#784212', icon: '🟤' },
}

export default function MiCuentaVerificacion({ user, profile }) {
  const [verifRequest, setVerifRequest] = useState(null)
  const [identityFiles, setIdentityFiles] = useState([])
  const [domicileFiles, setDomicileFiles] = useState([])
  const [bankFiles, setBankFiles] = useState([])
  const [selfieFile, setSelfieFile] = useState(null)
  const [selfiePreview, setSelfiePreview] = useState('')
  const [comprError, setComprError] = useState('')
  const [uploadingDocs, setUploadingDocs] = useState(false)
  const [verifSaved, setVerifSaved] = useState(false)
  const [verifError, setVerifError] = useState('')
  const [currentLevel, setCurrentLevel] = useState('basico')

  useEffect(() => {
    if (!user) return
    loadVerification()
    loadLevel()
  }, [user])

  const loadVerification = async () => {
    const { data } = await supabase
      .from('packer_verification_requests')
      .select('*')
      .eq('user_id', user.id)
      .single()
    if (data) setVerifRequest(data)
  }

  const loadLevel = async () => {
    const { data } = await supabase
      .from('packer_profiles')
      .select('level')
      .eq('id', user.id)
      .single()
    if (data?.level) setCurrentLevel(data.level)
  }

  const uploadDocFiles = async (files, folder) => {
    const paths = []
    for (const file of files) {
      try {
        const isImage = file.type.startsWith('image/')
        const processed = isImage ? await compressImage(file) : file
        const ext = isImage
          ? (processed.type.split('/').pop() || 'jpg')
          : (file.name.split('.').pop() || 'pdf')
        const path = `${user.id}/${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
        const { error } = await supabase.storage
          .from('packer-docs')
          .upload(path, processed, { contentType: isImage ? processed.type : file.type })
        if (error) throw error
        paths.push(path)
      } catch (err) {
        throw new Error(`Error al procesar ${file.name}: ${err.message}`)
      }
    }
    return paths
  }

  const handleSelfieChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setComprError('')
    try {
      const compressed = await compressImage(file)
      const url = URL.createObjectURL(compressed)
      setSelfieFile(compressed)
      setSelfiePreview(url)
    } catch (err) {
      setComprError('Error al comprimir la foto: ' + err.message)
    }
  }

  const removeSelfie = () => {
    if (selfiePreview) URL.revokeObjectURL(selfiePreview)
    setSelfieFile(null)
    setSelfiePreview('')
  }

  const removeFile = (setter, index) => {
    setter(prev => {
      const copy = [...prev]
      copy.splice(index, 1)
      return copy
    })
  }

  const handleSubmitVerification = async () => {
    if (identityFiles.length === 0 || domicileFiles.length === 0) {
      setVerifError('El documento de identidad y comprobante de domicilio son obligatorios')
      return
    }
    setUploadingDocs(true)
    setVerifError('')
    setComprError('')
    try {
      const identityUrls = await uploadDocFiles(identityFiles, 'identity')
      const domicileUrls = await uploadDocFiles(domicileFiles, 'domicile')
      const bankUrls = bankFiles.length > 0 ? await uploadDocFiles(bankFiles, 'bank') : []

      let selfieUrl = null
      if (selfieFile) {
        const compressedSelfie = await compressImage(selfieFile)
        const selfieExt = compressedSelfie.type.split('/').pop() || 'jpg'
        const selfiePath = `${user.id}/identity/selfie_${Date.now()}.${selfieExt}`
        const { error: selfieErr } = await supabase.storage
          .from('packer-docs')
          .upload(selfiePath, compressedSelfie, { contentType: compressedSelfie.type })
        if (selfieErr) throw new Error('Error al subir foto personal: ' + selfieErr.message)
        selfieUrl = selfiePath
      }

      const payload = {
        user_id: user.id,
        status: 'pending',
        identity_docs: identityUrls,
        domicile_docs: domicileUrls,
        bank_docs: bankUrls,
        selfie_url: selfieUrl,
      }
      if (verifRequest) {
        await supabase.from('packer_verification_requests')
          .update(payload).eq('id', verifRequest.id)
      } else {
        await supabase.from('packer_verification_requests')
          .insert([payload])
      }
      setVerifSaved(true)
      setIdentityFiles([])
      setDomicileFiles([])
      setBankFiles([])
      removeSelfie()
      setTimeout(() => setVerifSaved(false), 4000)
      loadVerification()
    } catch (err) {
      setVerifError('Error al enviar documentos: ' + err.message)
    }
    setUploadingDocs(false)
  }

  if (!user) return null

  return (
    <div className="mc-section">
      <div className="mc-section-header">
        <h2>Verificación de transportador</h2>
        <p>Verifica tu identidad para ganar la confianza de los remitentes.</p>
      </div>

      <div className="verif-info-box">
        <h4>Requisitos para la verificación</h4>
        <p>Completa los siguientes documentos para que nuestro equipo pueda verificar tu identidad. El proceso toma 24-48 horas.</p>
        <div className="verif-types-info">
          <div className="verif-type-card">
            <div className="verif-type-icon">📄</div>
            <div>
              <strong>Documento de identidad</strong>
              <p>Carnet de identidad, cédula o pasaporte vigente. Foto frontal y dorsal. Obligatorio.</p>
            </div>
          </div>
          <div className="verif-type-card">
            <div className="verif-type-icon">🏠</div>
            <div>
              <strong>Comprobante de domicilio</strong>
              <p>Factura de agua, luz, teléfono, internet o cable con tu nombre y dirección. Obligatorio.</p>
            </div>
          </div>
          <div className="verif-type-card">
            <div className="verif-type-icon">🏦</div>
            <div>
              <strong>Extracto bancario</strong>
              <p>Extracto reciente con tu nombre y dirección. Opcional.</p>
            </div>
          </div>
          <div className="verif-type-card">
            <div className="verif-type-icon">📷</div>
            <div>
              <strong>Foto personal</strong>
              <p>Foto clara de tu rostro para confirmar que eres la misma persona del documento.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status de verificación */}
      {verifRequest?.status === 'pending' && (
        <div className="mc-notice warning">Tus documentos están siendo revisados. Te notificaremos cuando estén aprobados.</div>
      )}
      {verifRequest?.status === 'rejected' && (
        <div className="mc-notice danger">
          Tu solicitud fue rechazada.
          {verifRequest.admin_note && <><br />Motivo: <strong>{verifRequest.admin_note}</strong></>}
          <br />Puedes volver a enviar documentos corregidos.
        </div>
      )}
      {verifRequest?.status === 'approved' && (
        <div className="mc-notice info">Documentos aprobados. Tu verificación está siendo procesada.</div>
      )}

      {/* Foto personal */}
      <div className="verif-layer">
        <div className="layer-header">
          <h3>Tu Foto Personal</h3>
          <span className={`layer-status ${verifRequest?.selfie_url ? 'approved' : ''}`}>
            {verifRequest?.selfie_url ? 'Enviado' : 'Pendiente'}
          </span>
        </div>
        <p className="verif-hint">Se usará para verificar que eres la misma persona del documento.</p>
        {verifRequest && verifRequest.status !== 'rejected' ? (
          <div className="verif-locked-notice">Documentos ya enviados. No se pueden modificar hasta revisión del admin.</div>
        ) : (
          <>
            <input type="file" accept="image/*" id="selfie-input" style={{ display: 'none' }} onChange={handleSelfieChange} />
            {selfiePreview
              ? <div className="verif-preview-single">
                  <img src={selfiePreview} alt="selfie" />
                  <button className="verif-preview-remove" onClick={removeSelfie} type="button">X</button>
                </div>
              : <label htmlFor="selfie-input" className="btn btn-secondary">Seleccionar foto</label>
            }
          </>
        )}
      </div>

      {/* Documento de identidad */}
      <div className="verif-layer">
        <div className="layer-header">
          <h3>Documento de Identidad (CI/Pasaporte)</h3>
          <span className={`layer-status ${profile?.identity_verified ? 'approved' : ''}`}>
            {profile?.identity_verified ? 'Verificado' : verifRequest?.identity_docs?.length ? 'Enviado' : 'Pendiente'}
          </span>
        </div>
        <p className="verif-hint">Sube fotos de tu documento: Anverso y Reverso. Las imágenes se comprimen automáticamente.</p>
        {verifRequest && verifRequest.status !== 'rejected' ? (
          <div className="verif-locked-notice">Documentos ya enviados. No se pueden modificar hasta revisión del admin.</div>
        ) : (
          <>
            <input type="file" accept="image/*" multiple id="identity-input" style={{ display: 'none' }}
              onChange={e => setIdentityFiles(Array.from(e.target.files))} />
            <label htmlFor="identity-input" className="btn btn-secondary">
              Seleccionar documentos ({identityFiles.length} archivo{identityFiles.length !== 1 ? 's' : ''})
            </label>
            {identityFiles.length > 0 && (
              <div className="verif-preview-grid">
                {identityFiles.map((f, i) => (
                  <div key={i} className="verif-preview-item">
                    <img src={URL.createObjectURL(f)} alt={`id-${i}`} />
                    <button className="verif-preview-remove" onClick={() => removeFile(setIdentityFiles, i)} type="button">X</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Comprobante de domicilio */}
      <div className="verif-layer">
        <div className="layer-header">
          <h3>Comprobante de Domicilio</h3>
          <span className={`layer-status ${profile?.address_verified ? 'approved' : ''}`}>
            {profile?.address_verified ? 'Verificado' : verifRequest?.domicile_docs?.length ? 'Enviado' : 'Pendiente'}
          </span>
        </div>
        <p className="verif-hint">Factura de agua, luz, teléfono, internet o cable con tu nombre y dirección. Las imágenes se comprimen automáticamente.</p>
        {verifRequest && verifRequest.status !== 'rejected' ? (
          <div className="verif-locked-notice">Documentos ya enviados. No se pueden modificar hasta revisión del admin.</div>
        ) : (
          <>
            <input type="file" accept="image/*" multiple id="domicile-input" style={{ display: 'none' }}
              onChange={e => setDomicileFiles(Array.from(e.target.files))} />
            <label htmlFor="domicile-input" className="btn btn-secondary">
              Seleccionar documentos ({domicileFiles.length} archivo{domicileFiles.length !== 1 ? 's' : ''})
            </label>
            {domicileFiles.length > 0 && (
              <div className="verif-preview-grid">
                {domicileFiles.map((f, i) => (
                  <div key={i} className="verif-preview-item">
                    <img src={URL.createObjectURL(f)} alt={`dom-${i}`} />
                    <button className="verif-preview-remove" onClick={() => removeFile(setDomicileFiles, i)} type="button">X</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Extracto bancario */}
      <div className="verif-layer">
        <div className="layer-header">
          <h3>Extracto Bancario</h3>
          <span className={`layer-status ${profile?.bank_verified ? 'approved' : ''}`}>
            {profile?.bank_verified ? 'Verificado' : verifRequest?.bank_docs?.length ? 'Enviado' : 'Pendiente'}
          </span>
        </div>
        <p className="verif-hint">El extracto puede contener una sola transacción. Lo importante es que sea visible tu nombre completo y dirección, igual que en tus documentos de identidad y domicilio. Acepta imágenes y PDFs.</p>
        {verifRequest && verifRequest.status !== 'rejected' ? (
          <div className="verif-locked-notice">Documentos ya enviados. No se pueden modificar hasta revisión del admin.</div>
        ) : (
          <>
            <input type="file" accept="image/*,application/pdf,.pdf" multiple id="bank-input" style={{ display: 'none' }}
              onChange={e => setBankFiles(Array.from(e.target.files))} />
            <label htmlFor="bank-input" className="btn btn-secondary">
              Seleccionar documentos ({bankFiles.length} archivo{bankFiles.length !== 1 ? 's' : ''})
            </label>
            {bankFiles.length > 0 && (
              <div className="verif-preview-grid">
                {bankFiles.map((f, i) => (
                  <div key={i} className={`verif-preview-item ${f.type.startsWith('image/') ? '' : 'verif-preview-nonimage'}`}>
                    {f.type.startsWith('image/')
                      ? <img src={URL.createObjectURL(f)} alt={`bank-${i}`} />
                      : <div className="verif-nonimage-icon">📄 {f.name}</div>
                    }
                    <button className="verif-preview-remove" onClick={() => removeFile(setBankFiles, i)} type="button">X</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Verificación de WhatsApp */}
      <div className="verif-layer">
        <div className="layer-header">
          <h3>Verificación de WhatsApp</h3>
          <span className={`layer-status ${profile?.phone_locked ? 'approved' : ''}`}>
            {profile?.phone_locked ? 'Fijado' : 'Pendiente'}
          </span>
        </div>
        <p className="verif-hint">El teléfono se fija una vez durante el registro. Para modificarlo contacta a soporte.</p>
      </div>

      {comprError && <div className="mc-error">{comprError}</div>}
      {verifError && <div className="mc-error">{verifError}</div>}
      {verifSaved && <div className="mc-success">Documentos enviados — en revisión</div>}

      {/* Botón enviar: solo si no hay request o si fue rechazado (para corregir) */}
      {(!verifRequest || verifRequest.status === 'rejected') && (
        <div className="verif-footer">
          <button className="btn btn-primary t-btn-primary"
            onClick={handleSubmitVerification}
            disabled={uploadingDocs || identityFiles.length === 0 || domicileFiles.length === 0}>
            {uploadingDocs
              ? <><span className="loading" style={{ width: 16, height: 16 }} /> Enviando...</>
              : 'Enviar documentos'}
          </button>
        </div>
      )}

      {/* Mensaje si está bloqueado (pending o approved) */}
      {verifRequest && verifRequest.status === 'pending' && (
        <div className="verif-footer">
          <button className="btn btn-primary t-btn-primary" disabled>Tu solicitud está en revisión</button>
        </div>
      )}
      {verifRequest && verifRequest.status === 'approved' && (
        <div className="verif-footer">
          <button className="btn btn-primary t-btn-primary" disabled>Verificación completada</button>
        </div>
      )}
    </div>
  )
}
