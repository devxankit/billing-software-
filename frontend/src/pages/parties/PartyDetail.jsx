import { useState, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, Phone, MapPin, Globe, CreditCard, 
  Receipt, TrendingUp, History, User, Mail, 
  ExternalLink, Calendar, Truck, CheckCircle2, Clock, Edit2, Download, Share2
} from 'lucide-react'
import { useParties } from '../../context/PartyContext'
import { useBills } from '../../context/BillContext'
import { useAuth } from '../../context/AuthContext'
import { usePageTranslation } from '../../hooks/usePageTranslation'
import dayjs from 'dayjs'

// Full amount with 2 decimals (e.g. ₹12,345.50) — never rounded or abbreviated
const formatINR = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div style={{ background: 'white', borderRadius: 20, padding: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 44, height: 44, borderRadius: 14, background: bg, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={20} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: '0.7rem', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{label}</div>
        <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0F0D2E', marginTop: 1, wordBreak: 'break-word', overflowWrap: 'break-word' }} title={value}>{value}</div>
      </div>
    </div>
  )
}

function BillItem({ bill, onClick, getTranslatedText }) {
  const statusLabels = {
    paid:    { label: 'Paid',    color: '#16A34A', bg: '#DCFCE7' },
    unpaid:  { label: 'Unpaid',  color: '#DC2626', bg: '#FEE2E2' },
    partial: { label: 'Partial', color: '#D97706', bg: '#FEF3C7' },
    topay:   { label: 'To Pay',  color: '#D97706', bg: '#FEF3C7' },
    tbb:     { label: 'TBB',     color: '#2563EB', bg: '#DBEAFE' },
    draft:   { label: 'Draft',   color: '#6B7280', bg: '#F3F4F6' },
  }
  const status = statusLabels[bill.status] || statusLabels.unpaid
  const itemCount = bill.items?.length || 0
  
  return (
    <div 
      onClick={() => onClick(bill._id || bill.id)}
      style={{ background: 'white', borderRadius: 18, padding: '14px 16px', border: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', transition: '0.2s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#7C3AED'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#F1F5F9'}
    >
      <div style={{ width: 40, height: 40, borderRadius: 12, background: '#F8FAFC', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Receipt size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F0D2E' }}>{bill.billNumber || getTranslatedText('DRAFT')}</span>
          <span style={{ fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 6, background: status.bg, color: status.color }}>
            {getTranslatedText(bill.status) || getTranslatedText(status.label)}
          </span>
        </div>
        <div style={{ fontSize: '0.7rem', color: '#9CA3AF', fontWeight: 500 }}>
          {dayjs(bill.billDate || bill.createdAt).format('DD MMM, YYYY')} • {itemCount} {getTranslatedText('Items')}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F0D2E' }}>{formatINR(bill.grandTotal)}</div>
        <div style={{ fontSize: '0.65rem', color: '#9CA3AF', fontWeight: 600 }}>{getTranslatedText('View Detail')}</div>
      </div>
    </div>
  )
}

function PaymentItem({ entry, onClick, getTranslatedText }) {
  return (
    <div
      onClick={() => onClick(entry.billId)}
      style={{ background: '#F0FDF4', borderRadius: 18, padding: '12px 16px', border: '1px solid #DCFCE7', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 12, background: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <CheckCircle2 size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F0D2E', marginBottom: 2 }}>
          {getTranslatedText('Payment Received')}{entry.mode ? ` (${entry.mode})` : ''}
        </div>
        <div style={{ fontSize: '0.7rem', color: '#6B7280', fontWeight: 500 }}>
          {dayjs(entry.date).format('DD MMM, YYYY')} • {entry.billNumber || getTranslatedText('DRAFT')}
        </div>
      </div>
      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#16A34A', textAlign: 'right' }}>
        + {formatINR(entry.amount)}
      </div>
    </div>
  )
}

export default function PartyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getParty, loaded: partiesLoaded } = useParties()
  const { bills, loaded: billsLoaded } = useBills()

  const { user } = useAuth()

  const party = useMemo(() => getParty(id), [id, getParty, partiesLoaded])
  
  const partyBills = useMemo(() => {
    return bills.filter(b => 
      (b.partyId === id || b.party?._id === id || b.party?.id === id) ||
      (b.billedToName && party && b.billedToName.toLowerCase().trim() === party.name.toLowerCase().trim())
    ).sort((a,b) => new Date(b.billDate || b.createdAt) - new Date(a.billDate || a.createdAt))
  }, [id, bills, party])
  const { getTranslatedText } = usePageTranslation([
    'Party Ledgers', 'Total Billed', 'Amount Paid', 'Pending', 'Contact Details',
    'Phone Number', 'Email', 'GSTIN', 'Address Info', 'Transaction History',
    'No Invoices Found', 'Party Not Found', 'Go Back', 'Paid', 'Unpaid', 'Partial',
    'To Pay', 'TBB', 'Draft', 'Items', 'View Detail', 'No Phone', 'No City', 'No GST',
    'No Address Details', 'DRAFT', 'Payment Received', 'paid', 'unpaid', 'partial', 'topay', 'tbb', 'draft',
    party?.name, party?.city, party?.address, party?.state, party?.pincode,
    ...partyBills.map(b => b.billNumber)
  ])

  // Ledger timeline: every bill plus every individual payment, newest first
  const ledger = useMemo(() => {
    const entries = []
    partyBills.forEach(bill => {
      const billId = bill._id || bill.id
      entries.push({ kind: 'bill', key: `bill-${billId}`, date: bill.billingDate || bill.billDate || bill.createdAt, bill })
      if (bill.status === 'draft') return
      if (bill.payments?.length) {
        bill.payments.forEach((p, i) => entries.push({
          kind: 'payment', key: `pay-${billId}-${p._id || i}`, billId, billNumber: bill.billNumber,
          date: p.date || p.createdAt || bill.createdAt, amount: p.amount || 0, mode: p.mode,
        }))
      } else {
        // Older bills paid before installments were tracked
        const paid = bill.paidAmount || (bill.status === 'paid' ? bill.grandTotal : 0) || 0
        if (paid > 0) entries.push({
          kind: 'payment', key: `pay-${billId}`, billId, billNumber: bill.billNumber,
          date: bill.paymentDate || bill.updatedAt || bill.createdAt, amount: paid,
        })
      }
    })
    return entries.sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [partyBills])

  const stats = useMemo(() => {
    const validBills = partyBills.filter(b => b.status !== 'draft')
    const total = validBills.reduce((s, b) => s + (b.grandTotal || 0), 0)
    const paid = validBills.reduce((s, b) => s + (b.paidAmount || (b.status === 'paid' ? b.grandTotal : 0) || 0), 0)
    const pending = Math.max(0, total - paid)
    return { total, paid, pending, count: validBills.length }
  }, [partyBills])

  if (!partiesLoaded || !billsLoaded) {
    return (
      <div className="page-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="skeleton" style={{ width: '100%', maxWidth: 500, height: 400, borderRadius: 28 }} />
      </div>
    )
  }

  if (!party) {
    return (
      <div className="page-wrapper" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <h3 style={{ color: '#0F0D2E', fontWeight: 800 }}>{getTranslatedText('Party Not Found')}</h3>
        <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ marginTop: 16 }}>{getTranslatedText('Go Back')}</button>
      </div>
    )
  }

  return (
    <div className="page-wrapper animate-fadeIn" style={{ paddingBottom: 40 }}>
      {/* Header Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(-1)} style={{ width: 36, height: 36, borderRadius: 12, border: 'none', background: 'white', color: '#0F0D2E', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <ArrowLeft size={20} />
          </button>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0F0D2E', margin: 0 }}>{getTranslatedText('Party Ledgers')}</h2>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button 
            onClick={() => navigate(`/${window.location.pathname.includes('garage') ? 'garage' : 'transport'}/parties/edit/${party._id || party.id}`)} 
            style={{ width: 36, height: 36, borderRadius: 12, border: 'none', background: '#F3F4F6', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <Edit2 size={18} />
          </button>
        </div>
      </div>

      {/* Main Profile Card */}
      <div style={{ background: 'white', borderRadius: 28, padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.02)', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
          <div style={{ width: 70, height: 70, borderRadius: 22, background: 'linear-gradient(135deg, #7C3AED, #9333EA)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', fontWeight: 900, boxShadow: '0 8px 20px rgba(124, 58, 237, 0.25)' }}>
            {party.name[0].toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0F0D2E', margin: '0 0 4px 0' }}>{getTranslatedText(party.name)}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                <Phone size={14} /> {party.phone || getTranslatedText('No Phone')}
              </span>
              <span style={{ fontSize: '0.8rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                <MapPin size={14} /> {party.city ? getTranslatedText(party.city) : getTranslatedText('No City')}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <StatCard icon={TrendingUp} label={getTranslatedText('Total Billed')} value={formatINR(stats.total)} color="#7C3AED" bg="#F5F3FF" />
          <StatCard icon={CheckCircle2} label={getTranslatedText('Amount Paid')} value={formatINR(stats.paid)} color="#16A34A" bg="#DCFCE7" />
          <StatCard icon={Clock} label={getTranslatedText('Pending')} value={formatINR(stats.pending)} color="#DC2626" bg="#FEE2E2" />
        </div>
      </div>

      {/* Details Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'white', borderRadius: 24, padding: '20px', border: '1px solid #F1F5F9' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#64748B', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <User size={16} /> {getTranslatedText('Contact Details')}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowWrap: 'break-word', wordBreak: 'break-all' }}>
            <div style={{ fontSize: '0.8rem' }}><span style={{ color: '#94A3B8', fontWeight: 600 }}>{getTranslatedText('Phone Number')}: </span> <span style={{ color: '#1E293B', fontWeight: 700 }}>{party.phone || '—'}</span></div>
            <div style={{ fontSize: '0.8rem' }}><span style={{ color: '#94A3B8', fontWeight: 600 }}>{getTranslatedText('Email')}: </span> <span style={{ color: '#1E293B', fontWeight: 700 }}>{party.email || '—'}</span></div>
            <div style={{ fontSize: '0.8rem' }}><span style={{ color: '#94A3B8', fontWeight: 600 }}>{getTranslatedText('GSTIN')}: </span> <span style={{ color: '#1E293B', fontWeight: 700 }}>{party.gstin || getTranslatedText('No GST')}</span></div>
          </div>
        </div>
        <div style={{ background: 'white', borderRadius: 24, padding: '20px', border: '1px solid #F1F5F9' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#64748B', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <MapPin size={16} /> {getTranslatedText('Address Info')}
          </h3>
          <div style={{ fontSize: '0.8rem', color: '#1E293B', fontWeight: 700, lineHeight: 1.6, overflowWrap: 'break-word', wordBreak: 'break-word' }}>
            {party.address ? (
              <>
                <div>{getTranslatedText(party.address)}</div>
                {(party.city || party.state || party.pincode) && (
                  <div style={{ marginTop: 4, color: '#475569', fontWeight: 600 }}>
                    {[party.city ? getTranslatedText(party.city) : null, party.state ? getTranslatedText(party.state) : null, party.pincode].filter(Boolean).join(', ')}
                  </div>
                )}
              </>
            ) : party.city ? (
               getTranslatedText(party.city)
            ) : (
               getTranslatedText('No Address Details')
            )}
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <History size={18} color="#0F0D2E" />
        <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#0F0D2E', margin: 0 }}>{getTranslatedText('Transaction History')}</h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {partyBills.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '44px 20px',
            background: 'white',
            borderRadius: 24,
            border: '1px dashed #CBD5E1',
            boxSizing: 'border-box',
            width: '100%'
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: '#F8FAFC',
              border: '1.5px solid #F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
            }}>
              <Receipt size={28} color="#94A3B8" style={{ display: 'block', margin: 'auto' }} />
            </div>
            <div style={{ color: '#64748B', fontSize: '0.85rem', fontWeight: 700 }}>{getTranslatedText('No Invoices Found')}</div>
          </div>
        ) : (
          ledger.map(entry => entry.kind === 'bill' ? (
            <BillItem key={entry.key} bill={entry.bill} onClick={(id) => navigate(`/bills/${id}`)} getTranslatedText={getTranslatedText} />
          ) : (
            <PaymentItem key={entry.key} entry={entry} onClick={(id) => navigate(`/bills/${id}`)} getTranslatedText={getTranslatedText} />
          ))
        )}
      </div>
      

    </div>
  )
}
