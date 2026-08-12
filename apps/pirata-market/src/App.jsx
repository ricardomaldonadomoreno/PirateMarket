import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import './styles/globals.css'

// Pages — Pirata Market
import Home from './pages/Home'
import ListingDetail from './pages/ListingDetail'
import CreateListing from './pages/CreateListing'
import Dashboard from './pages/Dashboard'
import DashboardVerificacion from './pages/DashboardVerificacion'
import DashboardTienda from './pages/DashboardTienda'
import DashboardDestacar from './pages/DashboardDestacar'
import Auth from './pages/Auth'
import VentasTV from './pages/VentasTV'
import ComoFunciona from './pages/ComoFunciona'
import SellerCatalog from './pages/SellerCatalog'
import Legal from './pages/Legal'
import MiPerfil from './pages/MiPerfil'

// Pages — Traficante
import TraficanteHome from '../../packer-app/src/pages/Home'
import TraficanteBuscar from '../../packer-app/src/pages/Buscar'
import TraficantePublicarViajero from '../../packer-app/src/pages/PublicarViajero'
import TraficantePublicarCompactador from '../../packer-app/src/pages/PublicarCompactador'
import TraficantePublicarFlete from '../../packer-app/src/pages/PublicarFlete'
import TraficanteDashboard from '../../packer-app/src/pages/Dashboard'
import TraficanteViajeDetalle from '../../packer-app/src/pages/ViajeDetalle'
import MiCuenta from '../../packer-app/src/pages/MiCuenta'
import MiCuentaVerificacion from '../../packer-app/src/pages/MiCuentaVerificacion'
import MiCuentaResenas from '../../packer-app/src/pages/MiCuentaResenas'
import MiCuentaNivel from '../../packer-app/src/pages/MiCuentaNivel'
import MiCuentaMisViajes from '../../packer-app/src/pages/MiCuentaMisViajes'
import TraficanteSolicitud from '../../packer-app/src/pages/Solicitud'
import TraficanteLegal from '../../packer-app/src/pages/Legal'

// Admin — Landing + SubAdmins
import AdminLogin from './pages/admin/AdminLogin'
import AdminLanding from './pages/admin/AdminLanding'
import AdminSubAdmins from './pages/admin/AdminSubAdmins'

// Admin — Pirata Market
import AdminDashboard from './pages/admin/pirata/AdminDashboard'
import AdminUsuarios from './pages/admin/pirata/AdminUsuarios'
import AdminAnuncios from './pages/admin/pirata/AdminAnuncios'
import AdminBanners from './pages/admin/pirata/AdminBanners'
import AdminCatalogos from './pages/admin/pirata/AdminCatalogos'

// Admin — Perfiles Generales
import AdminPerfiles from './pages/admin/AdminPerfiles'

// Admin — Traficante
import PackerAdminDashboard from './pages/admin/packer/PackerAdminDashboard'
import PackerAdminViajes from './pages/admin/packer/PackerAdminViajes'
import PackerAdminVerificaciones from './pages/admin/packer/PackerAdminVerificaciones'
import PackerAdminDestacados from './pages/admin/packer/PackerAdminDestacados'

// Components
import Navbar from './components/Navbar'
import TraficanteNavbar from '../../packer-app/src/components/Navbar'
import AdminRoute from './components/AdminRoute'

function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async (userId) => {
    if (!userId) return setProfile(null)
    const { data } = await supabase
      .from('users')
      .select('id, email, display_name, avatar_url, user_type, country')
      .eq('id', userId)
      .single()
    setProfile(data || null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      loadProfile(session?.user?.id ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      loadProfile(session?.user?.id ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#000000' }}>
        <div className="loading" style={{ width: '40px', height: '40px' }}></div>
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        {/* ── PIRATA MARKET ── */}
        <Route path="/" element={<><Navbar user={user} profile={profile} /><Home /></>} />
        <Route path="/ficha/:slug" element={<><Navbar user={user} profile={profile} /><ListingDetail user={user} /></>} />
        <Route path="/publicar" element={<><Navbar user={user} profile={profile} /><CreateListing user={user} /></>} />
        <Route path="/dashboard" element={<><Navbar user={user} profile={profile} /><Dashboard user={user} profile={profile} /></>}>
          <Route path="verificacion" element={<DashboardVerificacion user={user} profile={profile} onProfileUpdate={loadProfile} />} />
          <Route path="tienda" element={<DashboardTienda user={user} profile={profile} />} />
          <Route path="destacar" element={<DashboardDestacar user={user} profile={profile} />} />
        </Route>
        <Route path="/auth" element={<><Navbar user={user} profile={profile} /><Auth /></>} />
        <Route path="/ventas-tv" element={<><Navbar user={user} profile={profile} /><VentasTV /></>} />
        <Route path="/como-funciona" element={<><Navbar user={user} profile={profile} /><ComoFunciona /></>} />
        <Route path="/vendedor/:userId" element={<><Navbar user={user} profile={profile} /><SellerCatalog /></>} />
        <Route path="/legal" element={<><Navbar user={user} profile={profile} /><Legal /></>} />
        <Route path="/mi-perfil" element={<><Navbar user={user} profile={profile} /><MiPerfil user={user} onProfileUpdate={setProfile} /></>} />

        {/* ── ADMIN LANDING + SUB-ADMINS ── */}
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/home" element={<AdminRoute><AdminLanding /></AdminRoute>} />
        <Route path="/admin/sub-admins" element={<AdminRoute><AdminSubAdmins /></AdminRoute>} />

        {/* ── ADMIN PERFILES GENERALES ── */}
        <Route path="/admin/perfiles" element={<AdminRoute><AdminPerfiles /></AdminRoute>} />

        {/* ── ADMIN PIRATA MARKET ── */}
        <Route path="/admin/pirata" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/pirata/usuarios" element={<AdminRoute><AdminUsuarios /></AdminRoute>} />
        <Route path="/admin/pirata/anuncios" element={<AdminRoute><AdminAnuncios /></AdminRoute>} />
        <Route path="/admin/pirata/banners" element={<AdminRoute><AdminBanners /></AdminRoute>} />
        <Route path="/admin/pirata/catalogos" element={<AdminRoute><AdminCatalogos /></AdminRoute>} />

        {/* ── TRAFICANTE ── */}
        <Route path="/packer" element={<><TraficanteNavbar user={user} profile={profile} /><TraficanteHome user={user} /></>} />
        <Route path="/packer/buscar" element={<><TraficanteNavbar user={user} profile={profile} /><TraficanteBuscar user={user} /></>} />
        <Route path="/packer/publicar-viajero" element={<><TraficanteNavbar user={user} profile={profile} /><TraficantePublicarViajero user={user} /></>} />
        <Route path="/packer/publicar-compactador" element={<><TraficanteNavbar user={user} profile={profile} /><TraficantePublicarCompactador user={user} /></>} />
        <Route path="/packer/publicar-flete" element={<><TraficanteNavbar user={user} profile={profile} /><TraficantePublicarFlete user={user} /></>} />
        <Route path="/packer/viaje/:id" element={<><TraficanteNavbar user={user} profile={profile} /><TraficanteViajeDetalle user={user} /></>} />
        <Route path="/packer/solicitud/:id" element={<><TraficanteNavbar user={user} profile={profile} /><TraficanteSolicitud user={user} /></>} />
        <Route path="/packer/mi-cuenta" element={<><TraficanteNavbar user={user} profile={profile} /><MiCuenta user={user} onProfileUpdate={setProfile} /></>}>
          <Route path="viajes" element={<MiCuentaMisViajes user={user} />} />
          <Route path="verificacion" element={<MiCuentaVerificacion user={user} profile={profile} />} />
          <Route path="resenas" element={<MiCuentaResenas user={user} />} />
          <Route path="nivel" element={<MiCuentaNivel user={user} />} />
        </Route>
        <Route path="/packer/dashboard" element={<><TraficanteNavbar user={user} profile={profile} /><TraficanteDashboard user={user} /></>} />
        <Route path="/packer/legal" element={<><TraficanteNavbar user={user} profile={profile} /><TraficanteLegal /></>} />

        {/* ── ADMIN TRAFICANTE ── */}
        <Route path="/admin/packer" element={<AdminRoute><PackerAdminDashboard /></AdminRoute>} />
        <Route path="/admin/packer/viajes" element={<AdminRoute><PackerAdminViajes /></AdminRoute>} />
        <Route path="/admin/packer/verificaciones" element={<AdminRoute><PackerAdminVerificaciones /></AdminRoute>} />
        <Route path="/admin/packer/destacados" element={<AdminRoute><PackerAdminDestacados /></AdminRoute>} />
      </Routes>
    </Router>
  )
}

export default App
