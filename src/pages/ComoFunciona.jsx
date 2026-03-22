import { Link } from 'react-router-dom'
import './ComoFunciona.css'

const LANGUAGES = [
  { code: 'en', label: '🇺🇸 English' },
  { code: 'pt', label: '🇧🇷 Português' },
  { code: 'ar', label: '🇸🇦 العربية' },
  { code: 'zh-CN', label: '🇨🇳 中文' },
  { code: 'fr', label: '🇫🇷 Français' },
  { code: 'de', label: '🇩🇪 Deutsch' },
]

export default function ComoFunciona() {

  const translatePage = (langCode) => {
    const url = `https://translate.google.com/translate?sl=es&tl=${langCode}&u=${encodeURIComponent(window.location.href)}`
    window.open(url, '_blank')
  }

  return (
    <div className="como-funciona">
      <div className="cf-container">

        {/* Traducir */}
        <div className="cf-translate">
          <span>🌍 Traducir esta página:</span>
          <div className="cf-translate-btns">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                className="cf-translate-btn"
                onClick={() => translatePage(lang.code)}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Hero */}
        <div className="cf-hero">
          <h1 className="serif luxury-gold">
            <img src="/logo - ico.png" alt="Pirata Market" className="cf-logo" />
            Pirata Market
          </h1>
          <p className="cf-tagline">Comercio sin intermediarios, sin censura, sin algoritmos basura.</p>
        </div>

        {/* Tip de búsqueda */}
        <section className="cf-section cf-search-tip">
          <div className="cf-search-tip-icon">🔍</div>
          <div>
            <h2 className="serif">El buscador funciona por título</h2>
            <p>Como no usamos algoritmos, nuestro buscador encuentra anuncios buscando coincidencias exactas con el <strong>título del anuncio</strong>. No hay magia, no hay ranking pagado — lo que escribes es lo que se busca.</p>
            <p style={{ marginTop: '0.75rem' }}>
              <strong style={{ color: 'var(--gold)' }}>💡 Consejo para vendedores:</strong> al crear tu anuncio, incluye en el título hasta <strong>5 palabras clave</strong> que un comprador pueda buscar. Por ejemplo:
            </p>
            <div className="cf-keyword-examples">
              <div className="cf-keyword-example">
                <span className="cf-keyword-bad">❌ "Vendo mi celular"</span>
                <span className="cf-keyword-good">✅ "iPhone 13 Pro 256GB desbloqueado"</span>
              </div>
              <div className="cf-keyword-example">
                <span className="cf-keyword-bad">❌ "Ofrezco servicios"</span>
                <span className="cf-keyword-good">✅ "Plomero urgente domicilio Santa Cruz"</span>
              </div>
              <div className="cf-keyword-example">
                <span className="cf-keyword-bad">❌ "Ropa usada"</span>
                <span className="cf-keyword-good">✅ "Jeans Levi's 501 talla 32 nuevo"</span>
              </div>
            </div>
          </div>
        </section>

        {/* Cómo funciona */}
        <section className="cf-section">
          <h2 className="serif">¿Cómo funciona?</h2>
          <div className="cf-steps">
            <div className="cf-step">
              <span className="cf-step-num">1</span>
              <div>
                <strong>🏴‍☠️ Publica como Pirata (sin registro)</strong>
                <p>
                  Cualquier persona puede publicar un anuncio sin crear cuenta — estos son los <strong>vendedores Piratas</strong>.
                  El anuncio aparece al instante y <strong>se elimina automáticamente en 72 horas</strong>.
                  El contacto con el comprador lo incluye el propio vendedor en la descripción del anuncio (WhatsApp, Telegram, etc.).
                  <br /><br />
                  <em>Pirata Market no guarda ningún dato personal sobre estos vendedores ni lleva registro de sus publicaciones.</em>
                </p>
              </div>
            </div>
            <div className="cf-step">
              <span className="cf-step-num">2</span>
              <div>
                <strong>O crea una cuenta para anuncios permanentes</strong>
                <p>Regístrate como Persona, Tienda o Mayorista. Tus anuncios no expiran y puedes gestionarlos desde tu panel.</p>
              </div>
            </div>
            <div className="cf-step">
              <span className="cf-step-num">3</span>
              <div>
                <strong>El comprador te contacta directo</strong>
                <p>Sin intermediarios. El interesado te escribe por WhatsApp directamente. Nosotros no intervenimos en la transacción.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Diferenciadores */}
        <section className="cf-section">
          <h2 className="serif">¿Por qué Pirata Market?</h2>
          <div className="cf-features">
            <div className="cf-feature">
              <span>🚫</span>
              <strong>Sin prohibiciones absurdas</strong>
              <p>No te bloqueamos por publicar precios, productos de segunda mano, o servicios que otras plataformas censuran sin razón.</p>
            </div>
            <div className="cf-feature">
              <span>🔓</span>
              <strong>Sin baneos arbitrarios</strong>
              <p>No existe un algoritmo que te suspenda la cuenta por palabras clave. Aquí eres libre de vender lo que es legal.</p>
            </div>
            <div className="cf-feature">
              <span>⚡</span>
              <strong>Sin algoritmos basura</strong>
              <p>Los anuncios se muestran cronológicamente. No pagamos ni cobramos por visibilidad. Lo nuevo, arriba. Siempre.</p>
            </div>
            <div className="cf-feature">
              <span>🌍</span>
              <strong>Pensado para fronteras</strong>
              <p>Múltiples monedas, múltiples idiomas. Diseñado para mercados donde conviven distintas economías y culturas.</p>
            </div>
          </div>
        </section>

        {/* Reglas */}
        <section className="cf-section">
          <h2 className="serif">Reglas de la comunidad</h2>
          <div className="cf-rules">
            <div className="cf-rule allowed">
              <span>✅</span>
              <p>Productos nuevos y usados en buen estado</p>
            </div>
            <div className="cf-rule allowed">
              <span>✅</span>
              <p>Servicios legales de cualquier tipo</p>
            </div>
            <div className="cf-rule allowed">
              <span>✅</span>
              <p>Alimentos, artesanías, productos locales</p>
            </div>
            <div className="cf-rule allowed">
              <span>✅</span>
              <p>Empleos, freelance, trabajos temporales</p>
            </div>
            <div className="cf-rule forbidden">
              <span>🚫</span>
              <p>Productos ilegales o prohibidos por ley</p>
            </div>
            <div className="cf-rule forbidden">
              <span>🚫</span>
              <p>Estafas, fraudes o información falsa</p>
            </div>
            <div className="cf-rule forbidden">
              <span>🚫</span>
              <p>Contenido que incite violencia o discriminación</p>
            </div>
            <div className="cf-rule forbidden">
              <span>🚫</span>
              <p>Datos personales de terceros sin consentimiento</p>
            </div>
          </div>
        </section>

        {/* Disclaimer */}
        <section className="cf-section cf-disclaimer">
          <h2 className="serif">Disclaimer de responsabilidad</h2>
          <p>Pirata Market es una plataforma de clasificados que conecta compradores y vendedores. <strong>No somos parte de ninguna transacción.</strong></p>
          <p>No verificamos la calidad, legalidad ni autenticidad de los productos publicados. El comprador y vendedor son responsables de acordar los términos de sus transacciones.</p>
          <p>Los anuncios marcados como "Pirata" (sin registro) son publicados de forma anónima. Pirata Market no puede identificar ni contactar a estos vendedores.</p>
          <p>Nos reservamos el derecho de eliminar cualquier anuncio que viole nuestras reglas de comunidad o la legislación aplicable, sin previo aviso.</p>
          <p className="cf-legal">© {new Date().getFullYear()} Pirata Market · Un servicio de <strong>Buses App</strong></p>
        </section>

        {/* Botones finales */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <Link to="/" className="btn btn-primary">
            🏴‍☠️ Ir al mercado
          </Link>
          <Link to="/legal" className="btn btn-outline">
            ⚖️ Marco Legal
          </Link>
        </div>

      </div>
    </div>
  )
}
