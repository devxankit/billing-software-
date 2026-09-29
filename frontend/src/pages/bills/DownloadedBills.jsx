import { useMemo, useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Download, ArrowLeft, Calendar, User, Truck, Share2, Eye, Loader2 } from 'lucide-react'

import { useBills } from '../../context/BillContext'
import { useAuth } from '../../context/AuthContext'
import { TransportInvoice, GarageInvoice } from '../../components/billing/InvoiceTemplates'
import { buildInvoicePdfFile, invoiceFileName, sharePdfFile } from '../../utils/invoiceShare'
import { usePageTranslation } from '../../hooks/usePageTranslation'
import TranslatedText from '../../components/TranslatedText'
import dayjs from 'dayjs'

export default function DownloadedBills() {
  const { bills, loaded, fetchBill } = useBills()
  const { user: sessionUser } = useAuth()
  const navigate = useNavigate()

  // Share straight from this list: render the invoice off-screen, turn it into a PDF, open the share sheet
  const [shareBill, setShareBill] = useState(null)
  const shareRootRef = useRef(null)

  const startShare = async (bill) => {
    if (shareBill) return
    const full = (await fetchBill(bill._id)) || bill
    setShareBill(full)
  }

  useEffect(() => {
    if (!shareBill) return
    let cancelled = false
    const run = async () => {
      try {
        const file = await buildInvoicePdfFile(shareRootRef.current, invoiceFileName(shareBill))
        const shareUrl = `${window.location.origin}/view-bill/${shareBill._id}`
        await sharePdfFile(file, { title: 'Invoice', text: `Invoice #${shareBill.billNumber || ''}
View/Download here: ${shareUrl}` })
      } catch (err) {
        if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
          console.error('PDF Share Error:', err)
          alert('Failed to share PDF')
        }
      } finally {
        if (!cancelled) setShareBill(null)
      }
    }
    // Wait a frame so the off-screen invoice (and its images) is laid out before capture
    const timer = setTimeout(run, 300)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [shareBill])

  const { getTranslatedText } = usePageTranslation([
    'Downloaded Bills', 'History of invoices exported as PDF', 'No downloaded bills',
    'Bills you download will appear here', 'Date', 'Party', 'Amount', 'Bill No.',
    'View Invoice', 'Download History', 'Transport', 'Garage'
  ])

  const downloadedBills = useMemo(() => {
    return bills
      .filter(b => b.isDownloaded)
      .sort((a, b) => new Date(b.downloadedAt || b.updatedAt) - new Date(a.downloadedAt || a.updatedAt))
  }, [bills])

  if (!loaded) {
    return (
      <div className="page-wrapper animate-fadeIn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="skeleton" style={{ width: '100%', maxWidth: 600, height: 400, borderRadius: 24 }} />
      </div>
    )
  }

  return (
    <div className="page-wrapper animate-fadeIn" style={{ maxWidth: 800, margin: '0 auto', paddingBottom: 60, paddingTop: 16, px: '16px' }}>
      {/* Page Heading */}
      <div style={{ marginBottom: 18, paddingLeft: 4 }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 950, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
          {getTranslatedText('Downloaded Bills')}
        </h2>
        <p style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600, margin: '2px 0 0' }}>
          {getTranslatedText('History of invoices exported as PDF')}
        </p>
      </div>

      {downloadedBills.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: 'white', borderRadius: 28, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Download size={32} color="#94A3B8" />
          </div>
          <h3 style={{ margin: '0 0 8px 0', color: '#1E293B' }}>{getTranslatedText('No downloaded bills')}</h3>
          <p style={{ color: '#64748B', fontSize: '0.875rem', margin: 0 }}>{getTranslatedText('Bills you download will appear here')}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {downloadedBills.map(bill => (
            <div 
              key={bill._id} 
              onClick={() => navigate(`/bills/${bill._id}?viewOnly=true`)}
              style={{ 
                background: 'white', borderRadius: 24, padding: '16px', 
                boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.02)',
                display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: '0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}
            >
              <div style={{ 
                width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                background: bill.billType === 'garage' ? '#FFF7ED' : '#F5F3FF',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <FileText size={22} color={bill.billType === 'garage' ? '#F3811E' : '#7C3AED'} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0F172A', wordBreak: 'break-word' }}>
                    {bill.billNumber || 'Draft'}
                  </span>
                  <span style={{ fontSize: '0.6rem', fontWeight: 900, background: '#F1F5F9', color: '#64748B', padding: '2px 8px', borderRadius: 6, textTransform: 'uppercase', flexShrink: 0 }}>
                    {bill.billType === 'garage' ? getTranslatedText('Garage') : getTranslatedText('Transport')}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <User size={12} style={{ flexShrink: 0 }} /> 
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <TranslatedText>{bill.billedToName || bill.customerName || bill.party?.name || '—'}</TranslatedText>
                  </span>
                </div>
                <div style={{ fontSize: '0.65rem', color: '#94A3B8', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Calendar size={12} style={{ flexShrink: 0 }} /> 
                  <span style={{ whiteSpace: 'nowrap' }}>{dayjs(bill.downloadedAt).format('DD MMM, hh:mm A')}</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 900, fontSize: '1rem', color: '#0F172A', lineHeight: 1 }}>₹{(bill.grandTotal || 0).toLocaleString()}</div>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#16A34A', marginTop: 4 }}>{dayjs(bill.billingDate || bill.createdAt).format('DD MMM')}</div>
                </div>
                
                <div style={{ display: 'flex', gap: 6 }}>
                  <button 
                    onClick={(e) => { e.stopPropagation(); startShare(bill) }}
                    disabled={!!shareBill}
                    style={{ 
                      width: 32, height: 32, borderRadius: 8, border: 'none', background: '#F0FDF4', 
                      color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' 
                    }}
                    title="Share"
                  >
                    {shareBill?._id === bill._id ? <Loader2 size={14} className="spin" /> : <Share2 size={14} />}
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); navigate(`/bills/${bill._id}?viewOnly=true`) }}
                    style={{ 
                      width: 32, height: 32, borderRadius: 8, border: 'none', background: '#F8FAFC', 
                      color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' 
                    }}
                    title="View"
                  >
                    <Eye size={14} />
                  </button>
                </div>
              </div>


            </div>
          ))}
        </div>
      )}

      {shareBill && (
        <div ref={shareRootRef} aria-hidden="true" style={{ position: 'fixed', left: -10000, top: 0, width: 800, pointerEvents: 'none' }}>
          {(() => {
            const business = shareBill.businessSnapshot || ((shareBill.owner && typeof shareBill.owner === 'object') ? shareBill.owner : sessionUser)
            return shareBill.billType === 'garage'
              ? <GarageInvoice bill={shareBill} business={business} />
              : <TransportInvoice bill={shareBill} business={business} />
          })()}
        </div>
      )}
      <style>{`.spin { animation: spin 0.8s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
