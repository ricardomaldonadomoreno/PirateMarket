import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import './Auth.css'

export default function Auth() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [userEmail, setUserEmail] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    display_name: '',
    whatsapp: '',
  })

  // Detectar contexto según de dónde viene
  const fromTraficante = location.state?.from?.pathname?.startsWith('/traficante') ||
    document.referrer.includes('/traficante')

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
      const { error } = await supabase.auth.signInWithPassword({
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
      // Identidad 1: Login exitoso, redirigir según contexto o al perfil público
      const from = location.state?.from?.pathname || '/mi-perfil'
      navigate(from)
    } catch (err) {
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
      // Identidad 1: Solo registrar datos básicos (Email, WhatsApp, Display Name)
      const { error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            display_name: formData.display_name,
            whatsapp: formData.whatsapp,
            user_type: 'person' // Por defecto persona hasta que elija app
          },
          emailRedirectTo: fromTraficante
            ? 'https://pirate-market.vercel.app/traficante/mi-cuenta'
            : 'https://pirate-market.vercel.app/mi-perfil'
        }
      })
      if (authError) throw authError
      setUserEmail(formData.email)
      setMode('email_sent')
      setFormData({ email: '', password: '', display_name: '', whatsapp: '' })
    } catch (err) {
      setError(err.message || t('auth.error_signup'))
    } finally {
      setLoading(false)
    }
  }

  const handleResendEmail = async () => {
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: userEmail })
      if (error) throw error
      alert('Email reenviado! Revisa tu bandeja de entrada.')
    } catch (err) {
      setError('Error al reenviar email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth">
      <div className="auth-container">
        <div className="auth-card">

          {/* ── LOGO BUSES APP ── */}
          <div className="auth-logo">
            <div className="auth-buses-logo">
              <img src="/buses/logo.png" alt="Buses App" className="auth-buses-app-logo" />
              <h1 className="auth-buses-title">Buses App</h1>
            </div>
            <p className="auth-tagline">Módulos de transporte</p>
            <div className="auth-apps-badges">
              <div className="auth-app-badge">
                <img src="/logo-ico.png" alt="Pirata Market" className="auth-app-badge-logo" />
                <span>Pirata Market</span>
              </div>
              <div className="auth-app-badge-sep">·</div>
              <div className="auth-app-badge">
                <img src="/traficante/logoPNG.png" alt="Traficante" className="auth-app-badge-logo" />
                <span>Traficante</span>
              </div>
            </div>
          </div>

          {/* ── EMAIL SENT ── */}
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
              <button onClick={handleResendEmail} className="btn btn-secondary btn-full"
                disabled={loading} style={{ marginTop: '20px' }}>
                {loading ? t('auth.resending') : t('auth.resend_email')}
              </button>
              <button onClick={() => setMode('login')} className="btn-text"
                style={{ marginTop: '10px', width: '100%', textAlign: 'center' }}>
                {t('auth.back_to_login')}
              </button>
            </div>
          )}

          {/* ── TABS + FORMS ── */}
          {mode !== 'email_sent' && (
            <>
              <div className="auth-tabs">
                <button className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
                  onClick={() => { setMode('login'); setError(null); setShowPassword(false) }}>
                  {t('auth.login')}
                </button>
                <button className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
                  onClick={() => { setMode('signup'); setError(null); setShowPassword(false) }}>
                  {t('auth.signup')}
                </button>
              </div>

              {error && <div className="auth-error">⚠️ {error}</div>}

              {/* LOGIN */}
              {mode === 'login' && (
                <form onSubmit={handleLogin} className="auth-form">
                  <div className="form-group">
                    <label>{t('auth.email')}</label>
                    <input type="email" name="email" className="input"
                      placeholder="tu@email.com" value={formData.email}
                      onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>{t('auth.password')}</label>
                    <div className="password-input-wrapper">
                      <input type={showPassword ? 'text' : 'password'} name="password"
                        className="input" placeholder="••••••••" value={formData.password}
                        onChange={handleInputChange} required minLength={6} />
                      <button type="button" className="password-toggle"
                        onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? '🙉' : '🙈'}
                      </button>
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                    {loading ? <><span className="loading"></span>{t('auth.logging_in')}</> : t('auth.login')}
                  </button>
                </form>
              )}

              {/* SIGNUP */}
              {mode === 'signup' && (
                <form onSubmit={handleSignup} className="auth-form">
                  <div className="form-group">
                    <label>{t('auth.display_name')} *</label>
                    <input type="text" name="display_name" className="input"
                      placeholder={t('auth.display_name')} value={formData.display_name}
                      onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>{t('auth.whatsapp')} *</label>
                    <input type="tel" name="whatsapp" className="input"
                      placeholder="+591 7XXXXXXX" value={formData.whatsapp}
                      onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>{t('auth.email')} *</label>
                    <input type="email" name="email" className="input"
                      placeholder="tu@email.com" value={formData.email}
                      onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>{t('auth.password')} *</label>
                    <div className="password-input-wrapper">
                      <input type={showPassword ? 'text' : 'password'} name="password"
                        className="input" placeholder="••••••••" value={formData.password}
                        onChange={handleInputChange} required minLength={6} />
                      <button type="button" className="password-toggle"
                        onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? '🙉' : '🙈'}
                      </button>
                    </div>
                    <p className="form-hint">{t('auth.password_hint')}</p>
                  </div>
                  <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                    {loading ? <><span className="loading"></span>{t('auth.signing_up')}</> : t('auth.signup')}
                  </button>
                </form>
              )}

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
