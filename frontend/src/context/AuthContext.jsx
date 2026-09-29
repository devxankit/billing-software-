import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { sendOtp, verifyOtp as verifyOtpApi, setUserRole, updateUserProfile, transportRegister, garageRegister, getMe, logoutApi, adminLogoutApi, deleteAccount as deleteAccountApi } from '../api/authApi'
import { requestNotificationPermission, listenForMessages, removeNotificationToken } from '../services/pushNotificationService'

const AuthContext = createContext(null)

function stripLargeFields(u) {
  if (!u) return u
  const {
    // keep known-small, app-critical fields
    id, phone, name, role, businessName, setupComplete, slogan,
    email, address, city, state, pincode, panNo, gstin, aadharNo,
    bankDetails, logoUrl, signatureUrl, documents, alternatePhone,
    subscriptionActive, subscriptionExpiry, planName, allowedVehicles,
    wishingName, brandColor, wishingColor, repairDetailsLabel,
    // drop anything else potentially large
    ...rest
  } = u

  const safe = {
    id, phone, name, role, businessName, setupComplete, slogan,
    email, address, city, state, pincode, panNo, gstin, aadharNo,
    bankDetails, alternatePhone,
    subscriptionActive, subscriptionExpiry, planName, allowedVehicles, wishingName,
    brandColor: brandColor || '#000000',
    wishingColor: wishingColor || '#444444',
    repairDetailsLabel: repairDetailsLabel || null,
    logoUrl: typeof logoUrl === 'string' && logoUrl.startsWith('data:') ? null : (logoUrl || null),
    signatureUrl: typeof signatureUrl === 'string' && signatureUrl.startsWith('data:') ? null : (signatureUrl || null),
    documents: documents && typeof documents === 'object' ? documents : undefined,
  }

  // remove undefined keys
  Object.keys(safe).forEach(k => safe[k] === undefined && delete safe[k])
  // prevent accidental huge objects getting persisted
  void rest
  return safe
}

function safeSetBillingUser(u) {
  try {
    localStorage.setItem('billing_user', JSON.stringify(stripLargeFields(u)))
  } catch (e) {
    // if quota exceeded, fall back to minimal identity
    try {
      const minimal = u ? { id: u.id, phone: u.phone, role: u.role, name: u.name, businessName: u.businessName } : null
      if (minimal) localStorage.setItem('billing_user', JSON.stringify(minimal))
      else localStorage.removeItem('billing_user')
    } catch (_) {
      try { localStorage.removeItem('billing_user') } catch (_) { /* ignore */ }
    }
  }
}

export function AuthProvider({ children }) {
  const navigate = useNavigate()
  const [user, setUser]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [sendingOTP, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError]       = useState('')
  const [adminModule, setAdminModule] = useState(localStorage.getItem('admin_module') || 'Transport')

  useEffect(() => {
    let cancelled = false

    async function hydrate() {
      const token = localStorage.getItem('access_token')
      const refreshToken = localStorage.getItem('refresh_token')

      try {
        const saved = localStorage.getItem('billing_user')
        if (saved && (token || refreshToken)) {
          setUser(JSON.parse(saved))
          // Optimistic UI: Stop loading immediately if we have cached data
          if (!cancelled) setLoading(false)
        } else if (!token && !refreshToken) {
          localStorage.removeItem('billing_user')
          setUser(null)
        }
      } catch (_) {
        localStorage.removeItem('billing_user')
      }

      // If user has no tokens or is on public login/auth pages, do not make background auth API calls
      const isPublicAuthPage = ['/login', '/admin', '/admin-login', '/otp'].includes(window.location.pathname)
      if ((!token && !refreshToken) || isPublicAuthPage) {
        if (!cancelled) setLoading(false)
        return
      }

      try {
        const me = await getMe()
        if (!cancelled && me?.success) {
          const profile = me.user || me.admin
          if (profile) {
            setUser(profile)
            safeSetBillingUser(profile)
          }
        }
      } catch (_) {
        // If access token is expired, apiClient interceptor will refresh and retry once.
        // If refresh fails, it redirects to /login and clears storage.
      } finally {
        if (!cancelled) setLoading(false)
        if (!cancelled && localStorage.getItem('access_token')) {
          requestNotificationPermission()
          listenForMessages()
        }
      }
    }

    hydrate()
    return () => { cancelled = true }
  }, [])

  const clearError = useCallback(() => setError(''), [])

  const sendOTP = useCallback(async (phone) => {
    setSending(true)
    setError('')
    try {
      const res = await sendOtp(phone)
      return res
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to send OTP. Please try again.'
      setError(msg)
      return { success: false, message: msg }
    } finally {
      setSending(false)
    }
  }, [])

  const verifyOTP = useCallback(async (phone, otp, referralCode) => {
    setVerifying(true)
    setError('')
    try {
      const res = await verifyOtpApi(phone, otp, referralCode)
      if (res.success) {
        setUser(res.user)
        safeSetBillingUser(res.user)
        if (res.accessToken) localStorage.setItem('access_token', res.accessToken)
        if (res.refreshToken) localStorage.setItem('refresh_token', res.refreshToken)
        requestNotificationPermission()
        listenForMessages()
      } else {
        setError(res.message)
      }
      return res
    } catch (e) {
      const data = e.response?.data
      const msg = data?.message || 'Verification failed. Please try again.'
      const code = data?.code
      const reason = data?.reason
      setError(msg)
      return {
        success: false,
        message: msg,
        code,
        reason,
        isExpired: code === 'OTP_EXPIRED' || reason === 'EXPIRED' || reason === 'NOT_FOUND' || reason === 'MAX_ATTEMPTS',
        isInvalid: code === 'OTP_INVALID' || reason === 'INVALID',
        attemptsLeft: data?.attemptsLeft,
      }
    } finally {
      setVerifying(false)
    }
  }, [])

  const setRole = useCallback(async (role) => {
    try {
      const saved = localStorage.getItem('billing_user')
      const phone = saved ? JSON.parse(saved)?.phone : user?.phone
      if (phone) {
        const res = await setUserRole(phone, role)
        if (res.success) {
          if (res.accessToken) localStorage.setItem('access_token', res.accessToken)
          setUser(res.user)
          safeSetBillingUser(res.user)
          return res
        }
      }
    } catch (e) {
      console.error('Set role failed:', e)
    }
  }, [user])

  const updateProfile = useCallback(async (profileData) => {
    try {
      const { updateProfile: updateProfileApi } = await import('../api/profileApi')
      const res = await updateProfileApi(profileData)
      
      if (res.success && res.user) {
        setUser(res.user)
        safeSetBillingUser(res.user)
        return res
      }
      return res
    } catch (e) {
      console.error('Update profile API failed:', e)
      return { success: false, message: e.message }
    }
  }, [])

  const completeTransportSetup = useCallback(async (profileData) => {
    try {
      const res = await transportRegister(profileData)
      if (res.success) {
        if (res.accessToken) localStorage.setItem('access_token', res.accessToken)
        setUser(res.user)
        safeSetBillingUser(res.user)
      }
      return res
    } catch (e) {
      return { success: false, message: 'Registration failed' }
    }
  }, [])

  const completeGarageSetup = useCallback(async (profileData) => {
    try {
      const res = await garageRegister(profileData)
      if (res.success) {
        if (res.accessToken) localStorage.setItem('access_token', res.accessToken)
        setUser(res.user)
        safeSetBillingUser(res.user)
      }
      return res
    } catch (e) {
      return { success: false, message: 'Registration failed' }
    }
  }, [])

  const logout = useCallback(async () => {
    const role = user?.role
    
    // 0. Remove notification token before clearing user
    await removeNotificationToken()

    // 1. Immediate UI update
    setUser(null)
    
    // 2. Clear ALL local storage items related to session
    localStorage.removeItem('billing_user')
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('admin_module')
    localStorage.removeItem('view_mode')
    
    // 3. Optional: API call to revoke token on backend
    try {
      if (role === 'admin') await adminLogoutApi()
      else await logoutApi()
    } catch (_) { /* ignore */ }

    // 4. Navigate to login page softly to avoid hard reload
    navigate(role === 'admin' ? '/admin' : '/login', { replace: true })
  }, [user?.role, navigate])

  const deleteAccount = useCallback(async () => {
    try {
      const res = await deleteAccountApi()
      if (res.success) {
        await logout()
        return res
      }
      return res
    } catch (e) {
      console.error('Delete account failed:', e)
      return { success: false, message: e.message }
    }
  }, [logout])

  const switchAdminModule = useCallback((moduleName) => {
    setAdminModule(moduleName)
    localStorage.setItem('admin_module', moduleName)
  }, [])

  const login = useCallback(async (userData) => {
    setUser(userData)
    localStorage.setItem('billing_user', JSON.stringify(userData))
    // Note: access_token and refresh_token are typically set by the caller (like the login component)
    return { success: true, user: userData }
  }, [])

  const value = {
    user,
    loading,
    sendingOTP,
    verifying,
    error,
    clearError,
    sendOTP,
    verifyOTP,
    setRole,
    updateProfile,
    completeTransportSetup,
    completeGarageSetup,
    logout,
    deleteAccount,
    login,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isTransport: user?.role === 'transport',
    isGarage: user?.role === 'garage',
    hasRole: !!user?.role,
    adminModule,
    switchAdminModule,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
