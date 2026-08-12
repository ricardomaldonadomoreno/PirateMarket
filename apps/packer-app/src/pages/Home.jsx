import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield, Star, Users, Package, Plane, Car, Search,
  MapPin, Calendar, Lock, Scale, FileText, Zap,
  Circle, CircleDot, ShieldCheck, Crown
} from 'lucide-react'
import './Home.css'

const LEVELS = [
  { key: 'basic',  Icon: Circle,    color: '#888888' },
  { key: 'mid',    Icon: CircleDot, color: '#2980B9' },
  { key: 'pro',    Icon: ShieldCheck, color: '#8E44AD' },
  { key: 'elite',  Icon: Crown,     color: '#784212' },
]

const HOW_STEPS = [
  { Icon: Plane, title: 'El viajero publica su ruta', desc: 'Define origen, destino, fecha y espacio disponible. Recibe paquetes en su domicilio verificado.' },
  { Icon: Search, title: 'Tú encuentras y solicitas', desc: 'Busca por ruta y fecha, revisa el perfil y nivel del viajero, y envía tu solicitud con fotos del paquete.' },
  { Icon: Package, title: 'Entrega segura con QR', desc: 'El receptor escanea el QR al recibir. El pago se libera automáticamente. Todo registrado.' },
]

const EARN_PROFILES = [
  {
    Icon: Package,
    title: 'Viajero',
    desc: 'Tienes un viaje programado y espacio libre en tu maleta. Cada paquete que llevas es dinero extra sin esfuerzo adicional.',
    cta: 'Publicar mi viaje',
    route: '/traficante/publicar-viajero'
  },
  {
    Icon: Package,
    title: 'Compactador',
    desc: 'Recibes paquetes en tu domicilio, los consolidas en una caja y los envías. Sin viajar, desde tu casa, con horarios propios.',
    cta: 'Ser compactador',
    route: '/traficante/publicar-compactador'
  },
  {
    Icon: Car,
    title: 'Fletero',
    desc: 'Tienes vehículo y viajas entre ciudades. Llena tu auto o camioneta con carga y convierte cada viaje en un negocio.',
    cta: 'Ofrecer mi vehículo',
    route: '/traficante/publicar-flete'
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

  const heroRef = useFadeIn()
  const earnRef = useFadeIn()
  const howRef = useFadeIn()
  const escrowRef = useFadeIn()
  const levelsRef = useFadeIn()
  const registerRef = useFadeIn()

  const handleSearch = (e) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (origin) params.set('origen', origin)
    if (destination) params.set('destino', destination)
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
              <span className="t-hero-badge-item"><Shield size={14} /> Identidad verificada</span>
              <span className="t-hero-badge-item"><Star size={14} /> Sistema de reputación</span>
              <span className="t-hero-badge-item"><Users size={14} /> Flota comunitaria</span>
            </div>
            <div className="t-hero-actions">
              <button
                className="btn btn-primary t-btn-primary"
                onClick={() => navigate('/traficante/buscar')}
              >
                <Package size={14} /> Quiero enviar algo
              </button>
              <button
                className="btn btn-outline t-btn-outline"
                onClick={() => navigate('/traficante/publicar-viajero')}
              >
                <Plane size={14} /> Ofrecer mi espacio
              </button>
              {!user && (
                <button
                  className="btn btn-ghost t-btn-ghost"
                  onClick={() => navigate('/auth')}
                >
                  <Users size={14} /> Crear cuenta gratis
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
                    <label><MapPin size={13} /> Ciudad de origen</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="Ej: Santa Cruz, Bolivia"
                      value={origin}
                      onChange={e => setOrigin(e.target.value)}
                    />
                  </div>
                  <div className="t-field-hero">
                    <label><MapPin size={13} /> Ciudad de destino</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="Ej: São Paulo, Brasil"
                      value={destination}
                      onChange={e => setDestination(e.target.value)}
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary t-btn-primary t-search-btn-hero">
                  <Search size={14} /> Buscar transportadores
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
            <div className="t-earn-badge"><Zap size={13} /> Para transportadores</div>
            <h2 className="t-section-title">¿Viajas seguido? Cada viaje puede generarte ingresos</h2>
            <p className="t-earn-subtitle">
              Convierte tus viajes, tu vehículo o tu domicilio en una fuente de ingresos.
              Sin jefes, sin horarios fijos, sin inversión inicial.
            </p>
          </div>
          <div className="t-earn-grid">
            {EARN_PROFILES.map((profile) => (
              <div key={profile.title} className="t-earn-card card">
                <div className="t-earn-icon"><profile.Icon size={32} /></div>
                <h3>{profile.title}</h3>
                <p>{profile.desc}</p>
                <button
                  className="btn btn-outline t-btn-outline t-earn-btn"
                  onClick={() => navigate(user ? profile.route : '/auth')}
                >
                  {user ? profile.cta : 'Registrarme y empezar'}
                </button>
              </div>
            ))}
          </div>
          <div className="t-earn-cta">
            <div className="t-earn-cta-text">
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
                <div className="t-step-icon"><step.Icon size={32} /></div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── EVITA SER ESTAFADO (ESCROW) ── */}
      <section className="t-escrow-section" ref={escrowRef}>
        <div className="container">
          <div className="t-escrow-header">
            <h2 className="t-section-title">Evita ser estafado</h2>
            <p className="t-escrow-subtitle">
              Tu dinero nunca llega directamente al transportador. El sistema lo retiene de forma segura hasta que confirmes que todo salió bien.
            </p>
          </div>
          <div className="t-escrow-grid">
            <div className="t-escrow-step">
              <Lock size={24} className="t-escrow-icon" />
              <h4>Depósito seguro</h4>
              <p>Pagas al momento de confirmar el envío. El dinero queda en nuestra cuenta de escrow, no en manos del transportador.</p>
            </div>
            <div className="t-escrow-step">
              <ShieldCheck size={24} className="t-escrow-icon" />
              <h4>Verificación de entrega</h4>
              <p>El receptor escanea un código QR al recibir el paquete. Esto confirma que la entrega se realizó correctamente.</p>
            </div>
            <div className="t-escrow-step">
              <Zap size={24} className="t-escrow-icon" />
              <h4>Liberación automática</h4>
              <p>Una vez confirmada la entrega, el dinero se libera al transportador. Si algo sale mal, se abre una disputa.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── NIVELES DE CONFIANZA ── */}
      <section className="t-levels-section" ref={levelsRef}>
        <div className="container">
          <h2 className="t-section-title text-center">Niveles de confianza</h2>
          <p className="t-levels-intro">Cada transportador asciende de nivel al completar verificaciones. Más verificaciones = más confianza.</p>
          <div className="t-levels-grid">
            {LEVELS.map(level => (
              <div key={level.key} className="t-level-card card">
                <level.Icon size={24} className="t-level-icon-svg" style={{ color: level.color }} />
                <h4 style={{ color: level.color }}>
                  {level.key === 'basic' ? 'Básico' : level.key === 'mid' ? 'Medio' : level.key === 'pro' ? 'PRO' : 'Elite'}
                </h4>
                <p>
                  {level.key === 'basic' && 'Identidad y dirección verificadas.'}
                  {level.key === 'mid' && 'Garantía por artículo y escrow habilitado.'}
                  {level.key === 'pro' && 'Domicilio verificado. Rutas frecuentes.'}
                  {level.key === 'elite' && 'Verificado en dos países. Agente de logística.'}
                </p>
              </div>
            ))}
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
                  <Zap size={14} /> Crear cuenta gratis
                </button>
                <button
                  className="btn btn-outline t-btn-outline"
                  onClick={() => navigate('/traficante/buscar')}
                >
                  <Search size={14} /> Buscar transportadores
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── FOOTER LEGAL ── */}
      <footer className="t-footer-legal">
        <div className="container">
          <div className="t-footer-legal-content">
            <div className="t-footer-legal-brand">
              <span className="t-footer-legal-name">Packer</span>
              <span className="t-footer-legal-by">by Buses App</span>
            </div>
            <div className="t-footer-legal-right">
              <p className="t-footer-legal-text"><Scale size={13} /> Cada viajero es responsable de cumplir la legislación aduanera del país de destino.</p>
              <button
                className="t-footer-legal-link"
                onClick={() => navigate('/traficante/legal')}
              >
                <FileText size={12} /> Aviso legal completo
              </button>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
