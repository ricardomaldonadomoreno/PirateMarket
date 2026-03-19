import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import './styles/globals.css'

// Pages
import Home from './pages/Home'
import ListingDetail from './pages/ListingDetail'
import CreateListing from './pages/CreateListing'
import Dashboard from './pages/Dashboard'
import Auth from './pages/Auth'
import VentasTV from './pages/VentasTV'
import ComoFunciona from './pages/ComoFunciona'
import SellerCatalog from './pages/SellerCatalog'

// Admin Pages
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsuarios from './pages/admin/AdminUsuarios'
import AdminAnuncios from './pages/admin/AdminAnuncios'
import AdminReportes from './pages/admin/AdminReportes'

// Components
import Navbar from './components/Navbar'
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#333333' }}>
        <div className="loading" style={{ width: '40px', height: '40px' }}></div>
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        {/* Rutas públicas con Navbar */}
        <Route path="/" element={<><Navbar user={user} /><Home /></>} />
        <Route path="/ficha/:slug" element={<><Navbar user={user} /><ListingDetail user={user} /></>} />
        <Route path="/publicar" element={<><Navbar user={user} /><CreateListing user={user} /></>} />
        <Route path="/dashboard" element={<><Navbar user={user} /><Dashboard user={user} /></>} />
        <Route path="/auth" element={<><Navbar user={user} /><Auth /></>} />
        <Route path="/ventas-tv" element={<><Navbar user={user} /><VentasTV /></>} />
        <Route path="/como-funciona" element={<><Navbar user={user} /><ComoFunciona /></>} />
        <Route path="/vendedor/:userId" element={<><Navbar user={user} /><SellerCatalog /></>} />

        {/* Rutas admin — sin Navbar público */}
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/usuarios" element={<AdminRoute><AdminUsuarios /></AdminRoute>} />
        <Route path="/admin/anuncios" element={<AdminRoute><AdminAnuncios /></AdminRoute>} />
        <Route path="/admin/reportes" element={<AdminRoute><AdminReportes /></AdminRoute>} />
      </Routes>
    </Router>
  )
}

export default App
