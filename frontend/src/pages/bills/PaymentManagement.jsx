import { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { IndianRupee, MessageCircle, ChevronRight, Search, Wallet, CheckCircle2, Clock, AlertCircle, FileText } from 'lucide-react'
import { useBills } from '../../context/BillContext'
import { useAuth } from '../../context/AuthContext'
import dayjs from 'dayjs'
import { pdf } from '@react-pdf/renderer'
import { PDFLedger } from '../../components/billing/PDFLedger'
import { PDFPendingBills } from '../../components/billing/PDFPendingBills'

const STATUS_CFG = {
  paid:    { label: 'Paid',    color: '#16A34A', bg: '#DCFCE7', icon: CheckCircle2 },
  partial: { label: 'Partial', color: '#D97706', bg: '#FEF3C7', icon: Clock },
  unpaid:  { label: 'Unpaid',  color: '#DC2626', bg: '#FEE2E2', icon: AlertCircle },
  draft:   { label: 'Draft',   color: '#6B7280', bg: '#F3F4F6', icon: Clock },
}

const getStatusKey = (bill) => {
  if (bill.status === 'paid') return 'paid'
  if (bill.status === 'partial') return 'partial'
  if (bill.status === 'draft') return 'draft'
  return 'unpaid'
}

function BillPayRow({ bill, navigate }) {
  const paidAmt   = bill.paidAmount || 0
  const total     = bill.grandTotal || 0
  const balance   = Math.max(0, total - paidAmt)
  const sk        = getStatusKey(bill)
  const cfg       = STATUS_CFG[sk]
  const Icon      = cfg.icon
  const partyName = bill.billedToName || bill.customerName || bill.party?.name || '—'

  return (
    <div
      onClick={() => navigate(`/bills/${bill._id}`)}
      style={{
        background: 'white', borderRadius: 18, padding: '14px 16px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)', cursor: 'pointer',
        border: '1px solid #F3F4F6', transition: '0.18s',
        display: 'flex', alignItems: 'center', gap: 12,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#C4B5FD'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#F3F4F6'; e.currentTarget.style.transform = 'none' }}
    >
      {/* Status dot */}
      <div style={{ width: 42, height: 42, borderRadius: 12, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={20} color={cfg.color} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0F0D2E', whiteSpace: 'nowrap' }}>
            #{bill.billNumber || 'Draft'}
          </span>
          <span style={{ fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', padding: '2px 7px', borderRadius: 6, background: cfg.bg, color: cfg.color }}>
            {cfg.label}
          </span>
        </div>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {partyName}
        </div>
        <div style={{ fontSize: '0.68rem', color: '#9CA3AF', marginTop: 1 }}>
          {dayjs(bill.billingDate || bill.createdAt).format('DD MMM YYYY')}
        </div>
      </div>

      {/* Amounts */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontWeight: 900, fontSize: '0.95rem', color: '#0F0D2E' }}>
          ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        {balance > 0 && (
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#DC2626', background: '#FEF2F2', padding: '1px 7px', borderRadius: 6, marginTop: 2, display: 'inline-block' }}>
            Due: ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        )}
        {balance === 0 && paidAmt > 0 && (
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#16A34A' }}>✓ Cleared</div>
        )}
      </div>

      <ChevronRight size={16} color="#9CA3AF" style={{ flexShrink: 0 }} />
    </div>
  )
}

function PartyPayRow({ group, navigate, isExpanded, onToggle, user }) {
  const [isSharing, setIsSharing] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [ledgerModalOpen, setLedgerModalOpen] = useState(false)
  const [startDate, setStartDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'))
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'))
  const hasOutstanding = group.totalOutstanding > 0
  const firstLetter = (group.name || 'P')[0].toUpperCase()

  const printRef = useRef(null)
  const ledgerPrintRef = useRef(null)

  const ledgerEntries = useMemo(() => {
    const entries = [];
    [...group.bills].sort((a,b) => new Date(a.billingDate || a.createdAt) - new Date(b.billingDate || b.createdAt)).forEach(b => {
      entries.push({
        date: dayjs(b.billingDate || b.createdAt).toDate(),
        particulars: `Service Bill - ${b.vehicleNo || b.vehicle?.vehicleNumber || 'Items'}`,
        refNo: b.billNumber || 'DRAFT',
        debit: b.grandTotal || 0,
        credit: 0
      });
      if (b.payments && b.payments.length > 0) {
        b.payments.forEach(payment => {
          entries.push({
            date: payment.date ? dayjs(payment.date).toDate() : dayjs(b.billingDate || b.createdAt).toDate(),
            particulars: `Payment Received ${payment.mode ? `(${payment.mode})` : ''}`,
            refNo: b.billNumber || 'DRAFT',
            debit: 0,
            credit: payment.amount || 0
          });
        });
      } else {
        const paidAmt = b.paidAmount || b.paymentReceived || (b.status === 'paid' ? b.grandTotal : 0) || 0;
        if (paidAmt > 0) {
          entries.push({
            date: b.paymentDate ? dayjs(b.paymentDate).toDate() : dayjs(b.billingDate || b.createdAt).toDate(),
            particulars: `Payment Received`,
            refNo: b.billNumber || 'DRAFT',
            debit: 0,
            credit: paidAmt
          });
        }
      }
    });
    entries.sort((a, b) => a.date - b.date);
    let currentBalance = 0;
    return entries.map(entry => {
      currentBalance += (entry.debit - entry.credit);
      return { ...entry, balance: currentBalance };
    });
  }, [group.bills]);
  const filteredLedgerEntries = useMemo(() => {
    if (!startDate && !endDate) return ledgerEntries;
    
    let openingBalance = 0;
    const filtered = [];
    const start = startDate ? dayjs(startDate).startOf('day').valueOf() : 0;
    const end = endDate ? dayjs(endDate).endOf('day').valueOf() : Infinity;

    ledgerEntries.forEach(entry => {
      const entryTime = dayjs(entry.date).valueOf();
      if (entryTime < start) {
        openingBalance = entry.balance;
      } else if (entryTime >= start && entryTime <= end) {
        filtered.push(entry);
      }
    });

    const finalEntries = [];
    if (startDate) {
      finalEntries.push({
        date: dayjs(startDate).toDate(),
        particulars: 'Opening Balance',
        refNo: '-',
        debit: openingBalance > 0 ? openingBalance : 0,
        credit: openingBalance < 0 ? Math.abs(openingBalance) : 0,
        balance: openingBalance
      });
    }
    
    return [...finalEntries, ...filtered];
  }, [ledgerEntries, startDate, endDate]);

  const handleWhatsApp = async (e, type) => {
    if (e) e.stopPropagation()
    if (isSharing) return;
    
    setIsSharing(true);
    try {
      const isTransport = !window.location.pathname.includes('garage');
      let pdfBlob;
      if (type === 'ledger') {
        const partyMock = { name: group.name, phone: group.phone, address: group.address || '', city: group.city || '', email: group.email || '', gstin: group.gstin || '' };
        pdfBlob = await pdf(<PDFLedger ledgerEntries={filteredLedgerEntries} party={partyMock} business={user} isTransport={isTransport} />).toBlob();
      } else {
        pdfBlob = await pdf(<PDFPendingBills bills={group.bills} groupName={group.name} groupPhone={group.phone} groupEmail={group.email} business={user} isTransport={isTransport} totalOutstanding={group.totalOutstanding} />).toBlob();
      }
      
      const fileName = type === 'ledger' 
        ? `Statement_of_Account_${group.name.replace(/\s+/g, '_')}.pdf`
        : `Pending_Bills_${group.name.replace(/\s+/g, '_')}.pdf`;
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
      
      const title = type === 'ledger' ? 'Party Ledger Statement' : 'Pending Bills Summary';
      const text = type === 'ledger' 
        ? `Dear ${group.name}, please find your statement of account attached.`
        : `Dear ${group.name}, please find your outstanding pending bills summary attached.`;

      // ── STRATEGY 1: Flutter Native Bridge (Best – works on Android & iOS perfectly) ──
      const flutterBridge = window.FlutterShareBridge || window.webkit?.messageHandlers?.FlutterShareBridge;
      if (flutterBridge) {
        const reader = new FileReader();
        const base64Data = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const payload = JSON.stringify({ fileName: file.name, fileData: base64Data, mimeType: 'application/pdf' });
        
        if (window.FlutterShareBridge?.postMessage) {
          window.FlutterShareBridge.postMessage(payload);
        } else if (window.webkit?.messageHandlers?.FlutterShareBridge?.postMessage) {
          window.webkit.messageHandlers.FlutterShareBridge.postMessage(payload);
        }
        return;
      }

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title, text });
      } else {
        const p = group.phone ? group.phone.replace(/[^0-9]/g, '') : '';
        const dialPhone = p.length === 10 ? `91${p}` : p;
        const msg = `Dear ${group.name},\nPlease find your ${title} in the downloaded PDF.`;
        const url = dialPhone
          ? `https://wa.me/${dialPhone}?text=${encodeURIComponent(msg)}`
          : `https://wa.me/?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
        
        const downloadUrl = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
      }
    } catch (err) {
      console.error('Error generating PDF', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsSharing(false);
      setShowShareMenu(false);
    }
  }

  const handleGoToLedger = (e) => {
    e.stopPropagation()
    if (group.partyId) {
      const module = window.location.pathname.includes('garage') ? 'garage' : 'transport'
      navigate(`/${module}/parties/${group.partyId}`)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, position: 'relative', zIndex: (showShareMenu || ledgerModalOpen) ? 9999 : 1 }}>
      <div
        onClick={onToggle}
        style={{
          background: 'white', borderRadius: 18, padding: '14px 16px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)', cursor: 'pointer',
          border: '1px solid #F3F4F6', transition: '0.18s',
          display: 'flex', alignItems: 'center', gap: 12,
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#C4B5FD'; e.currentTarget.style.transform = 'translateY(-1px)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#F3F4F6'; e.currentTarget.style.transform = 'none' }}
      >
        {/* Letter Box */}
        <div style={{ width: 42, height: 42, borderRadius: 12, background: hasOutstanding ? '#FEE2E2' : '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '1.1rem', fontWeight: 900, color: hasOutstanding ? '#DC2626' : '#16A34A' }}>
            {firstLetter}
          </span>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0F0D2E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {group.name}
            </span>
            {group.partyId && (
              <span 
                onClick={handleGoToLedger}
                style={{ fontSize: '0.6rem', fontWeight: 800, color: '#4F46E5', background: '#EEF2FF', padding: '2px 6px', borderRadius: 5, cursor: 'pointer' }}
              >
                Ledger
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#6B7280', fontWeight: 500 }}>
            {group.bills.length} {group.bills.length === 1 ? 'bill' : 'bills'}
          </div>
        </div>

        {/* Balance & Totals */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {hasOutstanding ? (
            <div style={{ fontWeight: 900, fontSize: '0.95rem', color: '#DC2626' }}>
              ₹{group.totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          ) : (
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#16A34A' }}>✓ Cleared</div>
          )}
          <div style={{ fontSize: '0.62rem', color: '#9CA3AF', marginTop: 2, fontWeight: 500 }}>
            Billed: ₹{group.totalInvoiced.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
        </div>

        {/* WhatsApp Share Options Menu */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={(e) => { e.stopPropagation(); setShowShareMenu(!showShareMenu) }}
            title="Share Options"
            style={{
              width: 36, height: 36, borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #25D366, #128C7E)',
              color: 'white', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 3px 8px rgba(37,211,102,0.3)',
            }}
          >
            <MessageCircle size={16} />
          </button>
          
          {showShareMenu && (
            <>
              {/* Invisible overlay to close menu */}
              <div 
                style={{ position: 'fixed', inset: 0, zIndex: 9 }} 
                onClick={(e) => { e.stopPropagation(); setShowShareMenu(false) }}
              />
              <div 
                style={{
                  position: 'absolute', right: 0, top: 44, background: 'white', 
                  borderRadius: 12, padding: 8, boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                  zIndex: 10, minWidth: 160, border: '1px solid #F3F4F6',
                  display: 'flex', flexDirection: 'column', gap: 4
                }}
              >
                {hasOutstanding && (
                  <div 
                    onClick={(e) => handleWhatsApp(e, 'pending')}
                    style={{ padding: '10px 12px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', borderRadius: 8, color: '#0F0D2E', display: 'flex', alignItems: 'center', gap: 8 }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <MessageCircle size={14} color="#25D366" /> Pending Bills
                  </div>
                )}
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowShareMenu(false);
                    setLedgerModalOpen(true);
                  }}
                  style={{ padding: '10px 12px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', borderRadius: 8, color: '#0F0D2E', display: 'flex', alignItems: 'center', gap: 8 }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <FileText size={14} color="#4F46E5" /> Party Ledger
                </div>
              </div>
            </>
          )}
        </div>

        {/* Chevron icon */}
        <div style={{ color: '#9CA3AF', display: 'flex', alignItems: 'center' }}>
          <ChevronRight size={16} style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: '0.2s' }} />
        </div>
      </div>

      {/* Expanded Bills List */}
      {isExpanded && (
        <div style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {group.bills.map(bill => (
            <BillPayRow key={bill._id} bill={bill} navigate={navigate} />
          ))}
        </div>
      )}

      {/* Ledger Date Selection Modal */}
      {ledgerModalOpen && (
        <div 
          onClick={(e) => { e.stopPropagation(); setLedgerModalOpen(false); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div 
            onClick={e => e.stopPropagation()} 
            style={{ background: 'white', borderRadius: 20, padding: 24, width: '100%', maxWidth: 360, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 800, color: '#0F0D2E' }}>Select Ledger Dates</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', marginBottom: 4 }}>From Date</label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)} 
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', marginBottom: 4 }}>To Date</label>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)} 
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button 
                onClick={() => setLedgerModalOpen(false)}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid #E5E7EB', background: 'white', fontWeight: 700, color: '#4B5563', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setLedgerModalOpen(false);
                  handleWhatsApp(null, 'ledger');
                }}
                disabled={isSharing}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#4F46E5', color: 'white', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                {isSharing ? 'Generating...' : <><MessageCircle size={16} /> Share</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PaymentManagement({ type }) {
  const { bills, loaded } = useBills()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('outstanding') // 'outstanding' | 'partial' | 'paid' | 'all'
  const [viewTab, setViewTab] = useState('parties') // 'bills' | 'parties'
  const [expandedParties, setExpandedParties] = useState({})

  const moduleType = type || user?.role || 'transport'

  const relevant = useMemo(() => {
    return bills.filter(b => b.billType === moduleType && b.status !== 'draft')
  }, [bills, moduleType])

  const filtered = useMemo(() => {
    let list = [...relevant]
    if (filter === 'outstanding') list = list.filter(b => b.status !== 'paid')
    else if (filter === 'partial') list = list.filter(b => b.status === 'partial')
    else if (filter === 'paid') list = list.filter(b => b.status === 'paid')

    if (search.trim()) {
      const q = search.toLowerCase().trim()
      list = list.filter(b =>
        b.billNumber?.toLowerCase().includes(q) ||
        b.billedToName?.toLowerCase().includes(q) ||
        b.customerName?.toLowerCase().includes(q) ||
        b.party?.name?.toLowerCase().includes(q) ||
        b.billedToPhone?.toLowerCase().includes(q) ||
        b.customerPhone?.toLowerCase().includes(q)
      )
    }

    return list.sort((a, b) => new Date(b.billingDate || b.createdAt) - new Date(a.billingDate || a.createdAt))
  }, [relevant, filter, search])

  const partyGroups = useMemo(() => {
    const groups = {}
    relevant.forEach(bill => {
      const name = bill.billedToName || bill.customerName || bill.party?.name || 'Counter Sale / Guest'
      const phone = bill.billedToPhone || bill.customerPhone || bill.party?.phone || ''
      const email = bill.billedToEmail || bill.customerEmail || bill.party?.email || ''
      
      const key = name.toLowerCase().trim()
      if (!groups[key]) {
        groups[key] = {
          name,
          phone,
          email,
          partyId: bill.party?._id || bill.party?.id || null,
          bills: [],
          totalInvoiced: 0,
          totalPaid: 0,
          totalOutstanding: 0,
        }
      }
      groups[key].bills.push(bill)
      groups[key].totalInvoiced += bill.grandTotal || 0
      groups[key].totalPaid += bill.paidAmount || (bill.status === 'paid' ? bill.grandTotal : 0) || 0
    })

    const list = Object.values(groups).map(g => {
      g.totalOutstanding = Math.max(0, g.totalInvoiced - g.totalPaid)
      return g
    })

    let filteredList = list
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      filteredList = list.filter(g =>
        g.name.toLowerCase().includes(q) ||
        g.phone.includes(q) ||
        g.email.toLowerCase().includes(q) ||
        g.bills.some(b => b.billNumber?.toLowerCase().includes(q))
      )
    }

    // Sort by outstanding balance first, then name
    return filteredList.sort((a, b) => b.totalOutstanding - a.totalOutstanding || a.name.localeCompare(b.name))
  }, [relevant, search])

  // Summary totals
  const summary = useMemo(() => {
    const totalInvoiced = relevant.reduce((s, b) => s + (b.grandTotal || 0), 0)
    const totalPaid     = relevant.reduce((s, b) => s + (b.paidAmount || (b.status === 'paid' ? b.grandTotal : 0) || 0), 0)
    const totalOutstanding = Math.max(0, totalInvoiced - totalPaid)
    const partialCount = relevant.filter(b => b.status === 'partial').length
    const unpaidCount  = relevant.filter(b => b.status === 'unpaid').length
    return { totalInvoiced, totalPaid, totalOutstanding, partialCount, unpaidCount }
  }, [relevant])

  const FILTERS = [
    { val: 'outstanding', label: '⚠️ Outstanding' },
    { val: 'partial', label: '🕐 Partial' },
    { val: 'paid', label: '✅ Paid' },
    { val: 'all', label: 'All' },
  ]

  const togglePartyExpand = (key) => {
    setExpandedParties(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  return (
    <div className="page-wrapper animate-fadeIn" style={{ paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontWeight: 900, fontSize: '1.4rem', color: '#0F0D2E', margin: '0 0 4px' }}>
          Payment Management
        </h2>
        <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: 0 }}>
          Track outstanding balances & partial payments
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Total Invoiced', value: summary.totalInvoiced, color: '#4338CA', bg: '#EEF2FF' },
          { label: 'Total Collected', value: summary.totalPaid, color: '#16A34A', bg: '#F0FDF4' },
          { label: 'Outstanding', value: summary.totalOutstanding, color: summary.totalOutstanding > 0 ? '#DC2626' : '#16A34A', bg: summary.totalOutstanding > 0 ? '#FEF2F2' : '#F0FDF4' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 16, padding: '12px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 900, color: s.color }}>₹{s.value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
        ))}
      </div>

      {/* Sub-stats */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Unpaid Bills', value: summary.unpaidCount, color: '#DC2626', bg: '#FEE2E2' },
          { label: 'Partial Bills', value: summary.partialCount, color: '#D97706', bg: '#FEF3C7' },
          { label: 'Total Bills', value: relevant.length, color: '#4338CA', bg: '#EEF2FF' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: s.color }}>{s.value}</span>
            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: s.color, opacity: 0.8 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* View Toggle Tab */}
      <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: 12, padding: 3, marginBottom: 20 }}>
        <button
          onClick={() => setViewTab('parties')}
          style={{
            flex: 1, padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontWeight: 800, fontSize: '0.75rem', transition: '0.2s',
            background: viewTab === 'parties' ? 'white' : 'transparent',
            color: viewTab === 'parties' ? '#7C3AED' : '#64748B',
            boxShadow: viewTab === 'parties' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
          }}
        >
          Parties
        </button>
        <button
          onClick={() => setViewTab('bills')}
          style={{
            flex: 1, padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontWeight: 800, fontSize: '0.75rem', transition: '0.2s',
            background: viewTab === 'bills' ? 'white' : 'transparent',
            color: viewTab === 'bills' ? '#7C3AED' : '#64748B',
            boxShadow: viewTab === 'bills' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
          }}
        >
          Bills
        </button>
      </div>

      {/* Search + Filter */}
      <div style={{ background: 'white', borderRadius: 20, padding: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.04)', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder={viewTab === 'bills' ? "Search by party, bill no, phone..." : "Search by party name, phone..."}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', height: 42, borderRadius: 12, border: '1.5px solid #F3F4F6',
              background: '#F9FAFB', paddingLeft: 36, paddingRight: 12,
              fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
            }}
            onFocus={e => e.target.style.borderColor = '#7C3AED'}
            onBlur={e => e.target.style.borderColor = '#F3F4F6'}
          />
        </div>
        {viewTab === 'bills' && (
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
            {FILTERS.map(f => (
              <button
                key={f.val}
                onClick={() => setFilter(f.val)}
                style={{
                  padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  whiteSpace: 'nowrap', fontWeight: 800, fontSize: '0.65rem', transition: '0.15s',
                  background: filter === f.val ? '#7C3AED' : '#F1F5F9',
                  color: filter === f.val ? 'white' : '#64748B',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      {!loaded ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 76, borderRadius: 18 }} />)}
        </div>
      ) : viewTab === 'bills' ? (
        filtered.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '60px 20px',
            background: 'white',
            borderRadius: 24,
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
            border: '1px solid #F1F5F9',
            boxSizing: 'border-box'
          }}>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: '#F8FAFC',
              border: '1.5px solid #F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
            }}>
              <Wallet size={36} color="#94A3B8" style={{ display: 'block', margin: 'auto' }} />
            </div>
            <h3 style={{ margin: '0 0 8px', color: '#111827', fontSize: '1rem', fontWeight: 700 }}>
              {filter === 'paid' ? 'No paid bills yet' : filter === 'outstanding' ? 'No outstanding bills 🎉' : 'No bills found'}
            </h3>
            <p style={{ color: '#6B7280', fontSize: '0.8rem', margin: 0 }}>
              {filter === 'outstanding' ? 'All bills are cleared!' : 'Try a different filter or search.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(bill => (
              <BillPayRow key={bill._id} bill={bill} navigate={navigate} />
            ))}
          </div>
        )
      ) : (
        partyGroups.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '60px 20px',
            background: 'white',
            borderRadius: 24,
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
            border: '1px solid #F1F5F9',
            boxSizing: 'border-box'
          }}>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: '#F8FAFC',
              border: '1.5px solid #F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
            }}>
              <Wallet size={36} color="#94A3B8" style={{ display: 'block', margin: 'auto' }} />
            </div>
            <h3 style={{ margin: '0 0 8px', color: '#111827', fontSize: '1rem', fontWeight: 700 }}>
              No parties found
            </h3>
            <p style={{ color: '#6B7280', fontSize: '0.8rem', margin: 0 }}>
              Try a different search query.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {partyGroups.map(group => {
              const key = group.name.toLowerCase().trim()
              return (
                <PartyPayRow 
                  key={key} 
                  group={group} 
                  navigate={navigate} 
                  isExpanded={!!expandedParties[key]} 
                  onToggle={() => togglePartyExpand(key)}
                  user={user}
                />
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
