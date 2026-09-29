import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useBills } from '../../context/BillContext'
import { useAuth } from '../../context/AuthContext'
import { usePageTranslation } from '../../hooks/usePageTranslation'
import { ArrowLeft, Trash2, Download, FileText, Pencil, CheckCircle2, Share2, Wallet, MessageCircle, Clock, IndianRupee } from 'lucide-react'

import dayjs from 'dayjs'
import { useRef, useState, useEffect } from 'react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { pdf } from '@react-pdf/renderer'
import { PDFPendingBills } from '../../components/billing/PDFPendingBills'
import { PDFInvoice } from '../../components/billing/PDFInvoice'
import PaymentModal from '../../components/billing/PaymentModal'
import { buildInvoicePdfFile, invoiceFileName, sharePdfFile } from '../../utils/invoiceShare'

const amountToWords = (num) => {
  if (num === 0) return 'ZERO'
  const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN']
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY']

  const convert = (n) => {
    if (n < 20) return ones[n]
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '')
    if (n < 1000) return ones[Math.floor(n / 100)] + ' HUNDRED' + (n % 100 !== 0 ? ' AND ' + convert(n % 100) : '')
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' THOUSAND' + (n % 1000 !== 0 ? ' ' + convert(n % 1000) : '')
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' LAKH' + (n % 100000 !== 0 ? ' ' + convert(n % 100000) : '')
    return convert(Math.floor(n / 10000000)) + ' CRORE' + (n % 10000000 !== 0 ? ' ' + convert(n % 10000000) : '')
  }

  return convert(num) + ' ONLY'
}

const chunkArray = (array, size) => {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};

const numberToWords = (num) => {
  try {
    return amountToWords(Math.floor(num || 0))
  } catch (e) {
    return ''
  }
}

import { TransportInvoice, GarageInvoice } from '../../components/billing/InvoiceTemplates'

// ── Main Page ────────────────────────────────────────────────────────────────
export default function BillDetail() {
  const { id } = useParams()
  const { search } = useLocation()
  const viewOnly = new URLSearchParams(search).get('viewOnly') === 'true'
  const { fetchBill, updateBill, deleteBill, recordPayment, markAsDownloaded } = useBills()
  const { user: sessionUser } = useAuth()
  const navigate = useNavigate()
  const printRef = useRef()
  const invoiceRef = useRef()
  const [isPayModalOpen, setIsPayModalOpen] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isSharing, setIsSharing] = useState(false)

  const [bill, setBill] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cachedPdfFile, setCachedPdfFile] = useState(null)

  const { getTranslatedText } = usePageTranslation([
    'Bill No.', 'Draft', 'Date', 'FROM', 'BILLED TO', 'Billing Summary', 'No.', 'Vehicle No.',
    'Origin', 'Destination', 'Challan No.', 'Hold', 'Hamali/Return', 'Amount', 'DAYS',
    'Return', 'Hamali', 'Hamali Charges', 'Total Hold', 'Days', 'TOTAL', 'BANK DETAILS',
    'For', 'Authorized Signatory', 'Cash Credit Memo / Estimate', 'Customer Information',
    'Vehicle Information', 'Repair Details', 'Description', 'Qty', 'Rate', 'Total',
    'Grand Total', 'Terms and Conditions', 'By signing, customer authorizes garage to proceed with repairs.',
    'Loading bill...', 'Bill not found', 'Back to Bills', 'Mark Paid', 'Edit Draft', 'Edit Bill',
    'Generating...', 'PDF', 'Download PDF', 'Back to all bills', 'Delete this bill?', 'Mark this bill as fully paid?',
    'Name', 'Address', 'Phone', 'Make', 'Reg No', 'KMs', 'Bill No', 'Grateful for Moving What Matters to You!',
    'Parts Total', 'Labor Charges', 'GST', 'Discount'
  ])

  const business = bill?.businessSnapshot || ((bill?.owner && typeof bill.owner === 'object') ? bill.owner : sessionUser);

  const handleDownloadPDF = async () => {
    if (isDownloading) return
    setIsDownloading(true)

    try {
      const pdfDoc = new jsPDF('p', 'mm', 'a4')
      const pages = document.querySelectorAll('.invoice-wrap, .garage-invoice-wrap')

      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i], {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        })

        const imgData = canvas.toDataURL('image/jpeg', 0.75)
        const pdfWidth = pdfDoc.internal.pageSize.getWidth()
        const pdfHeight = pdfDoc.internal.pageSize.getHeight()

        if (i > 0) pdfDoc.addPage()
        pdfDoc.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST')
      }

      const fileName = `Invoice_${(bill.billNumber || bill._id).replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`;

      // Update backend BEFORE triggering download to prevent iOS WebView interruption
      const updated = await markAsDownloaded(bill._id)
      if (updated) setBill(updated)

      pdfDoc.save(fileName)
    } catch (err) {
      console.error('PDF Generation Error:', err)
      alert('Failed to generate PDF')
    } finally { setIsDownloading(false) }
  }

  const handleSharePDF = async () => {
    if (isSharing || !bill) return
    setIsSharing(true)
    try {
      const pdfFile = cachedPdfFile || await buildInvoicePdfFile(invoiceRef.current, invoiceFileName(bill))
      const shareUrl = `${window.location.origin}/view-bill/${bill._id}`
      await sharePdfFile(pdfFile, { title: 'Invoice', text: `Invoice #${bill.billNumber || ''}
View/Download here: ${shareUrl}` })
      markAsDownloaded(bill._id)
    } catch (err) {
      if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
        console.error('PDF Share Error:', err)
        alert('Failed to share PDF')
      }
    } finally { setIsSharing(false) }
  }

  useEffect(() => {
    if (!bill) return;
    const preGeneratePdf = async () => {
      try {
        if (!invoiceRef.current) return
        setCachedPdfFile(await buildInvoicePdfFile(invoiceRef.current, invoiceFileName(bill)))
      } catch (e) { console.error('Pre-generation failed', e) }
    }
    const timer = setTimeout(preGeneratePdf, 1500)
    return () => clearTimeout(timer)
  }, [bill])

  useEffect(() => {
    if (!id || id === 'new') return
    setLoading(true)
    fetchBill(id).then(b => {
      if (b) setBill(b)
      setLoading(false)
    })
  }, [id, fetchBill, search])

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#6B7280' }}><div style={{ fontSize: '0.9rem' }}>{getTranslatedText('Loading bill...')}</div></div>
  if (!bill) return <div style={{ textAlign: 'center', padding: 40 }}><h3>{getTranslatedText('Bill not found')}</h3><button className="btn btn-primary" onClick={() => navigate(`/${sessionUser?.role || 'transport'}/bills`)}>{getTranslatedText('Back to Bills')}</button></div>



  return (
    <div className="page-wrapper animate-fadeIn" style={{ maxWidth: 840, margin: '0 auto', paddingBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12, padding: '0 8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <button onClick={() => navigate(`/${bill.billType}/bills`)} style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'rgba(0,0,0,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', flexShrink: 0 }}><ArrowLeft size={18} /></button>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontWeight: 800, fontSize: '1rem', color: '#0F0D2E', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>#{bill.billNumber || getTranslatedText('Draft')}</h2>
            <p style={{ fontSize: '0.7rem', color: '#6B7280', margin: 0 }}>{dayjs(bill.billingDate || bill.createdAt).format('DD MMM YYYY')}</p>
          </div>
        </div>
        <div className="bill-actions" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end', flexShrink: 0 }}>
          {!viewOnly && bill.status === 'draft' && (
            <button
              onClick={() => {
                if (window.confirm(getTranslatedText('Create final bill from this draft?'))) {
                  updateBill(bill._id, { status: 'unpaid' }).then(u => u && setBill(u))
                }
              }}
              className="action-btn"
              style={{ background: '#E0E7FF', color: '#4338CA', border: '1.5px solid #C7D2FE' }}
              title={getTranslatedText('Create Bill')}
            >
              <FileText size={16} /> <span className="btn-text">{getTranslatedText('Create Bill')}</span>
            </button>
          )}
          {!viewOnly && bill.status !== 'paid' && bill.status !== 'draft' && (
            <button
              onClick={() => setIsPayModalOpen(true)}
              className="action-btn paid"
              title="Record Payment"
            >
              <Wallet size={16} /> <span className="btn-text">Record Payment</span>
            </button>
          )}
          {!viewOnly && bill.status !== 'paid' && (
            <button
              onClick={() => navigate(`/${bill.billType}/bills/edit/${bill._id}`)}
              className="action-btn edit"
              title={bill.status === 'draft' ? getTranslatedText('Edit Draft') : getTranslatedText('Edit Bill')}
            >
              <Pencil size={16} /> <span className="btn-text">{bill.status === 'draft' ? getTranslatedText('Edit Draft') : getTranslatedText('Edit Bill')}</span>
            </button>
          )}
          {!viewOnly && (
            <button
              onClick={() => { if (window.confirm(getTranslatedText('Delete this bill?'))) { deleteBill(id); navigate(`/${bill.billType}/bills`) } }}
              className="action-btn delete"
              title={getTranslatedText('Delete this bill?')}
            >
              <Trash2 size={16} />
            </button>
          )}

          <button
            onClick={() => handleSharePDF()}
            disabled={isSharing}
            className="action-btn share"
            title={getTranslatedText('Share PDF')}
            style={{ background: '#F0FDF4', color: '#16A34A', border: '1.5px solid #DCFCE7', cursor: 'pointer' }}
          >
            <Share2 size={18} />
            <span className="btn-text">{getTranslatedText('Share')}</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className={`action-btn download btn-primary ${viewOnly ? 'view-only-download' : ''}`}
            title={getTranslatedText('Download PDF')}
          >
            <Download size={18} />
            <span className="btn-text">
              {isDownloading ? getTranslatedText('Generating...') : getTranslatedText('Download PDF')}
            </span>
          </button>

        </div>
      </div>

      <div ref={printRef} className="bill-preview-scroll" style={{ background: '#f3f4f6', borderRadius: 20, padding: '40px 12px', boxShadow: '0 8px 30px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.03)', overflowX: 'auto', margin: '0 8px' }}>
        <div ref={invoiceRef} style={{ minWidth: 800 }}>
          {bill.billType === 'garage' ? <GarageInvoice bill={bill} business={business} getTranslatedText={(t) => t} /> : <TransportInvoice bill={bill} business={business} getTranslatedText={(t) => t} />}
        </div>
      </div>

      <PaymentModal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        bill={bill}
        business={business}
        onSuccess={async (paymentPayload) => {
          const updated = await recordPayment(bill._id, paymentPayload);
          if (updated) setBill(updated);
        }}
      />

      {/* ── Payment Summary & History Card ───────────────────────────────── */}
      {bill.status !== 'draft' && (() => {
        const paidAmt = bill.paidAmount || 0;
        const total = bill.grandTotal || 0;
        const balance = Math.max(0, total - paidAmt);
        const payments = bill.payments || [];
        const statusColor = bill.status === 'paid' ? '#16A34A' : bill.status === 'partial' ? '#D97706' : '#DC2626';
        const statusBg = bill.status === 'paid' ? '#DCFCE7' : bill.status === 'partial' ? '#FEF3C7' : '#FEE2E2';
        const partyPhone = bill.party?.phone || bill.billedToPhone || bill.customerPhone || '';

        const handleWhatsAppShare = async () => {
          if (isSharing) return;
          setIsSharing(true);
          try {
            const name = bill.party?.name || bill.billedToName || bill.customerName || 'Customer';
            const partyEmail = bill.party?.email || bill.customerEmail || '';
            const phone = partyPhone.replace(/[^0-9]/g, '');
            const dialPhone = phone.length === 10 ? `91${phone}` : phone;
            
            const isTransport = bill.billType !== 'garage';
            const pdfBlob = await pdf(<PDFPendingBills bills={[bill]} groupName={name} groupPhone={partyPhone} groupEmail={partyEmail} business={sessionUser} isTransport={isTransport} totalOutstanding={balance} />).toBlob();
            
            const fileName = `Pending_Bills_${name.replace(/\s+/g, '_')}.pdf`;
            const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
            
            const title = 'Pending Bills Summary';
            const text = `Dear ${name}, please find your outstanding pending bills summary attached.`;

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
              const msg = `Dear ${name},\nPlease find your ${title} in the downloaded PDF.`;
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
          }
        };

        return (
          <div style={{ margin: '20px 8px 0', background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB', boxShadow: '0 4px 16px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <IndianRupee size={17} color="#4F46E5" />
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F0D2E' }}>Payment Summary</span>
              </div>
              <span style={{ background: statusBg, color: statusColor, borderRadius: 20, padding: '3px 12px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>
                {bill.status}
              </span>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, borderBottom: payments.length > 0 ? '1px solid #F3F4F6' : 'none' }}>
              {[
                { label: 'Invoice Total', value: total, color: '#4338CA', bg: '#F5F3FF' },
                { label: 'Paid Amount', value: paidAmt, color: '#16A34A', bg: '#F0FDF4' },
                { label: 'Balance Due', value: balance, color: balance > 0 ? '#DC2626' : '#16A34A', bg: balance > 0 ? '#FEF2F2' : '#F0FDF4' },
              ].map((s, i) => (
                <div key={s.label} style={{ padding: '14px 16px', background: s.bg, borderRight: i < 2 ? '1px solid #F3F4F6' : 'none', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 900, color: s.color }}>₹{s.value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
              ))}
            </div>

            {/* Payment History */}
            {payments.length > 0 && (
              <div style={{ padding: '14px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <Clock size={14} color="#6B7280" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Payment History</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {payments.map((p, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#F9FAFB', borderRadius: 12, border: '1px solid #F3F4F6' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#16A34A', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F0D2E' }}>₹{(p.amount || 0).toLocaleString('en-IN')}</div>
                          <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>{p.mode} · {p.date ? new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</div>
                          {p.notes && <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginTop: 1 }}>{p.notes}</div>}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#16A34A', background: '#DCFCE7', padding: '2px 8px', borderRadius: 8 }}>Received</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* WhatsApp Share — only when balance due > 0 */}
            {balance > 0 && !viewOnly && (
              <div style={{ padding: '0 20px 16px' }}>
                <button
                  onClick={handleWhatsAppShare}
                  style={{
                    width: '100%', height: 44, borderRadius: 12, border: 'none',
                    background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                    color: '#fff', fontSize: '0.875rem', fontWeight: 800, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: '0 4px 14px rgba(37, 211, 102, 0.35)',
                  }}
                >
                  <MessageCircle size={17} />
                  Share Balance Due via WhatsApp
                </button>
              </div>
            )}
          </div>
        );
      })()}

      <div style={{ marginTop: 20, textAlign: 'center' }}><button className="btn" onClick={() => navigate(`/${bill?.billType || 'transport'}/bills`)} style={{ fontSize: '0.85rem', background: '#7C3AED', color: '#FFFFFF', border: 'none', fontWeight: 700, boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)' }}><FileText size={16} /> {getTranslatedText('Back to all bills')}</button></div>

      <style>{`
        .action-btn {
          display: flex;
          align-items: center;
          gap: 6;
          height: 40px;
          padding: 0 12px;
          border-radius: 12px;
          border: none;
          font-size: 0.8125rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .action-btn.paid { background: #DCFCE7; color: #16A34A; font-weight: 800; }
        .action-btn.edit { border: 1.5px solid #E2E8F0; background: white; color: #4F46E5; }
        .action-btn.delete { background: #FEE2E2; color: #DC2626; width: 40px; justify-content: center; padding: 0; }

        .action-btn.download { 
          background: linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%); 
          color: white; 
          border: none;
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.2);
        }
        .action-btn.download.view-only-download {
          height: 38px;
          padding: 0 16px;
          font-size: 0.8125rem;
          box-shadow: 0 6px 15px -4px rgba(124, 58, 237, 0.4);
        }
        .action-btn.download.view-only-download .btn-text {
          font-weight: 800;
        }
        .action-btn:active { transform: scale(0.95); }
        
        @media (max-width: 500px) {
          .bill-actions {
            width: 100%;
            justify-content: flex-end !important;
            gap: 10px !important;
            justify-content: flex-start !important;
            flex-wrap: wrap !important;
            margin-top: 12px !important;
            z-index: 10;
          }
          .action-btn {
            flex-direction: row;
            height: 40px;
            padding: 0 16px;
            gap: 8px;
            border-radius: 10px;
          }
          .action-btn .btn-text {
            display: block !important;
            font-size: 0.75rem;
          }
          .action-btn.delete, .action-btn.print {
            width: auto;
            min-width: 50px;
          }
          .action-btn svg {
            width: 16px;
            height: 16px;
          }
          .action-btn.download.view-only-download {
            height: 36px !important;
            padding: 0 12px !important;
            font-size: 0.7rem !important;
          }
        }
      `}</style>
    </div>
  )
}
