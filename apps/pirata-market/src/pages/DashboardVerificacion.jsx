import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { compressImage } from '../lib/utils'
import CityAutocomplete from '../components/CityAutocomplete'
import { Country } from 'country-state-city'
import { ShieldCheck, User, Store, Package, Camera, FileText, Clock, Check, XCircle, X } from 'lucide-react'
import './Dashboard.css'

const ACCOUNT_TYPES = [
  { value: 'person',    label: 'Persona',   icon: User },
  { value: 'shop',      label: 'Tienda',    icon: Store },
  { value: 'wholesale', label: 'Mayorista', icon: Package },
]

export default function DashboardVerificacion({ user, profile, onProfileUpdate }) {
  const { t } = useTranslation()
  const [uploadingDocs, setUploadingDocs] = useState(false)
  const [businessFiles, setBusinessFiles] = useState([])
  const [selfieFiles, setSelfieFiles] = useState([])
  const [verifSaved, setVerifSaved] = useState(false)
  const [fileError, setFileError] = useState('')
  const [comprError, setComprError] = useState('')
  const [changingType, setChangingType] = useState(false)
  const [realData, setRealData] = useState({
    full_name: '', country: '', city: '', phone: ''
  })
  const [anversoFile, setAnversoFile] = useState(null)
  const [reversoFile, setReversoFile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Estado de verificación derivado de pirata_profiles
  const userType = profile?.identity || 'person'
  const identityVerified = profile?.identity_verified || false
  const businessVerified = profile?.business_verified || false
  const identityLocked = profile?.identity_locked || false
  const verifStatus = profile?.verif_status || null
  const adminNote = profile?.admin_note || null
  const isShopOrWholesale = userType === 'shop' || userType === 'wholesale'

  // Derivar estado UI de pirata_profiles.verif_status
  const isPending = verifStatus === 'pending' && !identityVerified
  const isRejected = verifStatus === 'rejected'
  const identityPending = isPending || (identityLocked && !identityVerified)

  useEffect(() => {
    if (profile) {
      setRealData({
        full_name: profile.full_name || '',
        country: profile.country || '',
        city: profile.city || '',
        phone: profile.phone || ''
      })
    }
  }, [profile])

  useEffect(() => {
    if (user) setLoading(false)
  }, [user])

  const validateImageType = (file) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setFileError('Solo se permiten imágenes JPG, PNG o WebP')
      return false
    }
    if (file.size > 4 * 1024 * 1024) {
      setFileError('La imagen no puede superar 4MB')
      return false
    }
    setFileError('')
    return true
  }

  const handleAnversoFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!validateImageType(file)) return
    try {
      setComprError('')
      const compressed = await compressImage(file)
      setAnversoFile(compressed)
    } catch (err) {
      setComprError('Error al comprimir imagen: ' + err.message)
    }
  }

  const handleReversoFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!validateImageType(file)) return
    try {
      setComprError('')
      const compressed = await compressImage(file)
      setReversoFile(compressed)
    } catch (err) {
      setComprError('Error al comprimir imagen: ' + err.message)
    }
  }

  const removeAnversoFile = () => setAnversoFile(null)
  const removeReversoFile = () => setReversoFile(null)

  const handleBusinessFiles = async (e) => {
    const files = Array.from(e.target.files)
    for (const f of files) {
      if (!validateImageType(f)) return
    }
    try {
      setComprError('')
      const compressed = await Promise.all(files.map(f => compressImage(f)))
      setBusinessFiles(compressed)
    } catch (err) {
      setComprError('Error al comprimir imágenes: ' + err.message)
    }
  }

  const handleSelfieFiles = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!validateImageType(file)) return
    try {
      setComprError('')
      const compressed = await compressImage(file)
      setSelfieFiles([compressed])
    } catch (err) {
      setComprError('Error al comprimir imagen: ' + err.message)
    }
  }

  const removeBusinessFile = (index) => setBusinessFiles(prev => prev.filter((_, i) => i !== index))
  const removeSelfieFile = () => setSelfieFiles([])

  const uploadSingleFile = async (file, folder, suffix) => {
    const fileExt = file.type === 'image/png' ? 'png' : 'jpg'
    const path = `${user.id}/${folder}/${Date.now()}_${suffix}_${Math.random().toString(36).slice(2, 8)}.${fileExt}`
    const compressed = await compressImage(file)
    const { error } = await supabase.storage
      .from('verification-docs').upload(path, compressed, { contentType: 'image/jpeg' })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage
      .from('verification-docs').getPublicUrl(path)
    return publicUrl
  }

  // Cambiar tipo de cuenta → actualiza pirata_profiles.identity
  const handleChangeType = async (newType) => {
    if (newType === profile?.identity) return
    const label = ACCOUNT_TYPES.find(o => o.value === newType)?.label || newType
    const requiresBusinessVerification = newType === 'shop' || newType === 'wholesale'
    const isCurrentlyLocked = profile?.identity_locked && profile?.verif_status === 'pending'

    const confirmMsg = isCurrentlyLocked
      ? `¿Cambiar tu tipo de cuenta a ${label}? Esto cancelará tu solicitud de verificación actual y desbloqueará tus datos para una nueva solicitud.`
      : requiresBusinessVerification
        ? `¿Cambiar tu tipo de cuenta a ${label}? Deberás completar una nueva verificación de negocio. Tu verificación de identidad se mantiene.`
        : `¿Cambiar tu tipo de cuenta a ${label}? Tu verificación de negocio se reseteará, pero tu identidad se mantendrá.`

    if (!confirm(confirmMsg)) return

    setChangingType(true)
    try {
      // Resetear estado de verificación y cambiar tipo
      await supabase.from('pirata_profiles').update({
        identity: newType,
        business_verified: false,
        identity_locked: isCurrentlyLocked ? false : profile?.identity_locked || false,
        verif_status: isCurrentlyLocked ? null : profile?.verif_status || null,
        identity_docs: [null, null],
        business_docs: [],
        selfie_url: null,
        admin_note: null,
      }).eq('user_id', user.id)

      setBusinessFiles([])
      setAnversoFile(null)
      setReversoFile(null)
      if (onProfileUpdate) await onProfileUpdate(user.id)
    } catch (error) { alert('Error al cambiar tipo: ' + error.message) }
    finally { setChangingType(false) }
  }

  // Enviar solicitud de verificación → todo va a pirata_profiles
  const handleSubmitVerification = async () => {
    if (!identityVerified) {
      if (!realData.full_name || !realData.country || !realData.city || !realData.phone) {
        alert('Completa todos tus datos personales para la verificación.'); return
      }
      if (!anversoFile && !reversoFile) {
        alert('Sube ambos lados de tu documento de identidad (Anverso y Reverso).'); return
      }
    }

    setUploadingDocs(true)
    try {
      // Subir Anverso y Reverso
      let identityUrls = profile?.identity_docs || [null, null]
      if (anversoFile) {
        identityUrls[0] = await uploadSingleFile(anversoFile, 'identity', 'anverso')
      }
      if (reversoFile) {
        identityUrls[1] = await uploadSingleFile(reversoFile, 'identity', 'reverso')
      }

      // Subir Documentos de negocio
      let businessUrls = profile?.business_docs || []
      if (businessFiles.length > 0) {
        for (const file of businessFiles) {
          const url = await uploadSingleFile(file, 'business', `biz_${Date.now()}`)
          businessUrls.push(url)
        }
      }

      // Subir Selfie
      let selfieUrl = profile?.selfie_url || null
      if (selfieFiles.length > 0) {
        selfieUrl = await uploadSingleFile(selfieFiles[0], 'selfie', 'selfie')
      }

      // Guardar TODO en pirata_profiles: datos personales + fotos + estado
      const cityValue = typeof realData.city === 'string' ? realData.city : (realData.city?.city || '')
      const countryValue = typeof realData.country === 'string' ? realData.country : (realData.city?.country || '')
      await supabase.from('pirata_profiles').update({
        full_name: realData.full_name,
        country: countryValue,
        city: cityValue,
        phone: realData.phone,
        identity_locked: true,
        verif_status: 'pending',
        identity_docs: identityUrls,
        business_docs: businessUrls,
        selfie_url: selfieUrl,
        identity_verified: identityVerified, // mantener si ya estaba verificado
        business_verified: businessVerified,
      }).eq('user_id', user.id)

      setVerifSaved(true)
      setAnversoFile(null)
      setReversoFile(null)
      setBusinessFiles([])
      setSelfieFiles([])
      setTimeout(() => setVerifSaved(false), 4000)
      if (onProfileUpdate) await onProfileUpdate(user.id)
    } catch (error) { alert('Error al enviar: ' + error.message) }
    finally { setUploadingDocs(false) }
  }

  if (!user) return null

  return (
    <div className="db-section">
      <div className="db-section-header">
        <h2><ShieldCheck size={22} /> Verificación de Cuenta</h2>
        {identityVerified && <span className="verif-badge approved"><Check size={14} /> Cuenta Verificada</span>}
      </div>

      {/* Cuadros explicativos */}
      {!identityVerified && (
        <div className="verif-explain-grid">
          <div className="verif-explain-card">
            <User size={16} className="verif-explain-icon" />
            <strong>Persona</strong>
            <p>Solo tu identidad personal</p>
          </div>
          <div className="verif-explain-card">
            <Store size={16} className="verif-explain-icon" />
            <strong>Tienda</strong>
            <p>Identidad + verificación de negocio</p>
          </div>
          <div className="verif-explain-card">
            <Package size={16} className="verif-explain-icon" />
            <strong>Mayorista</strong>
            <p>Identidad + documentos legales</p>
          </div>
        </div>
      )}

      {/* Selector de tipo de cuenta */}
      <div className="verif-type-selector">
        <div className="type-change-options type-selector-row">
          {ACCOUNT_TYPES.map(opt => (
            <button
              key={opt.value}
              onClick={() => handleChangeType(opt.value)}
              disabled={changingType || userType === opt.value}
              className={`type-selector-btn ${userType === opt.value ? 'active' : ''}`}
            >
              {opt.icon && <opt.icon className="type-selector-icon" size={18} />}
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {!identityVerified && (
        <div className="verif-info-compact">
          <p className="verif-info-text">
            {userType === 'person' && <><User size={14} /> Solo necesitas verificar tu identidad personal</>}
            {userType === 'shop' && <><Store size={14} /> Necesitas verificar tu identidad + documentos de tu negocio</>}
            {userType === 'wholesale' && <><Package size={14} /> Necesitas verificar tu identidad + documentos legales de tu negocio</>}
          </p>
        </div>
      )}

      <div className="verif-layers">
        {/* CAPA 1: IDENTIDAD PERSONAL */}
        <div className={`verif-layer ${identityVerified ? 'verified' : ''}`}>
          <div className="layer-header">
            <h3><User size={18} /> Identidad Personal</h3>
            <span className={`layer-status ${
              identityVerified ? 'approved' :
              isPending ? 'pending' :
              isRejected ? 'rejected' :
              ''
            }`}>
              {identityVerified ? <><Check size={14} /> Verificada</> :
               isPending ? <><Clock size={14} /> En revisión</> :
               isRejected ? <><XCircle size={14} /> Rechazada</> :
               <><XCircle size={14} /> Pendiente</>}
            </span>
          </div>

          <div className="layer-content">
            {/* Si está en revisión (pending) → bloqueado */}
            {identityPending && !isRejected ? (
              <div className="verif-locked-message">
                <Clock size={24} />
                <strong>Tu identidad está en revisión</strong>
                <p>Los datos y documentos que enviaste están bloqueados hasta que el administrador los apruebe o rechace.</p>
              </div>
            ) : (
              <div>
                <div className="real-data-grid">
                  <div className="form-group">
                    <label>Nombre Completo Real</label>
                    <input type="text" className="input" value={realData.full_name} disabled={identityLocked && !isRejected}
                      onChange={e => setRealData(p => ({ ...p, full_name: e.target.value }))} placeholder="Como figura en tu documento" />
                  </div>
                  <div className="form-group">
                    <label>País / Ciudad</label>
                    <CityAutocomplete
                      placeholder="Selecciona tu país y ciudad"
                      value={{ country: realData.country, city: realData.city }}
                      disabled={identityLocked && !isRejected}
                      onChange={(result) => {
                        if (result) {
                          setRealData(p => {
                            let newPhone = p.phone
                            if (result.country_code && result.country !== p.country) {
                              const country = Country.getAllCountries().find(c => c.isoCode === result.country_code)
                              if (country?.phonecode) {
                                newPhone = '+' + country.phonecode
                              }
                            }
                            return { ...p, country: result.country, city: result.city, phone: newPhone }
                          })
                        }
                      }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Teléfono de contacto</label>
                    <input type="tel" className="input" value={realData.phone} disabled={identityLocked && !isRejected}
                      onChange={e => setRealData(p => ({ ...p, phone: e.target.value }))} placeholder="+591 ..." />
                  </div>
                </div>

                {/* Formularios de upload: solo si no está locked o fue rechazado */}
                {!identityVerified && (!identityLocked || isRejected) && (
                  <div>
                    {/* Foto personal (selfie) */}
                    <div className="verif-docs-upload">
                      <label><Camera size={16} /> Tu Foto Personal</label>
                      <p className="verif-hint">Sube una foto clara de tu rostro. Se usará para verificar que eres la misma persona del documento.</p>
                      <input type="file" accept="image/*" id="selfie-input" style={{ display: 'none' }} onChange={handleSelfieFiles} />
                      <label htmlFor="selfie-input" className="btn btn-secondary verif-upload-btn">
                        {selfieFiles.length > 0 ? 'Cambiar foto' : 'Seleccionar foto'}
                      </label>
                      {selfieFiles.length > 0 && (
                        <div className="verif-preview-single">
                          <div className="verif-preview-item verif-preview-single-item">
                            <img src={URL.createObjectURL(selfieFiles[0])} alt="Tu foto" />
                            <button className="verif-preview-remove" onClick={removeSelfieFile} title="Eliminar"><X size={14} /></button>
                          </div>
                        </div>
                      )}
                      {profile?.selfie_url && selfieFiles.length === 0 && (
                        <p className="verif-hint" style={{color: 'var(--gold)'}}><Check size={12} /> Foto personal ya enviada anteriormente</p>
                      )}
                    </div>

                    {/* Documento de Identidad */}
                    <div className="verif-docs-upload">
                      <label><FileText size={16} /> Documento de Identidad</label>
                      <p className="verif-hint">Sube ambos lados de tu documento (CI/Pasaporte). Máximo 4MB por imagen. Se comprimen automáticamente.</p>
                      <div className="verif-id-grid">
                        <div className="verif-id-slot">
                          <strong>Anverso (Frente)</strong>
                          <input type="file" accept="image/*" id="anverso-input" style={{ display: 'none' }} onChange={handleAnversoFile} />
                          <label htmlFor="anverso-input" className="btn btn-secondary verif-upload-btn">
                            {anversoFile ? 'Cambiar anverso' : 'Seleccionar anverso'}
                          </label>
                          {anversoFile && (
                            <div className="verif-preview-single">
                              <div className="verif-preview-item verif-preview-single-item">
                                <img src={URL.createObjectURL(anversoFile)} alt="Anverso" />
                                <button className="verif-preview-remove" onClick={removeAnversoFile} title="Eliminar"><X size={14} /></button>
                              </div>
                            </div>
                          )}
                          {profile?.identity_docs?.[0] && !anversoFile && (
                            <p className="verif-hint" style={{color: 'var(--gold)'}}><Check size={12} /> Anverso ya enviado</p>
                          )}
                        </div>
                        <div className="verif-id-slot">
                          <strong>Reverso (Atrás)</strong>
                          <input type="file" accept="image/*" id="reverso-input" style={{ display: 'none' }} onChange={handleReversoFile} />
                          <label htmlFor="reverso-input" className="btn btn-secondary verif-upload-btn">
                            {reversoFile ? 'Cambiar reverso' : 'Seleccionar reverso'}
                          </label>
                          {reversoFile && (
                            <div className="verif-preview-single">
                              <div className="verif-preview-item verif-preview-single-item">
                                <img src={URL.createObjectURL(reversoFile)} alt="Reverso" />
                                <button className="verif-preview-remove" onClick={removeReversoFile} title="Eliminar"><X size={14} /></button>
                              </div>
                            </div>
                          )}
                          {profile?.identity_docs?.[1] && !reversoFile && (
                            <p className="verif-hint" style={{color: 'var(--gold)'}}><Check size={12} /> Reverso ya enviado</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* CAPA 2: VERIFICACIÓN DE NEGOCIO */}
        {isShopOrWholesale && (!identityPending || isRejected) && (
          <div className={`verif-layer ${businessVerified ? 'verified' : ''}`}>
            <div className="layer-header">
              <h3><Store size={18} /> Verificación de Negocio</h3>
              <span className={`layer-status ${
                businessVerified ? 'approved' :
                isPending ? 'pending' : ''
              }`}>
                {businessVerified ? <><Check size={14} /> Verificada</> :
                 isPending ? <><Clock size={14} /> En revisión</> :
                 <><XCircle size={14} /> Pendiente</>}
              </span>
            </div>
            <div className="layer-content">
              <p className="verif-hint">Sube fotos de tu local, almacén o documentos legales de tu negocio. Las imágenes se comprimen automáticamente.</p>
              <input type="file" accept="image/*" multiple id="biz-input" style={{ display: 'none' }} onChange={handleBusinessFiles} />
              <label htmlFor="biz-input" className="btn btn-secondary verif-upload-btn">
                {businessFiles.length > 0 ? 'Cambiar documentos' : 'Subir documentos'} ({businessFiles.length})
              </label>
              {businessFiles.length > 0 && (
                <div className="verif-preview-grid">
                  {businessFiles.map((f, i) => (
                    <div key={i} className="verif-preview-item">
                      <img src={URL.createObjectURL(f)} alt="preview" />
                      <button className="verif-preview-remove" onClick={() => removeBusinessFile(i)} title="Eliminar"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="verif-footer">
        {adminNote && (
          <div className={`admin-note ${isRejected ? 'admin-note-rejected' : ''}`}>
            <strong>{isRejected ? <><XCircle size={14} /> Motivo de rechazo:</> : 'Nota del administrador:'}</strong> {adminNote}
          </div>
        )}
        {fileError && <p className="verif-error">{fileError}</p>}
        {comprError && <p className="verif-error">{comprError}</p>}
        <button className="btn btn-primary btn-full" onClick={handleSubmitVerification}
          disabled={identityPending || uploadingDocs || (!anversoFile && !reversoFile && !businessFiles.length && !selfieFiles.length)}>
          {uploadingDocs ? 'Enviando...' :
           identityPending ? 'Tu identidad está en revisión' :
           <><ShieldCheck size={16} /> Enviar Solicitud de Verificación</>}
        </button>
        {verifSaved && <p className="success-msg"><Check size={14} /> Solicitud enviada con éxito. El equipo revisará tus documentos pronto.</p>}
      </div>
    </div>
  )
}
