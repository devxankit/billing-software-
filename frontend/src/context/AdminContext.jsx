import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'
import * as adminApi from '../api/adminApi'

const AdminContext = createContext(null)

/* ─── helpers ─── */
const lsKey = (mode, entity) => `admin_${mode}_${entity}`

const load = (key) => {
  try { return JSON.parse(localStorage.getItem(key)) || [] } catch { return [] }
}
const save = (key, data) => localStorage.setItem(key, JSON.stringify(data))

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

const today = () => new Date().toISOString().split('T')[0]

/* ─── initial seed (only if empty or khali array) ─── */
// Admin logic is now purely API-driven. Legacy localStorage seeding removed.


export function AdminProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem('view_mode') || 'transport')

  /* ─── API Driven States ─── */
  const [users, setUsersRaw] = useState([])
  const [businesses, setBusinessesRaw] = useState([])
  const [invoices, setInvoicesRaw] = useState([])
  const [drivers, setDriversRaw] = useState([])
  const [staff, setStaffRaw] = useState([])
  const [vehicles, setVehiclesRaw] = useState([])
  const [softwareSales, setSoftwareSalesRaw] = useState([])
  const [plans, setPlansRaw] = useState([])
  const [loading, setLoading] = useState(false)
  const [dbStats, setDbStats] = useState(null)

    // Dummy seeder effect removed.


  /* Reload all state whenever mode changes */
  const refreshAll = useCallback(async () => {
    setLoading(true)
    try {
      const results = await Promise.allSettled([
        adminApi.getAdminDashboardStats(mode),
        adminApi.adminListUsers({ role: mode }),
        adminApi.getAdminTransportBills(mode),
        mode === 'transport' ? adminApi.getAdminTransportFleet() : Promise.resolve({ success: true, vehicles: [] }),
        adminApi.getAdminSales(),
        adminApi.getAdminPlans(mode),
        adminApi.getAdminSpecialUsers({ target: mode })
      ])

      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.error(`Admin API ${i} failed:`, r.reason)
          
          // If the critical users API fails with 403, redirect to login
          if (i === 1 && r.reason?.response?.status === 403) {
            const currentPath = window.location.pathname
            const isUIAdminPath = currentPath.startsWith('/admin')
            const isLoginPage = currentPath === '/admin' || currentPath === '/admin-login'
            if (isUIAdminPath && !isLoginPage) {
              window.location.href = '/admin'
            }
          }
        }
      })

      const sRes = results[0].status === 'fulfilled' ? results[0].value : { success: false }
      const uRes = results[1].status === 'fulfilled' ? results[1].value : { success: false }
      const bRes = results[2].status === 'fulfilled' ? results[2].value : { success: false }
      const fRes = results[3].status === 'fulfilled' ? results[3].value : { success: false }
      const sSalesRes = results[4].status === 'fulfilled' ? results[4].value : { success: false }
      const plansRes = results[5].status === 'fulfilled' ? results[5].value : { success: false }
      const specRes = results[6].status === 'fulfilled' ? results[6].value : { success: false }
      
      if (sRes.success) setDbStats(sRes.stats)
      if (uRes.success) {
        setUsersRaw(uRes.users)
        // Derive businesses from users who have businessName set
        const realBiz = uRes.users
          .map(u => ({
            ...u, // Includes businessName, ownerName, location, gstNo, etc. from backend userRow
            id: u.id,
            name: u.businessName || u.name || 'Unnamed Business', // Modal expects 'name' to be business name
            ownerName: u.name || u.ownerName, 
            status: u.setupComplete ? 'Active' : 'Pending',
          }))
        setBusinessesRaw(realBiz)
      }

      if (bRes.success) {
        const formatted = bRes.bills.map(b => {
          // Payments are recorded in paidAmount; a bill marked paid without payment entries counts as fully paid
          const paid = b.status === 'paid' ? (b.paidAmount || b.grandTotal || 0) : (b.paidAmount || 0)
          return {
          _id: b._id,
          id: b.billNumber || b._id,
          businessName: b.owner?.businessName || b.owner?.name || '—',
          userName: b.owner?.name || '—',
          total: b.grandTotal,
          status: b.status === 'paid' ? 'Paid' : b.status === 'draft' ? 'Draft' : 'Pending',
          date: new Date(b.billingDate || b.createdAt).toISOString().split('T')[0],
          tax: b.gstAmount || 0,
          paymentReceived: paid,
          pendingAmount: Math.max(0, (b.grandTotal || 0) - paid),
          items: b.items || []
          }
        })
        setInvoicesRaw(formatted)
      }

      if (fRes.success && mode === 'transport') {
        const formattedV = fRes.vehicles.map(v => ({
          id: v._id,
          ownerId: v.owner?._id || v.owner,
          ownerName: v.owner?.name || '—',
          plateNo: v.vehicleNumber,
          type: v.vehicleType || 'Truck',
          status: 'Active',
          model: v.model || ''
        }))
        setVehiclesRaw(formattedV)
      }

      // Load Real Software Sales
      if (sSalesRes.success) {
        setSoftwareSalesRaw(sSalesRes.sales.map(s => ({
          ...s,
          id: s._id,
          role: s.transporter?.role || 'transport',
          transporterName: s.transporter?.name || s.transporter?.businessName || (s.transporter ? `User (${s.transporter.phone})` : 'Deleted User'),
          businessName: s.transporter?.businessName || (s.transporter ? '—' : 'Account Removed'),
          phone: s.transporter?.phone || '—',
          isDeleted: s.transporter ? !!s.transporter.isDeleted : true,
          pendingAmount: s.totalAmount - s.amountPaid,
          purchaseDate: s.purchaseDate ? new Date(s.purchaseDate).toLocaleDateString() : '—',
          expiryDate: s.expiryDate ? new Date(s.expiryDate).toLocaleDateString() : '—',
          status: s.status.charAt(0).toUpperCase() + s.status.slice(1),
          paymentHistory: (s.paymentHistory || []).map(ph => ({
            ...ph,
            date: new Date(ph.date).toLocaleDateString()
          }))
        })))
      }
      
      // Load Plans
      if (plansRes.success) {
        setPlansRaw(plansRes.plans.map(p => ({ ...p, id: p._id })))
      }
      
      // Load Specialized Users
      if (specRes.success) {
        const targetRole = mode === 'transport' ? 'driver' : 'mechanic';
        const filteredDrivers = (specRes.users || []).filter(u => u.role === targetRole).map(u => ({ ...u, id: u._id }));
        setDriversRaw(filteredDrivers);
        
        const filteredStaff = (specRes.users || []).filter(u => u.role === 'staff').map(u => ({ ...u, id: u._id }));
        setStaffRaw(filteredStaff);
      }
    } catch (e) {
      console.error('Admin sync failed:', e);
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    // Only refresh if we are on an admin route to avoid infinite 403 redirect loops on login pages
    const isUIAdminPath = window.location.pathname.startsWith('/admin')
    if (isUIAdminPath) {
      refreshAll()
    }
  }, [refreshAll])

  /* ─── setters that also persist (Backward compatibility for local-only stuff) ─── */
  const setUsers = useCallback((fn) => {
    setUsersRaw(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn
      save(lsKey(mode, 'users'), next)
      return next
    })
  }, [mode])

  const setBusinesses = useCallback((fn) => {
    setBusinessesRaw(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn
      save(lsKey(mode, 'businesses'), next)
      return next
    })
  }, [mode])

  const setInvoices = useCallback((fn) => {
    setInvoicesRaw(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn
      save(lsKey(mode, 'invoices'), next)
      return next
    })
  }, [mode])

  const setDrivers = useCallback((fn) => {
    setDriversRaw(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn
      return next
    })
  }, [])

  const setStaff = useCallback((fn) => {
    setStaffRaw(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn
      return next
    })
  }, [])

  const setVehicles = useCallback((fn) => {
    setVehiclesRaw(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn
      save(lsKey('transport', 'vehicles'), next)
      return next
    })
  }, [])

  const setSoftwareSales = useCallback((fn) => {
    setSoftwareSalesRaw(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn
      save('admin_global_software_sales', next)
      return next
    })
  }, [])

  /* ─── switch mode (synced with AppContext view_mode) ─── */
  const switchMode = useCallback((m) => {
    localStorage.setItem('view_mode', m)
    setMode(m)
  }, [])

  /* ─── CRUD: Users ─── */
  const addUser = useCallback(async (data) => {
    try {
      const res = await adminApi.adminCreateUser({ ...data, role: mode })
      if (res.success) {
        refreshAll()
        return true
      }
    } catch (e) { 
      console.error('Create user failed:', e) 
      alert(`Create Failed: ${e.response?.data?.message || 'Unauthorized'}`)
    }
    return false
  }, [mode, refreshAll])

  const updateUser = useCallback(async (id, patch) => {
    try {
      const res = await adminApi.adminUpdateUser(id, patch)
      if (res.success) {
        refreshAll()
        return true
      }
    } catch (e) { 
      console.error('Update failed:', e.response?.data || e.message)
      alert(`Update Failed: ${e.response?.data?.message || 'Unauthorized'}`)
    }
    return false
  }, [refreshAll])

  const deleteUser = useCallback(async (id) => {
    try {
      const res = await adminApi.adminDeleteUser(id)
      if (res.success) {
        setUsersRaw(p => p.filter(u => u.id !== id))
        refreshAll()
        return true
      }
    } catch (e) { 
       console.error('Delete failed:', e.response?.data || e.message)
       alert(`Delete Failed: ${e.response?.data?.message || 'Unauthorized'}`)
    }
    return false
  }, [refreshAll])

  /* ─── CRUD: Businesses (Linked to User creation) ─── */
  const addBusiness = useCallback(async (data) => {
    return await addUser(data)
  }, [addUser])

  const updateBusiness = useCallback(async (id, patch) => {
    return await updateUser(id, patch)
  }, [updateUser])

  const deleteBusiness = useCallback(async (id) => {
    return await deleteUser(id)
  }, [deleteUser])

  /* ─── CRUD: Invoices ─── */
  const addInvoice = useCallback((data) => {
    const seq = Date.now().toString().slice(-6)
    const prefix = mode === 'transport' ? 'TRN' : 'GRG'
    const row = {
      id: `${prefix}-${seq}`,
      ...data,
      status: data.status || 'Pending',
      date: today(),
      tax: Math.round((data.total || 0) * 0.18)
    }
    setInvoices(p => [row, ...p])
    return row
  }, [mode, setInvoices])

  const updateInvoice = useCallback((id, patch) => {
    setInvoices(p => p.map(inv => inv.id === id ? { ...inv, ...patch } : inv))
  }, [setInvoices])

  const deleteInvoice = useCallback((id) => {
    setInvoices(p => p.filter(inv => inv.id !== id))
  }, [setInvoices])

  const adminUpdateBillStatus = useCallback(async (id, status, type) => {
    try {
      const res = await adminApi.adminUpdateBillStatus(id, { status, type })
      if (res.success) {
        refreshAll()
        return true
      }
    } catch (e) {
      console.error('Failed to update bill status', e)
    }
    return false
  }, [refreshAll])

  /* ─── CRUD: Drivers / Mechanics ─── */
  const addDriver = useCallback(async (data) => {
    try {
      const res = await adminApi.createAdminSpecialUser({ 
        ...data, 
        role: mode === 'transport' ? 'driver' : 'mechanic',
        target: mode
      })
      if (res.success) refreshAll()
    } catch (e) { console.error(e) }
  }, [mode, refreshAll])

  const updateDriver = useCallback(async (id, patch) => {
    try {
      const res = await adminApi.updateAdminSpecialUser(id, patch)
      if (res.success) refreshAll()
    } catch (e) { console.error(e) }
  }, [refreshAll])

  const deleteDriver = useCallback(async (id) => {
    try {
      const res = await adminApi.deleteAdminSpecialUser(id)
      if (res.success) refreshAll()
    } catch (e) { console.error(e) }
  }, [refreshAll])

  /* ─── CRUD: Staff ─── */
  const addStaff = useCallback(async (data) => {
    try {
      const res = await adminApi.createAdminSpecialUser({ 
        ...data, 
        role: 'staff',
        target: mode
      })
      if (res.success) refreshAll()
    } catch (e) { console.error(e) }
  }, [mode, refreshAll])

  const updateStaff = useCallback(async (id, patch) => {
    try {
      const res = await adminApi.updateAdminSpecialUser(id, patch)
      if (res.success) refreshAll()
    } catch (e) { console.error(e) }
  }, [refreshAll])

  const deleteStaff = useCallback(async (id) => {
    try {
      const res = await adminApi.deleteAdminSpecialUser(id)
      if (res.success) refreshAll()
    } catch (e) { console.error(e) }
  }, [refreshAll])

  /* ─── CRUD: Software Sales ─── */
  const addSoftwareSale = useCallback(async (data) => {
    try {
      const res = await adminApi.createAdminSale(data)
      if (res.success) {
        refreshAll()
        return res.sale
      }
    } catch (e) {
      console.error('Failed to create sale', e)
    }
    return null
  }, [refreshAll])

  const updateSoftwareSale = useCallback((id, patch) => {
    setSoftwareSalesRaw(p => p.map(s => s.id === id ? { ...s, ...patch } : s))
  }, [])

  const addSalePayment = useCallback(async (id, payment) => {
    try {
      const res = await adminApi.addAdminSalePayment(id, payment)
      if (res.success) {
        refreshAll()
      }
    } catch (e) {
      console.error('Failed to add payment', e)
    }
  }, [refreshAll])

  const deleteSoftwareSale = useCallback((id) => {
    setSoftwareSalesRaw(p => p.filter(s => s.id !== id))
  }, [])

  /* ─── CRUD: Plans (Real API linked) ─── */
  const addPlan = useCallback(async (data) => {
    try {
      const res = await adminApi.createAdminPlan({ ...data, target: mode })
      if (res.success) {
        refreshAll()
        return res.plan
      }
    } catch (e) { console.error(e) }
    return null
  }, [mode, refreshAll])

  const updatePlan = useCallback(async (id, patch) => {
    try {
      const res = await adminApi.updateAdminPlan(id, patch)
      if (res.success) refreshAll()
    } catch (e) { console.error(e) }
  }, [refreshAll])

  const deletePlan = useCallback(async (id) => {
    try {
      const res = await adminApi.deleteAdminPlan(id)
      if (res.success) refreshAll()
    } catch (e) { console.error(e) }
  }, [refreshAll])

  /* ─── Computed stats (live) ─── */
  const stats = useMemo(() => ({
    totalUsers: dbStats?.totalUsers || users.length,
    activeUsers: dbStats?.activeUsers || users.filter(u => u.status === 'Active').length,
    totalBusinesses: dbStats?.totalBusinesses || businesses.length,
    totalInvoices: dbStats?.totalInvoices || invoices.length,
    totalRevenue: dbStats?.totalRevenue || invoices.filter(i => i.status === 'Paid').reduce((acc, i) => acc + (Number(i.total) || 0), 0),
    pendingRevenue: dbStats?.pendingRevenue || invoices.filter(i => i.status === 'Pending').reduce((acc, i) => acc + (Number(i.total) || 0), 0),
    paidInvoices: dbStats?.paidInvoices ?? invoices.filter(i => i.status === 'Paid').length,
    pendingInvoices: dbStats?.pendingInvoices ?? invoices.filter(i => i.status === 'Pending').length,
    totalDrivers: drivers.length,
    totalStaff: staff.length,
    // What the platform itself earns: subscription payments from this mode's businesses
    platformRevenue: softwareSales.filter(s => s.role === mode).reduce((acc, s) => acc + (Number(s.amountPaid) || 0), 0),
    platformPending: softwareSales.filter(s => s.role === mode).reduce((acc, s) => acc + (Number(s.pendingAmount) || 0), 0),
  }), [dbStats, users, businesses, invoices, drivers, staff, softwareSales, mode])

  const value = useMemo(() => ({
    mode, switchMode, loading, refreshAll,
    users, addUser, updateUser, deleteUser,
    businesses, addBusiness, updateBusiness, deleteBusiness,
    invoices, addInvoice, updateInvoice, deleteInvoice, adminUpdateBillStatus,
    drivers, addDriver, updateDriver, deleteDriver,
    staff, addStaff, updateStaff, deleteStaff,
    vehicles, setVehicles,
    softwareSales, addSoftwareSale, updateSoftwareSale, deleteSoftwareSale, addSalePayment,
    plans, addPlan, updatePlan, deletePlan,
    stats,
  }), [
    mode, switchMode, loading, refreshAll,
    users, addUser, updateUser, deleteUser,
    businesses, addBusiness, updateBusiness, deleteBusiness,
    invoices, addInvoice, updateInvoice, deleteInvoice, adminUpdateBillStatus,
    drivers, addDriver, updateDriver, deleteDriver,
    staff, addStaff, updateStaff, deleteStaff,
    vehicles, setVehicles,
    softwareSales, addSoftwareSale, updateSoftwareSale, deleteSoftwareSale, addSalePayment,
    plans, addPlan, updatePlan, deletePlan,
    stats
  ])

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}

export function useAdmin() {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdmin must be used inside <AdminProvider>')
  return ctx
}
