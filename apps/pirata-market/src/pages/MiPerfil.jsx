import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './MiPerfil.css'

const USER_TYPE_LABELS = {
  person:    { label: 'Persona',    icon: '👤', color: '#888888' },
  shop:      { label: 'Tienda',     icon: '🏪', color: '#FFB703' },
  wholesale: { label: 'Mayorista',  icon: '📦', color: '#2980B9' },
  admin:     { label: 'Admin',      icon: '🔐', color: '#E63946' },
}

const TRAFICANTE_LEVEL_LABELS = {
  basico: { label: 'Básico', icon: '⚪', color: '#888888' },
  medio:  { label: 'Medio',  icon: '🔵', color: '#2980B9' },
  pro:    { label: 'PRO',    icon: '🟣', color: '#8E44AD' },
  elite:  { label: 'Elite',  icon: '🟤', color: '#784212' },
}

export default function MiPerfil({ user, onProfileUpdate }) {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [trafLevel, setTrafLevel] = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [savedName, setSavedName] = useState(false)
  const [error, setError] = useState('')

  // Contraseña
  const [showPassword, setShowPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSaved, setPasswordSaved] = useState(false)

  useEffect(() => {
    if (!user) return navigate('/auth')
    loadProfile()
  }, [user])

  const loadProfile = async () => {
    setLoading(true)
    try {
      // Datos de users
      const { data: userData } = await supabase
        .from('users')
        .select('display_name, avatar_url, whatsapp, user_type')
        .eq('id', user.id)
        .single()

      // Nivel de Traficante
      const { data: trafData } = await supabase
        .from('traficante_profiles')
        .select('level')
        .eq('id', user.id)
        .single()

      if (userData) {
        setProfile(userData)
        setDisplayName(userData.display_name || '')
      }
      if (trafData) setTrafLevel(trafData.level)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  // ── AVATAR ──
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadingAvatar(true)
    setError('')
    try {
      const fileExt = file.name.split('.').pop()
      const newFilePath = `${user.id}.${fileExt}`
      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/avatars/')[1]?.split('?')[0]
        if (oldPath) await supabase.storage.from('avatars').remove([oldPath])
      }
      const { error: uploadError } = await supabase.storage
        .from('avatars').upload(newFilePath, file, { upsert: true, contentType: file.type })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(newFilePath)
      const urlWithCache = `${publicUrl}?t=${Date.now()}`
      await supabase.from('users').update({ avatar_url: urlWithCache }).eq('id', user.id)
      setProfile(prev => ({ ...prev, avatar_url: urlWithCache }))
      if (onProfileUpdate) onProfileUpdate(prev => ({ ...prev, avatar_url: urlWithCache }))
    } catch (err) {
      setError('Error al subir la imagen: ' + err.message)
    }
    setUploadingAvatar(false)
  }

  const handleDeleteAvatar = async () => {
    if (!confirm('¿Eliminar tu foto de perfil?')) return
    setUploadingAvatar(true)
    try {
      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/avatars/')[1]?.split('?')[0]
        if (oldPath) await supabase.storage.from('avatars').remove([oldPath])
      }
      await supabase.from('users').update({ avatar_url: null }).eq('id', user.id)
      setProfile(prev => ({ ...prev, avatar_url: null }))
      if (onProfileUpdate) onProfileUpdate(prev => ({ ...prev, avatar_url: null }))
    } catch (err) {
      setError('Error al eliminar la foto')
    }
    setUploadingAvatar(false)
  }

  // ── NOMBRE ──
  const handleSaveName = async () => {
    if (!displayName.trim()) return setError('El nombre no puede estar vacío')
    setSavingName(true)
    setError('')
    const { error: err } = await supabase
      .from('users')
      .update({ display_name: displayName.trim() })
      .eq('id', user.id)
    setSavingName(false)
    if (err) return setError(err.message)
    setSavedName(true)
    setProfile(prev => ({ ...prev, display_name: displayName.trim() }))
    if (onProfileUpdate) onProfileUpdate(prev => ({ ...prev, display_name: displayName.trim() }))
    setTimeout(() => setSavedName(false), 3000)
  }

  // ── CONTRASEÑA ──
  const handleChangePassword = async () => {
    setPasswordError('')
    if (!currentPassword || !newPassword || !confirmPassword)
      return setPasswordError('Completa todos los campos')
    if (newPassword.length < 6)
      return setPasswordError('La nueva contraseña debe tener al menos 6 caracteres')
    if (newPassword !== confirmPassword)
      return setPasswordError('Las contraseñas no coinciden')
    setSavingPassword(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })
      if (signInError) {
        setSavingPassword(false)
        return setPasswordError('La contraseña actual es incorrecta')
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) throw updateError
      setPasswordSaved(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setShowPassword(false)
      setTimeout(() => setPasswordSaved(false), 4000)
    } catch (err) {
      setPasswordError('Error: ' + err.message)
    }
    setSavingPassword(false)
  }

  const userTypeInfo = USER_TYPE_LABELS[profile?.user_type] || USER_TYPE_LABELS['person']
  const trafLevelInfo = TRAFICANTE_LEVEL_LABELS[trafLevel] || null

  if (loading) return (
    <div className="mp-loading">
      <div className="loading" style={{ width: 40, height: 40 }} />
    </div>
  )

  return (
    <div className="mp-container">
      <div className="container">
        <div className="mp-card">

          <div className="mp-header">
            <h1>👤 Mi Perfil</h1>
            <p>Gestiona tu identidad y configuración de cuenta.</p>
          </div>

          <div className="mp-body">

            {/* ══ SECCIÓN 1 — IDENTIDAD ══ */}
            <div className="mp-section">
              <div className="mp-section-title">Identidad</div>

              {/* Avatar */}
              <div className="mp-avatar-row">
                <div className="mp-avatar-wrap">
                  {profile?.avatar_url
                    ? <img src={profile.avatar_url} alt="avatar" className="mp-avatar" />
                    : <div className="mp-avatar-placeholder">
                        {(displayName || user.email)?.charAt(0).toUpperCase()}
                      </div>
                  }
                  {uploadingAvatar && (
                    <div className="mp-avatar-overlay">
                      <span className="loading" style={{ width: 20, height: 20 }} />
                    </div>
                  )}
                </div>
                <div className="mp-avatar-info">
                  <div className="mp-avatar-name">{displayName || user.email?.split('@')[0]}</div>
                  <div className="mp-avatar-email">{user.email}</div>
                  <div className="mp-avatar-btns">
                    <button className="btn btn-secondary mp-btn-sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}>
                      📷 {profile?.avatar_url ? 'Cambiar foto' : 'Subir foto'}
                    </button>
                    {profile?.avatar_url && (
                      <button className="btn btn-ghost mp-btn-sm mp-btn-danger"
                        onClick={handleDeleteAvatar}
                        disabled={uploadingAvatar}>
                        🗑️ Eliminar
                      </button>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*"
                      style={{ display: 'none' }} onChange={handleAvatarUpload} />
                  </div>
                </div>
              </div>

              {/* Nombre */}
              <div className="mp-field">
                <label className="mp-label">Nombre de perfil</label>
                <p className="mp-hint">Este nombre se usa para publicar en ambas apps.</p>
                <div className="mp-field-row">
                  <input className="input" value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Ej: Ricardo M." />
                  <button className="btn btn-primary mp-save-btn"
                    onClick={handleSaveName} disabled={savingName}>
                    {savingName
                      ? <span className="loading" style={{ width: 16, height: 16 }} />
                      : '💾 Guardar'}
                  </button>
                </div>
                {error && <div className="mp-error">⚠️ {error}</div>}
                {savedName && <div className="mp-success">✅ Nombre actualizado</div>}
              </div>

              {/* Email */}
              <div className="mp-field">
                <label className="mp-label">Correo electrónico</label>
                <p className="mp-hint">El correo con el que creaste tu cuenta.</p>
                <div className="mp-readonly-field">
                  <span>✉️</span>
                  <span>{user.email}</span>
                </div>
              </div>

              {/* WhatsApp */}
              <div className="mp-field">
                <label className="mp-label">WhatsApp</label>
                <p className="mp-hint">Número registrado al crear tu cuenta. Para cambiarlo contacta a soporte.</p>
                <div className="mp-readonly-field">
                  <span>📱</span>
                  <span>{profile?.whatsapp || 'No registrado'}</span>
                </div>
              </div>
            </div>

            {/* ══ SECCIÓN 2 — ESTADO EN APPS ══ */}
            <div className="mp-section">
              <div className="mp-section-title">Estado en aplicaciones</div>
              <p className="mp-hint" style={{ marginBottom: '1.25rem' }}>
                Tu categoría y nivel se asignan desde cada app según tus verificaciones.
              </p>

              <div className="mp-apps-status">
                {/* Pirata Market */}
                <div className="mp-app-status-card">
                  <div className="mp-app-status-header">
                    <span className="mp-app-status-logo">🏴‍☠️</span>
                    <span className="mp-app-status-name">Pirata Market</span>
                  </div>
                  <div className="mp-app-status-badge"
                    style={{ color: userTypeInfo.color, borderColor: userTypeInfo.color, background: `${userTypeInfo.color}15` }}>
                    {userTypeInfo.icon} {userTypeInfo.label}
                  </div>
                </div>

                {/* Traficante */}
                <div className="mp-app-status-card">
                  <div className="mp-app-status-header">
                    <span className="mp-app-status-logo">🚐</span>
                    <span className="mp-app-status-name">Traficante</span>
                  </div>
                  {trafLevelInfo ? (
                    <div className="mp-app-status-badge"
                      style={{ color: trafLevelInfo.color, borderColor: trafLevelInfo.color, background: `${trafLevelInfo.color}15` }}>
                      {trafLevelInfo.icon} Nivel {trafLevelInfo.label}
                    </div>
                  ) : (
                    <div className="mp-app-status-badge mp-app-status-none">
                      ⚪ Sin nivel asignado
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ══ SECCIÓN 3 — SEGURIDAD ══ */}
            <div className="mp-section">
              <div className="mp-section-title">Seguridad</div>

              {!showPassword ? (
                <div className="mp-password-row">
                  <div>
                    <div className="mp-label">Contraseña</div>
                    <p className="mp-hint">Cambia tu contraseña cuando quieras.</p>
                  </div>
                  <button className="btn btn-secondary mp-btn-sm"
                    onClick={() => setShowPassword(true)}>
                    🔑 Cambiar contraseña
                  </button>
                </div>
              ) : (
                <div className="mp-password-form">
                  <div className="mp-field">
                    <label className="mp-label">Contraseña actual</label>
                    <input className="input" type="password"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      placeholder="Tu contraseña actual" />
                  </div>
                  <div className="mp-field">
                    <label className="mp-label">Nueva contraseña</label>
                    <input className="input" type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres" />
                  </div>
                  <div className="mp-field">
                    <label className="mp-label">Confirmar nueva contraseña</label>
                    <input className="input" type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Repite la nueva contraseña" />
                  </div>
                  {passwordError && <div className="mp-error">⚠️ {passwordError}</div>}
                  {passwordSaved && <div className="mp-success">✅ Contraseña actualizada correctamente</div>}
                  <div className="mp-password-actions">
                    <button className="btn btn-secondary mp-btn-sm"
                      onClick={() => {
                        setShowPassword(false)
                        setPasswordError('')
                        setCurrentPassword('')
                        setNewPassword('')
                        setConfirmPassword('')
                      }}>
                      Cancelar
                    </button>
                    <button className="btn btn-primary mp-save-btn"
                      onClick={handleChangePassword} disabled={savingPassword}>
                      {savingPassword
                        ? <span className="loading" style={{ width: 16, height: 16 }} />
                        : '🔒 Actualizar contraseña'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ══ SECCIÓN 4 — SOPORTE ══ */}
            <div className="mp-section">
              <div className="mp-section-title">Soporte</div>
              <p className="mp-hint">
                ¿Tienes algún problema con tu cuenta o necesitas ayuda? Escríbenos directamente.
              </p>
              
                href={`mailto:busesapp55@gmail.com?subject=Soporte — ${user.email}`}
                className="mp-support-btn"
              >
                <span className="mp-support-icon">✉️</span>
                <div>
                  <div className="mp-support-label">Contactar soporte</div>
                  <div className="mp-support-email">busesapp55@gmail.com</div>
                </div>
                <span className="mp-support-arrow">→</span>
              </a>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
