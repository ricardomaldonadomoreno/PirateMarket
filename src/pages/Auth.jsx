import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import './Auth.css'

export default function Auth() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState('login') // 'login' or 'signup'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null) // NUEVO
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    display_name: '',
    whatsapp: '',
    user_type: 'person'
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError(null)
    setSuccess(null) // NUEVO
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      })

      if (error) {
        // Email no confirmado
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Debes confirmar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.')
        }
        throw error
      }

      // Redirect to where they came from or dashboard
      const from = location.state?.from?.pathname || '/dashboard'
      navigate(from)
    } catch (err) {
      console.error('Login error:', err)
      setError(err.message || t('auth.error_login'))
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    // Validation
    if (!formData.display_name || formData.display_name.length < 2) {
      setError(t('auth.error_name'))
      setLoading(false)
      return
    }

    if (!formData.whatsapp || formData.whatsapp.length < 8) {
      setError(t('auth.error_whatsapp'))
      setLoading(false)
      return
    }

    try {
      // 1. Create auth user (con confirmación por email)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            display_name: formData.display_name,
            whatsapp: formData.whatsapp,
            user_type: formData.user_type
          },
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      })

      if (authError) throw authError

      // 2. Crear perfil en tabla users (se hará automáticamente con trigger)
      // PERO solo si el email NO requiere confirmación
      // Si requiere confirmación, el perfil se crea cuando confirme el email

      // Mostrar mensaje de éxito
      setSuccess(
        'Cuenta creada exitosamente! 🎉 Revisa tu email para confirmar tu cuenta.'
      )
      
      // Limpiar formulario
      setFormData({
        email: '',
        password: '',
        display_name: '',
        whatsapp: '',
        user_type: 'person'
      })

      // NO redirigir, quedarse en la página para que vea el mensaje
      
    } catch (err) {
      console.error('Signup error:', err)
      setError(err.message || t('auth.error_signup'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth">
      <div className="auth-container">
        <div className="auth-card">
          {/* Logo */}
          <div className="auth-logo">
            <img src="/logo - ico.png" alt="Pirata Market" className="auth-logo-icon" />
            <h1 className="serif luxury-gold">pirata</h1>
            <p className="auth-tagline">{t('brand.tagline')}</p>
          </div>

          {/* Tabs */}
          <div className="auth-tabs">
            <button
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => {
                setMode('login')
                setError(null)
                setSuccess(null)
              }}
            >
              {t('auth.login')}
            </button>
            <button
              className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => {
                setMode('signup')
                setError(null)
                setSuccess(null)
              }}
            >
              {t('auth.signup')}
            </button>
          </div>

          {/* Success Message */}
          {success && (
            <div className="auth-success">
              ✅ {success}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="auth-error">
              ⚠️ {error}
            </div>
          )}

          {/* Login Form */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="auth-form">
              <div className="form-group">
                <label>{t('auth.email')}</label>
                <input
                  type="email"
                  name="email"
                  className="input"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>{t('auth.password')}</label>
                <input
                  type="password"
                  name="password"
                  className="input"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="loading"></span>
                    {t('auth.logging_in')}
                  </>
                ) : (
                  t('auth.login')
                )}
              </button>
            </form>
          )}

          {/* Signup Form */}
          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="auth-form">
              <div className="form-group">
                <label>{t('auth.display_name')} *</label>
                <input
                  type="text"
                  name="display_name"
                  className="input"
                  placeholder={t('auth.display_name')}
                  value={formData.display_name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>{t('auth.whatsapp')} *</label>
                <input
                  type="tel"
                  name="whatsapp"
                  className="input"
                  placeholder="+591 7XXXXXXX"
                  value={formData.whatsapp}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>{t('auth.account_type')}</label>
                <select
                  name="user_type"
                  className="input select"
                  value={formData.user_type}
                  onChange={handleInputChange}
                >
                  <option value="person">👤 {t('auth.person')}</option>
                  <option value="shop">🏪 {t('auth.shop')}</option>
                  <option value="wholesale">📦 {t('auth.wholesale')}</option>
                </select>
              </div>

              <div className="form-group">
                <label>{t('auth.email')} *</label>
                <input
                  type="email"
                  name="email"
                  className="input"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>{t('auth.password')} *</label>
                <input
                  type="password"
                  name="password"
                  className="input"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  minLength={6}
                />
                <p className="form-hint">{t('auth.password_hint')}</p>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="loading"></span>
                    {t('auth.signing_up')}
                  </>
                ) : (
                  t('auth.signup')
                )}
              </button>
            </form>
          )}

          {/* Pirate Notice */}
          <div className="auth-notice">
            <p>🏴‍☠️ {t('auth.pirate_notice')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
