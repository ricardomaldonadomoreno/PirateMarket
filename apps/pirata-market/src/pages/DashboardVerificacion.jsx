import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { compressImage } from '../lib/utils'
import CityAutocomplete from '../components/CityAutocomplete'
import { Country } from 'country-state-city'
import { ShieldCheck, User, Store, Package, Camera, FileText, RefreshCw, Clock, Check, XCircle, X } from 'lucide-react'
import './Dashboard.css'

const ACCOUNT_TYPES = [
  { value: 'person',    label: 'Persona',   icon: User },
  { value: 'shop',      label: 'Tienda',    icon: Store },
  { value: 'wholesale', label: 'Mayorista', icon: Package },
]

export default function DashboardVerificacion({ user, profile, onProfileUpdate }) {
  const { t } = useTranslation()
  const [verificationRequest, setVerificationRequest] = useState(null)
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

  useEffect(() => {
    if (user) {
      loadVerification()
      loadRealData()
    }
  }, [user])

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

  const loadRealData = async () => {
    try {
      const { data } = await supabase
        .from('pirata_profiles')
        .select('full_name, country, city, phone, identity_verified, business_verified, identity_locked, allow_identity_edit')
        .eq('user_id', user.id)
        .single()
      if (data) {
        setRealData({
          full_name: data.full_name || '',
          country: data.country || '',
          city: data.city || '',
          phone: data.phone || ''
        })
      }
    } catch (error) { console.error(error) }
    finally { setLoading(false) }
  }

  const loadVerification = async () => {
    const { data } = await supabase
      .from('verification_requests')
      .select('*')
      .eq('user_id', user.id)
      .eq('source', 'pirata')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (data) setVerificationRequest(data)
  }

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

  const handleChangeType = async (newType) => {
    if (newType === profile?.user_type) return
    const label = ACCOUNT_TYPES.find(o => o.value === newType)?.label || newType
    const requiresBusinessVerification = newType === 'shop' || newType === 'wholesale'
    const confirmMsg = requiresBusinessVerification
      ? `¿Cambiar tu tipo de cuenta a ${label}? Deberás completar una nueva verificación de negocio. Tu verificación de identidad se mantiene.`
      : `¿Cambiar tu tipo de cuenta a ${label}? Tu verificación de negocio se reseteará, pero tu identidad se mantendrá.`
    if (!confirm(confirmMsg)) return

    setChangingType(true)
    try {
      await supabase.from('users').update({ user_type: newType }).eq('id', user.id)
      await supabase.from('pirata_profiles').update({ business_verified: false, identity_locked: false }).eq('user_id', user.id)

      if (verificationRequest) {
        await supabase.from('verification_requests').update({
          business_docs: [],
          status: requiresBusinessVerification ? 'pending' : verificationRequest.status
        }).eq('id', verificationRequest.id)
      } else if (requiresBusinessVerification) {
        await supabase.from('verification_requests').insert([{
          user_id: user.id,
          status: 'pending',
          source: 'pirata',
          identity_docs: [null, null],
          business_docs: [],
        }])
      }

      setBusinessFiles([])
      setAnversoFile(null)
      setReversoFile(null)
      if (onProfileUpdate) await onProfileUpdate(user.id)
      loadVerification()
    } catch (error) { alert('Error al cambiar tipo: ' + error.message) }
    finally { setChangingType(false) }
  }

  const handleSubmitVerification = async () => {
    const identityVerified = profile?.identity_verified
    if (!identityVerified) {
      if (!realData.full_name || !realData.country || !realData.city || !realData.phone) {
        alert('Completa todos tus datos personales para la verificación.'); return
      }
      if (!anversoFile || !reversoFile) {
        alert('Sube ambos lados de tu documento de identidad (Anverso y Reverso).'); return
      }
    }

    setUploadingDocs(true)
    try {
      // Anverso y Reverso: [anverso_url, reverso_url]
      let identityUrls = [null, null]
      if (anversoFile) {
        identityUrls[0] = await uploadSingleFile(anversoFile, 'identity', 'anverso')
      } else if (verificationRequest?.identity_docs?.[0]) {
        identityUrls[0] = verificationRequest.identity_docs[0]
      }
      if (reversoFile) {
        identityUrls[1] = await uploadSingleFile(reversoFile, 'identity', 'reverso')
      } else if (verificationRequest?.identity_docs?.[1]) {
        identityUrls[1] = verificationRequest.identity_docs[1]
      }

      let businessUrls = verificationRequest?.business_docs || []
      if (businessFiles.length > 0) {
        for (const file of businessFiles) {
          const url = await uploadSingleFile(file, 'business', `biz_${Date.now()}`)
          businessUrls.push(url)
        }
      }

      let selfieUrl = verificationRequest?.selfie_url || null
      if (selfieFiles.length > 0) {
        selfieUrl = await uploadSingleFile(selfieFiles[0], 'selfie', 'selfie')
      }

      const payload = {
        user_id: user.id,
        status: 'pending',
        source: 'pirata',
        identity_docs: identityUrls,
        business_docs: businessUrls,
        selfie_url: selfieUrl,
      }

      // Guardar datos reales en pirata_profiles y bloquear edición
      const cityValue = typeof realData.city === 'string' ? realData.city : (realData.city?.city || '')
      const countryValue = typeof realData.country === 'string' ? realData.country : (realData.city?.country || '')
      await supabase.from('pirata_profiles').update({
        full_name: realData.full_name,
        country: countryValue,
        city: cityValue,
        phone: realData.phone,
        identity_locked: true,
      }).eq('user_id', user.id)

      if (verificationRequest) {
        await supabase.from('verification_requests').update(payload).eq('id', verificationRequest.id)
      } else {
        await supabase.from('verification_requests').insert([payload])
      }

      setVerifSaved(true)
      setAnversoFile(null)
      setReversoFile(null)
      setBusinessFiles([])
      setSelfieFiles([])
      setTimeout(() => setVerifSaved(false), 4000)
      loadVerification()
      if (onProfileUpdate) await onProfileUpdate(user.id)
    } catch (error) { alert('Error al enviar: ' + error.message) }
    finally { setUploadingDocs(false) }
  }

  if (!user) return null

  const userType = profile?.user_type || 'person'
  const isVerified = profile?.is_verified
  const identityVerified = profile?.identity_verified
  const businessVerified = profile?.business_verified
  const identityLocked = profile?.identity_locked && !profile?.allow_identity_edit
  const isShopOrWholesale = userType === 'shop' || userType === 'wholesale'

  return (
    <div className="db-section">
      <div className="db-section-header">
        <h2><ShieldCheck size={22} /> Verificación de Cuenta</h2>
        {isVerified &&             <span className="verif-badge approved"><Check size={14} /> Cuenta Verificada</span>}
      </div>

      {/* Cuadros explicativos compactos */}
      {!isVerified && (
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

      {/* TIPO DE CUENTA - Botones de selección */}
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

      {!isVerified && (
        <div className="verif-info-compact">
          <p className="verif-info-text">
            {userType === 'person' && <><User size={14} /> Solo necesitas verificar tu identidad personal</>}
            {userType === 'shop' && <><Store size={14} /> Necesitas verificar tu identidad + documentos de tu negocio</>}
            {userType === 'wholesale' && <><Package size={14} /> Necesitas verificar tu identidad + documentos legales de tu negocio</>}
          </p>
        </div>
      )}

      <div className="verif-layers">
        {/* IDENTIDAD PERSONAL */}
        <div className={`verif-layer ${identityVerified ? 'verified' : ''}`}>
          <div className="layer-header">
            <h3><User size={18} /> Identidad Personal</h3>
            <span className={`layer-status ${identityVerified ? 'approved' : verificationRequest?.status === 'pending' ? 'pending' : verificationRequest?.status === 'rejected' ? 'rejected' : ''}`}>
              {identityVerified ? <><Check size={14} /> Verificada</> : verificationRequest?.status === 'pending' ? <><Clock size={14} /> En revisión</> : verificationRequest?.status === 'rejected' ? <><XCircle size={14} /> Rechazada</> : <><XCircle size={14} /> Pendiente</>}
            </span>
          </div>

          <div className="layer-content">
            <div className="real-data-grid">
              <div className="form-group">
                <label>Nombre Completo Real</label>
                <input type="text" className="input" value={realData.full_name} disabled={identityLocked}
                  onChange={e => setRealData(p => ({ ...p, full_name: e.target.value }))} placeholder="Como figura en tu documento" />
              </div>
              <div className="form-group">
                <label>País / Ciudad</label>
                <CityAutocomplete
                  placeholder="Selecciona tu país y ciudad"
                  value={{ country: realData.country, city: realData.city }}
                  onChange={(result) => {
                    if (result) {
                      setRealData(p => {
                        // Auto-prefijo de teléfono al cambiar país
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
                <input type="tel" className="input" value={realData.phone} disabled={identityLocked}
                  onChange={e => setRealData(p => ({ ...p, phone: e.target.value }))} placeholder="+591 ..." />
              </div>
            </div>

            {!identityVerified && (
              <>
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
                  {verificationRequest?.selfie_url && selfieFiles.length === 0 && (
                    <p className="verif-hint" style={{color: 'var(--gold)'}}><Check size={12} /> Foto personal ya enviada anteriormente</p>
                  )}
                </div>

                {/* Documento de Identidad - Anverso y Reverso */}
                <div className="verif-docs-upload">
                  <label><FileText size={16} /> Documento de Identidad</label>
                  <p className="verif-hint">Sube ambos lados de tu documento (CI/Pasaporte). Máximo 4MB por imagen. Se comprimen automáticamente.</p>
                  <div className="verif-id-grid">
                    {/* Anverso */}
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
                      {verificationRequest?.identity_docs?.[0] && !anversoFile && (
                        <p className="verif-hint" style={{color: 'var(--gold)'}}><Check size={12} /> Anverso ya enviado</p>
                      )}
                    </div>
                    {/* Reverso */}
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
                      {verificationRequest?.identity_docs?.[1] && !reversoFile && (
                        <p className="verif-hint" style={{color: 'var(--gold)'}}><Check size={12} /> Reverso ya enviado</p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* VERIFICACIÓN DE NEGOCIO */}
        {isShopOrWholesale && (
          <div className={`verif-layer ${businessVerified ? 'verified' : ''}`}>
            <div className="layer-header">
              <h3><Store size={18} /> Verificación de Negocio</h3>
              <span className={`layer-status ${businessVerified ? 'approved' : ''}`}>
                {businessVerified ? <><Check size={14} /> Verificada</> : <><XCircle size={14} /> Pendiente</>}
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

      <div className="verif-footer">
        {verificationRequest?.admin_note && (
          <div className={`admin-note ${verificationRequest?.status === 'rejected' ? 'admin-note-rejected' : ''}`}>
            <strong>{verificationRequest?.status === 'rejected' ? <><XCircle size={14} /> Motivo de rechazo:</> : 'Nota del administrador:'}</strong> {verificationRequest.admin_note}
          </div>
        )}
        {fileError && <p className="verif-error">{fileError}</p>}
        {comprError && <p className="verif-error">{comprError}</p>}
        <button className="btn btn-primary btn-full" onClick={handleSubmitVerification} disabled={identityLocked || uploadingDocs || (!anversoFile && !reversoFile && !businessFiles.length && !selfieFiles.length)}>
          {uploadingDocs ? 'Enviando...' : identityLocked ? 'Tu identidad está bloqueada por el administrador' : <><ShieldCheck size={16} /> Enviar Solicitud de Verificación</>}
        </button>
        {verifSaved && <p className="success-msg"><Check size={14} /> Solicitud enviada con éxito. El equipo revisará tus documentos pronto.</p>}
      </div>
    </div>
  )
}
