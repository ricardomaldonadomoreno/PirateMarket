import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { compressImage } from '../lib/utils'
import './Dashboard.css'

const COUNTRIES = [
  'Argentina', 'Bolivia', 'Brasil', 'Canadá', 'Chile', 'Colombia', 'Costa Rica',
  'Cuba', 'República Dominicana', 'Ecuador', 'El Salvador', 'Guatemala',
  'Honduras', 'Jamaica', 'México', 'Nicaragua', 'Panamá', 'Paraguay', 'Perú',
  'Puerto Rico', 'Trinidad y Tobago', 'Estados Unidos', 'Uruguay', 'Venezuela'
]

const ACCOUNT_TYPES = [
  { value: 'person',    label: 'Persona',   icon: '👤' },
  { value: 'shop',      label: 'Tienda',    icon: '🏪' },
  { value: 'wholesale', label: 'Mayorista', icon: '📦' },
]

export default function DashboardVerificacion({ user, profile, onProfileUpdate }) {
  const { t } = useTranslation()
  const [verificationRequest, setVerificationRequest] = useState(null)
  const [uploadingDocs, setUploadingDocs] = useState(false)
  const [identityFiles, setIdentityFiles] = useState([])
  const [businessFiles, setBusinessFiles] = useState([])
  const [selfieFiles, setSelfieFiles] = useState([])
  const [verifSaved, setVerifSaved] = useState(false)
  const [fileError, setFileError] = useState('')
  const [comprError, setComprError] = useState('')
  const [changingType, setChangingType] = useState(false)
  const [realData, setRealData] = useState({
    full_name: '', country: '', city: '', phone: ''
  })
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
        .from('users')
        .select('full_name, country, city, phone, identity_verified, business_verified, identity_locked, allow_identity_edit')
        .eq('id', user.id)
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

  const validateImageType = (files) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    const invalid = files.filter(f => !validTypes.includes(f.type))
    if (invalid.length > 0) {
      setFileError('Solo se permiten imágenes JPG, PNG o WebP')
      return false
    }
    setFileError('')
    return true
  }

  const handleIdentityFiles = async (e) => {
    const files = Array.from(e.target.files)
    if (!validateImageType(files)) return
    try {
      setComprError('')
      const compressed = await Promise.all(files.map(f => compressImage(f)))
      setIdentityFiles(compressed)
    } catch (err) {
      setComprError('Error al comprimir imágenes: ' + err.message)
    }
  }

  const handleBusinessFiles = async (e) => {
    const files = Array.from(e.target.files)
    if (!validateImageType(files)) return
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
    if (!validateImageType([file])) return
    try {
      setComprError('')
      const compressed = await compressImage(file)
      setSelfieFiles([compressed])
    } catch (err) {
      setComprError('Error al comprimir imagen: ' + err.message)
    }
  }

  const removeIdentityFile = (index) => setIdentityFiles(prev => prev.filter((_, i) => i !== index))
  const removeBusinessFile = (index) => setBusinessFiles(prev => prev.filter((_, i) => i !== index))
  const removeSelfieFile = () => setSelfieFiles([])

  const uploadDocFiles = async (files, folder) => {
    const urls = []
    for (const file of files) {
      const fileExt = file.type === 'image/png' ? 'png' : 'jpg'
      const path = `${user.id}/${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExt}`
      const compressed = await compressImage(file)
      const { error } = await supabase.storage
        .from('verification-docs').upload(path, compressed, { contentType: 'image/jpeg' })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage
        .from('verification-docs').getPublicUrl(path)
      urls.push(publicUrl)
    }
    return urls
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
      await supabase.from('users').update({
        user_type: newType,
        business_verified: false,
      }).eq('id', user.id)

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
          identity_docs: [],
          business_docs: [],
        }])
      }

      setBusinessFiles([])
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
      if (identityFiles.length < 1) {
        alert('Sube al menos una foto de tu documento de identidad.'); return
      }
    }

    setUploadingDocs(true)
    try {
      let identityUrls = verificationRequest?.identity_docs || []
      if (identityFiles.length > 0) {
        identityUrls = await uploadDocFiles(identityFiles, 'identity')
      }

      let businessUrls = verificationRequest?.business_docs || []
      if (businessFiles.length > 0) {
        businessUrls = await uploadDocFiles(businessFiles, 'business')
      }

      let selfieUrl = verificationRequest?.selfie_url || null
      if (selfieFiles.length > 0) {
        const urls = await uploadDocFiles(selfieFiles, 'selfie')
        selfieUrl = urls[0] || null
      }

      const payload = {
        user_id: user.id,
        status: 'pending',
        source: 'pirata',
        identity_docs: identityUrls,
        business_docs: businessUrls,
        selfie_url: selfieUrl,
      }

      await supabase.from('users').update({
        full_name: realData.full_name,
        country: realData.country,
        city: realData.city,
        phone: realData.phone,
      }).eq('id', user.id)

      if (verificationRequest) {
        await supabase.from('verification_requests').update(payload).eq('id', verificationRequest.id)
      } else {
        await supabase.from('verification_requests').insert([payload])
      }

      setVerifSaved(true)
      setIdentityFiles([])
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
        <h2>🏅 Verificación de Cuenta</h2>
        {isVerified && <span className="verif-badge approved">✓ Cuenta Verificada</span>}
      </div>

      {/* INFO: Tipos de verificación */}
      {!isVerified && (
        <div className="verif-info-box">
          <p><strong>¿Qué tipo de verificación necesitas?</strong></p>
          <div className="verif-types-info">
            <div className="verif-type-card">
              <span className="verif-type-icon">👤</span>
              <div>
                <strong>Persona</strong>
                <p>Solo tu identidad personal. Para publicar como vendedor individual.</p>
              </div>
            </div>
            <div className="verif-type-card">
              <span className="verif-type-icon">🏪</span>
              <div>
                <strong>Tienda</strong>
                <p>Identidad + verificación de tu local/negocio físico. Para publicar como tienda.</p>
              </div>
            </div>
            <div className="verif-type-card">
              <span className="verif-type-icon">📦</span>
              <div>
                <strong>Mayorista</strong>
                <p>Identidad + documentos legales de tu negocio. Para venta al por mayor.</p>
              </div>
            </div>
          </div>
          <p className="verif-hint">Selecciona tu tipo de cuenta abajo y completa los documentos.</p>
        </div>
      )}

      <div className="verif-layers">
        {/* IDENTIDAD PERSONAL */}
        <div className={`verif-layer ${identityVerified ? 'verified' : ''}`}>
          <div className="layer-header">
            <h3>👤 Identidad Personal</h3>
            <span className={`layer-status ${identityVerified ? 'approved' : verificationRequest?.status === 'pending' ? 'pending' : ''}`}>
              {identityVerified ? '✓ Verificada' : verificationRequest?.status === 'pending' ? '⏳ En revisión' : '✗ Pendiente'}
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
                <label>País</label>
                <select className="input" value={realData.country} disabled={identityLocked}
                  onChange={e => setRealData(p => ({ ...p, country: e.target.value }))}>
                  <option value="">Selecciona tu país</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Ciudad</label>
                <input type="text" className="input" value={realData.city} disabled={identityLocked}
                  onChange={e => setRealData(p => ({ ...p, city: e.target.value }))} placeholder="Ej: Santa Cruz" />
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
                  <label>📸 Tu Foto Personal</label>
                  <p className="verif-hint">Sube una foto clara de tu rostro. Se usará para verificar que eres la misma persona del documento.</p>
                  <input type="file" accept="image/*" id="selfie-input" style={{ display: 'none' }} onChange={handleSelfieFiles} />
                  <label htmlFor="selfie-input" className="btn btn-secondary verif-upload-btn">
                    {selfieFiles.length > 0 ? 'Cambiar foto' : 'Seleccionar foto'}
                  </label>
                  {selfieFiles.length > 0 && (
                    <div className="verif-preview-single">
                      <div className="verif-preview-item verif-preview-single-item">
                        <img src={URL.createObjectURL(selfieFiles[0])} alt="Tu foto" />
                        <button className="verif-preview-remove" onClick={removeSelfieFile} title="Eliminar">✕</button>
                      </div>
                    </div>
                  )}
                  {verificationRequest?.selfie_url && selfieFiles.length === 0 && (
                    <p className="verif-hint" style={{color: 'var(--gold)'}}>✓ Foto personal ya enviada anteriormente</p>
                  )}
                </div>

                {/* Documentos de identidad */}
                <div className="verif-docs-upload">
                  <label>📄 Documentos de Identidad (CI/Pasaporte)</label>
                  <p className="verif-hint">Sube fotos de tu documento: Anverso y Reverso. Las imágenes se comprimen automáticamente.</p>
                  <input type="file" accept="image/*" multiple id="id-input" style={{ display: 'none' }} onChange={handleIdentityFiles} />
                  <label htmlFor="id-input" className="btn btn-secondary verif-upload-btn">
                    {identityFiles.length > 0 ? 'Cambiar documentos' : 'Seleccionar documentos'} ({identityFiles.length})
                  </label>
                  {identityFiles.length > 0 && (
                    <div className="verif-preview-grid">
                      {identityFiles.map((f, i) => (
                        <div key={i} className="verif-preview-item">
                          <img src={URL.createObjectURL(f)} alt="preview" />
                          <button className="verif-preview-remove" onClick={() => removeIdentityFile(i)} title="Eliminar">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* VERIFICACIÓN DE NEGOCIO */}
        {isShopOrWholesale && (
          <div className={`verif-layer ${businessVerified ? 'verified' : ''}`}>
            <div className="layer-header">
              <h3>🏪 Verificación de Negocio</h3>
              <span className={`layer-status ${businessVerified ? 'approved' : ''}`}>
                {businessVerified ? '✓ Verificada' : '✗ Pendiente'}
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
                      <button className="verif-preview-remove" onClick={() => removeBusinessFile(i)} title="Eliminar">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TIPO DE CUENTA */}
        <div className="verif-layer account-type-layer">
          <div className="layer-header">
            <h3>🔁 Tipo de Cuenta</h3>
          </div>
          <div className="layer-content">
            <p className="verif-hint">
              Cambiar tu tipo de cuenta reinicia la verificación de negocio. Tu identidad personal no se ve afectada.
            </p>
            <div className="type-change-options">
              {ACCOUNT_TYPES.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleChangeType(opt.value)}
                  disabled={changingType || userType === opt.value}
                  className={userType === opt.value ? 'active' : ''}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="verif-footer">
        {verificationRequest?.admin_note && (
          <div className="admin-note">
            <strong>Nota del administrador:</strong> {verificationRequest.admin_note}
          </div>
        )}
        {fileError && <p className="verif-error">{fileError}</p>}
        {comprError && <p className="verif-error">{comprError}</p>}
        <button className="btn btn-primary btn-full" onClick={handleSubmitVerification} disabled={identityLocked || uploadingDocs || (!identityFiles.length && !businessFiles.length && !selfieFiles.length)}>
          {uploadingDocs ? 'Enviando...' : identityLocked ? 'Tu identidad está bloqueada por el administrador' : 'Enviar Solicitud de Verificación'}
        </button>
        {verifSaved && <p className="success-msg">✓ Solicitud enviada con éxito. El equipo revisará tus documentos pronto.</p>}
      </div>
    </div>
  )
}
