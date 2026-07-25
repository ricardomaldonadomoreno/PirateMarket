import { useState, useEffect } from 'react'
import { supabase } from '../../../pirata-market/src/lib/supabase'
import './MiCuenta.css'

const LEVEL_INFO = {
  basico: { label: 'Básico', color: 'var(--text-muted)', icon: '⚪' },
  medio:  { label: 'Medio',  color: '#2980B9', icon: '🔵' },
  pro:    { label: 'PRO',    color: '#8E44AD', icon: '🟣' },
  elite:  { label: 'Elite',  color: '#784212', icon: '🟤' },
}

const LEVEL_REQUIREMENTS = {
  basico: ['Identidad verificada', 'Dirección verificada', 'Comprobante de viaje'],
  medio:  ['Todo lo anterior', 'Garantía por artículo', 'Escrow habilitado'],
  pro:    ['Todo lo anterior', 'Oficina o domicilio habilitado', 'Rutas frecuentes verificadas'],
  elite:  ['Todo lo anterior', 'Dirección verificada en segundo país', 'Historial sólido de envíos'],
}

export default function MiCuentaNivel({ user }) {
  const [currentLevel, setCurrentLevel] = useState('basico')

  useEffect(() => {
    if (!user) return
    loadLevel()
  }, [user])

  const loadLevel = async () => {
    const { data } = await supabase
      .from('traficante_profiles')
      .select('level')
      .eq('id', user.id)
      .single()
    if (data?.level) setCurrentLevel(data.level)
  }

  return (
    <div className="mc-section">
      <div className="mc-section-header">
        <h2>Mi nivel</h2>
        <p>Tu nivel determina qué tipos de envíos puedes aceptar.</p>
      </div>

      <div className="mc-level-current">
        <div className="mc-level-icon" style={{ color: LEVEL_INFO[currentLevel]?.color || LEVEL_INFO.basico.color }}>
          {LEVEL_INFO[currentLevel]?.icon || LEVEL_INFO.basico.icon}
        </div>
        <div>
          <div className="mc-level-label" style={{ color: LEVEL_INFO[currentLevel]?.color || LEVEL_INFO.basico.color }}>
            Nivel {LEVEL_INFO[currentLevel]?.label || LEVEL_INFO.basico.label}
          </div>
          <div className="mc-level-desc">Tu nivel es asignado por el equipo según tus verificaciones completadas.</div>
        </div>
      </div>

      <div className="mc-levels-progress">
        {Object.entries(LEVEL_INFO).map(([key, info]) => (
          <div key={key} className={`mc-level-row ${key === currentLevel ? 'current' : ''}`}>
            <div className="mc-level-row-icon" style={{ color: info.color }}>{info.icon}</div>
            <div className="mc-level-row-info">
              <div className="mc-level-row-label" style={{ color: info.color }}>{info.label}</div>
              <div className="mc-level-row-reqs">
                {LEVEL_REQUIREMENTS[key].map((req, i) => (
                  <span key={i} className="mc-req-chip">{req}</span>
                ))}
              </div>
            </div>
            {key === currentLevel && <div className="mc-level-current-badge">← Tu nivel actual</div>}
          </div>
        ))}
      </div>

      <div className="mc-notice info">
        ℹ️ Para subir de nivel, completa las verificaciones y contacta a soporte.
      </div>
    </div>
  )
}
