import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import './Home.css'

const LEVELS = [
  { key: 'basic',  icon: '⚪', color: '#888888' },
  { key: 'mid',    icon: '🔵', color: '#2980B9' },
  { key: 'pro',    icon: '🟣', color: '#8E44AD' },
  { key: 'elite',  icon: '🟤', color: '#784212' },
]

const HOW_STEPS = [
  { icon: '✈️', key: 'step1' },
  { icon: '📦', key: 'step2' },
  { icon: '📲', key: 'step3' },
]

export default function TraficanteHome({ user }) {
  const { t } = useTranslation('traficante')
  const navigate = useNavigate()
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [date, setDate] = useState('')

  const handleSearch = (e) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (origin) params.set('origen', origin)
    if (destination) params.set('destino', destination)
    if (date) params.set('fecha', date)
    navigate(`/traficante/buscar?${params.toString()}`)
  }

  return (
    <div className="traficante-home">

      {/* ── HERO ── */}
      <section className="t-hero">
        <div className="container">
          <div className="t-hero-badge">
            <span>🚐</span>
            <span>{t('brand.by')}</span>
          </div>
          <h1 className="t-hero-title">
            {t('home.hero_title')}
          </h1>
          <p className="t-hero-subtitle">
            {t('home.hero_subtitle')}
          </p>
          <div className="t-hero-actions">
            <button
              className="btn btn-primary t-btn-primary"
              onClick={() => navigate('/traficante/buscar')}
            >
              📦 {t('home.btn_send')}
            </button>
            <button
              className="btn btn-outline t-btn-outline"
              onClick={() => navigate('/traficante/publicar-viaje')}
            >
              ✈️ {t('home.btn_travel')}
            </button>
          </div>
        </div>
        <div className="t-hero-glow" />
      </section>

      {/* ── BUSCADOR ── */}
      <section className="t-search-section">
        <div className="container">
          <div className="t-search-card">
            <h2 className="t-section-title">{t('home.search_title')}</h2>
            <form className="t-search-form" onSubmit={handleSearch}>
              <div className="t-search-fields">
                <div className="t-field">
                  <label>📍 {t('home.origin')}</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="Ej: Santa Cruz, Bolivia"
                    value={origin}
                    onChange={e => setOrigin(e.target.value)}
                  />
                </div>
                <div className="t-field-arrow">→</div>
                <div className="t-field">
                  <label>🎯 {t('home.destination')}</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="Ej: São Paulo, Brasil"
                    value={destination}
                    onChange={e => setDestination(e.target.value)}
                  />
                </div>
                <div className="t-field">
                  <label>📅 {t('home.date')}</label>
                  <input
                    className="input"
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary t-btn-primary t-search-btn">
                🔍 {t('home.btn_search')}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ── */}
      <section className="t-how-section">
        <div className="container">
          <h2 className="t-section-title text-center">{t('home.how_title')}</h2>
          <div className="t-steps-grid">
            {HOW_STEPS.map((step, i) => (
              <div key={step.key} className="t-step-card card">
                <div className="t-step-number">{i + 1}</div>
                <div className="t-step-icon">{step.icon}</div>
                <h3>{t(`home.${step.key}_title`)}</h3>
                <p>{t(`home.${step.key}_desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NIVELES ── */}
      <section className="t-levels-section">
        <div className="container">
          <h2 className="t-section-title text-center">{t('home.levels_title')}</h2>
          <div className="t-levels-grid">
            {LEVELS.map(level => (
              <div key={level.key} className="t-level-card card">
                <div className="t-level-icon" style={{ color: level.color }}>
                  {level.icon}
                </div>
                <h4 style={{ color: level.color }}>{t(`home.level_${level.key}`)}</h4>
                <p>{t(`home.level_${level.key}_desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GARANTÍA ── */}
      <section className="t-guarantee-section">
        <div className="container">
          <div className="t-guarantee-card">
            <div className="t-guarantee-icon">🔒</div>
            <div>
              <h3>{t('home.guarantee_title')}</h3>
              <p>{t('home.guarantee_desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── AVISO LEGAL ── */}
      <section className="t-legal-section">
        <div className="container">
          <p className="t-legal-text">⚖️ {t('home.legal_note')}</p>
        </div>
      </section>

    </div>
  )
}
