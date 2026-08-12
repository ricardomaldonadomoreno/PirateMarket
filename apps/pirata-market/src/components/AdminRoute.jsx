import { useState, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

// AdminRoute protege las rutas del backoffice.
// Usa la tabla `admins` (completamente separada de users y Supabase Auth).
// Tipos de acceso:
// 1. SuperAdmin (scope='all'): acceso total a todo
// 2. Sub-admin con scope='pirata': solo rutas /admin/pirata/*
// 3. Sub-admin con scope='traficante': solo rutas /admin/packer/*
// 4. Sub-admin con scope='both': acceso a Pirata + Traficante (sin Sub-Admins)

// Rutas que solo puede ver el super_admin
const SUPER_ADMIN_ROUTES = ['/admin/sub-admins']

// Prefijos de ruta por app
const PIRATA_PREFIX = '/admin/pirata'
const TRAFICANTE_PREFIX = '/admin/packer'

export default function AdminRoute({ children }) {
  const [status, setStatus] = useState('loading')
  const location = useLocation()

  useEffect(() => {
    const check = () => {
      // Verificar si hay admin logueado en sessionStorage
      const adminId = sessionStorage.getItem('admin_id')
      const adminEmail = sessionStorage.getItem('admin_email')
      const adminScope = sessionStorage.getItem('admin_scope')

      if (!adminId || !adminEmail) {
        setStatus('denied')
        return
      }

      // SuperAdmin (scope='all'): acceso total a todo
      if (adminScope === 'all') {
        setStatus('allowed')
        return
      }

      // Sub-admin con scope limitado
      const currentPath = location.pathname

      // Sub-Admins: solo super_admin (scope='all')
      if (SUPER_ADMIN_ROUTES.some(route => currentPath.startsWith(route))) {
        setStatus('denied')
        return
      }

      // Verificar acceso por scope/app
      if (adminScope === 'pirata' && !currentPath.startsWith(PIRATA_PREFIX) && currentPath !== '/admin/home') {
        setStatus('redirect_pirata')
        return
      }
      if (adminScope === 'traficante' && !currentPath.startsWith(TRAFICANTE_PREFIX) && currentPath !== '/admin/home') {
        setStatus('redirect_traficante')
        return
      }

      setStatus('allowed')
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
  if (status === 'redirect_traficante') return <Navigate to="/admin/packer" replace />

  return children
}
