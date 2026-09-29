import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Bell, Search, Menu } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useNotifications } from '../../context/NotificationContext'
import { useTranslation } from 'react-i18next'
import NotificationDropdown from './NotificationDropdown'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'

/**
 * MobileHeader — shown only on mobile (< 768px)
 */
export default function MobileHeader({
  title,
  showBack = false,
  rightAction,
  onBack,
  showNotif = true,
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { toggleMobileMenu } = useApp()
  const { unreadCount } = useNotifications()
  const { user } = useAuth()
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef(null)
  const handleBack = () => { if (onBack) onBack(); else navigate(-1) }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [])

  return (
    <header
      id="mob-header"
      className="mobile-header fixed top-0 left-0 right-0"
      style={{
        position: 'fixed',
        background: '#FFFFFF', /* solid so scrolled content doesn't show through */
        zIndex: 500,
        padding: '0 16px',
        height: '60px', /* Increased for better touch */
        borderBottom: '1px solid rgba(0,0,0,0.05)'
      }}
    >
      {/* Left */}
      <div className="flex items-center gap-2">
        {showBack ? (
          <button
            id="btn-mobile-back"
            onClick={handleBack}
            aria-label="Go back"
            style={{
              width: 34, height: 34, borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg)', border: 'none', cursor: 'pointer',
              color: 'var(--text-primary)',
            }}
          >
            <ArrowLeft size={20} strokeWidth={2.5} />
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={toggleMobileMenu}
              style={{
                width: 34, height: 34, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--text-primary)',
              }}
            >
              <Menu size={20} />
            </button>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'linear-gradient(135deg, #1E1B4B, #4C1D95)',
              padding: '4px 12px 4px 8px',
              borderRadius: 99,
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: 6,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ color: 'white', fontSize: '0.66rem', fontWeight: 900 }}>TR</span>
              </div>
              <span style={{ color: 'white', fontSize: '0.875rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
                TRANS
              </span>
            </div>
          </div>
        )}

        {title && showBack && (
          <h1 style={{
            fontSize: '0.9375rem', fontWeight: 700,
            color: 'var(--text-primary)', margin: 0,
          }}>
            {title}
          </h1>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-1">
        {rightAction || (
          <>
            {showNotif && user?.role !== 'admin' && (
              <div ref={notifRef} style={{ position: 'relative' }}>
                <button
                  className="btn-icon"
                  aria-label="Notifications"
                  id="btn-mobile-notifications"
                  onClick={() => setNotifOpen(prev => !prev)}
                  style={{ 
                    width: 34, height: 34, borderRadius: 10, 
                    background: notifOpen ? 'rgba(99, 102, 241, 0.1)' : 'rgba(0,0,0,0.05)', 
                    position: 'relative', cursor: 'pointer',
                    color: notifOpen ? '#6366F1' : 'inherit'
                  }}
                >
                  <Bell size={17} />
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute', top: 7, right: 7,
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
          </>
        )}
      </div>
    </header>
  )
}
