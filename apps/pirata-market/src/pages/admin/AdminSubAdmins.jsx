import { Navigate } from 'react-router-dom'

// AdminSubAdmins ahora redirige a /admin/home
// La gestión de sub-admins está integrada en el landing del hub
export default function AdminSubAdmins() {
  return <Navigate to="/admin/home" replace />
}
