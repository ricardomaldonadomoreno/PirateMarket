import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  Camera, Trash2, Lock, Eye, EyeOff, AlertTriangle,
  User, ShieldCheck, Mail, Phone, ShieldAlert, LogOut, Globe, Pencil, Check
} from 'lucide-react'
import './MiPerfil.css'

const USER_TYPE_LABELS = {
  person:    { label: 'Persona',    color: 'var(--text-muted)' },
  shop:      { label: 'Tienda',     color: 'var(--gold)' },
  wholesale: { label: 'Mayorista',  color: '#2980B9' },
  admin:     { label: 'Admin',      color: 'var(--danger)' },
}

const TRAFICANTE_LEVEL_LABELS = {
  basico: { label: 'Básico', color: 'var(--text-muted)' },
  medio:  { label: 'Medio',  color: '#2980B9' },
  pro:    { label: 'PRO',    color: '#8E44AD' },
  elite:  { label: 'Elite',  color: '#784212' },
}

export default function MiPerfil({ user, onProfileUpdate }) {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [trafLevel, setTrafLevel] = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [savedName, setSavedName] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!user) return navigate('/auth')
    loadProfile()
  }, [user])

  const loadProfile = async () => {
    setLoading(true)
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('display_name, avatar_url, whatsapp, user_type, country')
        .eq('id', user.id)
        .single()
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

  // ── ELIMINAR CUENTA ──
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'ELIMINAR') return
    setDeleting(true)
    try {
      // Verificar si ya hay una solicitud pendiente
      const { data: existingReq } = await supabase
        .from('deletion_requests')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .single()
      if (existingReq) {
        setError('Ya tienes una solicitud de eliminación pendiente. El administrador la revisará pronto.')
        setDeleting(false)
        return
      }
      // Enviar solicitud de eliminación al admin
      const { error: insertError } = await supabase
        .from('deletion_requests')
        .insert({ user_id: user.id, status: 'pending' })
      if (insertError) throw insertError
      setShowDeleteConfirm(false)
      setDeleteConfirmText('')
      setError('Solicitud de eliminación enviada. El administrador la revisará y responderá pronto.')
    } catch (err) {
      setError('Error al enviar la solicitud: ' + (err.message || err))
    }
    setDeleting(false)
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
            <h1>Perfil Público</h1>
            <p>Tu información visible para otros usuarios en las aplicaciones.</p>
          </div>

          <div className="mp-body">

            {/* ══ SECCIÓN 1 — DATOS PÚBLICOS ══ */}
            <div className="mp-section">
              <div className="mp-section-header">
                <User size={16} className="mp-section-icon" />
                <span>Datos públicos</span>
              </div>

              <div className="mp-data-public">
                {/* Avatar */}
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

                {/* Nombre + acciones */}
                <div className="mp-data-public-info">
                  <label className="mp-label">Nombre de perfil</label>
                  <p className="mp-hint">Visible públicamente en tus publicaciones.</p>
                  <div className="mp-name-row">
                    <input className="input" value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      placeholder="Ej: Ricardo M."
                      readOnly={!editingName} />
                    {!editingName ? (
                      <button className="mp-icon-btn"
                        onClick={() => setEditingName(true)}
                        title="Editar nombre">
                        <Pencil size={14} />
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn btn-primary mp-save-btn"
                          onClick={() => { setEditingName(false); handleSaveName() }} disabled={savingName}>
                          {savingName
                            ? <span className="loading" style={{ width: 16, height: 16 }} />
                            : <><Check size={14} /> Guardar</>}
                        </button>
                        <button className="btn btn-secondary mp-save-btn"
                          onClick={() => { setEditingName(false); setDisplayName(profile?.display_name || '') }}>
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="mp-avatar-actions">
                    <button className="mp-icon-btn"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      title="Subir foto">
                      <Camera size={14} />
                    </button>
                    {profile?.avatar_url && (
                      <button className="mp-icon-btn mp-icon-btn-danger"
                        onClick={handleDeleteAvatar}
                        disabled={uploadingAvatar}
                        title="Eliminar foto">
                        <Trash2 size={14} />
                      </button>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*"
                      style={{ display: 'none' }} onChange={handleAvatarUpload} />
                  </div>
                </div>
              </div>

              {error && <div className="mp-error"><AlertTriangle size={14} /> {error}</div>}
              {savedName && <div className="mp-success">Nombre actualizado</div>}
            </div>

            {/* ══ SECCIÓN 2 — ESTADO EN APPS ══ */}
            <div className="mp-section">
              <div className="mp-section-header">
                <ShieldCheck size={16} className="mp-section-icon" />
                <span>Estado en aplicaciones</span>
              </div>
              <p className="mp-hint">
                Tu categoría y nivel se asignan según tus verificaciones.
              </p>

              <div className="mp-apps-status">
                <div className="mp-app-status-card">
                  <div className="mp-app-status-header">
                    <span className="mp-app-status-name">Pirata Market</span>
                  </div>
                  <div className="mp-app-status-badge"
                    style={{ color: userTypeInfo.color, borderColor: userTypeInfo.color, background: `${userTypeInfo.color}15` }}>
                    {userTypeInfo.label}
                  </div>
                </div>

                <div className="mp-app-status-card">
                  <div className="mp-app-status-header">
                    <span className="mp-app-status-name">Traficante</span>
                  </div>
                  {trafLevelInfo ? (
                    <div className="mp-app-status-badge"
                      style={{ color: trafLevelInfo.color, borderColor: trafLevelInfo.color, background: `${trafLevelInfo.color}15` }}>
                      Nivel {trafLevelInfo.label}
                    </div>
                  ) : (
                    <div className="mp-app-status-badge mp-app-status-none">
                      Sin nivel asignado
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ══ SECCIÓN 3 — DATOS DE ACCESO ══ */}
            <div className="mp-section">
              <div className="mp-section-header">
                <Lock size={16} className="mp-section-icon" />
                <span>Mis datos de acceso</span>
              </div>
              <p className="mp-hint">
                Estos datos no se pueden modificar porque son tus credenciales de acceso a la plataforma.
              </p>

              <div className="mp-access-data">
                <div className="mp-readonly-field">
                  <Mail size={14} />
                  <span>{user.email}</span>
                </div>
                <div className="mp-readonly-field">
                  <Phone size={14} />
                  <span>{profile?.whatsapp || 'No registrado'}</span>
                </div>
                <div className="mp-readonly-field">
                  <Globe size={14} />
                  <span>{profile?.country || 'No registrado'}</span>
                </div>
              </div>
            </div>

            {/* ══ SECCIÓN 4 — SEGURIDAD ══ */}
            <div className="mp-section">
              <div className="mp-section-header">
                <ShieldAlert size={16} className="mp-section-icon" />
                <span>Seguridad</span>
              </div>

              {!showPassword ? (
                <div className="mp-password-row">
                  <div>
                    <div className="mp-label">Contraseña</div>
                    <p className="mp-hint" style={{ marginBottom: 0 }}>Cambia tu contraseña cuando quieras.</p>
                  </div>
                  <button className="btn btn-secondary mp-btn-sm"
                    onClick={() => setShowPassword(true)}>
                    Cambiar contraseña
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
                  {passwordError && <div className="mp-error"><AlertTriangle size={14} /> {passwordError}</div>}
                  {passwordSaved && <div className="mp-success">Contraseña actualizada correctamente</div>}
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
                        : 'Actualizar'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ══ SECCIÓN 5 — ELIMINAR CUENTA ══ */}
            <div className="mp-section mp-danger-zone">
              <div className="mp-section-header mp-danger-header">
                <LogOut size={16} />
                <span>Eliminar cuenta</span>
              </div>
              <p className="mp-hint">
                Al eliminar tu cuenta se borrarán permanentemente todos tus datos, publicaciones y verificaciones. Esta acción no se puede deshacer, conforme a políticas internacionales de protección de datos.
              </p>

              {!showDeleteConfirm ? (
                <button className="btn btn-ghost mp-btn-danger-text"
                  onClick={() => setShowDeleteConfirm(true)}>
                  <AlertTriangle size={14} />
                  Solicitar eliminación de cuenta
                </button>
              ) : (
                <div className="mp-delete-confirm">
                  <p className="mp-delete-warning">
                    Escribe <strong>ELIMINAR</strong> para solicitar la eliminación:
                  </p>
                  <input className="input mp-delete-input"
                    value={deleteConfirmText}
                    onChange={e => setDeleteConfirmText(e.target.value)}
                    placeholder="Escribe ELIMINAR" />
                  <div className="mp-delete-actions">
                    <button className="btn btn-secondary mp-btn-sm"
                      onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText('') }}>
                      Cancelar
                    </button>
                    <button className="btn btn-danger mp-btn-sm"
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirmText !== 'ELIMINAR' || deleting}>
                      {deleting ? <span className="loading" style={{ width: 16, height: 16 }} /> : 'Enviar solicitud'}
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
