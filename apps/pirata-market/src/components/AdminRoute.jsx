import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AdminRoute({ children }) {
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setStatus('denied'); return }

      const { data } = await supabase
        .from('users')
        .select('user_type')
        .eq('id', user.id)
        .single()

      setStatus(data?.user_type === 'admin' ? 'allowed' : 'denied')
    } catch {
      setStatus('denied')
    }
  }

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#1a1a1a' }}>
        <div className="loading" style={{ width: '40px', height: '40px' }}></div>
      </div>
    )
  }

  if (status === 'denied') return <Navigate to="/admin" replace />

  return children
}
