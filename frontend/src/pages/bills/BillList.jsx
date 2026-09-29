import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useMemo, useEffect, useRef } from 'react'
import { Plus, Search, FileText, Truck, Wrench, X, Trash2, Eye, Calendar, Edit2 } from 'lucide-react'
import { useBills } from '../../context/BillContext'
import { useAuth } from '../../context/AuthContext'
import { usePageTranslation } from '../../hooks/usePageTranslation'
import TranslatedText from '../../components/TranslatedText'
import dayjs from 'dayjs'

const STATUS_MAP = {
  paid: { label: 'Paid', color: '#16A34A', bg: '#DCFCE7' },
  unpaid: { label: 'Unpaid', color: '#DC2626', bg: '#FEE2E2' },
  partial: { label: 'Partial', color: '#D97706', bg: '#FEF3C7' },
  topay: { label: 'To Pay', color: '#D97706', bg: '#FEF3C7' },
  tbb: { label: 'TBB', color: '#2563EB', bg: '#DBEAFE' },
  draft: { label: 'Draft', color: '#6B7280', bg: '#F3F4F6' },
}

function PartyCard({ party, onClick, getTranslatedText }) {
  const billCount = party.bills.length
  return (
    <div
      onClick={() => onClick(party.name)}
      style={{
        background: 'white', borderRadius: 20, padding: '18px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.04)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 14,
        border: '1px solid rgba(0,0,0,0.02)', transition: '0.2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary-lighter)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.02)'; e.currentTarget.style.transform = 'none' }}
    >
      <div style={{
        width: 52, height: 52, borderRadius: 16, flexShrink: 0,
        background: '#F0F9FF', color: '#0369A1',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.25rem'
      }}>
        {party.name[0]?.toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ margin: '0 0 2px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0F0D2E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <TranslatedText>{party.name}</TranslatedText>
        </h3>
        <div style={{
          margin: 0, fontSize: '0.75rem', color: '#6B7280', fontWeight: 600,
          display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: 6, rowGap: 2
        }}>
          {party.phone && <span>{party.phone}</span>}
          {party.phone && <span style={{ opacity: 0.4 }}>•</span>}
          <span style={{ whiteSpace: 'nowrap' }}>
            {billCount} {getTranslatedText(billCount === 1 ? 'Bill' : 'Bills')}
          </span>
          <span style={{ opacity: 0.4 }}>•</span>
          <span style={{ whiteSpace: 'nowrap' }}>
            {getTranslatedText('Paid')} {party.bills.filter(b => b.status === 'paid').length}
          </span>
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: 4 }}>
        <div style={{ fontWeight: 900, fontSize: '1rem', color: '#0F0D2E', marginBottom: 2 }}>
          ₹{party.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
        </div>
        {party.pendingAmount > 0 && (
          <div style={{ fontSize: '0.625rem', fontWeight: 800, color: '#DC2626', background: '#FEE2E2', padding: '2px 8px', borderRadius: 6, display: 'inline-block', whiteSpace: 'nowrap' }}>
            {getTranslatedText('Pending').toUpperCase()}: ₹{party.pendingAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </div>
        )}
      </div>
    </div>

  )
}

function BillCard({ bill, onClick, onDelete, getTranslatedText, navigate }) {
  const statusInfo = STATUS_MAP[bill.status] || STATUS_MAP.unpaid
  const isGarage = bill.billType === 'garage'
  const isTransport = !isGarage

  const partyName = isTransport ? (bill.billedToName || bill.party?.name || getTranslatedText('Consolidated Bill')) : (bill.customerName || bill.party?.name || '—')
  const itemCount = bill.items?.length || 0

  return (
    <div
      onClick={() => onClick(bill)}
      style={{
        background: 'white', borderRadius: 20, padding: '16px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.04)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 14,
        border: '1px solid rgba(0,0,0,0.02)', transition: '0.2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary-lighter)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.02)'; e.currentTarget.style.transform = 'none' }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 14, flexShrink: 0,
        background: isGarage ? '#F5F3FF' : '#FFF7ED',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {isGarage
          ? <Wrench size={22} color="#7C3AED" />
          : <Truck size={22} color="#F3811E" />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0F0D2E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {bill.billNumber || getTranslatedText('Draft').toUpperCase()}
          </span>
          <span style={{
            fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase',
            padding: '2px 8px', borderRadius: 6,
            background: statusInfo.bg, color: statusInfo.color
          }}>
            {getTranslatedText(statusInfo.label)}
          </span>
        </div>
        <div style={{ fontSize: '0.7rem', color: '#6B7280', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <TranslatedText>{partyName}</TranslatedText> {bill.billedToPhone || bill.party?.phone ? `• ${bill.billedToPhone || bill.party?.phone}` : ''}
        </div>
        <div style={{ fontSize: '0.65rem', color: '#9CA3AF', fontWeight: 500, marginTop: 2 }}>
          {dayjs(bill.billDate || bill.billingDate || bill.createdAt).format('DD MMM')} • {isTransport ? `${itemCount} ${getTranslatedText(itemCount === 1 ? 'Trip' : 'Trips')}` : (bill.vehicleNo || '—')}
        </div>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
        <div style={{ fontWeight: 900, fontSize: '1rem', color: '#0F0D2E', marginBottom: 6 }}>
          ₹{(bill.grandTotal || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
        </div>
        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
          {bill.status !== 'draft' && (
            <button onClick={e => { e.stopPropagation(); onClick(bill) }}
              title={getTranslatedText('View')}
              style={{ width: 28, height: 28, border: 'none', background: '#F3F4F6', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Eye size={12} color="#6B7280" />
            </button>
          )}
          {bill.status !== 'paid' && (
            <button onClick={e => {
              e.stopPropagation();
              const prefix = bill.billType === 'transport' ? 'transport' : 'garage';
              navigate(`/${prefix}/bills/edit/${bill._id}`);
            }}
              title={getTranslatedText('Edit')}
              style={{ width: 28, height: 28, border: 'none', background: '#E0F2FE', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Edit2 size={12} color="#0369A1" />
            </button>
          )}
          <button onClick={e => { e.stopPropagation(); onDelete(bill._id) }}
            style={{ width: 28, height: 28, border: 'none', background: '#FEE2E2', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trash2 size={12} color="#DC2626" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BillList({ type }) {
  const { bills, deleteBill, loaded } = useBills()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [selectedParty, setSelectedParty] = useState(null)
  const searchInputRef = useRef(null)

  // Batch Translation
  const { getTranslatedText } = usePageTranslation([
    'Transport Bills', 'Garage Bills', 'Managed', 'Add New', 'Search by vehicle, bill no or party...',
    'From Date', 'To Date', 'Reset Filters', 'Party-wise', 'View All', 'Date',
    'All', 'Pending', 'Paid', 'Draft', 'Transport', 'Garage', 'Back to Parties',
    'No bills found', 'Try a different search term', 'Start by creating a new invoice',
    'Bill', 'Bills', 'Trip', 'Trips', 'View', 'Edit', 'Consolidated Bill',
    'Paid', 'Unpaid', 'Partial', 'To Pay', 'TBB', 'Draft', 'Number'
  ])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('search') === 'true' && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [location.search])

  const [startDate, setStartDate] = useState(dayjs().subtract(1, 'month').format('YYYY-MM-DD'))
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [viewMode, setViewMode] = useState('party')
  const [sortOrder, setSortOrder] = useState('desc')
  const [sortBy, setSortBy] = useState('date') // 'date' or 'number'

  const userRole = user?.role || 'transport'
  const moduleType = type || userRole
  const isAdmin = userRole === 'admin'

  const filtered = useMemo(() => {
    let list = bills
    if (!isAdmin) {
      list = list.filter(b => b.billType === moduleType)
    } else if (type) {
      list = list.filter(b => b.billType === type)
    }

    if (filter === 'paid') list = list.filter(b => b.status === 'paid')
    if (filter === 'draft') list = list.filter(b => b.status === 'draft')
    if (filter === 'unpaid') list = list.filter(b => (b.status !== 'paid' && b.status !== 'draft'))
    if (filter === 'transport') list = list.filter(b => b.billType === 'transport')
    if (filter === 'garage') list = list.filter(b => b.billType === 'garage')

    if (startDate) {
      list = list.filter(b => dayjs(b.billDate || b.billingDate || b.createdAt).format('YYYY-MM-DD') >= startDate)
    }
    if (endDate) {
      list = list.filter(b => dayjs(b.billDate || b.billingDate || b.createdAt).format('YYYY-MM-DD') <= endDate)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(b =>
        b.billNumber?.toLowerCase().includes(q) ||
        b.billedToName?.toLowerCase().includes(q) ||
        b.customerName?.toLowerCase().includes(q) ||
        b.vehicleNo?.toLowerCase().includes(q) ||
        b.billedToPhone?.toLowerCase().includes(q) ||
        b.customerPhone?.toLowerCase().includes(q) ||
        (b.party?.phone || '').toLowerCase().includes(q) ||
        b.items?.some(item =>
          item.companyFrom?.toLowerCase().includes(q) ||
          item.companyTo?.toLowerCase().includes(q) ||
          item.chalanNo?.toLowerCase().includes(q) ||
          item.tempoNo?.toLowerCase().includes(q)
        )
      )
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'number') {
        const numA = a.billNumber || ''
        const numB = b.billNumber || ''
        // Natural sort for strings like Inv-T-2026-01
        return sortOrder === 'desc'
          ? numB.localeCompare(numA, undefined, { numeric: true, sensitivity: 'base' })
          : numA.localeCompare(numB, undefined, { numeric: true, sensitivity: 'base' })
      }
      const dateA = new Date(a.billDate || a.billingDate || a.createdAt)
      const dateB = new Date(b.billDate || b.billingDate || b.createdAt)
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
    })
  }, [bills, filter, search, isAdmin, userRole, moduleType, type, sortOrder, sortBy, startDate, endDate])

  const groupedByParty = useMemo(() => {
    const map = {};
    filtered.forEach(bill => {
      const name = bill.billType === 'transport'
        ? (bill.billedToName || bill.party?.name || 'Uncategorized')
        : (bill.customerName || bill.party?.name || 'Uncategorized');

      const key = name.toLowerCase().trim();
      const bDate = new Date(bill.billDate || bill.billingDate || bill.createdAt);

      if (!map[key]) {
        map[key] = {
          name,
          phone: bill.billedToPhone || bill.party?.phone || bill.customerPhone,
          bills: [],
          totalAmount: 0,
          pendingAmount: 0,
          latestDate: bDate,
          latestBillNumber: bill.billNumber || ''
        };
      }
      map[key].bills.push(bill);
      map[key].totalAmount += (bill.grandTotal || 0);
      if (bill.status !== 'paid' && bill.status !== 'draft') {
        const paidAmt = bill.paidAmount || 0;
        map[key].pendingAmount += Math.max(0, (bill.grandTotal || 0) - paidAmt);
      }
      if (!map[key].phone) {
        map[key].phone = bill.billedToPhone || bill.party?.phone || bill.customerPhone;
      }
      if (bDate > map[key].latestDate) {
        map[key].latestDate = bDate;
        map[key].latestBillNumber = bill.billNumber || '';
      }
    });

    return Object.values(map).sort((a, b) => {
      if (sortBy === 'number') {
        return sortOrder === 'desc'
          ? b.latestBillNumber.localeCompare(a.latestBillNumber, undefined, { numeric: true })
          : a.latestBillNumber.localeCompare(b.latestBillNumber, undefined, { numeric: true })
      }
      return sortOrder === 'desc' ? b.latestDate - a.latestDate : a.latestDate - b.latestDate
    });
  }, [filtered, sortBy, sortOrder]);

  const displayedBillsForParty = useMemo(() => {
    if (!selectedParty) return [];
    return filtered
      .filter(bill => {
        const name = bill.billType === 'transport'
          ? (bill.billedToName || bill.party?.name || 'Uncategorized')
          : (bill.customerName || bill.party?.name || 'Uncategorized');
        return name.toLowerCase().trim() === selectedParty.toLowerCase().trim();
      })
      .sort((a, b) => {
        if (sortBy === 'number') {
          const numA = a.billNumber || ''
          const numB = b.billNumber || ''
          return sortOrder === 'desc'
            ? numB.localeCompare(numA, undefined, { numeric: true })
            : numA.localeCompare(numB, undefined, { numeric: true })
        }
        const dateA = new Date(a.billDate || a.billingDate || a.createdAt)
        const dateB = new Date(b.billDate || b.billingDate || b.createdAt)
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
      });
  }, [selectedParty, filtered, sortBy, sortOrder]);

  const totals = useMemo(() => {
    const list = (isAdmin && !type) ? bills : bills.filter(b => b.billType === (type || userRole))
    const paid = list.reduce((s, b) => s + (b.paidAmount || (b.status === 'paid' ? b.grandTotal : 0) || 0), 0)
    const pending = list.filter(b => b.status !== 'paid' && b.status !== 'draft').reduce((s, b) => s + Math.max(0, (b.grandTotal || 0) - (b.paidAmount || 0)), 0)
    return { paid, pending, count: list.length }
  }, [bills, isAdmin, userRole, type])

  const FILTERS = [
    { val: 'all', label: getTranslatedText('All') },
    { val: 'unpaid', label: getTranslatedText('Pending') },
    { val: 'paid', label: getTranslatedText('Paid') },
    { val: 'draft', label: getTranslatedText('Draft') },
    ...(isAdmin && !type ? [
      { val: 'transport', label: `🚛 ${getTranslatedText('Transport')}` },
      { val: 'garage', label: `🔧 ${getTranslatedText('Garage')}` }
    ] : []),
  ]

  return (
    <div className="page-wrapper animate-fadeIn" style={{ paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontWeight: 900, fontSize: window.innerWidth < 640 ? '1.25rem' : '1.5rem', color: '#0F0D2E', margin: 0 }}>
            {moduleType === 'transport' ? getTranslatedText('Transport Bills') : getTranslatedText('Garage Bills')}
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: 0 }}>{totals.count} {getTranslatedText('Managed')}</p>
        </div>
        <button
          className={window.innerWidth < 640 ? "btn btn-primary btn-sm" : "btn btn-primary btn-lg"}
          onClick={() => navigate(`/${moduleType}/bills/new`)}
          style={{ borderRadius: 12, height: window.innerWidth < 640 ? 40 : 'auto', padding: window.innerWidth < 640 ? '0 12px' : '14px 28px' }}
        >
          <Plus size={window.innerWidth < 640 ? 18 : 20} /> <span className="hide-mobile">{getTranslatedText('Add New')}</span>
        </button>
      </div>

      {/* Search & Filter */}
      <div style={{ background: 'white', borderRadius: 28, padding: '20px', boxShadow: '0 10px 40px rgba(0,0,0,0.04)', marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              ref={searchInputRef}
              placeholder={getTranslatedText('Search bills...')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: 16, height: 44, borderRadius: 12, border: '1px solid #F3F4F6', background: '#F9FAFB', fontSize: '0.85rem' }}
            />
          </div>
          <button style={{
            width: 44, height: 44, borderRadius: 12, border: 'none', background: '#0F0D2E', color: 'white',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(15, 13, 46, 0.15)'
          }}>
            <Search size={20} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.62rem', textTransform: 'uppercase', marginBottom: 3, display: 'block', opacity: 0.7 }}>{getTranslatedText('From Date')}</label>
            <div className="input-group">
              <Calendar size={13} className="input-icon" style={{ left: 12, top: '50%', transform: 'translateY(-50%)', position: 'absolute', pointerEvents: 'none', color: 'var(--text-muted)' }} />
              <input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)} 
                className="form-input"
                style={{ paddingLeft: 34, paddingRight: 4, height: 36, borderRadius: 10, fontSize: '0.78rem', fontWeight: 700 }}
              />
            </div>
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.62rem', textTransform: 'uppercase', marginBottom: 3, display: 'block', opacity: 0.7 }}>{getTranslatedText('To Date')}</label>
            <div className="input-group">
              <Calendar size={13} className="input-icon" style={{ left: 12, top: '50%', transform: 'translateY(-50%)', position: 'absolute', pointerEvents: 'none', color: 'var(--text-muted)' }} />
              <input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)} 
                className="form-input"
                style={{ paddingLeft: 34, paddingRight: 4, height: 36, borderRadius: 10, fontSize: '0.78rem', fontWeight: 700 }}
              />
            </div>
          </div>
        </div>

        {(startDate !== dayjs().subtract(1, 'month').format('YYYY-MM-DD') || endDate !== dayjs().format('YYYY-MM-DD') || search) && (
          <button
            onClick={() => { setStartDate(dayjs().subtract(1, 'month').format('YYYY-MM-DD')); setEndDate(dayjs().format('YYYY-MM-DD')); setSearch(''); setFilter('all') }}
            style={{ padding: '8px', borderRadius: 10, border: 'none', background: '#FEE2E2', color: '#DC2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', gap: 6 }}
          >
            <X size={16} /> {getTranslatedText('Reset Filters')}
          </button>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
            {FILTERS.map(f => (
              <button key={f.val} onClick={() => setFilter(f.val)}
                style={{
                  padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                  background: filter === f.val ? '#7C3AED' : '#F1F5F9',
                  color: filter === f.val ? 'white' : '#64748B',
                  fontWeight: 800, fontSize: '0.65rem', transition: '0.2s'
                }}
              >{f.label}</button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F3F4F6', paddingTop: 10 }}>
            <div style={{ display: 'flex', background: '#F1F5F9', padding: 3, borderRadius: 10 }}>
              <button
                onClick={() => { setViewMode('party'); setSelectedParty(null); }}
                style={{
                  padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 800,
                  background: viewMode === 'party' ? 'white' : 'transparent',
                  color: viewMode === 'party' ? '#0F0D2E' : '#64748B',
                  boxShadow: viewMode === 'party' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                  transition: '0.2s'
                }}
              >{getTranslatedText('Party-wise')}</button>
              <button
                onClick={() => { setViewMode('all'); setSelectedParty(null); }}
                style={{
                  padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 800,
                  background: viewMode === 'all' ? 'white' : 'transparent',
                  color: viewMode === 'all' ? '#0F0D2E' : '#64748B',
                  boxShadow: viewMode === 'all' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                  transition: '0.2s'
                }}
              >{getTranslatedText('View All')}</button>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => {
                  if (sortBy === 'date') setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')
                  else setSortBy('date')
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 10,
                  border: '1px solid #E2E8F0', background: sortBy === 'date' ? '#0F0D2E' : 'white', cursor: 'pointer',
                  fontSize: '0.65rem', fontWeight: 800, color: sortBy === 'date' ? 'white' : '#475569', transition: '0.2s'
                }}
              >
                <Calendar size={14} />
                {getTranslatedText('Date')} {sortBy === 'date' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
              </button>
              <button
                onClick={() => {
                  if (sortBy === 'number') setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')
                  else setSortBy('number')
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 10,
                  border: '1px solid #E2E8F0', background: sortBy === 'number' ? '#0F0D2E' : 'white', cursor: 'pointer',
                  fontSize: '0.65rem', fontWeight: 800, color: sortBy === 'number' ? 'white' : '#475569', transition: '0.2s'
                }}
              >
                <FileText size={14} />
                {getTranslatedText('Number')} {sortBy === 'number' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* List Content */}
      {!loaded ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 20 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '60px 20px',
          background: 'white',
          borderRadius: 28,
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          border: '1px solid #F1F5F9',
          boxSizing: 'border-box',
          width: '100%'
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
            <FileText size={36} color="#94A3B8" style={{ display: 'block', margin: 'auto' }} />
          </div>
          <h3 style={{ margin: 0, color: '#111827', fontSize: '1.125rem', fontWeight: 800 }}>{getTranslatedText('No bills found')}</h3>
          <p style={{ color: '#6B7280', fontSize: '0.875rem', marginTop: 8, marginBottom: 0 }}>{search ? getTranslatedText('Try a different search term') : getTranslatedText('Start by creating a new invoice')}</p>
        </div>
      ) : (viewMode === 'party' && !selectedParty) ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {groupedByParty.map(party => (
            <PartyCard key={party.name} party={party} onClick={setSelectedParty} getTranslatedText={getTranslatedText} />
          ))}
        </div>
      ) : viewMode === 'all' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(bill => (
            <BillCard key={bill._id} bill={bill} onClick={b => b.status === 'draft' ? navigate(`/${b.billType === 'transport' ? 'transport' : 'garage'}/bills/edit/${b._id}`) : navigate(`/bills/${b._id}`)} onDelete={deleteBill} getTranslatedText={getTranslatedText} navigate={navigate} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <button onClick={() => setSelectedParty(null)} style={{ border: 'none', background: '#F3F4F6', borderRadius: 10, padding: '8px 12px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', color: '#4B5563', display: 'flex', alignItems: 'center', gap: 6 }}>
              <X size={14} /> {getTranslatedText('Back to Parties')}
            </button>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0F0D2E' }}><TranslatedText>{selectedParty}</TranslatedText></div>
          </div>
          {displayedBillsForParty.map(bill => (
            <BillCard key={bill._id} bill={bill} onClick={b => b.status === 'draft' ? navigate(`/${b.billType === 'transport' ? 'transport' : 'garage'}/bills/edit/${b._id}`) : navigate(`/bills/${b._id}`)} onDelete={deleteBill} getTranslatedText={getTranslatedText} navigate={navigate} />
          ))}
        </div>
      )}
      <style>{`
        .responsive-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        @media (max-width: 640px) {
          .responsive-grid {
            grid-template-columns: 1fr !important;
          }
        }
        * { -webkit-overflow-scrolling: touch; }
      `}</style>
    </div>
  )
}
