import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import './ComoFunciona.css'

export default function ComoFunciona() {

  useEffect(() => {
    if (document.getElementById('google-translate-script')) return

    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: 'es',
          includedLanguages: 'en,pt,ar,zh,fr,de,it,ru,ja,ko',
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false
        },
        'google_translate_element'
      )
    }

    const script = document.createElement('script')
    script.id = 'google-translate-script'
    script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
    script.async = true
    document.body.appendChild(script)
  }, [])

  return (
    <div className="como-funciona">
      <div className="cf-container">

        {/* Google Translate */}
        <div className="cf-translate">
          <span>🌍 Traducir esta página:</span>
          <div id="google_translate_element"></div>
        </div>

        {/* Hero */}
        <div className="cf-hero">
          <h1 className="serif luxury-gold">
            <img src="/logo - ico.png" alt="Pirata Market" className="cf-logo" />
            Pirata Market
          </h1>
          <p className="cf-tagline">Comercio sin intermediarios, sin censura, sin algoritmos basura.</p>
        </div>

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
                  <em>Pirata-Marketplace no guarda ningún dato personal sobre estos vendedores ni lleva registro de sus publicaciones.</em>
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
          <p>CONTACTO: busesapp55@gmail.com.</p>
        </section>

        <Link to="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          🏴‍☠️ Ir al mercado
        </Link>

      </div>
    </div>
  )
}
