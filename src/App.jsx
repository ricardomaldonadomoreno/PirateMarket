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

// Components
import Navbar from './components/Navbar'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#333333'
      }}>
        <div className="loading" style={{ width: '40px', height: '40px' }}></div>
      </div>
    )
  }

  return (
    <Router>
      <Navbar user={user} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/ficha/:slug" element={<ListingDetail user={user} />} />
        <Route path="/publicar" element={<CreateListing user={user} />} />
        <Route path="/dashboard" element={<Dashboard user={user} />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/ventas-tv" element={<VentasTV />} />
        <Route path="/como-funciona" element={<ComoFunciona />} />
      </Routes>
    </Router>
  )
}

export default App
