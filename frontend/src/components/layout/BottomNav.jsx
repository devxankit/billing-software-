import { useState, useEffect, useMemo } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, FileText, Plus, Users, UserCircle, Truck, MapPin, Wrench, Banknote, Download
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useAdmin } from '../../context/AdminContext'
import { usePageTranslation } from '../../hooks/usePageTranslation'

export default function BottomNav() {
  const { user, isAdmin } = useAuth()
  const { mode } = useAdmin()
  const navigate = useNavigate()
  const location = useLocation()

  // Batch Translation for Nav Labels
  const { getTranslatedText } = usePageTranslation([
    'Dashboard', 'Bills', 'Parties', 'Border Tax', 'Profile', 'New Job Card', 'Download Bill'
  ])


  const isTransport = isAdmin ? (mode === 'transport') : (user?.role === 'transport')
  const modulePrefix = isTransport ? '/transport' : '/garage'
  
  const leftItems = useMemo(() => [
    { to: `${modulePrefix}/dashboard`, icon: LayoutDashboard, label: getTranslatedText('Dashboard') },
    { to: `${modulePrefix}/bills`,     icon: FileText,        label: getTranslatedText('Bills') },
  ], [modulePrefix, getTranslatedText])

  const rightItems = useMemo(() => {
    const items = [
      { to: `${modulePrefix}/parties`, icon: Users, label: getTranslatedText('Parties') }
    ]

    if (isTransport) {
      items.push({ to: `${modulePrefix}/download-bills`, icon: Download, label: getTranslatedText('Download Bill') })
    }

    items.push({ to: '/profile', icon: UserCircle, label: getTranslatedText('Profile') })
    return items
  }, [isTransport, modulePrefix, getTranslatedText])




  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false)

  useEffect(() => {
    const isInputElement = (el) => el && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)

    const onFocusIn = (e) => {
      if (isInputElement(e.target)) {
        setIsKeyboardOpen(true)
      }
    }

    const onFocusOut = () => {
      setTimeout(() => {
        if (!isInputElement(document.activeElement)) {
          setIsKeyboardOpen(false)
        }
      }, 150)
    }

    const onViewportResize = () => {
      if (window.visualViewport) {
        const heightDiff = window.innerHeight - window.visualViewport.height
        if (heightDiff > 150) {
          setIsKeyboardOpen(true)
        } else if (!isInputElement(document.activeElement)) {
          setIsKeyboardOpen(false)
        }
      }
    }

    window.addEventListener('focusin', onFocusIn)
    window.addEventListener('focusout', onFocusOut)
    window.visualViewport?.addEventListener('resize', onViewportResize)

    return () => {
      window.removeEventListener('focusin', onFocusIn)
      window.removeEventListener('focusout', onFocusOut)
      window.visualViewport?.removeEventListener('resize', onViewportResize)
    }
  }, [])

  if (isKeyboardOpen) {
    return null
  }

  return (
    <nav className="bottom-nav" role="navigation" aria-label="Bottom navigation">
      <div className="bottom-nav-inner">
        {/* Left Side */}
        {leftItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to.endsWith('dashboard')}
            className={({ isActive }) => {
              const isReallyActive = isActive && !(item.to.endsWith('bills') && location.pathname.endsWith('/new'))
              return `bottom-nav-item${isReallyActive ? ' active' : ''}`
            }}
          >
            <div className="bottom-nav-icon-wrap">
              <item.icon size={22} />
            </div>
            <span className="bottom-nav-label">
              {item.label}
            </span>
          </NavLink>
        ))}

        {/* Center FAB - New Job for Garage only */}
        {!isTransport && (
          <button
            className="bottom-nav-fab"
            id="btn-create-new"
            onClick={() => navigate('/garage/bills/new')}
            aria-label="New Job Card"
          >
            <div className="fab-btn">
              <Plus size={28} color="white" strokeWidth={3} />
            </div>
            <span className="bottom-nav-label" style={{ marginTop: 6 }}>
              {getTranslatedText('New Job Card')}
            </span>
          </button>
        )}

        {/* Right Side */}
        {rightItems.map((item) => (
          item.isExternal ? (
            <a
              key={item.label}
              href={item.to}
              target="_blank"
              rel="noopener noreferrer"
              className="bottom-nav-item"
            >
              <div className="bottom-nav-icon-wrap">
                <item.icon size={22} />
              </div>
              <span className="bottom-nav-label">
                {item.label}
              </span>
            </a>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
            >
              <div className="bottom-nav-icon-wrap">
                <item.icon size={22} />
              </div>
              <span className="bottom-nav-label">
                {item.label}
              </span>
            </NavLink>
          )
        ))}
      </div>
    </nav>
  )
}
