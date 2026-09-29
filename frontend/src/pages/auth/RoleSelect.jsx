import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Truck, Wrench, CheckCircle2, ArrowRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import logo from '../../assets/trans-logo.png'
import { usePageTranslation } from '../../hooks/usePageTranslation'

const roles = [
  {
    id: 'transport',
    icon: <Truck size={24} />,
    iconColor: '#F59E0B',
    iconBg: '#FFFBEB',
    title: 'Transporter',
    titleHi: 'ट्रांसपोर्ट',
    desc: 'Manage trips, vehicles & billing',
    features: ['Trip management', 'Vehicle fleet', 'Route billing', 'Chalan upload'],
  },
  {
    id: 'garage',
    icon: <Wrench size={24} />,
    iconColor: '#7C3AED',
    iconBg: '#F5F3FF',
    title: 'Garage Owner',
    titleHi: 'गैरेज',
    desc: 'Manage services & repair billing',
    features: ['Service records', 'Spare parts', 'Reminders', 'Repair invoices'],
  },
]

export default function RoleSelect() {
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const { setRole, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const { getTranslatedText } = usePageTranslation([
    'Back', 'Choose Your Role', 'Select what best describes your business.', 'Included Features:',
    'Setting up...', 'Continue',
    ...roles.flatMap(r => [r.title, r.desc, ...r.features]),
  ])

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
      return
    }
    // If user already has a role, skip role selection — they cannot change it
    if (user?.role === 'transport' || user?.role === 'garage') {
      const dest = user.setupComplete ? `/${user.role}/dashboard` : `/register/${user.role}`
      navigate(dest, { replace: true })
    }
  }, [isAuthenticated, navigate, user?.role, user?.setupComplete])

  const handleContinue = async () => {
    if (!selected) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 600))
    await setRole(selected)
    // Continue signup: business registration → (vehicles) → subscription
    navigate(`/register/${selected}`, { replace: true })
  }

  return (
    <>
      {/* Header */}
      <div className="auth-card-header" style={{ marginBottom: 10, position: 'relative' }}>
        <button 
          onClick={() => navigate('/language-select')}
          style={{ position: 'absolute', left: 0, top: 0, background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 700 }}
        >
          <ArrowRight size={14} style={{ transform: 'rotate(180deg)' }} /> {getTranslatedText('Back')}
        </button>
        <div style={{
          width: 44, height: 44, borderRadius: 12, overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
          margin: '0 auto 8px'
        }}>
          <img src={logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <h2 className="auth-card-title" style={{ fontSize: '1.15rem' }}>{getTranslatedText('Choose Your Role')}</h2>
        <p className="auth-card-subtitle" style={{ fontSize: '0.75rem', marginTop: 2 }}>
          {getTranslatedText('Select what best describes your business.')}
        </p>
      </div>

      {/* Role cards */}
      <div className="role-grid">
        {roles.map((role, idx) => (
          <button
            key={role.id}
            id={`btn-role-${role.id}`}
            className={`role-card animate-fadeInUp stagger-${idx + 1} ${selected === role.id ? 'selected' : ''}`}
            onClick={() => setSelected(role.id)}
          >
            {/* Icon */}
            <div className="role-icon" style={{ background: role.iconBg, color: role.iconColor }}>
              {role.icon}
            </div>

            {/* Info container */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="role-title">
                  {getTranslatedText(role.title)}
                </div>
                {selected === role.id && <CheckCircle2 size={18} color="var(--primary)" fill="white" />}
              </div>
              <div className="role-desc">{getTranslatedText(role.desc)}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Features preview */}
      {selected && (
        <div
          className="animate-fadeInUp"
          style={{
            padding: '12px 16px', borderRadius: '16px', marginBottom: 12,
            background: 'white',
            border: '1px solid var(--primary-lighter)',
            boxShadow: '0 2px 10px rgba(124, 58, 237, 0.05)'
          }}
        >
          <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ background: 'var(--primary)', color: 'white', width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px' }}>✓</span>
            {getTranslatedText('Included Features:')}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
            {roles.find(r => r.id === selected)?.features.map(f => (
              <div key={f} style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', gap: 6, alignItems: 'center', fontWeight: 500 }}>
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--primary)', opacity: 0.4 }}></div> {getTranslatedText(f)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Continue button */}
      <div style={{ marginTop: 8 }}>
        <button
          id="btn-role-continue"
          className="btn btn-primary"
          style={{ 
            width: '100%', height: 46, borderRadius: 12, fontSize: '0.875rem', fontWeight: 800,
            boxShadow: selected ? '0 6px 15px rgba(124, 58, 237, 0.2)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
          }}
          onClick={handleContinue}
          disabled={!selected || loading}
        >
          {loading ? (
            <><Loader2 size={16} className="spin" /> {getTranslatedText('Setting up...')}</>
          ) : (
            <>{getTranslatedText('Continue')} <ArrowRight size={16} /></>
          )}
        </button>
      </div>

      <style>{`
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}
