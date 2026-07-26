import { useState, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// AdminRoute protege las rutas del backoffice.
// Tipos de acceso:
// 1. Admin principal (user_type='admin'): acceso total a todo
// 2. Colaborador con app_access='both': acceso a Pirata + Traficante (sin Sub-Admins)
// 3. Colaborador con app_access='pirata': solo rutas /admin/pirata/*
// 4. Colaborador con app_access='traficante': solo rutas /admin/traficante/*

// Rutas que solo puede ver el super_admin
const SUPER_ADMIN_ROUTES = ['/admin/sub-admins']

// Prefijos de ruta por app
const PIRATA_PREFIX = '/admin/pirata'
const TRAFICANTE_PREFIX = '/admin/traficante'

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
        // Auth no disponible
      }

      // 2. Verificar si es colaborador (sessionStorage)
      const colabId = sessionStorage.getItem('colaborador_id')
      const colabEmail = sessionStorage.getItem('colaborador_email')
      const colabAppAccess = sessionStorage.getItem('colaborador_app') || 'both'

      if (colabId && colabEmail) {
        // Verificar que sigue activo
        try {
          const { data: colabData } = await supabase
            .from('colaboradores')
            .select('is_active')
            .eq('id', colabId)
            .single()

          if (!colabData?.is_active) {
            // Desactivado, limpiar
            sessionStorage.clear()
            setStatus('denied')
            return
          }
        } catch {
          // Error, asumir activo
        }

        // Verificar que la ruta actual está permitida según app_access
        const currentPath = location.pathname

        // Sub-Admins: solo super_admin
        if (SUPER_ADMIN_ROUTES.some(route => currentPath.startsWith(route))) {
          setStatus('denied')
          return
        }

        // Verificar acceso por app
        if (colabAppAccess === 'pirata' && !currentPath.startsWith(PIRATA_PREFIX) && currentPath !== '/admin/home') {
          // Redirigir a pirata
          setStatus('redirect_pirata')
          return
        }
        if (colabAppAccess === 'traficante' && !currentPath.startsWith(TRAFICANTE_PREFIX) && currentPath !== '/admin/home') {
          setStatus('redirect_traficante')
          return
        }

        setStatus('allowed')
        return
      }

      setStatus('denied')
    }

    check()
  }, [location.pathname])

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#111111' }}>
        <div className="loading" style={{ width: '40px', height: '40px' }}></div>
      </div>
    )
  }

  if (status === 'denied') return <Navigate to="/admin" replace state={{ from: location }} />
  if (status === 'redirect_pirata') return <Navigate to="/admin/pirata" replace />
  if (status === 'redirect_traficante') return <Navigate to="/admin/traficante" replace />

  return children
}
