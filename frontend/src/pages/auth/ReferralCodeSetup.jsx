import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Gift, Loader2, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react'
import { applyReferralCode } from '../../api/referralApi'
import { useAuth } from '../../context/AuthContext'

export default function ReferralCodeSetup() {
  const [referralCode, setReferralCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const navigate = useNavigate()
  const { logout } = useAuth()

  useEffect(() => {
    window.history.pushState(null, null, window.location.pathname);
    const handlePopState = async () => {
      await logout();
      navigate('/login', { replace: true });
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [logout, navigate]);

  const handleApply = async () => {
    if (!referralCode.trim()) {
      setError('Please enter a referral code')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await applyReferralCode(referralCode.trim().toUpperCase())
      if (res.success) {
        navigate('/language-select', { replace: true })
      } else {
        setError(res.message || 'Invalid referral code')
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to apply referral code')
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    navigate('/language-select', { replace: true })
  }

  return (
    <div className="animate-fadeIn" style={{ maxWidth: 440, margin: '0 auto', paddingBottom: isFocused ? '40vh' : 0, transition: 'padding 0.3s ease', position: 'relative' }}>
      {/* Back Button */}
      <button 
        id="btn-back-referral"
        onClick={async () => {
          await logout()
          navigate('/login')
        }}
        style={{
          position: 'absolute', left: 16, top: 0, width: 40, height: 40,
          borderRadius: 12, background: 'white', border: '1px solid #F1F5F9',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          zIndex: 99, color: '#64748B'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color = '#7C3AED'
          e.currentTarget.style.borderColor = '#EDE9FE'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = '#64748B'
          e.currentTarget.style.borderColor = '#F1F5F9'
        }}
      >
        <ArrowLeft size={20} strokeWidth={2.5} />
      </button>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ 
          width: 60, height: 60, borderRadius: 20, background: '#F5F3FF',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px',
          boxShadow: '0 8px 30px rgba(124, 58, 237, 0.1)', position: 'relative'
        }}>
          <Gift size={28} color="#7C3AED" strokeWidth={2.5} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: 6 }}>
          Have a Referral Code?
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#64748B', fontWeight: 500 }}>
          Enter it below to get exclusive rewards
        </p>
      </div>

      <div style={{ 
        background: 'white', padding: '24px 20px', borderRadius: 28, 
        border: '1px solid #F1F5F9', boxShadow: '0 20px 50px rgba(0,0,0,0.04)',
        margin: '0 10px'
      }}>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            REFERRAL CODE
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="e.g. TRANS1234"
              value={referralCode}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onChange={(e) => {
                setReferralCode(e.target.value.toUpperCase())
                setError('')
              }}
              style={{
                width: '100%', height: 52, borderRadius: 12, border: '2px solid',
                padding: '0 16px 0 44px', fontSize: '1rem', fontWeight: 700, color: '#1E293B',
                outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box',
                background: error ? '#FEF2F2' : '#F9FAFB',
                borderColor: error ? '#EF4444' : (referralCode ? '#7C3AED' : '#F1F5F9')
              }}
            />
            <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: error ? '#EF4444' : '#7C3AED' }}>
              <Gift size={20} />
            </div>
          </div>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#DC2626', fontSize: '0.8rem', fontWeight: 600, marginTop: 8 }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={handleApply}
            disabled={loading || !referralCode.trim()}
            className="btn btn-primary btn-full"
            style={{ 
              height: 52, borderRadius: 16, fontSize: '0.95rem', fontWeight: 800, 
              background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', 
              boxShadow: '0 10px 25px rgba(124, 58, 237, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}
          >
            {loading ? <Loader2 size={20} className="spin" /> : 'Apply Code'}
          </button>
          
          <button
            onClick={handleSkip}
            disabled={loading}
            className="btn btn-ghost btn-full"
            style={{ 
              height: 52, borderRadius: 16, fontSize: '0.95rem', fontWeight: 700, 
              color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              border: '1px solid transparent', backgroundColor: '#F8FAFC'
            }}
          >
            Skip for now <ArrowRight size={16} />
          </button>
        </div>
      </div>
      <style>{`
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
