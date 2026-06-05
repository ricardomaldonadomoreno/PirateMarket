import { useState } from 'react'
import { Link } from 'react-router-dom'
import './Legal.css'

const TABS = [
  { id: 'terminos', label: '📋 Términos de Servicio' },
  { id: 'privacidad', label: '🔒 Política de Privacidad' },
  { id: 'licencia', label: '⚖️ Licencia de Uso' },
  { id: 'contenido', label: '🚫 Política de Contenido' },
]

export default function Legal() {
  const [activeTab, setActiveTab] = useState('terminos')

  return (
    <div className="legal-page">
      <div className="legal-container">

        {/* Header */}
        <div className="legal-header">
          <div className="legal-beta-badge">🧪 Versión Beta</div>
          <h1 className="serif luxury-gold">Marco Legal</h1>
          <p className="legal-subtitle">
            Pirata Marketplace — Un servicio de <strong>Buses App</strong>
          </p>
          <p className="legal-update">Última actualización: {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        {/* Tabs */}
        <div className="legal-tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`legal-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="legal-content card">

          {/* TÉRMINOS DE SERVICIO */}
          {activeTab === 'terminos' && (
            <div className="legal-section">
              <h2 className="serif">Términos de Servicio</h2>
              <div className="legal-notice">
                ⚠️ Pirata Marketplace se encuentra actualmente en fase <strong>Beta</strong>. Las funciones operativas básicas están disponibles y en funcionamiento, sin embargo la plataforma puede experimentar cambios, interrupciones o actualizaciones sin previo aviso durante este período de desarrollo y pruebas.
              </div>

              <h3>1. Naturaleza del Servicio</h3>
              <p>Pirata Marketplace (en adelante "la Plataforma") es un tablón de anuncios clasificados digital operado por <strong>Buses App</strong>. La Plataforma actúa exclusivamente como intermediario técnico que facilita la publicación de anuncios y la conexión entre usuarios. <strong>Buses App no es parte de ninguna transacción comercial</strong> que se realice entre usuarios.</p>

              <h3>2. Aceptación de los Términos</h3>
              <p>Al acceder o utilizar la Plataforma, el usuario acepta íntegramente estos Términos de Servicio. Si no está de acuerdo con alguna de las condiciones aquí establecidas, debe abstenerse de utilizar el servicio. El uso continuado de la Plataforma tras la publicación de modificaciones a estos Términos implica la aceptación de dichos cambios.</p>

              <h3>3. Descripción del Servicio</h3>
              <p>La Plataforma ofrece las siguientes funcionalidades en su versión actual:</p>
              <ul>
                <li>Publicación de anuncios de productos y servicios con o sin registro de cuenta.</li>
                <li>Navegación y búsqueda de anuncios publicados por otros usuarios.</li>
                <li>Contacto directo entre compradores y vendedores a través de medios externos (WhatsApp, etc.).</li>
                <li>Servicios opcionales de catálogo premium y verificación de identidad.</li>
                <li>Coordinación de envíos a través del servicio Pack-Service de Buses App.</li>
              </ul>
              <p>Durante la fase Beta, algunas funcionalidades pueden estar en desarrollo o sujetas a cambios sin previo aviso.</p>

              <h3>4. Limitación de Responsabilidad</h3>
              <p>Buses App y Pirata Marketplace <strong>no asumen responsabilidad alguna</strong> por:</p>
              <ul>
                <li>La veracidad, exactitud, legalidad o calidad de los anuncios publicados por los usuarios.</li>
                <li>Cualquier transacción, acuerdo, disputa, pérdida o daño derivado de la relación entre compradores y vendedores.</li>
                <li>Interrupciones del servicio, errores técnicos, pérdida de datos o caídas de la plataforma, especialmente durante la fase Beta.</li>
                <li>El uso indebido de la información de contacto publicada por los usuarios.</li>
                <li>Productos o servicios que no cumplan con las expectativas del comprador.</li>
              </ul>
              <p>En ningún caso la responsabilidad total de Buses App hacia un usuario podrá exceder el monto pagado por dicho usuario por servicios de la Plataforma en los últimos tres (3) meses.</p>

              <h3>5. Obligaciones del Usuario</h3>
              <p>Al utilizar la Plataforma, el usuario se compromete a:</p>
              <ul>
                <li>Publicar únicamente contenido veraz, legal y de su propiedad o sobre el que tenga derecho a publicar.</li>
                <li>No utilizar la Plataforma para actividades ilegales, fraudulentas o que perjudiquen a terceros.</li>
                <li>No publicar contenido que viole derechos de propiedad intelectual de terceros.</li>
                <li>Mantener la confidencialidad de sus credenciales de acceso.</li>
                <li>Notificar a Buses App ante cualquier uso no autorizado de su cuenta.</li>
              </ul>

              <h3>6. Disponibilidad del Servicio</h3>
              <p>La Plataforma se ofrece "tal como está" y "según disponibilidad". Buses App no garantiza disponibilidad ininterrumpida del servicio, especialmente durante la fase Beta. Nos reservamos el derecho de suspender, modificar o discontinuar el servicio — total o parcialmente — en cualquier momento y sin previo aviso, sin que esto genere responsabilidad alguna hacia los usuarios.</p>

              <h3>7. Modificación y Terminación</h3>
              <p>Buses App se reserva el derecho de modificar estos Términos en cualquier momento. Las modificaciones entrarán en vigor desde su publicación en la Plataforma. Asimismo, nos reservamos el derecho de suspender o cancelar el acceso de cualquier usuario que incumpla estos Términos, sin necesidad de notificación previa.</p>

              <h3>8. Ley Aplicable y Jurisdicción</h3>
              <p>Estos Términos se rigen por los principios generales del derecho aplicables a plataformas digitales internacionales. Cualquier controversia derivada del uso de la Plataforma será sometida a la jurisdicción que Buses App designe según la naturaleza y el origen de la disputa. Al ser una plataforma de alcance internacional, la jurisdicción aplicable podrá ser la del país donde esté registrada la entidad operadora de Buses App.</p>

              <h3>9. Contacto</h3>
              <p>Para consultas legales, reclamos o notificaciones formales: <strong>busesapp55@gmail.com</strong></p>
            </div>
          )}

          {/* POLÍTICA DE PRIVACIDAD */}
          {activeTab === 'privacidad' && (
            <div className="legal-section">
              <h2 className="serif">Política de Privacidad</h2>
              <div className="legal-notice">
                ⚠️ Durante la fase Beta, las prácticas de recolección de datos pueden ajustarse según evoluciona la plataforma. Te notificaremos de cambios significativos.
              </div>

              <h3>1. Responsable del Tratamiento</h3>
              <p>El responsable del tratamiento de datos personales es <strong>Buses App</strong>, operador de Pirata Marketplace. Contacto: <strong>busesapp55@gmail.com</strong></p>

              <h3>2. Datos que Recolectamos</h3>
              <p><strong>Usuarios registrados:</strong></p>
              <ul>
                <li>Nombre o nombre de usuario, dirección de correo electrónico.</li>
                <li>Número de WhatsApp (opcional, solo si el usuario lo proporciona).</li>
                <li>Foto de perfil (opcional).</li>
                <li>Documentos de identidad y fotos del negocio — <strong>solo en caso de solicitar verificación</strong>, tratados con acceso restringido.</li>
              </ul>
              <p><strong>Usuarios Pirata (sin registro):</strong></p>
              <ul>
                <li>No se recolectan datos personales identificables.</li>
                <li>Los anuncios se asocian a un token temporal anónimo que expira a las 72 horas.</li>
                <li>No almacenamos dirección IP ni información del dispositivo de forma permanente.</li>
              </ul>
              <p><strong>Datos técnicos automáticos:</strong></p>
              <ul>
                <li>Estadísticas de uso anónimas (vistas de anuncios, búsquedas).</li>
                <li>Cookies de sesión necesarias para el funcionamiento del servicio.</li>
              </ul>

              <h3>3. Uso de los Datos</h3>
              <p>Los datos recolectados se utilizan exclusivamente para:</p>
              <ul>
                <li>Gestionar la cuenta del usuario y su acceso a la Plataforma.</li>
                <li>Procesar solicitudes de verificación de identidad.</li>
                <li>Enviar notificaciones relacionadas con el servicio (no publicidad de terceros).</li>
                <li>Mejorar el funcionamiento y la seguridad de la Plataforma.</li>
                <li>Cumplir con obligaciones legales cuando sea aplicable.</li>
              </ul>

              <h3>4. Compartición de Datos</h3>
              <p><strong>Buses App no vende, alquila ni comercializa los datos personales de sus usuarios.</strong> Los datos pueden ser compartidos únicamente con:</p>
              <ul>
                <li>Proveedores de infraestructura técnica (Supabase) bajo acuerdos de confidencialidad.</li>
                <li>Autoridades competentes cuando exista una obligación legal válida y verificable.</li>
              </ul>

              <h3>5. Documentos de Verificación</h3>
              <p>Las fotos de documentos de identidad (DNI, CI) enviadas para verificación son de acceso exclusivo del equipo administrador de Buses App. <strong>Nunca se publican ni se comparten públicamente.</strong> Las fotos del negocio (local, certificaciones) sí son visibles públicamente en el catálogo del vendedor una vez aprobada la verificación, según lo acordado por el usuario al iniciar el proceso.</p>

              <h3>6. Retención de Datos</h3>
              <ul>
                <li>Anuncios Pirata: eliminados automáticamente a las 72 horas.</li>
                <li>Cuentas registradas: datos conservados mientras la cuenta esté activa. El usuario puede solicitar la eliminación en cualquier momento.</li>
                <li>Documentos de verificación: conservados mientras la cuenta esté verificada activa.</li>
              </ul>

              <h3>7. Derechos del Usuario</h3>
              <p>El usuario tiene derecho a:</p>
              <ul>
                <li>Acceder a sus datos personales almacenados.</li>
                <li>Solicitar la corrección de datos inexactos.</li>
                <li>Solicitar la eliminación de su cuenta y datos asociados.</li>
                <li>Oponerse al tratamiento de sus datos en casos justificados.</li>
              </ul>
              <p>Para ejercer estos derechos: <strong>busesapp55@gmail.com</strong></p>

              <h3>8. Seguridad</h3>
              <p>Implementamos medidas técnicas de seguridad incluyendo cifrado de comunicaciones (HTTPS/SSL), autenticación segura mediante tokens JWT y políticas de acceso por fila (Row Level Security) en la base de datos. No obstante, ningún sistema es completamente infalible y durante la fase Beta pueden existir vulnerabilidades en proceso de corrección.</p>

              <h3>9. Menores de Edad</h3>
              <p>La Plataforma no está dirigida a personas menores de 18 años. Si tienes conocimiento de que un menor ha registrado una cuenta, notifícanos a <strong>busesapp55@gmail.com</strong> para proceder con la eliminación inmediata.</p>
            </div>
          )}

          {/* LICENCIA DE USO */}
          {activeTab === 'licencia' && (
            <div className="legal-section">
              <h2 className="serif">Licencia de Uso y Derechos Reservados</h2>

              <div className="legal-notice legal-notice-gold">
                © {new Date().getFullYear()} Buses App — Pirata Marketplace. Todos los derechos reservados. El acceso a esta plataforma no implica transferencia de propiedad intelectual de ningún tipo.
              </div>

              <h3>1. Propiedad Intelectual de la Plataforma</h3>
              <p>La Plataforma Pirata Marketplace, incluyendo sin limitación su código fuente, diseño, arquitectura, nombre comercial, logotipo, estructura de datos, algoritmos, textos, gráficos e interfaces, son propiedad exclusiva de <strong>Buses App</strong> y están protegidos por las leyes de propiedad intelectual aplicables a nivel internacional.</p>
              <p><strong>El uso de la Plataforma no otorga al usuario ningún derecho de propiedad</strong> sobre ninguno de los elementos anteriores. El usuario no puede copiar, reproducir, modificar, distribuir, descompilar ni crear obras derivadas de la Plataforma o cualquiera de sus componentes.</p>

              <h3>2. Licencia Otorgada al Usuario</h3>
              <p>Buses App otorga al usuario una <strong>licencia limitada, no exclusiva, intransferible, revocable y sin posibilidad de sublicencia</strong> para:</p>
              <ul>
                <li>Acceder y utilizar la Plataforma únicamente para los fines previstos en estos Términos.</li>
                <li>Publicar anuncios de productos y servicios conforme a las políticas de contenido.</li>
                <li>Navegar, buscar y contactar a otros usuarios a través de los mecanismos provistos.</li>
              </ul>
              <p>Esta licencia <strong>no equivale a propiedad</strong> y puede ser revocada en cualquier momento por Buses App sin necesidad de justificación, especialmente ante incumplimientos de los presentes Términos.</p>

              <h3>3. Contenido Publicado por los Usuarios</h3>
              <p>El usuario conserva la <strong>plena propiedad</strong> de todo el contenido que publica en la Plataforma (textos, fotografías, descripciones, precios). Sin embargo, al publicar contenido, el usuario otorga a Buses App una <strong>licencia mundial, no exclusiva, gratuita, sublicenciable y transferible</strong> para:</p>
              <ul>
                <li>Alojar, almacenar, reproducir y mostrar dicho contenido dentro de la Plataforma.</li>
                <li>Indexarlo para facilitar su búsqueda y descubrimiento por otros usuarios.</li>
                <li>Generar previsualizaciones para compartir en redes sociales (Open Graph).</li>
                <li>Utilizarlo para el correcto funcionamiento técnico del servicio.</li>
              </ul>
              <p>Esta licencia <strong>termina automáticamente</strong> cuando el usuario elimina el contenido o su cuenta, excepto en los casos en que dicho contenido haya sido compartido por terceros antes de su eliminación.</p>
              <p><strong>Buses App no reclamará propiedad sobre el contenido de los usuarios, no lo venderá a terceros ni lo utilizará con fines publicitarios o comerciales ajenos al funcionamiento de la Plataforma.</strong></p>

              <h3>4. Marcas Registradas</h3>
              <p>"Pirata Marketplace", "Pack-Service", "Buses App" y los logotipos asociados son marcas comerciales de Buses App. El usuario no está autorizado a utilizar estas marcas sin el consentimiento previo y por escrito de Buses App.</p>

              <h3>5. Derechos de Terceros</h3>
              <p>El usuario garantiza que el contenido que publica no infringe derechos de propiedad intelectual, derechos de imagen ni ningún otro derecho de terceros. En caso de reclamación por infracción de derechos de terceros relacionada con contenido publicado por un usuario, Buses App se reserva el derecho de eliminar dicho contenido y de ejercer acciones de repetición contra el usuario responsable.</p>

              <h3>6. Reporte de Infracciones</h3>
              <p>Si consideras que algún contenido publicado en la Plataforma infringe tus derechos de propiedad intelectual, puedes notificarlo a: <strong>busesapp55@gmail.com</strong> indicando el contenido específico, la naturaleza de la infracción y tu información de contacto.</p>

              <h3>7. Código Abierto y Terceros</h3>
              <p>La Plataforma utiliza componentes de software de código abierto bajo sus respectivas licencias (React, Leaflet, OpenStreetMap, Supabase). El uso de estos componentes no modifica los derechos de Buses App sobre la Plataforma en su conjunto.</p>
            </div>
          )}

          {/* POLÍTICA DE CONTENIDO */}
          {activeTab === 'contenido' && (
            <div className="legal-section">
              <h2 className="serif">Política de Contenido</h2>

              <div className="legal-notice">
                Pirata Marketplace defiende la libertad comercial responsable. Cualquier producto o servicio legal puede publicarse sin restricciones arbitrarias. Sin embargo, existen límites claros para proteger a la comunidad y cumplir con la legalidad internacional.
              </div>

              <h3>Contenido Permitido ✅</h3>
              <div className="legal-allowed-grid">
                {[
                  "Productos nuevos y usados en cualquier condición declarada",
                  "Servicios legales de cualquier naturaleza",
                  "Alimentos, bebidas y productos locales",
                  "Artesanías, arte y productos culturales",
                  "Empleos, trabajos freelance y servicios temporales",
                  "Vehículos, inmuebles y bienes raíces",
                  "Electrónica, tecnología y equipos",
                  "Ropa, calzado y accesorios",
                  "Animales y mascotas (con responsabilidad)",
                  "Servicios profesionales y educativos",
                ].map((item, i) => (
                  <div key={i} className="legal-allowed-item">✅ {item}</div>
                ))}
              </div>

              <h3>Contenido Prohibido 🚫</h3>
              <div className="legal-forbidden-grid">
                {[
                  "Productos ilegales o prohibidos por la legislación aplicable",
                  "Sustancias controladas, drogas o precursores químicos",
                  "Armas de fuego, explosivos o materiales peligrosos sin habilitación legal",
                  "Contenido sexual explícito o material para adultos",
                  "Contenido que involucre menores de edad de cualquier forma inapropiada",
                  "Información personal de terceros sin su consentimiento",
                  "Publicaciones fraudulentas, estafas o engaños al comprador",
                  "Contenido que incite violencia, odio o discriminación",
                  "Propiedad intelectual de terceros sin autorización",
                  "Servicios de hacking, malware o actividades cibernéticas ilícitas",
                  "Servicios financieros no autorizados o esquemas piramidales",
                  "Documentos falsos, identidades falsas o credenciales apócrifas",
                ].map((item, i) => (
                  <div key={i} className="legal-forbidden-item">🚫 {item}</div>
                ))}
              </div>

              <h3>Moderación y Reportes</h3>
              <p>Buses App se reserva el derecho de eliminar cualquier anuncio que, a su criterio, viole esta política o las leyes aplicables, sin previo aviso y sin que esto genere derecho a compensación alguna para el usuario.</p>
              <p>Los usuarios pueden reportar contenido inapropiado directamente desde la ficha de cada anuncio. Los reportes son revisados por el equipo administrador y pueden resultar en la eliminación del contenido y/o la suspensión de la cuenta del infractor.</p>
              <p>Para reportes urgentes o consultas sobre moderación: <strong>busesapp55@gmail.com</strong></p>

              <h3>Responsabilidad del Usuario Publicante</h3>
              <p>El usuario que publica un anuncio es el <strong>único y exclusivo responsable</strong> del contenido publicado. Buses App no realiza verificación previa de los anuncios y actúa como intermediario técnico pasivo. La publicación de contenido ilegal puede resultar en:</p>
              <ul>
                <li>Eliminación inmediata del anuncio y/o cuenta.</li>
                <li>Reporte a autoridades competentes cuando la ley lo exija.</li>
                <li>Acciones legales por parte de los afectados — en las que Buses App no será parte.</li>
              </ul>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="legal-footer">
          <p>¿Tienes preguntas? Escríbenos a <a href="mailto:busesapp55@gmail.com">busesapp55@gmail.com</a></p>
          <Link to="/" className="btn btn-secondary" style={{ marginTop: '1rem', display: 'inline-flex' }}>
            🏴‍☠️ Volver al mercado
          </Link>
        </div>

      </div>
    </div>
  )
}
