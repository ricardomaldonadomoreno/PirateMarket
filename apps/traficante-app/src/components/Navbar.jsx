import SharedNavbar from '../../../pirata-market/src/lib/shared/SharedNavbar'
import './Navbar.css'

export default function TraficanteNavbar(props) {
  return (
    <SharedNavbar
      {...props}
      brandName={<><span className="traficante-gold">Traficante</span><br /><span className="logo-suffix traficante-by">by buses app</span></>}
      brandLogo="/traficante/logoPNG.png"
      homeRoute="/traficante"
      logoutRoute="/traficante"
      i18nNamespace="traficante"
      navClass="traficante-navbar"
    />
  )
}
