import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ShieldCheck, ArrowLeft, Loader2, AlertCircle, RefreshCw, Check, Clock } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const OTP_LENGTH = 6
const RESEND_TIMEOUT = 30
const DEFAULT_TTL = 300 // 5 minutes

export default function OTPVerify() {
  const [otp, setOtp] = useState('')
  const [timer, setTimer] = useState(RESEND_TIMEOUT)
  const [resending, setResending] = useState(false)
  const [localError, setLocalError] = useState('')
  const [shake, setShake] = useState(false)
  const inputRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { verifyOTP, sendOTP, logout, verifying, error } = useAuth()

  const phone = location.state?.phone || localStorage.getItem('temp_login_phone') || ''
  const isNewUser = location.state?.isNewUser ?? (localStorage.getItem('temp_is_new_user') === 'true')

  // Calculate remaining OTP validity in seconds based on sessionStorage
  const getRemainingValidity = useCallback(() => {
    const expiresAt = sessionStorage.getItem('otp_expires_at')
    if (!expiresAt) {
      const initialExpires = Date.now() + DEFAULT_TTL * 1000
      sessionStorage.setItem('otp_expires_at', String(initialExpires))
      return DEFAULT_TTL
    }
    const rem = Math.floor((parseInt(expiresAt, 10) - Date.now()) / 1000)
    return rem > 0 ? rem : 0
  }, [])

  const [validityTimer, setValidityTimer] = useState(getRemainingValidity)
  const [isExpired, setIsExpired] = useState(() => getRemainingValidity() <= 0)

  // If no phone, redirect to login
  useEffect(() => {
    if (!phone) navigate('/login', { replace: true })
  }, [phone, navigate])

  // Countdown for resend button (cooldown)
  useEffect(() => {
    if (timer <= 0) return
    const id = setInterval(() => setTimer(t => t - 1), 1000)
    return () => clearInterval(id)
  }, [timer])

  // Countdown for OTP expiration
  useEffect(() => {
    const id = setInterval(() => {
      const rem = getRemainingValidity()
      setValidityTimer(rem)
      if (rem <= 0) {
        setIsExpired(true)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [getRemainingValidity])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  const formatValidityTime = (totalSecs) => {
    const m = Math.floor(totalSecs / 60)
    const s = totalSecs % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const handleVerify = useCallback(async (otpStr) => {
    const code = otpStr || otp

    // Client-side validation: expired check
    if (isExpired || getRemainingValidity() <= 0) {
      setIsExpired(true)
      setLocalError('OTP has expired. Please request a new OTP.')
      triggerShake()
      return
    }

    // Client-side validation: length check
    if (!code || code.length < OTP_LENGTH) {
      setLocalError(`Please enter the complete ${OTP_LENGTH}-digit OTP`)
      triggerShake()
      return
    }

    const res = await verifyOTP(phone, code)
    if (res.success) {
      sessionStorage.removeItem('otp_expires_at')
      if (res.isNewUser) {
        navigate('/referral-setup', { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    } else {
      triggerShake()
      if (res.isExpired) {
        setIsExpired(true)
        setLocalError(res.message || 'OTP has expired. Please request a new OTP.')
      } else if (res.isInvalid) {
        const attemptsMsg = (res.attemptsLeft !== undefined && res.attemptsLeft > 0)
          ? ` (${res.attemptsLeft} attempt${res.attemptsLeft === 1 ? '' : 's'} remaining)`
          : ''
        setLocalError((res.message || 'Invalid OTP. Please check and try again.') + attemptsMsg)
      } else {
        setLocalError(res.message || 'Verification failed. Please try again.')
      }
      setOtp('')
      inputRef.current?.focus()
    }
  }, [otp, phone, isExpired, getRemainingValidity, verifyOTP, navigate])

  const handleOtpChange = (val) => {
    const digitOnly = val.replace(/\D/g, '').slice(0, OTP_LENGTH)
    setOtp(digitOnly)
    if (localError) setLocalError('')

    if (isExpired || getRemainingValidity() <= 0) {
      setIsExpired(true)
      setLocalError('OTP has expired. Please request a new OTP.')
      triggerShake()
      return
    }

    // Auto-verify if 6 digits entered
    if (digitOnly.length === OTP_LENGTH) {
      handleVerify(digitOnly)
    }
  }

  // Auto-fill: the browser reads the OTP SMS where it can (WebOTP), and the
  // mobile app can hand over the code (or the whole SMS text) via window.fillOtp
  const handleOtpChangeRef = useRef(handleOtpChange)
  handleOtpChangeRef.current = handleOtpChange

  useEffect(() => {
    const fill = (value) => {
      const code = String(value || '').match(/\b\d{6}\b/)?.[0]
      if (code) handleOtpChangeRef.current(code)
    }
    window.fillOtp = fill

    const abort = new AbortController()
    if ('OTPCredential' in window) {
      navigator.credentials.get({ otp: { transport: ['sms'] }, signal: abort.signal })
        .then(cred => fill(cred?.code))
        .catch(() => {})
    }
    window.flutter_inappwebview?.callHandler?.('listenForOtp')?.then?.(fill)?.catch?.(() => {})

    return () => {
      abort.abort()
      delete window.fillOtp
    }
  }, [])

  const handleResend = async () => {
    setResending(true)
    setOtp('')
    setLocalError('')
    inputRef.current?.focus()
    const res = await sendOTP(phone)
    if (res.success) {
      const ttl = res.ttlSeconds || DEFAULT_TTL
      const newExpiresAt = Date.now() + ttl * 1000
      sessionStorage.setItem('otp_expires_at', String(newExpiresAt))
      setValidityTimer(ttl)
      setIsExpired(false)
      setTimer(RESEND_TIMEOUT)
    } else {
      setLocalError(res.message || 'Failed to resend OTP. Please try again.')
      triggerShake()
    }
    setResending(false)
  }

  const displayPhone = phone
    ? `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`
    : ''

  const displayError = localError || error
  const isOtpError = !!displayError && !displayError?.toLowerCase().includes('referral')

  return (
    <div className="animate-fadeIn" style={{ maxWidth: 440, margin: '0 auto', padding: 0 }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{
          width: 60, height: 60, borderRadius: 20, background: isExpired ? '#FEF2F2' : '#F5F3FF',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px',
          boxShadow: isExpired ? '0 8px 30px rgba(239, 68, 68, 0.15)' : '0 8px 30px rgba(124, 58, 237, 0.1)',
          position: 'relative',
          transition: 'all 0.3s ease'
        }}>
          {isExpired ? (
            <AlertCircle size={28} color="#DC2626" strokeWidth={2.5} />
          ) : (
            <ShieldCheck size={28} color="#7C3AED" strokeWidth={2.5} />
          )}
          <div style={{
            position: 'absolute', bottom: -4, right: -4, width: 22, height: 22,
            borderRadius: '50%', background: isExpired ? '#DC2626' : '#7C3AED', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: 'white', border: '3px solid white',
            transition: 'background 0.3s ease'
          }}>
            {isExpired ? (
              <RefreshCw size={11} strokeWidth={3} />
            ) : (
              <Check size={12} strokeWidth={4} />
            )}
          </div>
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: 6 }}>
          Verify OTP
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#64748B', fontWeight: 500 }}>
          We sent a 6-digit code to<br />
          <strong style={{ color: '#1E293B', fontSize: '0.9375rem' }}>{displayPhone}</strong>
        </p>
      </div>

      {/* Form Card */}
      <div className="otp-card" style={{
        background: 'white', padding: '24px 20px', borderRadius: 28,
        border: '1px solid #F1F5F9', boxShadow: '0 20px 50px rgba(0,0,0,0.04)',
        margin: '0 10px'
      }}>
        {/* Expiration Banner / Timer */}
        {isExpired ? (
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: 14,
            padding: '10px 14px',
            marginBottom: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#B91C1C', fontSize: '0.85rem', fontWeight: 600 }}>
              <AlertCircle size={18} color="#DC2626" />
              <span>OTP has expired</span>
            </div>
            <button
              id="btn-quick-resend"
              onClick={handleResend}
              disabled={resending}
              style={{
                background: '#DC2626',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              <RefreshCw size={12} className={resending ? 'spin' : ''} />
              {resending ? 'Sending...' : 'Resend Code'}
            </button>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            marginBottom: 20,
            fontSize: '0.8125rem',
            color: validityTimer < 60 ? '#DC2626' : '#64748B',
            fontWeight: 600,
            background: validityTimer < 60 ? '#FEF2F2' : '#F8FAFC',
            padding: '6px 12px',
            borderRadius: 20,
            width: 'fit-content',
            margin: '0 auto 20px'
          }}>
            <Clock size={14} color={validityTimer < 60 ? '#DC2626' : '#7C3AED'} />
            <span>Valid for <strong style={{ color: validityTimer < 60 ? '#DC2626' : '#1E293B', fontFamily: 'monospace', fontSize: '0.875rem' }}>{formatValidityTime(validityTimer)}</strong></span>
          </div>
        )}

        {/* Single OTP Input (Hidden but functional for Autofill) */}
        <div className="form-group" style={{ marginBottom: 28, textAlign: 'center', position: 'relative' }}>
          <div style={{ position: 'relative', maxWidth: 260, margin: '0 auto' }}>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={OTP_LENGTH}
              value={otp}
              onChange={e => handleOtpChange(e.target.value)}
              autoComplete="one-time-code"
              disabled={isExpired}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                zIndex: 10,
                cursor: isExpired ? 'not-allowed' : 'default',
                fontSize: '16px', // Prevents iOS zoom
                color: 'transparent',
                background: 'transparent',
                caretColor: 'transparent',
                border: 'none',
                outline: 'none',
                padding: 0,
                margin: 0
              }}
            />

            {/* Visual 6-Box UI with Shake on Error */}
            <div className={`otp-input-container ${shake ? 'shake' : ''}`} style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 5,
              position: 'relative',
              zIndex: 5
            }}>
              {[...Array(6)].map((_, i) => {
                const isCurrent = otp.length === i && !isExpired
                const isFilled = otp.length > i
                const boxBorderColor = isOtpError
                  ? '#EF4444'
                  : isExpired
                    ? '#FCA5A5'
                    : isCurrent
                      ? '#7C3AED'
                      : isFilled
                        ? '#7C3AED'
                        : '#E2E8F0'
                const boxBackground = isOtpError
                  ? '#FEF2F2'
                  : isExpired
                    ? '#F8FAFC'
                    : isFilled
                      ? '#F5F3FF'
                      : '#FFFFFF'

                return (
                  <div
                    key={i}
                    className="otp-input-box"
                    style={{
                      width: 36,
                      height: 48,
                      borderRadius: 12,
                      border: '2.5px solid',
                      borderColor: boxBorderColor,
                      background: boxBackground,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.125rem',
                      fontWeight: 900,
                      color: isOtpError ? '#DC2626' : '#0F172A',
                      boxShadow: isCurrent ? '0 10px 25px rgba(124, 58, 237, 0.15)' : '0 2px 4px rgba(0,0,0,0.02)',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: isCurrent ? 'translateY(-4px)' : 'none'
                    }}
                  >
                    {otp[i] || ''}
                    {isCurrent && (
                      <div style={{ width: 3, height: 20, background: '#7C3AED', animation: 'blink 1s infinite', borderRadius: 2 }} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {displayError && (
            <div className="form-error" style={{
              justifyContent: 'center',
              marginTop: 16,
              color: '#DC2626',
              fontSize: '0.8rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{displayError}</span>
            </div>
          )}
        </div>

        {/* Verify / Resend Button */}
        <button
          id="btn-verify-otp"
          className="btn btn-primary btn-lg btn-full"
          onClick={() => (isExpired ? handleResend() : handleVerify())}
          disabled={verifying || (!isExpired && otp.length < OTP_LENGTH)}
          style={{
            height: 56,
            borderRadius: 16,
            fontSize: '0.95rem',
            fontWeight: 800,
            background: isExpired
              ? 'linear-gradient(135deg, #DC2626, #B91C1C)'
              : 'linear-gradient(135deg, #7C3AED, #6D28D9)',
            boxShadow: isExpired
              ? '0 10px 25px rgba(220, 38, 38, 0.25)'
              : '0 10px 25px rgba(124, 58, 237, 0.3)',
            transition: 'all 0.3s ease'
          }}
        >
          {verifying ? (
            <><Loader2 size={20} className="spin" /> Verifying...</>
          ) : isExpired ? (
            <><RefreshCw size={18} className={resending ? 'spin' : ''} /> Resend Expired OTP</>
          ) : (
            'Verify & Continue'
          )}
        </button>

        {/* Actions */}
        <div className="otp-actions">
          <button
            id="btn-change-number"
            onClick={() => {
              logout()
              navigate('/login')
            }}
            className="btn btn-ghost"
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
              fontSize: '0.85rem', fontWeight: 700, color: '#64748B', border: '1px solid #F1F5F9', borderRadius: 12,
            }}
          >
            <ArrowLeft size={16} /> <span>Change Number</span>
          </button>

          {timer > 0 ? (
            <div style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: 600 }}>
              Resend in <span style={{ color: '#7C3AED' }}>{timer}s</span>
            </div>
          ) : (
            <button
              id="btn-resend-otp"
              onClick={handleResend}
              disabled={resending}
              className="btn btn-ghost"
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
                fontSize: '0.85rem', fontWeight: 700, color: '#7C3AED', border: '1px solid #EDE9FE', borderRadius: 12,
              }}
            >
              <RefreshCw size={16} className={resending ? 'spin' : ''} />
              {resending ? 'Sending...' : 'Resend OTP'}
            </button>
          )}
        </div>
      </div>

      <style>{`
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes blink { 50% { opacity: 0; } }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .shake {
          animation: shake 0.4s ease-in-out;
        }
        
        .otp-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 24px;
          gap: 10px;
        }

        @media (max-width: 400px) {
          .otp-actions { flex-direction: column-reverse; gap: 12px; }
          .otp-actions > button, .otp-actions > div { width: 100%; justify-content: center; display: flex; }
        }

        @media (max-width: 360px) {
          .otp-card { padding: 24px 12px !important; }
          .otp-input-container { gap: 4px !important; }
          .otp-input-box { width: 32px !important; height: 42px !important; font-size: 1rem !important; }
        }

        @media (max-width: 320px) {
          .otp-input-container { gap: 3px !important; }
          .otp-input-box { width: 30px !important; height: 40px !important; font-size: 0.95rem !important; }
        }
      `}</style>
    </div>
  )
}
