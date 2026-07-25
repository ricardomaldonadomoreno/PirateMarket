import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// AdminRoute verifica admin_roles en vez de user_type
// para evitar bloqueo accidental si el admin cambia su user_type
// Soporta prop requireSuperAdmin para páginas que solo super_admin puede ver
export default function AdminRoute({ children, requireSuperAdmin }) {
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setStatus('denied'); return }

      // Verificar en admin_roles (tabla segura, no se puede cambiar desde la app normal)
      const { data: roleData } = await supabase
        .from('admin_roles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      if (!roleData) {
        // Fallback: verificar user_type = 'admin' por si no se ha migrado aún
        const { data: userData } = await supabase
          .from('users')
          .select('user_type')
          .eq('id', user.id)
          .single()

        if (userData?.user_type !== 'admin') {
          setStatus('denied')
          return
        }
        // Si requireSuperAdmin, no permitir fallback
        if (requireSuperAdmin) {
          setStatus('denied')
          return
        }
        setStatus('allowed')
        return
      }

      // Verificar rol suficiente
      const roles = ['moderator', 'admin', 'super_admin']
      const userRoleIndex = roles.indexOf(roleData.role)

      if (userRoleIndex === -1) {
        setStatus('denied')
        return
      }

      // Si requiere super_admin, verificar
      if (requireSuperAdmin && roleData.role !== 'super_admin') {
        setStatus('denied')
        return
      }

      setStatus('allowed')
    } catch {
      setStatus('denied')
    }
  }

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#111111' }}>
        <div className="loading" style={{ width: '40px', height: '40px' }}></div>
      </div>
    )
  }

  if (status === 'denied') return <Navigate to="/admin" replace />

  return children
}
