import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import './AdminLogin.css'

// AdminLogin usa la Edge Function `login-admin` para verificar credenciales.
// La Edge Function verifica directamente contra la tabla `admins` (sin Supabase Auth).
//
// Flujo:
// 1. Email + contraseña → POST a Edge Function
// 2. Si success → guardar admin_id, admin_email, admin_name, admin_scope en sessionStorage
// 3. Redirige a /admin/home
// 4. scope='all': acceso total (superadmin)
// 5. scope específico: acceso limitado (sub-admin)

// URL de la Edge Function (obtenida del dashboard de Supabase)
const LOGIN_ADMIN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smart-processor`

// Obtener la anon key del entorno Supabase
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

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
      const res = await fetch(LOGIN_ADMIN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Credenciales invalidas')
      }

      const { id, email: adminEmail, full_name, scope, active } = data.admin

      if (!active) {
        throw new Error('Esta cuenta de administrador esta desactivada')
      }

      // Guardar datos del admin en sessionStorage
      sessionStorage.setItem('admin_id', id)
      sessionStorage.setItem('admin_email', adminEmail)
      sessionStorage.setItem('admin_name', full_name)
      sessionStorage.setItem('admin_scope', scope)

      // Intentar login en Supabase Auth para que auth.uid() funcione con RLS
      // El admin debe tener cuenta en users con user_type='admin'
      try {
        await supabase.auth.signInWithPassword({ email: adminEmail, password })
      } catch (authErr) {
        // Si falla el login de Auth (ej: admin no tiene cuenta en users),
        // continuar sin sesión de Auth. Las RLS de admin no funcionarán
        // pero las operaciones via Edge Functions sí.
        console.warn('Admin Auth login fallback (sin sesión Supabase Auth):', authErr.message)
      }

      // Redirigir al landing del backoffice
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
