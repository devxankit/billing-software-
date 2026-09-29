import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Phone, ArrowRight, Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import logo from '../../assets/trans-logo.png'

export default function Login() {
  const [phone, setPhone]     = useState(() => localStorage.getItem('temp_login_phone') || '')
  const [error, setError]     = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const { sendOTP, sendingOTP, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const validate = () => {
    const digits = phone.replace(/\D/g, '')
    if (!/^[6-9]\d{9}$/.test(digits)) {
      setError('Wrong format. Please enter a valid Indian mobile number')
      return false
    }
    setError('')
    return true
  }

  const handleSend = async () => {
    if (!validate()) return
    const sanitizedPhone = phone.replace(/\D/g, '')
    const res = await sendOTP(sanitizedPhone)
    if (res.success) {
      localStorage.setItem('temp_login_phone', sanitizedPhone)
      localStorage.setItem('temp_is_new_user', res.isNewUser ? 'true' : 'false')
      const ttl = res.ttlSeconds || 300
      sessionStorage.setItem('otp_expires_at', String(Date.now() + ttl * 1000))
      navigate('/otp', { state: { phone: sanitizedPhone, isNewUser: res.isNewUser, ttlSeconds: ttl } })
    } else {
      setError(res.message || 'Could not send OTP. Please try again.')
    }
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSend() }

  const formatPhone = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 10)
    if (digits.length <= 5) return digits
    return `${digits.slice(0, 5)} ${digits.slice(5)}`
  }

  return (
    <div className="animate-fadeIn login-container" style={{ 
      width: '100%', 
      maxWidth: 480,
      margin: 'auto', 
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      minHeight: '100%'
    }}>
      {/* Header */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: 20
      }}>
        <div style={{ 
          width: 120, height: 120, borderRadius: 32, background: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px',
          boxShadow: '0 12px 36px rgba(0,0,0,0.1)', position: 'relative',
          border: '1.5px solid #F1F5F9',
          overflow: 'hidden', padding: 18, boxSizing: 'border-box'
        }}>
          <img src={logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <h2 style={{ 
          fontSize: '1.5rem', fontWeight: 950, color: '#0F172A', letterSpacing: '-0.04em', marginBottom: 4,
          background: 'linear-gradient(to right, #0F172A, #4C1D95)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
        }}>
          Welcome to TRANS
        </h2>
        <p style={{ fontSize: '0.8125rem', color: '#64748B', fontWeight: 600, lineHeight: 1.4 }}>
          Enter your mobile number to get started.<br />
          We'll send you a <span style={{ color: '#7C3AED', fontWeight: 800 }}>6-digit OTP</span>.
        </p>
      </div>

      {/* Main Login Card */}
      <div style={{ 
        background: 'white', padding: '24px 20px', borderRadius: 28, 
        border: '1px solid #F1F5F9', boxShadow: '0 20px 50px rgba(0,0,0,0.03)',
        position: 'relative'
      }}>
        <div className="form-group" style={{ marginBottom: 20 }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 850, color: '#1E293B', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, opacity: 0.8 }}>
            <Phone size={13} color="#7C3AED" /> MOBILE NUMBER
          </label>
          
          <div style={{ 
            height: 54, borderRadius: 16, display: 'flex', overflow: 'hidden', border: '2px solid',
            borderColor: error ? '#FECACA' : (isFocused ? '#7C3AED' : '#F1F5F9'),
            background: error ? '#FEF2F2' : (isFocused ? '#FDFDFF' : '#F9FAFB'),
            transition: 'all 0.25s ease',
            boxShadow: isFocused && !error ? '0 4px 12px rgba(124, 58, 237, 0.08)' : 'none'
          }}>
            <div style={{ 
              padding: '0 14px', background: error ? '#FEE2E2' : '#F1F5F9', 
              borderRight: '1px solid', borderColor: error ? '#FECACA' : '#E2E8F0',
              height: '100%', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0
            }}>
               <span style={{ fontSize: '0.9rem' }}>🇮🇳</span>
               <span style={{ fontWeight: 900, color: '#0F172A', fontSize: '0.875rem' }}>+91</span>
            </div>
            <input
              id="phone-input"
              type="tel"
              inputMode="numeric"
              placeholder="99999 99999"
              value={formatPhone(phone)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onChange={e => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 10)
                setPhone(val)
                localStorage.setItem('temp_login_phone', val)
                if (error) setError('')
              }}
              onKeyDown={handleKeyDown}
              className="login-input"
              style={{ border: 'none', background: 'transparent', width: '100%', height: '100%', fontSize: '1.0625rem', fontWeight: 800, padding: '0 16px', color: '#0F172A', outline: 'none' }}
            />
          </div>
          
          {error && (
            <div style={{ marginTop: 8, color: '#DC2626', fontSize: '0.7rem', fontWeight: 750, display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 4 }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}
        </div>

        <button
          id="btn-send-otp"
          onMouseDown={(e) => e.preventDefault()} // Prevents blur before click on desktop
          onClick={handleSend}
          disabled={sendingOTP || phone.replace(/\D/g, '').length < 10}
          className="btn btn-primary"
          style={{ 
            height: 56, width: '100%', borderRadius: 16, fontSize: '0.95rem', fontWeight: 900, 
            background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)', 
            boxShadow: '0 8px 24px rgba(124, 58, 237, 0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            border: 'none', color: 'white', cursor: 'pointer', transition: '0.2s',
            marginTop: 10
          }}
        >
          {sendingOTP ? (
            <><Loader2 size={18} className="spin" /> Sending...</>
          ) : (
            <>Get Authentication OTP <ArrowRight size={18} strokeWidth={2.5} /></>
          )}
        </button>

        <p style={{ textAlign: 'center', fontSize: '0.7rem', color: '#94A3B8', marginTop: 18, fontWeight: 600, lineHeight: 1.5 }}>
          Authorized access only. By continuing you agree to<br/>
          <Link to="/terms?type=terms" style={{ color: '#7C3AED', textDecoration: 'underline', textDecorationColor: 'rgba(124, 58, 237, 0.2)', fontWeight: 800 }}>Terms of Service</Link> and <Link to="/privacy?type=privacy" style={{ color: '#7C3AED', textDecoration: 'underline', textDecorationColor: 'rgba(124, 58, 237, 0.2)', fontWeight: 800 }}>Privacy Policy</Link>.
        </p>
      </div>

      <style>{`
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .btn:active { transform: scale(0.97); }
        .login-input::placeholder { color: #CBD5E1; font-weight: 500; }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        @media (max-width: 400px) {
           .login-container { transform: scale(0.95); margin-top: -10px; }
        }
      `}</style>
    </div>
  )
}
