import SharedNavbar from '../lib/shared/SharedNavbar'

export default function Navbar(props) {
  return (
    <SharedNavbar
      {...props}
      brandName={<><span className="luxury-gold">Pirata Market</span><span className="logo-suffix">By Buses App</span></>}
      brandLogo="/logo-ico.png"
      homeRoute="/"
      logoutRoute="/"
      i18nNamespace={undefined}
      primaryCta={{ to: '/publicar', labelKey: 'navbar.publish', className: 'btn-primary' }}
    />
  )
}
