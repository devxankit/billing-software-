import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { Outlet, useLocation, Navigate, useNavigate, useNavigationType } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Sidebar from '../components/layout/Sidebar'
import BottomNav from '../components/layout/BottomNav'
import TopHeader from '../components/layout/TopHeader'
import MobileHeader from '../components/layout/MobileHeader'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'


export default function MainLayout() {
  const { t } = useTranslation()
  const { sidebarCollapsed, mobileMenuOpen, closeMobileMenu } = useApp()
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const navType = useNavigationType()
  const prevNav = useRef({ path: location.pathname, idx: window.history.state?.idx ?? 0 })

  // Going back from a footer-menu page (Bills, Parties, Download Bill, Profile)
  // always opens the dashboard, whatever was visited before it
  useLayoutEffect(() => {
    const from = prevNav.current
    const idx = window.history.state?.idx ?? 0
    prevNav.current = { path: location.pathname, idx }
    if (navType !== 'POP' || idx >= from.idx) return

    const tab = from.path.match(/^\/(transport|garage)\/(bills|parties|download-bills)$/)
    const role = tab ? tab[1] : (from.path === '/profile' && ['transport', 'garage'].includes(user?.role) ? user.role : null)
    if (!role) return
    const home = `/${role}/dashboard`
    if (location.pathname !== home) navigate(home, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  // Safety: If somehow a user lands on a path that doesn't match their role
  // (Defense-in-depth in case of manual URL manipulation)
  if (user && user.role) {
    if (location.pathname.startsWith('/admin') && user.role !== 'admin') {
      return <Navigate to="/dashboard" replace />
    }
    if (location.pathname.startsWith('/transport') && user.role !== 'transport' && user.role !== 'admin') {
      return <Navigate to="/dashboard" replace />
    }
    if (location.pathname.startsWith('/garage') && user.role !== 'garage' && user.role !== 'admin') {
      return <Navigate to="/dashboard" replace />
    }
  }
  

  const pageMeta = {
    '/transport/dashboard': { title: t('dashboard'), subtitle: t('logistics_overview') },
    '/transport/bills': { title: t('bills'), subtitle: t('freight_invoices_sub') },
    '/transport/parties': { title: t('parties'), subtitle: t('transport_clients_sub') },
    '/transport/download-bills': { title: t('downloaded_bills'), subtitle: t('downloaded_bills_sub') },
    '/garage/dashboard': { title: t('dashboard'), subtitle: t('workshop_overview') },
    '/garage/bills': { title: t('bills'), subtitle: t('service_invoices_sub') },
    '/garage/parties': { title: t('parties'), subtitle: t('garage_customers_sub') },
    '/finance': { title: t('finance'), subtitle: t('finance_sub') },
    '/profile': { title: t('profile'), subtitle: t('profile_sub') },
    '/profile/business': { title: t('business_profile_title'), subtitle: t('business_profile_subtitle') },
    '/profile/bank': { title: t('bank_details'), subtitle: t('bank_details_sub') },
    '/transport/trips': { title: t('trips'), subtitle: t('trips_sub') },
    '/transport/vehicles': { title: t('vehicles'), subtitle: t('fleet_sub') },
    '/garage/vehicles': { title: t('vehicles'), subtitle: t('customer_vehicles_sub') },
    '/garage/services': { title: t('services'), subtitle: t('service_records_sub') },
    '/transport/expenses': { title: t('daily_expense'), subtitle: t('expenses_sub') },
    '/admin/dashboard': { title: t('admin'), subtitle: t('system_overview') },
    // Pages that render their own heading get no top-header title (avoids a duplicated header)
    '/admin/users': { title: null, subtitle: null },
    '/admin/billing': { title: t('bills'), subtitle: t('all_system_bills_sub') },
    '/admin/software-sales': { title: null, subtitle: null },
  }

  let meta = pageMeta[location.pathname] || { title: 'TRANS', subtitle: null }

  // Global Navigation: Level 1 pages (Dashboard, main lists) get Hamburger. 
  // Level 2+ pages (Details, Forms) get Back Button.
  const pathParts = location.pathname.split('/').filter(Boolean)

  // Decide if this is a main top-level page
  const isTopLevel = pathParts.length <= 1 ||
    (pathParts.length === 2 && ['dashboard', 'bills', 'parties', 'download-bills', 'expenses', 'payment-management', 'vehicles'].includes(pathParts[1])) ||
    location.pathname === '/profile' ||
    location.pathname === '/profile/business' ||
    location.pathname === '/profile/bank' ||
    location.pathname.startsWith('/admin')

  // Identify pages that render their own inline back buttons
  const hasInlineHeader = 
    location.pathname.includes('/add') ||
    location.pathname.includes('/edit') ||
    location.pathname.includes('/new') ||
    (location.pathname.match(/\/(transport|garage)\/parties\/.+/) !== null) ||
    location.pathname.match(/^\/bills\/.+/) !== null ||
    location.pathname.startsWith('/insurance')

    return (
    <div className={`app-layout ${location.pathname.startsWith('/admin') ? 'admin-layout' : ''}`}>
      {/* Mobile Drawer Backdrop */}
      <div
        className={`mobile-overlay ${mobileMenuOpen ? 'active' : ''}`}
        onClick={closeMobileMenu}
      />

      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <main className={`main-content${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
        {/* Desktop top header */}
        {!hasInlineHeader && <TopHeader title={meta.title} subtitle={meta.subtitle} />}

        {/* Mobile sticky header */}
        {!hasInlineHeader && (
          <MobileHeader
            title={meta.title}
            showBack={!isTopLevel}
            showNotif={isTopLevel}
          />
        )}


        {/* Page content */}
        <div className={`page-content ${hasInlineHeader ? 'no-global-header' : ''}`}>
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom navbar */}
      {!location.pathname.startsWith('/admin') && <BottomNav />}
    </div>
  )
}
