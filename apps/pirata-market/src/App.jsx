import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import './styles/globals.css'

// Pages — Pirata Market
import Home from './pages/Home'
import ListingDetail from './pages/ListingDetail'
import CreateListing from './pages/CreateListing'
import Dashboard from './pages/Dashboard'
import Auth from './pages/Auth'
import VentasTV from './pages/VentasTV'
import ComoFunciona from './pages/ComoFunciona'
import SellerCatalog from './pages/SellerCatalog'
import Legal from './pages/Legal'

// Pages — Traficante
import TraficanteHome from '../../traficante-app/src/pages/Home'
import TraficanteBuscar from '../../traficante-app/src/pages/Buscar'
import TraficantePublicarViaje from '../../traficante-app/src/pages/PublicarViaje'
import TraficanteDashboard from '../../traficante-app/src/pages/Dashboard'
import TraficanteViajeDetalle from '../../traficante-app/src/pages/ViajeDetalle'
import TraficanteSolicitud from '../../traficante-app/src/pages/Solicitud'

// Admin — Pirata Market
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsuarios from './pages/admin/AdminUsuarios'
import AdminAnuncios from './pages/admin/AdminAnuncios'
import AdminReportes from './pages/admin/AdminReportes'

// Admin — Traficante
import TraficanteAdminLogin from '../../traficante-app/src/pages/admin/AdminLogin'
import TraficanteAdminDashboard from '../../traficante-app/src/pages/admin/AdminDashboard'

// Components
import Navbar from './components/Navbar'
import TraficanteNavbar from '../../traficante-app/src/components/Navbar'
import AdminRoute from './components/AdminRoute'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#2B2B2B' }}>
        <div className="loading" style={{ width: '40px', height: '40px' }}></div>
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        {/* ── PIRATA MARKET ── */}
        <Route path="/" element={<><Navbar user={user} /><Home /></>} />
        <Route path="/ficha/:slug" element={<><Navbar user={user} /><ListingDetail user={user} /></>} />
        <Route path="/publicar" element={<><Navbar user={user} /><CreateListing user={user} /></>} />
        <Route path="/dashboard" element={<><Navbar user={user} /><Dashboard user={user} /></>} />
        <Route path="/auth" element={<><Navbar user={user} /><Auth /></>} />
        <Route path="/ventas-tv" element={<><Navbar user={user} /><VentasTV /></>} />
        <Route path="/como-funciona" element={<><Navbar user={user} /><ComoFunciona /></>} />
        <Route path="/vendedor/:userId" element={<><Navbar user={user} /><SellerCatalog /></>} />
        <Route path="/legal" element={<><Navbar user={user} /><Legal /></>} />

        {/* ── ADMIN PIRATA MARKET ── */}
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/usuarios" element={<AdminRoute><AdminUsuarios /></AdminRoute>} />
        <Route path="/admin/anuncios" element={<AdminRoute><AdminAnuncios /></AdminRoute>} />
        <Route path="/admin/reportes" element={<AdminRoute><AdminReportes /></AdminRoute>} />

        {/* ── TRAFICANTE ── */}
        <Route path="/traficante" element={<><TraficanteNavbar user={user} /><TraficanteHome user={user} /></>} />
        <Route path="/traficante/buscar" element={<><TraficanteNavbar user={user} /><TraficanteBuscar user={user} /></>} />
        <Route path="/traficante/publicar-viaje" element={<><TraficanteNavbar user={user} /><TraficantePublicarViaje user={user} /></>} />
        <Route path="/traficante/viaje/:id" element={<><TraficanteNavbar user={user} /><TraficanteViajeDetalle user={user} /></>} />
        <Route path="/traficante/solicitud/:id" element={<><TraficanteNavbar user={user} /><TraficanteSolicitud user={user} /></>} />
        <Route path="/traficante/dashboard" element={<><TraficanteNavbar user={user} /><TraficanteDashboard user={user} /></>} />

        {/* ── ADMIN TRAFICANTE ── */}
        <Route path="/traficante/admin" element={<TraficanteAdminLogin />} />
        <Route path="/traficante/admin/dashboard" element={<AdminRoute><TraficanteAdminDashboard /></AdminRoute>} />
      </Routes>
    </Router>
  )
}

export default App
