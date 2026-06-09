import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './MiPerfil.css'

export default function MiPerfil({ user, onProfileUpdate }) {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [savedName, setSavedName] = useState(false)
  const [error, setError] = useState('')

  // Cambio de contraseña
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
    const { data } = await supabase
      .from('users')
      .select('display_name, avatar_url')
      .eq('id', user.id)
      .single()
    if (data) {
      setProfile(data)
      setDisplayName(data.display_name || '')
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
    if (onProfileUpdate) onProfileUpdate(prev => ({ ...prev, display_name: displayName.trim() }))
    setTimeout(() => setSavedName(false), 3000)
  }

  // ── CONTRASEÑA ──
  const handleChangePassword = async () => {
    setPasswordError('')
    if (!currentPassword || !newPassword || !confirmPassword) {
      return setPasswordError('Completa todos los campos')
    }
    if (newPassword.length < 6) {
      return setPasswordError('La nueva contraseña debe tener al menos 6 caracteres')
    }
    if (newPassword !== confirmPassword) {
      return setPasswordError('Las contraseñas no coinciden')
    }
    setSavingPassword(true)
    try {
      // Verificar contraseña actual re-autenticando
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })
      if (signInError) {
        setSavingPassword(false)
        return setPasswordError('La contraseña actual es incorrecta')
      }
      // Actualizar contraseña
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })
      if (updateError) throw updateError
      setPasswordSaved(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setShowPassword(false)
      setTimeout(() => setPasswordSaved(false), 4000)
    } catch (err) {
      setPasswordError('Error al cambiar la contraseña: ' + err.message)
    }
    setSavingPassword(false)
  }

  if (loading) return (
    <div className="mp-loading">
      <div className="loading" style={{ width: 40, height: 40 }} />
    </div>
  )

  return (
    <div className="mp-container">
      <div className="container">
        <div className="mp-card">

          {/* ── HEADER ── */}
          <div className="mp-header">
            <h1>👤 Mi Perfil</h1>
            <p>Datos básicos de tu cuenta. Accede a cada app para gestionar tu perfil completo.</p>
          </div>

          <div className="mp-body">

            {/* ══ SECCIÓN 1 — FOTO Y NOMBRE ══ */}
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
                  <div className="mp-avatar-name">{displayName || user.email}</div>
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

              {/* Nombre para mostrar */}
              <div className="mp-field">
                <label className="mp-label">Nombre para mostrar</label>
                <p className="mp-hint">Este nombre aparece en ambas apps.</p>
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

              {/* Email — solo lectura */}
              <div className="mp-field">
                <label className="mp-label">Correo electrónico</label>
                <p className="mp-hint">El correo con el que creaste tu cuenta. No se puede cambiar.</p>
                <div className="mp-readonly-field">{user.email}</div>
              </div>
            </div>

            {/* ══ SECCIÓN 2 — CONTRASEÑA ══ */}
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
                      onClick={() => { setShowPassword(false); setPasswordError(''); setCurrentPassword(''); setNewPassword(''); setConfirmPassword('') }}>
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

            {/* ══ SECCIÓN 3 — MIS APPS ══ */}
            <div className="mp-section">
              <div className="mp-section-title">Mis aplicaciones</div>
              <p className="mp-hint">Accede a cada app para gestionar tu perfil completo, verificaciones y actividad.</p>

              <div className="mp-apps-grid">
                <Link to="/dashboard" className="mp-app-card">
                  <div className="mp-app-icon">🏴‍☠️</div>
                  <div className="mp-app-info">
                    <div className="mp-app-name">Pirata Market</div>
                    <div className="mp-app-desc">Gestiona tus anuncios, verificación y catálogo</div>
                  </div>
                  <div className="mp-app-arrow">→</div>
                </Link>

                <Link to="/traficante/mi-cuenta" className="mp-app-card mp-app-traficante">
                  <div className="mp-app-icon">🚐</div>
                  <div className="mp-app-info">
                    <div className="mp-app-name">Traficante</div>
                    <div className="mp-app-desc">Gestiona tu perfil de transportador, dirección y verificación</div>
                  </div>
                  <div className="mp-app-arrow">→</div>
                </Link>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
