import SharedNavbar from '../../../pirata-market/src/lib/shared/SharedNavbar'
import './Navbar.css'

export default function TraficanteNavbar(props) {
  return (
    <SharedNavbar
      {...props}
      brandName={<><span className="packer-gold">Packer</span><br /><span className="logo-suffix traficante-by">by buses app</span></>}
      brandLogo="/packer/logoPNG.png"
      homeRoute="/packer"
      logoutRoute="/packer"
      i18nNamespace="traficante"
      navClass="traficante-navbar"
    />
  )
}
