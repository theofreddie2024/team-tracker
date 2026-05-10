import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import type { Role } from '../lib/types'

interface Props {
  requireRole?: Role
}

export default function ProtectedRoute({ requireRole }: Props) {
  const { session, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-500">
        Loading…
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-500">
        Setting up your profile…
      </div>
    )
  }

  if (requireRole && profile.role !== requireRole) {
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/'} replace />
  }

  return <Outlet />
}
