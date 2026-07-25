import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import './AdminLogin.css'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw authError

      // Primero verificar en admin_roles (fuente de verdad segura)
      const { data: roleData } = await supabase
        .from('admin_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .single()

      if (roleData) {
        // Tiene rol admin — redirigir a la landing de selección
        navigate('/admin/home')
        return
      }

      // Fallback: verificar user_type = 'admin' (para admins legacy que no tienen admin_roles aún)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('user_type')
        .eq('id', data.user.id)
        .single()

      if (userError) throw userError

      if (userData?.user_type !== 'admin') {
        await supabase.auth.signOut()
        throw new Error('No tienes permisos de administrador')
      }

      // Admin legacy sin admin_roles — redirigir a la landing
      navigate('/admin/home')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-login">
      <div className="admin-login-bg">
        <img src="/logo-ico.png" alt="Pirata Market" className="admin-bg-logo" />
      </div>
      <div className="admin-login-card">
        <div className="admin-login-header">
          <img src="/logo-ico.png" alt="Pirata Market" className="admin-login-logo" />
          <h1 className="serif">Backoffice</h1>
          <p>Acceso restringido — Solo administradores</p>
        </div>

        {error && <div className="admin-error">{error}</div>}

        <form onSubmit={handleLogin} className="admin-login-form">
          <div className="admin-form-group">
            <label>Email</label>
            <input
              type="email"
              className="input"
              placeholder="admin@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="admin-form-group">
            <label>Contraseña</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? <><span className="loading"></span> Verificando...</> : 'Ingresar al panel'}
          </button>
        </form>
      </div>
    </div>
  )
}
