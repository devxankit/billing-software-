import React, { useState, useMemo, useEffect } from 'react'
import {
  FileText, Search, Plus, Filter, Download,
  IndianRupee, CheckCircle, AlertCircle, Clock,
  MoreVertical, X, Calendar, ChevronLeft, ChevronRight,
  TrendingUp, CreditCard, Banknote, Trash2, Edit3, Truck, Wrench
} from 'lucide-react'
import { useAdmin } from '../../context/AdminContext'

const ITEMS_PER_PAGE = 8

// Distinct colours per bill status (Draft must not look like Pending)
const STATUS_STYLES = {
  paid:    { bg: '#DCFCE7', color: '#16A34A' },
  pending: { bg: '#FEF3C7', color: '#D97706' },
  draft:   { bg: '#E0E7FF', color: '#4F46E5' },
}
const getStatusStyle = (status) => STATUS_STYLES[status?.toLowerCase()] || STATUS_STYLES.pending

function InvoiceModal({ mode, businesses, users, existing, onSave, onClose }) {
  const isTransport = mode === 'transport'
  const [form, setForm] = useState(existing || {
    id: '',
    businessId: '',
    userId: '',
    total: '',
    status: 'Pending',
    notes: ''
  })

  // Derive businessName and userName for storage
  const handleSave = (e) => {
    e.preventDefault()
    const биз = businesses.find(b => b.id === form.businessId)
    const уср = users.find(u => u.id === form.userId)
    onSave({
      ...form,
      businessName: биз ? биз.name : 'Unknown Business',
      userName: уср ? уср.name : 'Unknown User',
      total: Number(form.total)
    })
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)'
    }}>
      <div className="card animate-scaleIn" style={{ width: '100%', maxWidth: 500, padding: 0, overflowY: 'auto', maxHeight: '90vh' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontWeight: 900 }}>{existing ? 'Invoice Details' : 'View Invoice'}</h3>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
    <form style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          <div className="form-group">
            <label className="form-label">ASSOCIATED BUSINESS *</label>
            <input type="text" className="form-input" disabled value={form.businessName || '—'} />
          </div>

          <div className="form-group">
            <label className="form-label">{isTransport ? 'TRANSPORTER / OWNER *' : 'OWNER / CUSTOMER *'}</label>
            <input type="text" className="form-input" disabled value={form.userName || '—'} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.7rem' }}>TOTAL (₹)</label>
              <div className="input-group">
                <input type="number" className="form-input" disabled value={form.total} style={{ paddingLeft: 12 }} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.7rem' }}>PENDING (₹)</label>
              <div className="input-group">
                <input type="number" className="form-input" disabled value={form.pendingAmount ?? (form.status?.toLowerCase() === 'paid' ? 0 : form.total)} style={{ paddingLeft: 12 }} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.7rem' }}>STATUS</label>
              <div style={{
                padding: '0 8px', borderRadius: 10, fontWeight: 800, fontSize: '0.75rem',
                textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center',
                background: getStatusStyle(form.status).bg,
                color: getStatusStyle(form.status).color,
                height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {form.status || 'Pending'}
              </div>
            </div>
          </div>


          {existing?.items && existing.items.length > 0 && (
            <div style={{ marginTop: 4 }}>
              <label className="form-label">{isTransport ? 'TRIP / ITEM DETAILS' : 'SERVICE ITEMS'}</label>
              <div style={{ background: 'var(--bg-alt)', borderRadius: 12, padding: 12, marginTop: 6, fontSize: '0.8rem' }}>
                {isTransport ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 0.8fr', gap: 8, paddingBottom: 8, borderBottom: '1px solid var(--border)', fontWeight: 800, color: 'var(--text-secondary)', fontSize: '0.65rem', textTransform: 'uppercase' }}>
                      <span>Item / Vehicle</span><span>From</span><span>To</span><span>Amt</span>
                    </div>
                    {existing.items.map((it, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 0.8fr', gap: 8, paddingTop: 8, fontWeight: 600, fontSize: '0.75rem' }}>
                        <span style={{ color: 'var(--text-primary)', wordBreak: 'break-word' }}>{it.description || it.tempoNo || 'Item ' + (i + 1)}</span>
                        <span style={{ color: 'var(--text-secondary)', wordBreak: 'break-word' }}>{it.companyFrom || '—'}</span>
                        <span style={{ color: 'var(--text-secondary)', wordBreak: 'break-word' }}>{it.companyTo || '—'}</span>
                        <span style={{ color: 'var(--primary)', fontWeight: 800 }}>₹{Number(it.amount || 0).toLocaleString()}</span>
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.6fr 1fr', gap: 8, paddingBottom: 8, borderBottom: '1px solid var(--border)', fontWeight: 800, color: 'var(--text-secondary)', fontSize: '0.65rem', textTransform: 'uppercase' }}>
                      <span>Service Name</span><span>Qty</span><span>Amount</span>
                    </div>
                    {existing.items.map((it, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 0.6fr 1fr', gap: 8, paddingTop: 8, fontWeight: 600, fontSize: '0.75rem' }}>
                        <span style={{ color: 'var(--text-primary)', wordBreak: 'break-word' }}>{it.description || it.serviceName || it.name || 'Service ' + (i + 1)}</span>
                        <span style={{ color: 'var(--text-secondary)', wordBreak: 'break-word' }}>{it.quantity || it.qty || 1}</span>
                        <span style={{ color: 'var(--primary)', fontWeight: 800 }}>₹{Number(it.amount || it.price || 0).toLocaleString()}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button type="button" className="btn btn-primary btn-full" onClick={onClose}>
              Close Details
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function BillingMonitor() {
  const { mode, invoices, addInvoice, updateInvoice, deleteInvoice, adminUpdateBillStatus, businesses, users, stats, refreshAll } = useAdmin()
  const isTransport = mode === 'transport'
  const accentColor = '#7C3AED'
  const accentLight = '#EDE9FE'

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [showDates, setShowDates] = useState(false)
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(null)

  // Reload bills on open so payments recorded by users since the last load are reflected
  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (modal) {
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
  }, [modal])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return invoices.filter(inv => {
      const matchSearch = !q || inv.id.toLowerCase().includes(q) || inv.businessName?.toLowerCase().includes(q) || inv.userName?.toLowerCase().includes(q)
      const matchStatus = statusFilter === 'All' || inv.status?.toLowerCase() === statusFilter.toLowerCase()
      const matchDate = (!dateRange.start || inv.date >= dateRange.start) && (!dateRange.end || inv.date <= dateRange.end)
      return matchSearch && matchStatus && matchDate
    })
  }, [invoices, search, statusFilter, dateRange])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const handleSave = (form) => {
    if (modal?.id) updateInvoice(modal.id, form)
    else addInvoice(form)
    setModal(null)
  }

  const handleExportCSV = () => {
    if (!filtered.length) return alert("No data to export")
    
    const headers = ['Invoice ID', 'Date', 'Business', 'User', 'Total (INR)', 'Status']
    const rows = filtered.map(inv => [
      `"${inv.id || ''}"`,
      // ="..." makes Excel treat the date as text so it never renders as ######
      inv.date ? `"=""${inv.date}"""` : '""',
      `"${inv.businessName || ''}"`,
      `"${inv.userName || ''}"`,
      inv.total || 0,
      `"${inv.status || ''}"`
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `Invoices_Export_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="animate-fadeIn">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <CreditCard size={18} color={accentColor} />
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Financial Oversight · {isTransport ? 'Transport' : 'Garage'} Invoices
            </span>
          </div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 900, margin: 0 }}>Billing Monitor</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Track and manage all system-wide financial transactions
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-ghost" onClick={handleExportCSV} style={{ fontSize: '0.8rem' }}><Download size={16} /> CSV</button>
        </div>
      </div>

      {/* ── Stats Summary ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 32 }}>
        {[
          { label: 'Total Billed', value: `₹${(stats.totalRevenue + stats.pendingRevenue).toLocaleString()}`, icon: IndianRupee, color: accentColor, bg: accentLight },
          { label: 'Settled', value: `₹${stats.totalRevenue.toLocaleString()}`, icon: CheckCircle, color: '#10B981', bg: '#D1FAE5' },
          { label: 'Outstanding', value: `₹${stats.pendingRevenue.toLocaleString()}`, icon: AlertCircle, color: '#EF4444', bg: '#FEE2E2' },
        ].map((s, idx) => (
          <div key={idx} className="card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <s.icon size={26} color={s.color} />
            </div>
            <div>
              <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{s.label}</p>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: '2px 0 0' }}>{s.value}</h2>
            </div>
          </div>
        ))}
      </div>

      {/* ── Invoice Registry ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="input-group" style={{ flex: '1 1 300px' }}>
            <Search className="input-icon" size={18} />
            <input
              type="text" className="form-input" placeholder="Search by Invoice ID, Business or User..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              style={{ paddingLeft: 44, height: 44 }}
            />
          </div>
          <select className="form-input" style={{ height: 44, width: 140, fontWeight: 700 }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
            <option value="All">All Status</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Draft">Draft</option>
          </select>
          <button 
            type="button"
            className={`btn ${showDates ? 'btn-primary' : 'btn-ghost'}`} 
            style={{ 
              height: 44, 
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 16px',
              background: showDates ? accentColor : 'white',
              color: showDates ? 'white' : 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }} 
            onClick={() => setShowDates(!showDates)}
            title="Filter by Date Range"
          >
            <Calendar size={18} />
            <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>Date Range</span>
          </button>
          
          {showDates && (
            <div className="animate-fadeIn" style={{ display: 'flex', gap: 10, alignItems: 'center', background: '#F8FAFC', padding: '4px 12px', borderRadius: 12, border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748B' }}>FROM</span>
                <input 
                  type="date" 
                  className="form-input" 
                  style={{ height: 36, width: 130, fontSize: '0.8rem', padding: '0 8px', borderRadius: 8 }} 
                  value={dateRange.start} 
                  onChange={e => { setDateRange(p => ({ ...p, start: e.target.value })); setPage(1); }} 
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748B' }}>TO</span>
                <input 
                  type="date" 
                  className="form-input" 
                  style={{ height: 36, width: 130, fontSize: '0.8rem', padding: '0 8px', borderRadius: 8 }} 
                  value={dateRange.end} 
                  onChange={e => { setDateRange(p => ({ ...p, end: e.target.value })); setPage(1); }} 
                />
              </div>
              {(dateRange.start || dateRange.end) && (
                <button 
                  type="button" 
                  className="btn btn-ghost btn-sm" 
                  style={{ height: 32, width: 32, padding: 0, minWidth: 'auto', borderRadius: 8, color: '#EF4444' }} 
                  onClick={() => { setDateRange({ start: '', end: '' }); setPage(1); }} 
                  title="Clear Date Filter"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'var(--bg-alt)', borderBottom: '1px solid var(--border)' }}>
              <tr>
                {['Ref / Date', 'Business Info', 'Associated User', 'Amount', 'Status'].map(h => (
                  <th key={h} style={{ padding: '13px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map(inv => (
                <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)', transition: '0.2s' }} className="table-row-hover">
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={16} color="var(--primary)" />
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: '0.85rem' }}>{inv.id}</p>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{inv.date}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isTransport ? <Truck size={14} color="var(--text-muted)" /> : <Wrench size={14} color="var(--text-muted)" />}
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{inv.businessName}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{inv.userName}</span>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 900, fontSize: '1rem' }}>₹{(inv.total || 0).toLocaleString()}</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>TAX: ₹{(inv.tax || 0).toLocaleString()}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', padding: '4px 10px', borderRadius: 99,
                      background: getStatusStyle(inv.status).bg,
                      color: getStatusStyle(inv.status).color
                    }}>{inv.status}</span>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: '80px 24px', textAlign: 'center' }}>
                    <FileText size={48} color="var(--text-muted)" strokeWidth={1} style={{ margin: '0 auto 16px' }} />
                    <h3 style={{ margin: 0, fontWeight: 800 }}>No invoice records</h3>
                    <p style={{ margin: '6px 0 16px', color: 'var(--text-muted)' }}>The financial records history is currently empty.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Showing {paginated.length} results</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} /></button>
            <button className="btn btn-primary btn-sm" style={{ background: accentColor, borderColor: accentColor }}>{page}</button>
            <button className="btn btn-ghost btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      {modal && (
        <InvoiceModal
          mode={mode}
          businesses={businesses}
          users={users}
          existing={modal !== 'add' ? modal : null}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      <style>{`
        .table-row-hover:hover { background: rgba(0,0,0,0.01); }
        
        @media print {
          .sidebar, .top-header, .btn, .input-group, .select, select, 
          .stats-row, .pagination-row, button, .flex-between, .mb-8 {
            display: none !important;
          }
          .card {
            box-shadow: none !important;
            border: 1px solid #eee !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .page-wrapper {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            border: 1px solid #eee !important;
            padding: 8px !important;
            font-size: 10pt !important;
          }
          body {
            background: white !important;
          }
        }
      `}</style>
    </div>
  )
}
