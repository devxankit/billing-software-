import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PageLoader from '../components/PageLoader'

/**
 * ProtectedRoute — wraps any routes that need authentication
 * Props:
 *   requireRole — if set, user must have this role (or 'admin' bypasses)
 */
export default function ProtectedRoute({ requireRole }) {
  const { isAuthenticated, hasRole, user, loading } = useAuth()

  // While hydrating from localStorage, show spinner
  if (loading) return <PageLoader />

  // Not logged in → login page
  if (!isAuthenticated) return <Navigate to="/login" replace />

  // Logged in but no role selected yet → role select
  const path = window.location.pathname
  if (!hasRole && path !== '/role-select' && path !== '/language-select' && path !== '/referral-setup') {
    return <Navigate to="/role-select" replace />
  }

  // Role-gated route check
  if (requireRole && user?.role !== requireRole && user?.role !== 'admin') {
    // If mismatch, send to their own specific module home
    const dest = user?.role === 'admin' ? '/admin/dashboard' : '/dashboard'
    return <Navigate to={dest} replace />
  }

  // Role-specific Onboarding Enforcement removed so users can go directly to dashboard
  // and update profile / bank details later from the Profile section.

  return <Outlet />
}
