import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import './VentasTV.css'

export default function VentasTV() {
  const { t } = useTranslation()

  return (
    <div className="ventas-tv">
      <div className="tv-container">
        <div className="tv-body">
          <div className="tv-screen">
            <div className="tv-static">
              <div className="static-text">
                <span className="channel">📺 VentasTV</span>
                <span className="coming-soon">Próximamente</span>
                <span className="subtitle">Transmisiones en vivo de vendedores</span>
              </div>
            </div>
          </div>
          <div className="tv-controls">
            <div className="tv-knob"></div>
            <div className="tv-knob"></div>
          </div>
          <div className="tv-legs">
            <div className="tv-leg"></div>
            <div className="tv-leg"></div>
          </div>
        </div>
        <Link to="/" className="btn btn-secondary" style={{ marginTop: '2rem' }}>
          ← Volver al mercado
        </Link>
      </div>
    </div>
  )
}
