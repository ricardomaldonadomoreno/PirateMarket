import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import './AdminLogin.css'

// AdminLogin maneja dos tipos de acceso:
// 1. Admin principal (tú): usa Supabase Auth + tabla users (user_type='admin')
// 2. Colaboradores: valida directamente contra tabla colaboradores
//    Sin Supabase Auth, sin emails de confirmación, sin nada.
//    Email + contraseña → coincide en la tabla → entra al backoffice.

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
      // Intento 1: Supabase Auth (admin principal con user_type='admin')
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })

      if (!authError && authData.user) {
        // Verificar que es admin en la tabla users
        const { data: userData } = await supabase
          .from('users')
          .select('user_type')
          .eq('id', authData.user.id)
          .single()

        if (userData?.user_type === 'admin') {
          // Es el admin principal → entra al backoffice
          navigate('/admin/home')
          return
        }
      }

      // Intento 2: Validar contra tabla colaboradores
      const { data: colabData, error: colabError } = await supabase.rpc('validate_colaborador', {
        p_email: email,
        p_password: password,
      })

      if (colabError) {
        throw colabError
      }

      if (colabData && colabData.length > 0) {
        const colab = colabData[0]
        // Guardar datos del colaborador en sessionStorage para que AdminRoute lo reconozca
        sessionStorage.setItem('colaborador_id', colab.id)
        sessionStorage.setItem('colaborador_email', colab.email)
        sessionStorage.setItem('colaborador_name', colab.full_name)
        sessionStorage.setItem('colaborador_app', colab.app_access)
        navigate('/admin/home')
        return
      }

      // Ningún intento funcionó
      throw new Error('Email o contrasena incorrectos')
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
          <p>Acceso restringido — Solo administradores y colaboradores</p>
        </div>

        {error && <div className="admin-error">⚠️ {error}</div>}

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
            {loading ? <><span className="loading"></span> Verificando...</> : '🔐 Ingresar al panel'}
          </button>
        </form>
      </div>
    </div>
  )
}
