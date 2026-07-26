import { useState, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// AdminRoute protege las rutas del backoffice.
// Acepta dos tipos de acceso:
// 1. Admin principal: autenticado con Supabase Auth + user_type='admin' en tabla users
// 2. Colaborador: validado contra tabla colaborador, datos en sessionStorage

export default function AdminRoute({ children }) {
  const [status, setStatus] = useState('loading')
  const location = useLocation()

  useEffect(() => {
    const check = async () => {
      // 1. Verificar si es admin principal (Supabase Auth)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: userData } = await supabase
            .from('users')
            .select('user_type')
            .eq('id', user.id)
            .maybeSingle()

          if (userData?.user_type === 'admin') {
            setStatus('allowed')
            return
          }
        }
      } catch {
        // Auth no disponible, intentar con colaborador
      }

      // 2. Verificar si es colaborador (sessionStorage)
      const colabId = sessionStorage.getItem('colaborador_id')
      const colabEmail = sessionStorage.getItem('colaborador_email')
      if (colabId && colabEmail) {
        try {
          const { data: colabData } = await supabase
            .from('colaboradores')
            .select('is_active')
            .eq('id', colabId)
            .single()

          if (colabData?.is_active) {
            setStatus('allowed')
            return
          }
          // Colaborador desactivado
          sessionStorage.removeItem('colaborador_id')
          sessionStorage.removeItem('colaborador_email')
          sessionStorage.removeItem('colaborador_name')
          sessionStorage.removeItem('colaborador_app')
        } catch {
          // Error de query, asumir activo
          setStatus('allowed')
          return
        }
      }

      setStatus('denied')
    }

    check()
  }, [])

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#111111' }}>
        <div className="loading" style={{ width: '40px', height: '40px' }}></div>
      </div>
    )
  }

  if (status === 'denied') return <Navigate to="/admin" replace state={{ from: location }} />

  return children
}
