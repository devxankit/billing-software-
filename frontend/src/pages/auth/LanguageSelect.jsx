import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Globe, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { useAuth } from '../../context/AuthContext'

import { usePageTranslation } from '../../hooks/usePageTranslation'

const languageOptions = [
  { id: 'en', label: 'English', native: 'English', icon: '🇺🇸' },
  { id: 'hi', label: 'Hindi', native: 'हिन्दी', icon: '🇮🇳' },
  { id: 'gu', label: 'Gujarati', native: 'ગુજરાતી', icon: '🇮🇳' },
  { id: 'mr', label: 'Marathi', native: 'मराठी', icon: '🇮🇳' },
  { id: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ', icon: '🇮🇳' },
  { id: 'ta', label: 'Tamil', native: 'தமிழ்', icon: '🇮🇳' },
  { id: 'te', label: 'Telugu', native: 'తెలుగు', icon: '🇮🇳' },
  { id: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ', icon: '🇮🇳' },
  { id: 'ml', label: 'Malayalam', native: 'മലയാളം', icon: '🇮🇳' },
  { id: 'bn', label: 'Bengali', native: 'বাংলা', icon: '🇮🇳' },
]

export default function LanguageSelect() {
  const { getTranslatedText } = usePageTranslation([
    'Choose Language', 'Select your preferred language.', 'Continue / जारी रखें', 'Processing...', 'Back'
  ])
  const { language, changeLanguage, isChangingLanguage } = useLanguage()
  const [selected, setSelected] = useState(language)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()

  // Sync with context if it changes externally
  useEffect(() => {
    setSelected(language)
  }, [language])

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const handleCardClick = (id) => {
    setSelected(id)
    changeLanguage(id)
  }

  const handleContinue = async () => {
    if (loading || isChangingLanguage) return
    
    setLoading(true)
    try {
      await new Promise(r => setTimeout(r, 600))
      
      if (isAuthenticated) {
        if (!user?.role) {
          navigate('/role-select')
        } else if (!user?.setupComplete) {
          navigate(`/register/${user.role}`)
        } else {
          navigate('/dashboard', { replace: true })
        }
      } else {
        navigate('/login', { replace: true })
      }
    } catch (error) {
      console.error("Language change failed:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fadeIn" style={{ 
      width: '100%', 
      maxWidth: 480, 
      margin: '0 auto',
      padding: 0,
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24, position: 'relative' }}>
        <button 
          onClick={() => navigate('/otp')}
          style={{ position: 'absolute', left: 0, top: 0, background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 700 }}
        >
          <ArrowRight size={14} style={{ transform: 'rotate(180deg)' }} /> {getTranslatedText('Back')}
        </button>
        <div style={{ 
          width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg, #7C3AED, #4F46E5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          boxShadow: '0 10px 25px rgba(124, 58, 237, 0.25)',
          color: 'white'
        }}>
          <Globe size={28} strokeWidth={2.5} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.03em', marginBottom: 8 }}>
          {getTranslatedText('Choose Language')}
        </h2>
        <p style={{ fontSize: '0.9rem', color: '#64748B', fontWeight: 600, lineHeight: 1.4 }}>
          {getTranslatedText('Select your preferred language.')}
        </p>
      </div>

      {/* Language Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(2, 1fr)', 
        gap: 12,
        marginBottom: 24,
        maxHeight: '46vh',
        overflowY: 'auto',
        padding: '4px',
        marginRight: '-4px'
      }}>
        {languageOptions.map((lang) => {
          const isActive = selected === lang.id
          return (
            <button
              key={lang.id}
              type="button"
              onClick={() => handleCardClick(lang.id)}
              style={{
                padding: '14px 10px',
                borderRadius: '20px',
                background: isActive ? '#F5F3FF' : '#F8FAFC',
                border: '2px solid',
                borderColor: isActive ? '#7C3AED' : 'transparent',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <div style={{ fontSize: '1.5rem' }}>{lang.icon}</div>
              <div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#1E293B' }}>{lang.native}</div>
                <div style={{ fontSize: '0.65rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>{lang.label}</div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Continue Button */}
      <button
        type="button"
        onClick={handleContinue}
        disabled={loading || isChangingLanguage}
        style={{ 
          width: '100%', height: 56, borderRadius: 18, 
          background: 'linear-gradient(135deg, #7C3AED, #4F46E5)',
          color: 'white', fontSize: '1.0625rem', fontWeight: 800, border: 'none',
          cursor: (loading || isChangingLanguage) ? 'not-allowed' : 'pointer', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          boxShadow: '0 10px 25px rgba(124, 58, 237, 0.3)', transition: 'all 0.2s',
          opacity: (loading || isChangingLanguage) ? 0.7 : 1
        }}
      >
        {loading ? (
          <><Loader2 size={20} className="spin" /> {getTranslatedText('Processing...')}</>
        ) : (
          <>{getTranslatedText('Continue / जारी रखें')} <ArrowRight size={20} /></>
        )}
      </button>

      <style>{`
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        button:active { transform: scale(0.96); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #E2E8F0; borderRadius: 10px; }
      `}</style>
    </div>
  )
}
