import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Bell, Search, Menu, X, ChevronDown, FileText,
  LogOut, Settings, UserCircle, Receipt
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../context/NotificationContext'
import { usePageTranslation } from '../../hooks/usePageTranslation'
import TranslatedText from '../../components/TranslatedText'
import NotificationDropdown from './NotificationDropdown'

export default function TopHeader({ title, subtitle }) {
  const { user, logout, isAdmin } = useAuth()
  const { unreadCount } = useNotifications()
  const navigate = useNavigate()
  const location = useLocation()
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef(null)
  const profileRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false)
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [])

  // Batch Translation for Common Header Labels
  const { getTranslatedText } = usePageTranslation([
    'User', 'Profile', 'Settings', 'Logout', 'Search', 'Finance', 'Notifications', 'Admin'
  ])

  const handleLogout = async () => {
    if (window.confirm(getTranslatedText('Are you sure you want to logout?'))) {
      await logout()
      navigate(user?.role === 'admin' ? '/admin' : '/login')
    }
  }

  const displayName = user?.businessName || user?.name || (isAdmin ? 'Admin' : '')
  const initials = displayName
    ? displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.phone?.slice(-2) || ''

  return (
    <header className="top-header">
      {/* Left — page title */}
      <div>
        {title && <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}><TranslatedText>{title}</TranslatedText></h2>}
        {subtitle && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 1 }}><TranslatedText>{subtitle}</TranslatedText></p>}
      </div>

      <div className="flex items-center gap-2">
        {/* Finance */}

        {/* Finance */}
        {!user?.role?.includes('admin') && (
          <button 
            className="btn-icon" 
            aria-label="Finance" 
            id="btn-header-finance"
            onClick={() => navigate('/finance')}
            style={{ background: 'rgba(0,0,0,0.05)', borderRadius: 10, width: 36, height: 36, cursor: 'pointer' }}
          >
            <Receipt size={18} />
          </button>
        )}

        {/* Notifications */}
        {user?.role !== 'admin' && (
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button
              className="btn-icon"
              aria-label="Notifications"
              id="btn-header-notifications"
              onClick={() => setNotifOpen(prev => !prev)}
              style={{ 
                position: 'relative', 
                background: notifOpen ? 'rgba(99, 102, 241, 0.1)' : 'rgba(0,0,0,0.05)', 
                borderRadius: 10, width: 36, height: 36, cursor: 'pointer',
                color: notifOpen ? '#6366F1' : 'inherit',
                transition: 'all 0.2s'
              }}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: 6, right: 6,
                  width: 7, height: 7, borderRadius: '50%',
                  background: 'var(--danger)', border: '1.5px solid white'
                }} />
              )}
            </button>
            {notifOpen && (
              <NotificationDropdown 
                onClose={() => setNotifOpen(false)} 
              />
            )}
          </div>
        )}

        {/* Profile dropdown */}
        <div ref={profileRef} style={{ position: 'relative' }}>
          <button
            id="btn-header-profile"
            onClick={() => setProfileOpen(p => !p)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'transparent', border: 'none',
              cursor: 'pointer', padding: '4px 8px', borderRadius: 'var(--radius-md)',
              transition: 'var(--transition)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div className="avatar avatar-sm">{initials || <UserCircle size={18} />}</div>
            <div style={{ textAlign: 'left', lineHeight: 1.3 }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                <TranslatedText>{displayName || getTranslatedText('User')}</TranslatedText>
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                {getTranslatedText(user?.role || 'User')}
              </div>
            </div>
            <ChevronDown size={14} color="var(--text-muted)"
              style={{ transform: profileOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
            />
          </button>

          {/* Dropdown */}
          {profileOpen && (
            <>
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)',
                minWidth: 180, zIndex: 100, overflow: 'hidden',
                animation: 'fadeInUp 0.15s ease both'
              }}>
                <button
                  onClick={() => { navigate('/profile'); setProfileOpen(false) }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center',
                    gap: 10, padding: '11px 16px', background: 'none', border: 'none',
                    cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-primary)',
                    transition: 'var(--transition)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <UserCircle size={16} color="var(--text-muted)" /> {getTranslatedText('Profile')}
                </button>
                {user?.role !== 'admin' && (
                  <button
                    onClick={() => { navigate('/profile/edit'); setProfileOpen(false) }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center',
                      gap: 10, padding: '11px 16px', background: 'none', border: 'none',
                      cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-primary)',
                      transition: 'var(--transition)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <Settings size={16} color="var(--text-muted)" /> {getTranslatedText('Settings')}
                  </button>
                )}
                <div className="divider" style={{ margin: 0 }} />
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center',
                    gap: 10, padding: '11px 16px', background: 'none', border: 'none',
                    cursor: 'pointer', fontSize: '0.875rem', color: 'var(--danger)',
                    transition: 'var(--transition)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-light)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <LogOut size={16} /> {getTranslatedText('Logout')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
