import { useNavigate } from 'react-router-dom'
import './Legal.css'

export default function TraficanteLegal() {
  const navigate = useNavigate()

  return (
    <div className="traficante-legal">
      <div className="container">
        <button
          className="t-legal-back"
          onClick={() => navigate('/packer')}
        >
          ← Volver al inicio
        </button>

        <h1 className="t-legal-title">Aviso Legal — Packer</h1>

        <section className="t-legal-content">
          <p>Contenido legal en construcción.</p>
        </section>
      </div>
    </div>
  )
}
