import React, { useEffect, useMemo, useState, useCallback } from 'react'
import {
  Users, Search, Filter, UserPlus, X,
  User, Phone, Mail, Shield, Trash2, Edit3,
  ChevronLeft, ChevronRight, CheckCircle, Clock,
  Truck, Wrench, Building2, MoreVertical, CreditCard, Eye, FileText, History
} from 'lucide-react'
import { useAdmin } from '../../context/AdminContext'
import { adminCreateUser, adminDeleteUser, adminListUsers, adminUpdateUser, getAdminUserHistory } from '../../api/adminApi'
import dayjs from 'dayjs'

const ROLES_T = ['Transporter', 'Driver', 'Staff']
const ROLES_G = ['Garage Owner', 'Mechanic', 'Staff']
const ITEMS_PER_PAGE = 8

const formatName = (str) => {
  if (!str) return ''
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

function toBackendRole(mode) {
  return mode === 'transport' ? 'transport' : 'garage'
}

function fromBackendRole(mode, role) {
  if (mode === 'transport') return role === 'transport' ? 'Transporter' : role
  return role === 'garage' ? 'Garage Owner' : role
}

function toJoinedAt(d) {
  if (!d) return '—'
  try {
    const dt = new Date(d)
    return dt.toISOString().slice(0, 10)
  } catch {
    return '—'
  }
}

function UserModal({ mode, existing, onSave, onClose }) {
  const isTransport = mode === 'transport'
  const roles = isTransport ? ROLES_T : ROLES_G
  const [form, setForm] = useState(existing || {
    name: '', phone: '', email: '', role: roles[0]
  })
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)'
    }}>
      <div className="card animate-scaleIn" style={{ width: '100%', maxWidth: 480, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontWeight: 900 }}>{existing ? 'Edit User' : `Onboard ${isTransport ? 'Transport' : 'Garage'} User`}</h3>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave(form) }} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          <div className="form-group">
            <label className="form-label">FULL NAME *</label>
            <div className="input-group">
              <User className="input-icon" size={18} />
              <input type="text" className="form-input" placeholder="Name or Business Name" required value={form.name} onChange={set('name')} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">PHONE</label>
              <div className="input-group">
                <Phone className="input-icon" size={18} />
                <input type="tel" className="form-input" placeholder="10-digit mobile" value={form.phone} onChange={set('phone')} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">EMAIL</label>
              <div className="input-group">
                <Mail className="input-icon" size={18} />
                <input type="email" className="form-input" placeholder="email@example.com" value={form.email} onChange={set('email')} />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">ROLE / TYPE</label>
            <select className="form-input" value={form.role} onChange={set('role')}>
              {roles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button type="button" className="btn btn-ghost btn-full" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-full">{existing ? 'Save Changes' : 'Create Account'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function UserManagement() {
  const { mode, vehicles, invoices, users: contextUsers, stats } = useAdmin()
  const isTransport = mode === 'transport'
  const accentColor = '#7C3AED'
  const roles = isTransport ? ROLES_T : ROLES_G

  const [users, setUsers] = useState(contextUsers || [])
  const [fetching, setFetching] = useState(false)
  const [apiError, setApiError] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [roleFilter, setRoleFilter] = useState('All')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [modal, setModal] = useState(null) // null | 'add' | { ...user }
  const [history, setHistory] = useState(null) // null | { name, invoices, isTransport }
  const [showVehicles, setShowVehicles] = useState(null) // null | { name, list }
  const [viewDetails, setViewDetails] = useState(null) // null | { ...user }



  const loadUsers = useCallback(async () => {
    setFetching(true)
    setApiError('')
    try {
      const res = await adminListUsers({
        role: toBackendRole(mode),
        q: search,
        page,
        limit: ITEMS_PER_PAGE
      })
      if (!res?.success) {
        setApiError(res?.message || 'Failed to load users')
        setUsers([])
        return
      }
      const rows = (res.users || []).map(u => ({
        id: u.id,
        name: u.name || u.businessName || `User (${u.phone || 'Unknown'})`,
        phone: u.phone || '—',
        email: u.email || '—',
        role: fromBackendRole(mode, u.role),
        status: u.isDeleted ? 'Deleted' : (u.setupComplete ? 'Active' : 'Inactive'),
        subscriptionActive: !!u.subscriptionActive,
        joinedAt: toJoinedAt(u.createdAt),
        documents: u.documents || {},
        referredBy: u.referredBy || null
      }))

      setUsers(rows)
      setTotal(res.pagination?.total || 0)
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to load users'
      setApiError(msg)
    } finally {
      setFetching(false)
    }
  }, [mode, search, page])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  // Prevent background scrolling when any modal is open
  useEffect(() => {
    const isModalOpen = modal || history || showVehicles || viewDetails
    if (isModalOpen) {
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }
  }, [modal, history, showVehicles, viewDetails])

  const filtered = useMemo(() => {
    return users.filter(u => {
      const matchStatus = statusFilter === 'All' || u.status === statusFilter
      const matchRole = roleFilter === 'All' || u.role === roleFilter
      return matchStatus && matchRole
    })
  }, [users, statusFilter, roleFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paginated = useMemo(() => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    return filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filtered, page]);

  const handleSave = async (form) => {
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        email: form.email,
        role: toBackendRole(mode),
        setupComplete: true,
      }
      if (modal?.id) {
        await adminUpdateUser(modal.id, { name: payload.name, email: payload.email, setupComplete: true })
      } else {
        await adminCreateUser(payload)
      }
      setModal(null)
      setPage(1)
      await loadUsers()
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Save failed'
      setApiError(msg)
    }
  }

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            {isTransport ? <Truck size={16} color={accentColor} /> : <Wrench size={16} color={accentColor} />}
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {isTransport ? 'Transport Mode' : 'Garage Mode'}
            </span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0 }}>{isTransport ? 'Transport Owners' : 'Garage Owners'}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '4px 0 0' }}>
            Manage {isTransport ? 'transporters, drivers & staff' : 'garage owners, mechanics & staff'}
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Total', val: stats.totalUsers || 0, color: '#6366F1' },
          { label: 'Active', val: stats.activeUsers || 0, color: '#10B981' },
          { label: 'Inactive', val: (stats.totalUsers || 0) - (stats.activeUsers || 0), color: '#EF4444' },
          { label: 'Registered Biz', val: stats.totalBusinesses || 0, color: accentColor },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '14px 20px', flex: '1 1 140px', display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <div className="input-group" style={{ flex: '2 1 260px' }}>
            <Search className="input-icon" size={18} />
            <input
              type="text" className="form-input" placeholder="Search by name, phone, email..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              style={{ paddingLeft: 44, height: 44 }}
            />
          </div>
          <select className="form-input" style={{ height: 44, minWidth: 140, fontWeight: 700 }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        {(apiError || fetching) && (
          <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: apiError ? 'var(--danger)' : 'var(--text-muted)' }}>
              {apiError ? apiError : 'Loading users…'}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => loadUsers({ q: search })} disabled={fetching}>
              Refresh
            </button>
          </div>
        )}

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'var(--bg-alt)', borderBottom: '1px solid var(--border)' }}>
              <tr>
                {['User', 'Contact', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '13px 20px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.015)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: `${accentColor}20`, fontWeight: 900, color: accentColor, fontSize: '1rem'
                      }}>{(user.name || '?')[0].toUpperCase()}</div>
                      <p style={{ margin: 0, fontWeight: 800, fontSize: '0.9rem' }}>{formatName(user.name)}</p>
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{user.phone || '—'}</p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, overflowWrap: 'anywhere' }}>{user.email || '—'}</p>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 800, padding: '5px 10px', borderRadius: 99,
                      background: `${accentColor}15`, color: accentColor
                    }}>{user.role}</span>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                      <button
                        onClick={async () => {
                          return // Read-only
                        }}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 99,
                          border: 'none', cursor: 'default', fontWeight: 800, fontSize: '0.65rem', textTransform: 'uppercase',
                          background: user.status === 'Active'
                            ? 'var(--success-light)'
                            : (user.status === 'Deleted' ? '#F3F4F6' : '#FEF3C7'),
                          color: user.status === 'Active'
                            ? 'var(--success)'
                            : (user.status === 'Deleted' ? '#6B7280' : '#D97706'),
                          transition: 'filter 0.2s',
                          opacity: 0.95
                        }}
                      >
                        <div style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: user.status === 'Active'
                            ? 'var(--success)'
                            : (user.status === 'Deleted' ? '#6B7280' : '#D97706')
                        }} />
                        {user.status}
                      </button>

                      <span style={{
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 6,
                        textTransform: 'uppercase',
                        letterSpacing: '0.02em',
                        background: user.subscriptionActive ? 'rgba(22, 163, 74, 0.1)' : 'rgba(220, 38, 38, 0.1)',
                        color: user.subscriptionActive ? 'var(--success)' : 'var(--danger)',
                        display: 'inline-block'
                      }}>
                        {user.subscriptionActive ? 'Active Sub' : 'No Sub'}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                    {user.joinedAt || '—'}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost btn-sm btn-icon" style={{ color: accentColor }}
                        onClick={() => setViewDetails(user)}
                        title="View Details"
                      >
                        <Eye size={15} />
                      </button>
                      <button className="btn btn-ghost btn-sm btn-icon" style={{ color: accentColor }}
                        onClick={async () => {
                          setFetching(true)
                          try {
                            const res = await getAdminUserHistory(user.id)
                            if (res.success) {
                              setHistory({
                                name: user.name,
                                isTransport: isTransport,
                                invoices: res.history.bills,
                                trips: res.history.trips,
                                vehicles: res.history.vehicles
                              })
                            }
                          } catch (e) {
                            console.error('Failed to load user history', e)
                          } finally {
                            setFetching(false)
                          }
                        }}
                        title={isTransport ? "Trip History" : "Service History"}
                      >
                        {isTransport ? <History size={15} /> : <CreditCard size={15} />}
                      </button>
                      {isTransport && (
                        <button className="btn btn-ghost btn-sm btn-icon" style={{ color: '#10B981' }}
                          onClick={() => {
                            const list = vehicles.filter(v => (v.ownerName === user.name || v.ownerId === user.id))
                            setShowVehicles({ name: user.name, list })
                          }}
                          title="Registered Vehicles"
                        >
                          <Truck size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr><td colSpan="7" style={{ padding: '60px 24px', textAlign: 'center' }}>
                  <Users size={44} color="var(--text-muted)" strokeWidth={1.5} style={{ margin: '0 auto 14px' }} />
                  <h3 style={{ margin: 0, fontWeight: 800, color: 'var(--text-secondary)' }}>No users found</h3>
                  <p style={{ margin: '6px 0 16px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    {users.length === 0 ? `No ${isTransport ? 'transporters' : 'garage owners'} registered yet` : 'Try adjusting filters'}
                  </p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Showing <b>{paginated.length}</b> of <b>{filtered.length}</b> users
          </p>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} /></button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i} className={`btn btn-sm ${page === i + 1 ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setPage(i + 1)}
                style={page === i + 1 ? { background: accentColor, borderColor: accentColor } : {}}>
                {i + 1}
              </button>
            ))}
            <button className="btn btn-ghost btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      {modal && (
        <UserModal
          mode={mode}
          existing={modal !== 'add' ? modal : null}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {history && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)'
        }}>
          <div className="card animate-scaleIn" style={{ width: '100%', maxWidth: 650, padding: 0, overflow: 'hidden', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 900 }}>{history.isTransport ? 'Trip History' : 'Service History'}</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{history.name}</p>
              </div>
              <button className="btn-icon" onClick={() => setHistory(null)}><X size={20} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {/* Trips Section (Transport Only) */}
              {history.isTransport && history.trips && history.trips.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4F46E5', textTransform: 'uppercase', marginBottom: 12 }}>Recent Operational Trips</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {history.trips.map(trip => (
                      <div key={trip.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{trip.vehicle}</div>
                          {trip.route && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{trip.route}</div>}
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{dayjs(trip.date).format('DD-MM-YYYY')}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 900 }}>₹{Number(trip.amount).toLocaleString()}</div>
                          <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: trip.status === 'Billed' ? 'var(--success)' : trip.status === 'Cancelled' ? 'var(--danger)' : '#D97706' }}>{trip.status}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fleet/Vehicles Section */}
              {history.vehicles && history.vehicles.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: accentColor, textTransform: 'uppercase', marginBottom: 12 }}>
                    {history.isTransport ? 'Delivery Fleet' : 'Registered Customer Vehicles'} ({history.vehicles.length})
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {history.vehicles.map(v => (
                      <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F9FAFB', padding: '10px 14px', borderRadius: 14, border: '1px solid #F3F4F6' }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
                          <Truck size={14} color={accentColor} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>{v.plateNo}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {v.type}{v.model ? ` • ${v.model}` : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>
                {history.isTransport ? 'Recent Billing History' : 'Service & Billing History'}
              </h4>

              {history.invoices.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  {history.isTransport ? <Truck size={40} color="var(--text-muted)" style={{ opacity: 0.3, marginBottom: 12 }} /> : <CreditCard size={40} color="var(--text-muted)" style={{ opacity: 0.3, marginBottom: 12 }} />}
                  <p style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>No {history.isTransport ? 'trips' : 'services'} recorded yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {history.invoices.map(inv => (
                    <div key={inv.id} style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                      <div style={{ background: 'var(--bg-alt)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>{inv.id} — {dayjs(inv.date).format('DD-MM-YYYY hh:mm A')}</span>
                        <span style={{ fontWeight: 900, color: accentColor }}>₹{Number(inv.total).toLocaleString()}</span>
                      </div>
                      <div style={{ padding: 12 }}>
                        {inv.items && inv.items.map((it, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '4px 0', borderBottom: i < inv.items.length - 1 ? '1px dashed #eee' : 'none' }}>
                            <span style={{ fontWeight: 600 }}>{it.description} (x{it.qty})</span>
                            <span style={{ color: 'var(--text-secondary)' }}>₹{Number(it.amount).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg-alt)' }}>
              <button className="btn btn-primary btn-full" onClick={() => setHistory(null)}>Close History</button>
            </div>
          </div>
        </div>
      )}

      {showVehicles && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)'
        }}>
          <div className="card animate-scaleIn" style={{ width: '100%', maxWidth: 650, padding: 0, overflow: 'hidden', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 900 }}>Delivery Fleet</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{showVehicles.name}</p>
              </div>
              <button className="btn-icon" onClick={() => setShowVehicles(null)}><X size={20} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {showVehicles.list.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <Truck size={40} color="var(--text-muted)" style={{ opacity: 0.3, marginBottom: 12 }} />
                  <p style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>No vehicles registered yet.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {showVehicles.list.map(v => (
                    <div key={v.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16, background: 'white', position: 'relative' }}>
                      <div style={{ position: 'absolute', right: 12, top: 12, fontSize: '0.6rem', fontWeight: 800, padding: '2px 8px', borderRadius: 4, background: v.status === 'Active' ? '#D1FAE5' : '#FEF3C7', color: v.status === 'Active' ? '#059669' : '#D97706' }}>{v.status}</div>
                      <div style={{ fontWeight: 900, fontSize: '1rem', color: accentColor }}>{v.plateNo}</div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, margin: '4px 0' }}>{v.model || v.type}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{v.model ? `Type: ${v.type}` : 'Registered Vehicle'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg-alt)' }}>
              <button className="btn btn-primary btn-full" onClick={() => setShowVehicles(null)}>Close List</button>
            </div>
          </div>
        </div>
      )}

      {viewDetails && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)'
        }}>
          <div className="card animate-scaleIn" style={{ width: '100%', maxWidth: 500, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontWeight: 900 }}>User Profile Details</h3>
              <button className="btn-icon" onClick={() => setViewDetails(null)}><X size={20} /></button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--bg-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 900, color: accentColor }}>
                  {(viewDetails.name || '?')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900 }}>{viewDetails.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>ID: #{String(viewDetails.id).slice(-6).toUpperCase()}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 20 }}>
                <div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Contact Phone</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{viewDetails.phone || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Email Address</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, overflowWrap: 'anywhere' }}>{viewDetails.email || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Current Role</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'capitalize' }}>{viewDetails.role}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Account Status</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: viewDetails.status === 'Active' ? 'var(--success)' : 'var(--danger)' }}>{viewDetails.status}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Joined At</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{viewDetails.joinedAt}</div>
                </div>
                {viewDetails.referredBy && (
                  <div style={{ gridColumn: 'span 2', background: '#F8FAFC', padding: '10px 14px', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#6366F1', textTransform: 'uppercase', marginBottom: 4 }}>Referred By</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1E293B' }}>{viewDetails.referredBy.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748B' }}>{viewDetails.referredBy.phone}</div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Uploaded Documents</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {(() => {
                    const docs = viewDetails.documents || {};
                    const docList = [];
                    if (docs.aadharUrl) docList.push({ label: 'Aadhar Card', url: docs.aadharUrl });
                    if (docs.panUrl) docList.push({ label: 'PAN Card', url: docs.panUrl });
                    if (docs.photoUrl) docList.push({ label: 'Owner Photo', url: docs.photoUrl });
                    if (docs.rcUrl) docList.push({ label: 'Vehicle RC', url: docs.rcUrl });
                    if (docs.insuranceUrl) docList.push({ label: 'Insurance', url: docs.insuranceUrl });
                    if (docs.addressProofUrl) docList.push({ label: 'Address Proof', url: docs.addressProofUrl });
                    if (docs.gstCertificateUrl) docList.push({ label: 'GST Certificate', url: docs.gstCertificateUrl });

                    if (docList.length === 0) {
                      return (
                        <div style={{ padding: '12px', border: '1px dashed var(--border)', borderRadius: 8, width: '100%', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          No documents uploaded for this user.
                        </div>
                      );
                    }

                    return docList.map((doc, idx) => (
                      <a key={idx} href={doc.url} target="_blank" rel="noreferrer"
                        style={{
                          textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                          background: 'var(--bg-alt)', border: '1px solid var(--border)', borderRadius: 8,
                          color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 700,
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = accentColor; e.currentTarget.style.color = accentColor }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                      >
                        <FileText size={14} />
                        {doc.label}
                      </a>
                    ));
                  })()}
                </div>
              </div>

              <button className="btn btn-primary btn-full" onClick={() => setViewDetails(null)}>Close Profile</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .animate-scaleIn { animation: scaleIn 0.25s cubic-bezier(0.16,1,0.3,1); }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  )
}
