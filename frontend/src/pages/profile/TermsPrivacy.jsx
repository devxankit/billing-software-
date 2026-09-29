import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ShieldCheck, FileText, Info, CheckCircle2, User, CreditCard } from 'lucide-react'
import { usePageTranslation } from '../../hooks/usePageTranslation'

function Section({ title, icon: Icon, children }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h4 style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 12px', fontWeight: 800, fontSize: '1rem', color: '#1E293B' }}>
        <Icon size={18} color="var(--primary)" /> {title}
      </h4>
      <p style={{ margin: 0, fontSize: '0.9375rem', color: '#64748B', lineHeight: 1.6, paddingLeft: 28 }}>
        {children}
      </p>
    </div>
  )
}

export default function TermsPrivacy() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const currentPath = window.location.pathname
  const type = searchParams.get('type') || (currentPath.includes('privacy') ? 'privacy' : 'terms')
  
  const { getTranslatedText } = usePageTranslation([
    'Privacy Policy', 'Terms of Service', 'Back', 'Last updated: 01 May 2026',
    '1. Data Collection', 'We collect information you provide directly to us, such as when you create an account, update your business profile, or contact customer support.',
    '2. How We Use Data', 'The information we collect is used to provide, maintain, and improve our billing and transport management services.',
    '3. Data Security', 'We use industry-standard encryption and security measures to protect your personal and business data.',
    '4. Third-Party Sharing', 'We do not sell your personal data. We may share information with verified payment processors.',
    '1. Acceptance of Terms', 'By accessing or using the Trans platform, you agree to be bound by these Terms of Service.',
    '2. User Responsibilities', 'Users must provide accurate business information. You are solely responsible for the legality of the invoices generated.',
    '3. Subscription & Payments', 'Subscriptions are billed on a yearly basis. All payments are non-refundable.',
    '4. Intellectual Property', 'All logos, software code, and design elements are the property of Trans.',
    'Questions? Contact our support team', 'transbilling.support@gmail.com'
  ])

  const isPrivacy = type === 'privacy'
  const title = isPrivacy ? getTranslatedText('Privacy Policy') : getTranslatedText('Terms of Service')
  const Icon = isPrivacy ? ShieldCheck : FileText

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/login')
  }

  return (
    // Full-height column: header stays fixed, only the content below scrolls
    <div className="animate-fadeIn" style={{ height: '100dvh', display: 'flex', flexDirection: 'column', maxWidth: 800, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 36, padding: 'calc(env(safe-area-inset-top, 0px) + 16px) 16px 16px' }}>
        <button onClick={handleBack} style={{
          position: 'absolute', left: 16,
          width: 36, height: 36, borderRadius: 10, border: 'none',
          background: 'rgba(0,0,0,0.06)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280'
        }}>
          <ArrowLeft size={18} />
        </button>
        <h2 style={{ fontWeight: 800, fontSize: '1.25rem', color: '#0F0D2E', margin: 0, textAlign: 'center' }}>{title}</h2>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 16px 60px' }}>
      <div className="card" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(37, 99, 235, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
            <Icon size={28} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.125rem' }}>{title}</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#6B7280' }}>TRANS Billing Solutions</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {isPrivacy ? (
            <>
              <Section title={getTranslatedText('1. Data Collection')} icon={Info}>
                {getTranslatedText('We collect information you provide directly to us, such as when you create an account, update your business profile, or contact customer support.')}
              </Section>
              <Section title={getTranslatedText('2. How We Use Data')} icon={CheckCircle2}>
                {getTranslatedText('The information we collect is used to provide, maintain, and improve our billing and transport management services.')}
              </Section>
              <Section title={getTranslatedText('3. Data Security')} icon={ShieldCheck}>
                {getTranslatedText('We use industry-standard encryption and security measures to protect your personal and business data.')}
              </Section>
              <Section title={getTranslatedText('4. Third-Party Sharing')} icon={User}>
                {getTranslatedText('We do not sell your personal data. We may share information with verified payment processors.')}
              </Section>
            </>
          ) : (
            <>
              <Section title={getTranslatedText('1. Acceptance of Terms')} icon={CheckCircle2}>
                {getTranslatedText('By accessing or using the Trans platform, you agree to be bound by these Terms of Service.')}
              </Section>
              <Section title={getTranslatedText('2. User Responsibilities')} icon={User}>
                {getTranslatedText('Users must provide accurate business information. You are solely responsible for the legality of the invoices generated.')}
              </Section>
              <Section title={getTranslatedText('3. Subscription & Payments')} icon={CreditCard}>
                {getTranslatedText('Subscriptions are billed on a yearly basis. All payments are non-refundable.')}
              </Section>
              <Section title={getTranslatedText('4. Intellectual Property')} icon={ShieldCheck}>
                {getTranslatedText('All logos, software code, and design elements are the property of Trans.')}
              </Section>
            </>
          )}
        </div>

        <div style={{ marginTop: 48, paddingTop: 32, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 600, marginBottom: 24 }}>{getTranslatedText('Last updated: 01 May 2026')}</div>
          <p style={{ margin: '0 0 8px', fontSize: '0.9375rem', fontWeight: 700 }}>{getTranslatedText('Questions? Contact our support team')}</p>
          <a 
            href="mailto:transbilling.support@gmail.com" 
            style={{ 
              color: 'var(--primary)', 
              fontWeight: 800, 
              textDecoration: 'underline',
              fontSize: '1rem',
              display: 'inline-block',
              padding: '4px 8px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            transbilling.support@gmail.com
          </a>
        </div>
      </div>
      </div>
    </div>
  )
}
