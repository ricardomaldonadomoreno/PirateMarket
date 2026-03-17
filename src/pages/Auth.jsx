import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import './Auth.css'

export default function Auth() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState('login') // 'login', 'signup', or 'email_sent'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [userEmail, setUserEmail] = useState('')
  const [showPassword, setShowPassword] = useState(false) // NUEVO
  
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
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      })

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          setError(t('auth.email_not_confirmed'))
          setLoading(false)
          return
        }
        throw error
      }

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

      setUserEmail(formData.email)
      setMode('email_sent')
      
      setFormData({
        email: '',
        password: '',
        display_name: '',
        whatsapp: '',
        user_type: 'person'
      })
      
    } catch (err) {
      console.error('Signup error:', err)
      setError(err.message || t('auth.error_signup'))
    } finally {
      setLoading(false)
    }
  }

  const handleResendEmail = async () => {
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: userEmail
      })

      if (error) throw error

      alert('Email reenviado! Revisa tu bandeja de entrada.')
    } catch (err) {
      console.error('Resend error:', err)
      setError('Error al reenviar email')
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

          {/* EMAIL SENT SCREEN */}
          {mode === 'email_sent' && (
            <div className="email-sent">
              <div className="email-sent-icon">📧</div>
              <h2>{t('auth.email_sent_title')}</h2>
              <p className="email-sent-message">
                {t('auth.email_sent_message')} <strong>{userEmail}</strong>
              </p>
              
              <div className="email-sent-steps">
                <div className="step">
                  <span className="step-number">1</span>
                  <p>{t('auth.step_1')}</p>
                </div>
                <div className="step">
                  <span className="step-number">2</span>
                  <p>{t('auth.step_2')}</p>
                </div>
                <div className="step">
                  <span className="step-number">3</span>
                  <p>{t('auth.step_3')}</p>
                </div>
              </div>

              <button
                onClick={handleResendEmail}
                className="btn btn-secondary btn-full"
                disabled={loading}
                style={{ marginTop: '20px' }}
              >
                {loading ? t('auth.resending') : t('auth.resend_email')}
              </button>

              <button
                onClick={() => setMode('login')}
                className="btn-text"
                style={{ marginTop: '10px', width: '100%', textAlign: 'center' }}
              >
                {t('auth.back_to_login')}
              </button>
            </div>
          )}

          {/* TABS */}
          {mode !== 'email_sent' && (
            <>
              <div className="auth-tabs">
                <button
                  className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
                  onClick={() => {
                    setMode('login')
                    setError(null)
                    setShowPassword(false)
                  }}
                >
                  {t('auth.login')}
                </button>
                <button
                  className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
                  onClick={() => {
                    setMode('signup')
                    setError(null)
                    setShowPassword(false)
                  }}
                >
                  {t('auth.signup')}
                </button>
              </div>

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
                    <div className="password-input-wrapper">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        className="input"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      >
                        {showPassword ? '👁️' : '👁️‍🗨️'}
                      </button>
                    </div>
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
                    <div className="password-input-wrapper">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        className="input"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      >
                        {showPassword ? '👁️' : '👁️‍🗨️'}
                      </button>
                    </div>
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
