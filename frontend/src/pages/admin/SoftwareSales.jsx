import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { 
  CreditCard, Search, Plus, Trash2, Calendar, 
  Phone, User, Building2, ChevronLeft, ChevronRight,
  X, CheckCircle, Clock, AlertCircle, IndianRupee,
  History, Wallet, ArrowUpRight, TrendingUp, Settings,
  Layers, Zap, Edit2
} from 'lucide-react'
import { useAdmin } from '../../context/AdminContext'

const ITEMS_PER_PAGE = 8

function PlanManagerModal({ plans, onAdd, onUpdate, onDelete, onClose, isTransport }) {
   const [editPlan, setEditPlan] = useState(null)
   const [form, setForm] = useState({ name: '', durationValue: 1, durationType: 'Years', price: '', features: '' })

   const handleSave = (e) => {
      e.preventDefault()
      const priceNum = Number(form.price)
      const durationNum = Number(form.durationValue)

      if (isNaN(priceNum) || priceNum <= 0) {
         alert('Plan Price must be greater than zero!')
         return
      }
      if (isNaN(durationNum) || durationNum <= 0) {
         alert('Duration must be greater than zero!')
         return
      }

      if (editPlan) onUpdate(editPlan.id, form)
      else onAdd(form)
      setForm({ name: '', durationValue: 1, durationType: 'Years', price: '', features: '' })
      setEditPlan(null)
   }

   return (
      <div style={{
         position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
         display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(4px)'
       }}>
         <div className="card animate-scaleIn" style={{ width: '100%', maxWidth: 700, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
               <div>
                  <h3 style={{ margin: 0, fontWeight: 900 }}>{isTransport ? 'Transporter' : 'Garage'} Plan Master</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Define software packages</p>
               </div>
               <button className="btn-icon" onClick={onClose}><X size={20} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', flex: 1, overflow: 'hidden' }}>
               <div style={{ padding: '24px', borderRight: '1px solid var(--border)', background: 'var(--bg-alt)' }}>
                  <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                     <h4 style={{ margin: '0 0 5px', fontSize: '0.85rem', fontWeight: 800 }}>{editPlan ? 'Edit Plan' : 'Create New Plan'}</h4>
                     <input 
                        className="form-input" placeholder="Plan Name (e.g. Silver)" required 
                        value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                     />
                     <div style={{ display: 'flex', gap: 8 }}>
                        <input 
                           type="number" className="form-input" placeholder="Value (e.g. 1)" required min="1"
                           value={form.durationValue || ''} onChange={e => setForm(p => ({ ...p, durationValue: Number(e.target.value) }))}
                           style={{ flex: 1 }}
                        />
                        <select className="form-input" value={form.durationType || 'Years'} onChange={e => setForm(p => ({ ...p, durationType: e.target.value }))} style={{ flex: 2 }}>
                           <option value="Days">Days</option>
                           <option value="Months">Months</option>
                           <option value="Years">Years</option>
                        </select>
                     </div>
                     <div className="input-group">
                        <IndianRupee className="input-icon" size={16} />
                        <input 
                           type="number" className="form-input" placeholder="Price" required min="0.01" step="any"
                           value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                        />
                     </div>
                     <div style={{ display: 'flex', gap: 8 }}>
                        <button type="submit" className="btn btn-primary btn-full">{editPlan ? 'Update' : 'Add Plan'}</button>
                        {editPlan && <button type="button" className="btn btn-ghost" onClick={() => { setEditPlan(null); setForm({ name: '', durationValue: 1, durationType: 'Years', price: '', features: '' }) }}><X size={16} /></button>}
                     </div>
                  </form>
               </div>

               <div style={{ overflowY: 'auto', padding: '12px' }}>
                  {(plans || []).map(p => (
                     <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'white', borderRadius: 12, border: '1px solid var(--border)', marginBottom: 10 }}>
                        <div>
                           <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{p.name} <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: '#F3F4F6', borderRadius: 4, marginLeft: 6 }}>{p.durationValue || 1} {p.durationType || p.interval}</span></div>
                           <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#7C3AED' }}>
                              ₹{Number(p.price).toLocaleString()} 
                           </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                           <button className="btn-icon btn-sm" onClick={() => { setEditPlan(p); setForm(p) }}><Edit2 size={14} /></button>
                           <button className="btn-icon btn-sm" onClick={() => onDelete(p.id)} style={{ color: '#EF4444' }}><Trash2 size={14} /></button>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </div>
   )
}

function SaleModal({ plans, users, existing, onSave, onClose, isTransport }) {
  const [form, setForm] = useState(existing || {
    transporterId: '', totalAmount: '', amountPaid: '', paymentMode: 'Cash',
    planId: ''
  })

  const availableUsers = (users || []).filter(u => u.role === (isTransport ? 'transport' : 'garage'))

  const set = k => e => {
     const val = e.target.value
     if (k === 'planId') {
        const selected = plans.find(p => p.id === val)
        if (selected) {
           const price = Number(selected.price) || 0
           const gst = Math.round(price * 0.18)
           const total = price + gst
           setForm(p => ({ ...p, planId: val, totalAmount: total }))
           return
        }
     }
     if (k === 'transporterId') {
        setForm(p => ({ ...p, transporterId: val }))
        return
     }
     setForm(p => ({ ...p, [k]: val }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.transporterId) return alert('Please select a business')
    onSave({
      ...form,
      transporterId: form.transporterId,
      planName: plans.find(p => p.id === form.planId)?.name || 'Custom Plan'
    })
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)'
    }}>
      <div className="card animate-scaleIn" style={{ width: '100%', maxWidth: 520, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontWeight: 900 }}>{existing ? 'Edit Sale' : `Onboard New ${isTransport ? 'Transporter' : 'Garage'}`}</h3>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          
          <div className="form-group">
            <label className="form-label">SELECT {isTransport ? 'TRANSPORTER' : 'GARAGE'} *</label>
            <div className="input-group">
               <User className="input-icon" size={18} />
               <select className="form-input" required value={form.transporterId} onChange={set('transporterId')} style={{ paddingLeft: 44 }}>
                  <option value="">-- Select Registered Business --</option>
                  {availableUsers.map(u => (
                    <option key={u._id} value={u._id}>
                      {u.businessName || u.name} ({u.phone})
                    </option>
                  ))}
               </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">SELECT SUBSCRIPTION PLAN</label>
            <div className="input-group">
               <Zap className="input-icon" size={18} />
               <select className="form-input" value={form.planId} onChange={set('planId')} style={{ paddingLeft: 44 }}>
                  <option value="">-- Choose a Plan --</option>
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name} ({p.durationValue || 1} {p.durationType || p.interval}) - ₹{p.price}</option>)}
               </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
             <div className="form-group">
                <label className="form-label">FINAL DEAL PRICE *</label>
                <div className="input-group">
                   <IndianRupee className="input-icon" size={18} />
                   <input type="number" className="form-input" placeholder="Total Cost" required value={form.totalAmount} onChange={set('totalAmount')} />
                </div>
                {form.planId && (
                    <div style={{ fontSize: '0.65rem', color: '#64748B', marginTop: 4, fontWeight: 700 }}>
                       Inc. 18% GST (₹{Math.round(form.totalAmount - (form.totalAmount / 1.18))} approx)
                    </div>
                 )}
             </div>
             <div className="form-group">
                <label className="form-label">INITIAL PAYMENT *</label>
                <div className="input-group">
                   <Wallet className="input-icon" size={18} />
                   <input type="number" className="form-input" placeholder="Paid Now" required value={form.amountPaid} onChange={set('amountPaid')} />
                </div>
             </div>
          </div>

          <div className="form-group">
            <label className="form-label">PAYMENT MODE</label>
            <select className="form-input" value={form.paymentMode} onChange={set('paymentMode')}>
              <option value="Cash">Cash</option>
              <option value="UPI / PhonePe">UPI / PhonePe</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button type="button" className="btn btn-ghost btn-full" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-full">{existing ? 'Update' : 'Register Sale'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PaymentLogModal({ sale, onAddPayment, onClose }) {
   const [payment, setPayment] = useState({ amount: '', mode: 'Cash' })
   
   return (
      <div style={{
         position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
         display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)'
       }}>
         <div className="card animate-scaleIn" style={{ width: '100%', maxWidth: 580, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
               <div>
                  <h3 style={{ margin: 0, fontWeight: 900 }}>Payment Collections</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{sale.businessName} · {sale.transporterName}</p>
               </div>
               <button className="btn-icon" onClick={onClose}><X size={20} /></button>
            </div>
            
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-alt)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                   <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Deal</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900 }}>₹{sale.totalAmount?.toLocaleString()}</div>
                   </div>
                   <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#10B981', textTransform: 'uppercase' }}>Total Paid</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#10B981' }}>₹{sale.amountPaid?.toLocaleString()}</div>
                   </div>
                   <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#EF4444', textTransform: 'uppercase' }}>Balance Due</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#EF4444' }}>₹{sale.pendingAmount?.toLocaleString()}</div>
                   </div>
                </div>
            </div>

            <div style={{ maxHeight: 220, overflowY: 'auto' }}>
               <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--bg)', borderBottom: '1px solid var(--border)', zIndex: 1 }}>
                     <tr>
                        {['Date', 'Amount', 'Method'].map(h => <th key={h} style={{ padding: '10px 24px', textAlign: 'left', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>)}
                     </tr>
                  </thead>
                  <tbody>
                     {sale.paymentHistory?.map((h, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                           <td style={{ padding: '12px 24px', fontSize: '0.85rem', fontWeight: 600 }}>{h.date}</td>
                           <td style={{ padding: '12px 24px', fontSize: '0.85rem', fontWeight: 800, color: '#10B981' }}>₹{h.amount?.toLocaleString()}</td>
                           <td style={{ padding: '12px 24px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>{h.mode}</td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>

            {sale.pendingAmount > 0 && (
               <div style={{ padding: '24px', borderTop: '2px dashed var(--border)', background: 'var(--bg-alt)' }}>
                  <h4 style={{ margin: '0 0 14px', fontSize: '0.85rem', fontWeight: 800 }}>Collect Pending Payment</h4>
                  <div style={{ display: 'flex', gap: 12 }}>
                     <div className="input-group" style={{ flex: 1 }}>
                        <IndianRupee className="input-icon" size={16} />
                        <input 
                           type="number" className="form-input" placeholder="Amount" 
                           value={payment.amount} onChange={e => setPayment(p => ({ ...p, amount: e.target.value }))} 
                        />
                     </div>
                     <select 
                        className="form-input" style={{ width: 140 }}
                        value={payment.mode} onChange={e => setPayment(p => ({ ...p, mode: e.target.value }))}
                     >
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="Bank">Bank</option>
                     </select>
                     <button 
                        className="btn btn-primary" disabled={!payment.amount}
                        onClick={() => { onAddPayment(sale.id, payment); setPayment({ amount: '', mode: 'Cash' }) }}
                     >Collect</button>
                  </div>
               </div>
            )}
         </div>
      </div>
   )
}

export default function SoftwareSales() {
  const { 
     mode,
     softwareSales, addSoftwareSale, updateSoftwareSale, deleteSoftwareSale, addSalePayment,
     plans, addPlan, updatePlan, deletePlan,
     users
  } = useAdmin()
  const isTransport = mode === 'transport'
  const accentColor = '#7C3AED'

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(null)
  const [historyModal, setHistoryModal] = useState(null)
  const [showPlanMgr, setShowPlanMgr] = useState(false)

  // Prevent background scrolling when any modal is open
  useEffect(() => {
    if (modal || historyModal || showPlanMgr) {
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
      document.documentElement.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
      document.documentElement.style.overflow = 'unset'
    }
  }, [modal, historyModal, showPlanMgr])

  const filtered = useMemo(() => {
    return (softwareSales || []).filter(s => {
      // 1. Filter by mode (Sales made to users with matching role)
      const saleRole = s.role || s.transporter?.role || 'transport'
      if (saleRole !== (isTransport ? 'transport' : 'garage')) return false

      // 2. Filter by search & status
      const q = search.toLowerCase()
      const tName = s.transporterName || ''
      const bName = s.businessName || ''
      const phone = s.phone || ''
      const matchSearch = !q || tName.toLowerCase().includes(q) || bName.toLowerCase().includes(q) || phone.includes(q)
      
      // Request: Only show accounts that have fully completed payment
      if (s.status !== 'Paid') return false
      
      return matchSearch
    })
  }, [softwareSales, search, isTransport])

  const stats = useMemo(() => {
     // Stats should reflect the current mode's data (without search interference usually, but filtered includes it)
     // If we want mode-only stats, we'd filter by isTransport only. 
     // But using 'filtered' is more consistent with the view.
     const total = filtered?.reduce((s, x) => s + (x.totalAmount || 0), 0) || 0
     const paid = filtered?.reduce((s, x) => s + (x.amountPaid || 0), 0) || 0
     const pending = total - paid
     return { total, paid, pending }
  }, [filtered])

  const ITEMS_PER_PAGE = 8
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const handleSave = async (form) => {
     if (modal?.id) await updateSoftwareSale(modal.id, form)
     else await addSoftwareSale(form)
     setModal(null)
  }

  const handleAddPayment = async (id, p) => {
     await addSalePayment(id, p)
     // Context refresh handles the rest
  }

  return (
    <div className="animate-fadeIn" style={{ padding: '24px' }}>
      <div className="flex items-center justify-between mb-8" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <TrendingUp size={16} color={accentColor} />
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
               {isTransport ? 'Transporter' : 'Garage'} Growth · Acquisition Logic
            </span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0 }}>{isTransport ? 'Transporter' : 'Garage'} Sales & Tracking</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Manage {plans.length} active {isTransport ? 'transporter' : 'garage'} plans and track collections.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn" onClick={() => setShowPlanMgr(true)} style={{ 
               display: 'flex', 
               alignItems: 'center', 
               gap: 8,
               background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
               color: 'white',
               border: 'none',
               padding: '10px 20px',
               borderRadius: '14px',
               fontWeight: 800,
               boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)',
               transition: 'all 0.2s ease',
               cursor: 'pointer'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-1.5px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(124, 58, 237, 0.45)';
              e.currentTarget.style.filter = 'brightness(1.05)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(124, 58, 237, 0.3)';
              e.currentTarget.style.filter = 'none';
            }}
            >
               <Settings size={18} /> Manage Plans
            </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20, marginBottom: 32 }}>
          {[
             { label: 'Total Deal Value', val: stats.total, color: accentColor, bg: '#F5F3FF', icon: TrendingUp },
             { label: 'Payments Collected', val: stats.paid, color: '#10B981', bg: '#F0FDF4', icon: CheckCircle },
          ].map(c => (
             <div key={c.label} className="card" style={{ padding: '24px', border: 'none', background: 'white', position: 'relative' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: c.bg, color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                   <c.icon size={22} />
                </div>
                <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>₹{c.val?.toLocaleString()}</div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 4, letterSpacing: '0.04em' }}>{c.label}</div>
             </div>
          ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', background: 'white', borderRadius: 16, border: '1px solid var(--border)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <div className="input-group" style={{ flex: '2 1 280px' }}>
            <Search className="input-icon" size={18} />
            <input 
              type="text" className="form-input" placeholder="Search client name, business, or phone..." 
              value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} 
              style={{ paddingLeft: 44, height: 44 }} 
            />
          </div>

        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'var(--bg-alt)', borderBottom: '1px solid var(--border)' }}>
              <tr>
                {[isTransport ? 'Transporter / Business' : 'Garage / Business', 'Total Deal', 'Paid', 'Subscription', 'Actions'].map(h => (
                   <th key={h} style={{ padding: '14px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map(sale => (
                <tr key={sale.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, color: sale.isDeleted ? '#94A3B8' : 'var(--text-primary)' }}>
                        {sale.transporterName}
                      </span>
                      {sale.isDeleted && (
                        <span style={{
                          fontSize: '0.62rem', fontWeight: 900, background: '#FEE2E2', color: '#DC2626',
                          padding: '2px 8px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.02em',
                          display: 'inline-block'
                        }}>
                          Deleted
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{sale.businessName} · {sale.phone}</div>
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '0.9rem', fontWeight: 800 }}>₹{sale.totalAmount?.toLocaleString()}</td>
                  <td style={{ padding: '16px 24px', fontSize: '0.9rem', fontWeight: 800, color: '#10B981' }}>₹{sale.amountPaid?.toLocaleString()}</td>
                  <td style={{ padding: '16px 24px' }}>
                     <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>{sale.purchaseDate}</div>
                     <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#EF4444', marginTop: 2 }}>Ends: {sale.expiryDate}</div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                       <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setHistoryModal(sale)} title="Payment History"><History size={16} /></button>
                       <button className="btn btn-sm btn-icon" style={{ background: '#FEE2E2', color: '#EF4444', border: 'none' }} onClick={() => deleteSoftwareSale(sale.id)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                   <td colSpan="5" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>No sales records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
           <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Records: {filtered.length}</p>
           <div style={{ display: 'flex', gap: 8 }}>
             <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} /></button>
             <button className="btn btn-ghost btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={16} /></button>
           </div>
        </div>
      </div>

      {modal && <SaleModal plans={plans} users={users} existing={modal === 'add' ? null : modal} onSave={handleSave} onClose={() => setModal(null)} isTransport={isTransport} />}
      {historyModal && <PaymentLogModal sale={historyModal} onAddPayment={handleAddPayment} onClose={() => setHistoryModal(null)} />}
      {showPlanMgr && <PlanManagerModal plans={plans} onAdd={addPlan} onUpdate={updatePlan} onDelete={deletePlan} onClose={() => setShowPlanMgr(false)} isTransport={isTransport} />}
    </div>
  )
}
