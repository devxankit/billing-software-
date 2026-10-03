import { useMemo } from 'react'
import { UserCircle, Building2, CreditCard, QrCode, ChevronRight, LogOut, Zap, Calendar, PenTool, Share2, HelpCircle, ShieldCheck, FileText, Trash2, Globe } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import { useLanguage } from '../../contexts/LanguageContext'
import TranslatedText from '../../components/TranslatedText'
import { usePageTranslation } from '../../hooks/usePageTranslation'
import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Search as SearchIcon, X as CloseIcon } from 'lucide-react'
import dayjs from 'dayjs'
import { getReferralStats } from '../../api/referralApi'

// menuItems will be handled inside the component with t()

const languageOptions = [
  { id: 'en', label: 'English', native: 'English', icon: '🇺🇸' },
  { id: 'hi', label: 'Hindi', native: 'हिन्दी', icon: '🇮🇳' },
  { id: 'gu', label: 'Gujarati', native: 'Gujarati', nativeLabel: 'ગુજરાતી', icon: '🇮🇳' },
  { id: 'mr', label: 'Marathi', native: 'Marathi', nativeLabel: 'मराठी', icon: '🇮🇳' },
  { id: 'pa', label: 'Punjabi', native: 'Punjabi', nativeLabel: 'ਪੰਜਾਬੀ', icon: '🇮🇳' },
  { id: 'ta', label: 'Tamil', native: 'Tamil', nativeLabel: 'தமிழ்', icon: '🇮🇳' },
  { id: 'te', label: 'Telugu', native: 'Telugu', nativeLabel: 'తెలుగు', icon: '🇮🇳' },
  { id: 'kn', label: 'Kannada', native: 'Kannada', nativeLabel: 'ಕನ್ನಡ', icon: '🇮🇳' },
  { id: 'ml', label: 'Malayalam', native: 'Malayalam', nativeLabel: 'മലയാളം', icon: '🇮🇳' },
  { id: 'bn', label: 'Bengali', native: 'Bengali', nativeLabel: 'বাংলা', icon: '🇮🇳' },
]

export default function Profile() {
  const { getTranslatedText } = usePageTranslation([
    'Personal Profile', 'Bill Page Format Information', 'Bank Details', 'QR Code', 'Subscription',
    'Help & Support', 'Share App & Earn', 'Edit personal information', 'Manage business info & address',
    'Update payment receiving accounts', 'Your UPI payment QR', 'Manage your plan & billing',
    'Get assistance or report issues', 'Recommend Trans to others', 'Logo', 'Signature',
    'Business Owner', 'Edit Profile', 'Garage', 'Transport', 'Admin', 'Account',
    'Current Plan', 'Active', 'Expired', 'Expires on', 'Manage', 'Search', 'Cancel', 'Logout',
    'Terms of Service', 'Privacy Policy', 'Delete Account', 'Warning: This action is permanent', 'Are you sure?', 'Delete',
    'App Language', 'Professional Plan', 'No Active Plan', 'All your data will be deleted.',
    'Deleting...', 'Yes, Delete', 'No, Cancel', 'Are you sure you want to logout?'
  ])
  const { user, logout, isAdmin, deleteAccount } = useAuth()
  const { language, changeLanguage } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('search') === 'true') {
      setShowSearch(true)
    }
  }, [location.search])

  const menuItems = useMemo(() => {
    const items = [
      { icon: UserCircle, label: getTranslatedText('Personal Profile'), sub: getTranslatedText('Edit personal information'), to: '/profile/edit', color: '#7C3AED' },
    ]

    if (!isAdmin) {
      items.push({ icon: Building2,  label: getTranslatedText('Bill Page Format Information'), sub: getTranslatedText('Manage business info & address'), to: '/profile/business', color: 'var(--primary)' })
      items.push(
        { icon: CreditCard, label: getTranslatedText('Bank Details'),     sub: getTranslatedText('Update payment receiving accounts'), to: '/profile/bank',     color: '#2563EB'        }
      )
      items.push(
        { icon: QrCode,     label: getTranslatedText('QR Code'),          sub: getTranslatedText('Your UPI payment QR'),          to: '/profile/qr',       color: '#16A34A'        },
        { icon: Zap,        label: getTranslatedText('Subscription'),     sub: getTranslatedText('Manage your plan & billing'),   to: '/subscription',     state: { fromProfile: true }, color: '#E11D48'        }
      )
    }

    if (!isAdmin) {
      items.push(
        { icon: HelpCircle, label: getTranslatedText('Help & Support'),     sub: getTranslatedText('Get assistance or report issues'),     to: '/profile/support',  color: '#0EA5E9'        },
        { icon: Share2,     label: getTranslatedText('Share App & Earn'),        sub: getTranslatedText('Recommend Trans to others'),        to: '/share-and-earn',      color: '#7C3AED'        },
        { icon: FileText,   label: getTranslatedText('Terms of Service'),   sub: getTranslatedText('Legal agreement & rules'),          to: '/terms?type=terms', color: '#64748B'      },
        { icon: ShieldCheck, label: getTranslatedText('Privacy Policy'),    sub: getTranslatedText('Data protection & privacy'),        to: '/privacy?type=privacy', color: '#16A34A'    }
      )
    }

    return items
  }, [getTranslatedText, isAdmin])

  const filteredMenuItems = useMemo(() => {
    if (!searchTerm) return menuItems
    return menuItems.filter(item => 
      item.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.sub.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [menuItems, searchTerm])

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.phone?.slice(-2) || '?'

  const handleSupport = () => {
    const waUrl = `https://wa.me/919999999999?text=${encodeURIComponent("Hello! I need help with the Trans app.")}`
    window.open(waUrl, '_blank')
  }

  const handleShare = async () => {
    const businessName = user?.businessName || user?.name || 'Trans'
    let shareText = `Check out ${businessName} on Trans! Manage your fleet and invoices easily. Download now and get ₹500 reward on sharing!`
    let shareUrl = 'https://play.google.com/store/apps/details?id=com.company.transbilling'
    
    try {
      const res = await getReferralStats()
      if (res?.success && res?.referralCode) {
        shareText = `Join TRANS using my referral code *${res.referralCode}* and manage your fleet and invoices easily! Download/Signup here:`
        shareUrl = `https://transbilling.in/signup?ref=${res.referralCode}`
      }
    } catch (error) {
      console.warn('Failed to fetch referral stats:', error)
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Trans',
          text: shareText,
          url: shareUrl
        })
      } else {
        const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + " " + shareUrl)}`
        window.open(waUrl, '_blank')
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('Share error:', err)
      }
    }
  }


  return (
    <div className="page-wrapper animate-fadeIn">
      {/* Profile header */}
      <div className="card" style={{ marginBottom: 16, textAlign: 'center', padding: '28px 20px' }}>
        {!isAdmin && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <div className="avatar avatar-lg" style={{ margin: '0 auto 8px', width: 64, height: 64, fontSize: '1.25rem', overflow: 'hidden', background: '#F1F5F9', border: '2px solid #E2E8F0' }}>
                {user?.logoUrl ? (
                  <img src={user.logoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Logo" />
                ) : initials}
              </div>
              <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', margin: 0 }}>{getTranslatedText('Logo')}</p>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: 12, background: '#FFF1F2', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', margin: '0 auto 8px' }}>
                {user?.signatureUrl ? (
                  <img src={user.signatureUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Signature" />
                ) : (
                  <PenTool size={24} color="#E11D48" />
                )}
              </div>
              <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', margin: 0 }}>{getTranslatedText('Signature')}</p>
            </div>
          </div>
        )}

        <h3 style={{ fontWeight: 800, fontSize: '1.125rem', margin: '8px 0 0' }}><TranslatedText>{user?.name || user?.businessName || getTranslatedText('Account')}</TranslatedText></h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: 4, marginBottom: 0 }}>
          +91 {user?.phone?.replace(/(\d{5})(\d{5})/, '$1 $2') || 'XXXXX XXXXX'}
        </p>
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', gap: 10 }}>
          <button 
            onClick={() => navigate('/profile/edit')}
            className="btn btn-sm" 
            style={{ fontSize: '0.75rem', padding: '6px 12px', background: 'white', border: '1.5px solid #E2E8F0', borderRadius: 10, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <UserCircle size={14} /> {getTranslatedText('Edit Profile')}
          </button>
          <span className="badge badge-primary" style={{ textTransform: 'capitalize' }}>
            {user?.role === 'garage' ? getTranslatedText('Garage') : user?.role === 'transport' ? getTranslatedText('Transport') : getTranslatedText('Admin')} {getTranslatedText('Account')}
          </span>
        </div>

        {/* Subscription Plan Info */}
        {user?.role !== 'admin' && (
          <div style={{ 
            marginTop: 20, padding: '12px 16px', background: '#F8FAFC', borderRadius: 16, 
            border: '1.5px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' 
          }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7C3AED' }}>
              <Zap size={20} fill="#7C3AED" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#1E293B' }}>
                  {user?.planName ? <TranslatedText>{user.planName}</TranslatedText> : getTranslatedText(user?.subscriptionActive ? 'Professional Plan' : 'No Active Plan')}
                </span>
                <span className={`badge ${user?.subscriptionActive ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                  {user?.subscriptionActive ? getTranslatedText('Active') : getTranslatedText('Expired')}
                </span>
              </div>
              {user?.subscriptionExpiry && (
                <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>
                  {getTranslatedText('Expires on')} {dayjs(user.subscriptionExpiry).format('DD MMM, YYYY')}
                </p>
              )}
            </div>
            <button 
              onClick={() => navigate('/subscription', { state: { fromProfile: true } })}
              style={{ padding: '6px 12px', background: 'white', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: '0.7rem', fontWeight: 700, color: '#475569', cursor: 'pointer' }}
            >
              {getTranslatedText('Manage')}
            </button>
          </div>
        )}
      </div>



      {/* Language Selection */}
      {!isAdmin && (
        <div className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F0F9FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0EA5E9' }}>
              <Globe size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 800, color: '#1E293B', margin: 0 }}>{getTranslatedText('App Language')}</h4>
              <p style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600, margin: 0 }}>Select your preferred language</p>
            </div>
            <div className="badge badge-info" style={{ textTransform: 'capitalize' }}>
              {languageOptions.find(l => l.id === language)?.native || 'English'}
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <select
              value={language}
              onChange={(e) => changeLanguage(e.target.value)}
              style={{
                width: '100%', height: 48, borderRadius: 12, border: '1.5px solid #E2E8F0',
                background: '#F8FAFB', padding: '0 16px', fontSize: '0.875rem', fontWeight: 700,
                color: '#334155', appearance: 'none', cursor: 'pointer', outline: 'none'
              }}
            >
              {languageOptions.map(l => (
                <option key={l.id} value={l.id}>
                  {l.native} {l.nativeLabel ? `(${l.nativeLabel})` : ''}
                </option>
              ))}
            </select>
            <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94A3B8' }}>
              <ChevronRight size={16} style={{ transform: 'rotate(90deg)' }} />
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      {showSearch && (
        <div className="animate-slideDown" style={{ marginBottom: 16 }}>
          <div className="search-container" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', background: 'white', borderRadius: 16, border: '1.5px solid var(--primary)', height: 48 }}>
            <SearchIcon size={18} color="var(--primary)" />
            <input 
              autoFocus
              type="text" 
              placeholder={getTranslatedText('Search')} 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '0.9rem', fontWeight: 600 }}
            />
            {searchTerm && (
              <CloseIcon 
                size={18} 
                onClick={() => setSearchTerm('')} 
                style={{ cursor: 'pointer', color: '#94A3B8' }} 
              />
            )}
            <button 
              onClick={() => { setShowSearch(false); setSearchTerm(''); navigate('/profile', { replace: true }) }}
              style={{ border: 'none', background: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
            >
              {getTranslatedText('Cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Menu items */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
        {filteredMenuItems.map((item, i) => (
          <button
            key={item.label}
            id={`btn-profile-${item.label.toLowerCase().replace(/ /g, '-')}`}
            onClick={() => {
              if (item.onClick === 'share') handleShare()
              else if (item.onClick === 'support') handleSupport()
              else navigate(item.to, { state: item.state })
            }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              gap: 14, padding: '16px 20px', background: 'none',
              border: 'none', borderBottom: i < filteredMenuItems.length - 1 ? '1px solid var(--border)' : 'none',
              cursor: 'pointer', transition: 'var(--transition)', fontFamily: 'Inter, sans-serif',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: item.color + '18',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <item.icon size={18} color={item.color} />
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.label}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{item.sub}</div>
            </div>
            <ChevronRight size={16} color="var(--text-muted)" />
          </button>
        ))}
        {filteredMenuItems.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>No results found</p>
          </div>
        )}
      </div>

      {/* Logout */}
      <button
        id="btn-profile-logout"
        className="btn btn-ghost btn-full"
        onClick={async () => {
          if (window.confirm(getTranslatedText('Are you sure you want to logout?'))) {
            await logout(); 
            navigate(user?.role === 'admin' ? '/admin' : '/login') 
          }
        }}
        style={{ color: '#475569', borderColor: '#E2E8F0', gap: 8, marginBottom: 12, height: 50, background: 'white' }}
      >
        <LogOut size={16} /> {getTranslatedText('Logout')}
      </button>

      {/* Delete Account */}
      {!isAdmin && (
        <button
          id="btn-profile-delete-account"
          className="btn btn-ghost btn-full"
          onClick={() => setShowDeleteConfirm(true)}
          style={{ color: 'var(--danger)', borderColor: 'var(--danger-light)', gap: 8, height: 50, background: 'white', opacity: 0.8 }}
        >
          <Trash2 size={16} /> {getTranslatedText('Delete Account')}
        </button>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 1000 }} onClick={() => setShowDeleteConfirm(false)}>
          <div className="card animate-scaleUp" style={{ maxWidth: 320, width: '100%', textAlign: 'center', padding: '32px 24px' }} onClick={e => e.stopPropagation()}>
             <div style={{ width: 64, height: 64, borderRadius: 20, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Trash2 size={32} color="var(--danger)" />
             </div>
             <h3 style={{ fontWeight: 900, fontSize: '1.25rem', marginBottom: 8 }}>{getTranslatedText('Are you sure?')}</h3>
             <p style={{ color: '#64748B', fontSize: '0.875rem', marginBottom: 24, lineHeight: 1.5 }}>{getTranslatedText('Warning: This action is permanent')}. {getTranslatedText('All your data will be deleted.')}</p>
             
             <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button 
                  className="btn btn-danger btn-full" 
                  disabled={isDeleting}
                  onClick={async () => {
                    setIsDeleting(true)
                    const res = await deleteAccount()
                    if (!res.success) {
                      alert(res.message || 'Failed to delete account')
                      setIsDeleting(false)
                      setShowDeleteConfirm(false)
                    }
                  }}
                  style={{ height: 48, fontWeight: 800 }}
                >
                  {isDeleting ? getTranslatedText('Deleting...') : getTranslatedText('Yes, Delete')}
                </button>
                <button className="btn btn-ghost btn-full" onClick={() => setShowDeleteConfirm(false)} style={{ height: 48 }}>{getTranslatedText('No, Cancel')}</button>
             </div>
          </div>
        </div>
      )}
    </div>
  )
}
