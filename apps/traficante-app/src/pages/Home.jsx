import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import './Home.css'

const LEVELS = [
  { key: 'basic',  icon: '⚪', color: '#888888' },
  { key: 'mid',    icon: '🔵', color: '#2980B9' },
  { key: 'pro',    icon: '🟣', color: '#8E44AD' },
  { key: 'elite',  icon: '🟤', color: '#784212' },
]

const HOW_STEPS = [
  { icon: '✈️', title: 'El viajero publica su ruta', desc: 'Define origen, destino, fecha y espacio disponible. Recibe paquetes en su domicilio verificado.' },
  { icon: '📦', title: 'Tú encuentras y solicitas', desc: 'Busca por ruta y fecha, revisa el perfil y nivel del viajero, y envía tu solicitud con fotos del paquete.' },
  { icon: '📲', title: 'Entrega segura con QR', desc: 'El receptor escanea el QR al recibir. El pago se libera automáticamente. Todo registrado.' },
]

const EARN_PROFILES = [
  {
    icon: '🧳',
    title: 'Viajero',
    desc: 'Tienes un viaje programado y espacio libre en tu maleta. Cada paquete que llevas es dinero extra sin esfuerzo adicional.',
    cta: 'Publicar mi viaje',
    route: '/traficante/publicar-viaje'
  },
  {
    icon: '📦',
    title: 'Compactador',
    desc: 'Recibes paquetes en tu domicilio, los consolidas en una caja y los envías. Sin viajar, desde tu casa, con horarios propios.',
    cta: 'Ser compactador',
    route: '/traficante/publicar-viaje'
  },
  {
    icon: '🚗',
    title: 'Fletero',
    desc: 'Tienes vehículo y viajas entre ciudades. Llena tu auto o camioneta con carga y convierte cada viaje en un negocio.',
    cta: 'Ofrecer mi vehículo',
    route: '/traficante/publicar-viaje'
  },
]

/* ── Fade-in on scroll (ponytail: CSS puro, sin librerías) ── */
function useFadeIn() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('fade-in-visible'); obs.disconnect() } },
      { threshold: 0.15 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return ref
}

export default function TraficanteHome({ user }) {
  const navigate = useNavigate()
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [date, setDate] = useState('')

  const heroRef = useFadeIn()
  const earnRef = useFadeIn()
  const howRef = useFadeIn()
  const levelsRef = useFadeIn()
  const guaranteeRef = useFadeIn()
  const registerRef = useFadeIn()

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

      {/* ── HERO SPLIT ── */}
      <section className="t-hero" ref={heroRef}>
        <div className="container t-hero-split">

          {/* ── Izquierda: Descriptivo ── */}
          <div className="t-hero-left">
            <h1 className="t-hero-title">
              Viajeros que transportan tu mercadería
            </h1>
            <p className="t-hero-subtitle">
              Conectamos viajeros con <span className="highlight">espacio en su equipaje</span> y personas que necesitan enviar. Sin couriers, sin burocracia, con garantías reales.
            </p>
            <div className="t-hero-badges">
              <span className="t-hero-badge-item">🛡️ Identidad verificada</span>
              <span className="t-hero-badge-item">⭐ Sistema de reputación</span>
              <span className="t-hero-badge-item">🚐 Flota comunitaria</span>
            </div>
            <div className="t-hero-actions">
              <button
                className="btn btn-primary t-btn-primary"
                onClick={() => navigate('/traficante/buscar')}
              >
                📦 Quiero enviar algo
              </button>
              <button
                className="btn btn-outline t-btn-outline"
                onClick={() => navigate('/traficante/publicar-viaje')}
              >
                ✈️ Ofrecer mi espacio
              </button>
              {!user && (
                <button
                  className="btn btn-ghost t-btn-ghost"
                  onClick={() => navigate('/auth')}
                >
                  👤 Crear cuenta gratis
                </button>
              )}
            </div>
          </div>

          {/* ── Derecha: Buscador ── */}
          <div className="t-hero-right">
            <div className="t-search-card-hero">
              <form className="t-search-form-hero" onSubmit={handleSearch}>
                <div className="t-hero-search-fields">
                  <div className="t-field-hero">
                    <label>📍 Ciudad de origen</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="Ej: Santa Cruz, Bolivia"
                      value={origin}
                      onChange={e => setOrigin(e.target.value)}
                    />
                  </div>
                  <div className="t-field-hero">
                    <label>🎯 Ciudad de destino</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="Ej: São Paulo, Brasil"
                      value={destination}
                      onChange={e => setDestination(e.target.value)}
                    />
                  </div>
                  <div className="t-field-hero">
                    <label>📅 Fecha estimada</label>
                    <input
                      className="input"
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary t-btn-primary t-search-btn-hero">
                  🔍 Buscar transportadores
                </button>
              </form>
            </div>
          </div>

        </div>
      </section>

      {/* ── GANA DINERO ── */}
      <section className="t-earn-section" ref={earnRef}>
        <div className="container">
          <div className="t-earn-header">
            <div className="t-earn-badge">💰 Para transportadores</div>
            <h2 className="t-section-title">¿Viajas seguido? Cada viaje puede generarte ingresos</h2>
            <p className="t-earn-subtitle">
              Convierte tus viajes, tu vehículo o tu domicilio en una fuente de ingresos.
              Sin jefes, sin horarios fijos, sin inversión inicial.
            </p>
          </div>
          <div className="t-earn-grid">
            {EARN_PROFILES.map((profile) => (
              <div key={profile.title} className="t-earn-card card">
                <div className="t-earn-icon">{profile.icon}</div>
                <h3>{profile.title}</h3>
                <p>{profile.desc}</p>
                <button
                  className="btn btn-outline t-btn-outline t-earn-btn"
                  onClick={() => navigate(user ? profile.route : '/auth')}
                >
                  {user ? profile.cta : '→ Registrarme y empezar'}
                </button>
              </div>
            ))}
          </div>
          <div className="t-earn-cta">
            <div className="t-earn-cta-text">
              <span>🏴‍☠️</span>
              <p>Somos competencia directa de las empresas de paquetería. La diferencia: <strong>el dinero va a las personas, no a las corporaciones.</strong></p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ── */}
      <section className="t-how-section" ref={howRef}>
        <div className="container">
          <h2 className="t-section-title text-center">¿Cómo funciona?</h2>
          <div className="t-steps-grid">
            {HOW_STEPS.map((step, i) => (
              <div key={i} className="t-step-card card">
                <div className="t-step-number">{i + 1}</div>
                <div className="t-step-icon">{step.icon}</div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NIVELES ── */}
      <section className="t-levels-section" ref={levelsRef}>
        <div className="container">
          <h2 className="t-section-title text-center">Niveles de confianza</h2>
          <div className="t-levels-grid">
            {LEVELS.map(level => (
              <div key={level.key} className="t-level-card card">
                <div className="t-level-icon" style={{ color: level.color }}>
                  {level.icon}
                </div>
                <h4 style={{ color: level.color }}>
                  {level.key === 'basic' ? 'Básico' : level.key === 'mid' ? 'Medio' : level.key === 'pro' ? 'PRO' : 'Elite'}
                </h4>
                <p>
                  {level.key === 'basic' && 'Identidad y dirección verificadas. Ideal para paquetes de bajo valor.'}
                  {level.key === 'mid' && 'Agrega garantía por artículo y escrow. Puede comprar por encargo.'}
                  {level.key === 'pro' && 'Oficina o domicilio habilitado. Rutas frecuentes. Paquetes de valor medio-alto.'}
                  {level.key === 'elite' && 'Dirección verificada en dos países. Máxima confianza. Agente de logística.'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GARANTÍA ── */}
      <section className="t-guarantee-section" ref={guaranteeRef}>
        <div className="container">
          <div className="t-guarantee-card">
            <div className="t-guarantee-icon">🔒</div>
            <div>
              <h3>Tu dinero siempre protegido</h3>
              <p>El pago queda en escrow hasta que el receptor confirma la entrega. Nadie puede quedarse con tu dinero.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── REGISTRO CTA ── */}
      {!user && (
        <section className="t-register-section" ref={registerRef}>
          <div className="container">
            <div className="t-register-card">
              <h2>¿Listo para empezar?</h2>
              <p>Crea tu cuenta gratis y empieza a enviar o a ganar dinero hoy mismo.</p>
              <div className="t-register-actions">
                <button
                  className="btn btn-primary t-btn-primary"
                  onClick={() => navigate('/auth')}
                >
                  🚀 Crear cuenta gratis
                </button>
                <button
                  className="btn btn-outline t-btn-outline"
                  onClick={() => navigate('/traficante/buscar')}
                >
                  🔍 Buscar transportadores
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── FOOTER LEGAL ── */}
      <footer className="t-footer-legal">
        <div className="container">
          <p className="t-footer-legal-text">⚖️ Cada viajero es responsable de cumplir la legislación aduanera del país de destino. Traficante no fomenta ni se hace responsable por el transporte de artículos ilegales.</p>
          <button
            className="t-footer-legal-link"
            onClick={() => navigate('/traficante/legal')}
          >
            📄 Aviso legal completo
          </button>
        </div>
      </footer>

    </div>
  )
}
