import React from 'react'
import dayjs from 'dayjs'

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

// Scan-to-pay QR: the owner's uploaded QR, else one generated from their UPI ID for this bill's amount
const paymentQrSrc = (business, bill) => {
  const bank = business?.bankDetails || {}
  if (bank.qrUrl) return bank.qrUrl
  if (!bank.upiId) return null
  const upiUrl = `upi://pay?pa=${bank.upiId}&pn=${encodeURIComponent(business?.businessName || 'Business')}&am=${(bill?.grandTotal || 0).toFixed(2)}&cu=INR`
  return `https://quickchart.io/qr?text=${encodeURIComponent(upiUrl)}&size=200`
}

function PaymentQr({ business, bill, size }) {
  const src = paymentQrSrc(business, bill)
  if (!src) return null
  return (
    <div style={{ textAlign: 'center', flexShrink: 0 }}>
      <img src={src} crossOrigin="anonymous" alt="Scan to pay" style={{ width: size, height: size, objectFit: 'contain', display: 'block' }} />
      <div style={{ fontSize: '0.55rem', fontWeight: 800, color: '#555', marginTop: 2 }}>SCAN TO PAY</div>
    </div>
  )
}

export function TransportInvoice({ bill, business, getTranslatedText = (t) => t }) {
  const items = [...(bill.items || [])].sort((a, b) => new Date(a.date) - new Date(b.date))
  const itemChunks = items.length > 0 ? chunkArray(items, 10) : [[]]
  const displayDate = bill.billingDate || bill.billDate || bill.createdAt
  const accent = '#FFB800'

  return (
    <div className="invoice-container" style={{ display: 'flex', flexDirection: 'column', gap: '40px', paddingBottom: '40px' }}>
      {itemChunks.map((chunk, pageIndex) => (
        <div key={pageIndex} className="invoice-wrap" style={{ color: '#000', fontFamily: 'Inter, sans-serif', padding: '40px', height: '1120px', width: '794px', backgroundColor: '#fff', border: '1px solid #eee', position: 'relative', margin: '0 auto', boxShadow: '0 0 10px rgba(0,0,0,0.05)', boxSizing: 'border-box' }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', border: '1px solid #ccc', borderRadius: '4px 4px 0 0' }}>
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 52, height: 52, background: 'white', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', border: '1.5px solid #F1F5F9' }}>
                {business?.logoUrl
                  ? <img src={business.logoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: '1.4rem', fontWeight: 950, color: business?.brandColor || '#000' }}>{(business?.businessName || 'B')[0]}</span>
                }
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                {business?.wishingName && (
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: business?.wishingColor || '#444', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    || {business.wishingName} ||
                  </div>
                )}
                <h1 style={{ fontSize: '1.4rem', fontWeight: 950, margin: 0, letterSpacing: '-0.04em', lineHeight: 0.9, color: business?.brandColor || '#000' }}>{business?.businessName?.toUpperCase() || 'KHAN TRANSPORT'}</h1>
                {business?.slogan && (
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#555', marginTop: 4 }}>
                    {business.slogan}
                  </div>
                )}
              </div>
            </div>
            <div style={{ borderLeft: '1px solid #ccc' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', borderBottom: '1px solid #ccc' }}>
                <div style={{ padding: '8px 4px', background: '#fff', fontWeight: 600, fontSize: '0.65rem', textAlign: 'right' }}>{getTranslatedText('Bill No.')}:</div>
                <div style={{ padding: '8px 6px', fontWeight: 800, fontSize: '0.75rem', borderLeft: '1px solid #eee', textAlign: 'left' }}>{bill.billNumber || getTranslatedText('Draft')}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr' }}>
                <div style={{ padding: '8px 4px', background: '#fff', fontWeight: 600, fontSize: '0.65rem', textAlign: 'right' }}>{getTranslatedText('Date')}:</div>
                <div style={{ padding: '8px 6px', fontWeight: 800, fontSize: '0.75rem', borderLeft: '1px solid #eee', textAlign: 'left' }}>{dayjs(displayDate).format('DD/MM/YYYY')}</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid #ccc', borderTop: 'none' }}>
            <div style={{ padding: '8px 10px', background: '#fff9e6', borderRight: '1px solid #ccc' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, marginBottom: 2 }}>{getTranslatedText('FROM')}: <span style={{ fontWeight: 900 }}>{business?.businessName}</span></div>
              <div style={{ fontSize: '0.7rem', color: '#000', lineHeight: 1.4, fontWeight: 500 }}>
                {business?.address}<br />
                {(business?.city || business?.state) && `${business?.city || ''}${business?.city && business?.state ? ', ' : ''}${business?.state || ''} ${business?.pincode || ''}`}<br />
                Mob : {business?.phone}{business?.alternatePhone ? `, ${business?.alternatePhone}` : ''}<br />
                {business?.email && <>Email: {business?.email}<br /></>}
                {business?.gstin && <>GSTIN: {business?.gstin}<br /></>}
                {business?.panNo && <>PAN: {business?.panNo}</>}
              </div>
            </div>
            <div style={{ padding: '8px 10px', background: '#fff9e6' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, marginBottom: 2 }}>{getTranslatedText('BILLED TO')}: <span style={{ fontWeight: 950 }}>{bill.billedToName || bill.party?.name || '—'}</span></div>
              <div style={{ fontSize: '0.7rem', color: '#000', lineHeight: 1.4, fontWeight: 500 }}>
                {(bill.billedToAddress || bill.party?.address) && <>{bill.billedToAddress || bill.party?.address}<br /></>}
                {(bill.billedToCity || bill.party?.city || bill.billedToState || bill.party?.state) && (
                  <>{[bill.billedToCity || bill.party?.city, bill.billedToState || bill.party?.state].filter(Boolean).join(', ')} {bill.billedToPincode || bill.party?.pincode || ''}<br /></>
                )}
                {(bill.billedToPhone || bill.party?.phone) && <><span style={{ fontWeight: 700 }}>Mob: {bill.billedToPhone || bill.party?.phone}</span><br /></>}
                {(bill.billedToEmail || bill.party?.email) && <>Email: {bill.billedToEmail || bill.party?.email}<br /></>}
                {(bill.billedToGstin || bill.party?.gstin) && <><span style={{ fontWeight: 700 }}>GSTIN:</span> {bill.billedToGstin || bill.party?.gstin}<br /></>}
                {(bill.billedToPan || bill.party?.pan) && <><span style={{ fontWeight: 700 }}>PAN:</span> {bill.billedToPan || bill.party?.pan}</>}
              </div>
            </div>
          </div>

          <div style={{ background: accent, color: '#000', textAlign: 'center', padding: '5px', fontWeight: 900, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.12em', borderLeft: '1px solid #ccc', borderRight: '1px solid #ccc', margin: '0 -1px' }}>
            {getTranslatedText('Billing Summary')}
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc', borderTop: 'none', marginBottom: 0 }}>
            <thead>
              <tr style={{ background: '#fff9e6' }}>
                {[getTranslatedText('No.'), getTranslatedText('Date'), getTranslatedText('Vehicle No.'), getTranslatedText('Origin'), getTranslatedText('Destination'), getTranslatedText('Challan No. / Bill No.'), getTranslatedText('Hold'), getTranslatedText('Hamali/Return'), getTranslatedText('Amount')].map((h, i) => (
                  <th key={i} style={{ padding: '12px 6px', fontSize: '0.75rem', fontWeight: 800, border: '1px solid #ccc', textAlign: i >= 6 ? 'right' : 'center', color: '#333' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chunk.map((item, i) => (
                <tr key={i}>
                  <td style={{ padding: '10px', border: '1px solid #ccc', textAlign: 'center', fontSize: '0.85rem' }}>{(pageIndex * 10) + i + 1}</td>
                  <td style={{ padding: '10px', border: '1px solid #ccc', textAlign: 'center', fontSize: '0.85rem' }}>{dayjs(item.date).format('DD/MM/YY')}</td>
                  <td style={{ padding: '10px', border: '1px solid #ccc', textAlign: 'center', fontSize: '0.85rem', fontWeight: 700, color: '#1E293B' }}>{item.tempoNo || '—'}</td>
                  <td style={{ padding: '10px', border: '1px solid #ccc', textAlign: 'center', fontSize: '0.85rem', fontWeight: 600, maxWidth: 120, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.companyFrom || '—'}</td>
                  <td style={{ padding: '10px', border: '1px solid #ccc', textAlign: 'center', fontSize: '0.85rem', maxWidth: 120, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.companyTo || '—'}</td>
                  <td style={{ padding: '10px', border: '1px solid #ccc', textAlign: 'center', fontSize: '0.85rem', maxWidth: 80, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.chalanNo || '—'}</td>
                  <td style={{ padding: '10px', border: '1px solid #ccc', textAlign: 'right', fontSize: '0.85rem', color: '#7C3AED', fontWeight: 700 }}>
                    {(parseFloat(item.haltDays) > 0 || parseFloat(item.haltAmount) > 0) ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 900 }}>{parseFloat(item.haltDays) || 0} <span style={{ fontSize: '0.6rem', fontWeight: 600 }}>{getTranslatedText('DAYS')}</span></div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 500, opacity: 0.8 }}>₹{parseFloat(item.haltAmount || 0).toLocaleString()}</div>
                      </div>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #ccc', textAlign: 'right', fontSize: '0.85rem' }}>
                    {item.returnAmount > 0 && <div style={{ color: '#047857', fontWeight: 700 }}><span style={{ fontSize: '0.65rem' }}>{getTranslatedText('Return')}: </span>₹{parseFloat(item.returnAmount).toLocaleString()}</div>}
                    {item.extraAmount > 0 && <div style={{ color: '#B45309', fontWeight: 700 }}><span style={{ fontSize: '0.65rem' }}>{getTranslatedText('Hamali')}: </span>₹{parseFloat(item.extraAmount).toLocaleString()}</div>}
                    {!(item.returnAmount > 0) && !(item.extraAmount > 0) && '—'}
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #ccc', textAlign: 'right', fontSize: '0.85rem', fontWeight: 700 }}>{parseFloat(item.amount || 0) > 0 ? parseFloat(item.amount).toLocaleString() : '—'}</td>
                </tr>
              ))}

              {/* Totals Section (Only on last page) */}
              {pageIndex === itemChunks.length - 1 && (
                <>
                  {(parseFloat(bill.extraCharges || 0) > 0) && (
                    <tr>
                      <td colSpan="8" style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 700, fontSize: '0.8rem', border: '1px solid #ccc' }}>{getTranslatedText('Hamali Charges')} :</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 800, fontSize: '0.85rem', border: '1px solid #ccc' }}>₹{parseFloat(bill.extraCharges).toLocaleString()}</td>
                    </tr>
                  )}
                  {items.some(it => (parseFloat(it.haltAmount) || 0) > 0) && (
                    <tr>
                      <td colSpan="6" style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 700, fontSize: '0.8rem', border: '1px solid #ccc' }}>{getTranslatedText('Total Hold')} ({items.reduce((sum, it) => sum + (parseFloat(it.haltDays) || 0), 0)} {getTranslatedText('Days')}) :</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 800, fontSize: '0.85rem', border: '1px solid #ccc', color: '#7C3AED' }}>₹{items.reduce((sum, it) => sum + (parseFloat(it.haltAmount) || 0), 0).toLocaleString()}</td>
                      <td colSpan="2" style={{ border: '1px solid #ccc' }}></td>
                    </tr>
                  )}
                  {bill.gstAmount > 0 && (
                    <tr>
                      <td colSpan="8" style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 700, fontSize: '0.8rem', border: '1px solid #ccc' }}>{getTranslatedText('Subtotal')} :</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 800, fontSize: '0.85rem', border: '1px solid #ccc' }}>₹{bill.subTotal?.toLocaleString()}</td>
                    </tr>
                  )}
                  {bill.gstAmount > 0 && (
                    <tr>
                      <td colSpan="8" style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 700, fontSize: '0.8rem', border: '1px solid #ccc' }}>{getTranslatedText('GST')} :</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 800, fontSize: '0.85rem', border: '1px solid #ccc' }}>₹{bill.gstAmount?.toLocaleString()}</td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan="7" style={{ background: accent, color: '#000', padding: '6px 20px', fontWeight: 800, fontSize: '0.9rem', textAlign: 'center' }}>{bill.notes && bill.notes !== 'Grateful for Moving What Matters to You!' ? bill.notes : ' '}</td>
                    <td style={{ padding: '6px', textAlign: 'center', fontWeight: 900, fontSize: '1rem', border: '1px solid #ccc', background: '#f5f5f5' }}>{getTranslatedText('TOTAL')} :</td>
                    <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 950, fontSize: '1.25rem', border: '1px solid #ccc' }}>₹{bill.grandTotal?.toLocaleString()}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>

          {/* Footer (Bank + Sign) - Fixed at bottom of each page block */}
          <div style={{ position: 'absolute', bottom: '40px', left: '40px', right: '40px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '60% 40%', alignItems: 'start' }}>
              <div style={{ border: '1px solid #ccc', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ background: '#fff9e6', padding: '6px 12px', fontSize: '0.7rem', fontWeight: 800, borderBottom: '1px solid #ccc' }}>{getTranslatedText('BANK DETAILS')} :</div>
                <div style={{ padding: '8px 12px', backgroundColor: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.65rem' }}><span style={{ fontWeight: 600, color: '#555' }}>A/c No : </span><span style={{ fontWeight: 900 }}>{business?.bankDetails?.accountNumber || business?.bankAccNo || ''}</span></div>
                    <div style={{ fontSize: '0.65rem' }}><span style={{ fontWeight: 600, color: '#555' }}>IFSC : </span><span style={{ fontWeight: 900 }}>{(business?.bankDetails?.ifsc || business?.bankIfsc || '').toUpperCase()}</span></div>
                    <div style={{ fontSize: '0.65rem', marginTop: 3 }}><span style={{ fontWeight: 600, color: '#555' }}>Name : </span><span style={{ fontWeight: 900 }}>{business?.bankDetails?.accountName || business?.name || ''}</span></div>
                    <div style={{ fontSize: '0.65rem', marginTop: 3 }}><span style={{ fontWeight: 600, color: '#555' }}>Bank : </span><span style={{ fontWeight: 900 }}>{business?.bankDetails?.bankName || business?.bankName || ''}</span></div>
                  </div>
                  <PaymentQr business={business} bill={bill} size={64} />
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 900, marginBottom: 5 }}>{getTranslatedText('For')} {business?.businessName || ''},</div>
                <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                  {business?.signatureUrl ? (
                    <img src={business.signatureUrl} style={{ maxHeight: '100%', maxWidth: 160, objectFit: 'contain', mixBlendMode: 'multiply' }} />
                  ) : (
                    <div style={{ width: 170, borderBottom: '1px solid #000', marginTop: 30 }} />
                  )}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#666', fontWeight: 600 }}>({getTranslatedText('Authorized Signatory')})</div>
              </div>
            </div>
            <div style={{ textAlign: 'center', fontSize: '0.7rem', color: '#999', marginTop: 10 }}>
              <div style={{ marginBottom: 2, fontWeight: 900, color: '#555' }}>Generated by transbilling.in</div>
              <div>Page {pageIndex + 1} of {itemChunks.length}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function GarageInvoice({ bill, business, getTranslatedText = (t) => t }) {
  const items = bill.items || []
  const itemChunks = items.length > 0 ? chunkArray(items, 10) : [[]]
  const themeColor = '#FFB800' // Original Yellow

  return (
    <div className="garage-invoice-container" style={{ display: 'flex', flexDirection: 'column', gap: '40px', paddingBottom: '40px' }}>
      {itemChunks.map((chunk, pageIndex) => (
        <div key={pageIndex} className="garage-invoice-wrap" style={{ color: '#000', fontFamily: 'Inter, sans-serif', width: '794px', height: '1120px', margin: '0 auto', background: 'white', boxShadow: '0 0 40px rgba(0,0,0,0.05)', position: 'relative', border: '1px solid #eee', boxSizing: 'border-box' }}>
          {/* 1. Header Banner */}
          <div style={{ background: themeColor, padding: '30px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 900, color: '#000', letterSpacing: '-0.02em' }}>{getTranslatedText('Cash Credit Memo / Estimate')}</h1>
              <p style={{ margin: '4px 0 0', fontSize: '1rem', fontWeight: 600, color: '#333' }}>{business?.slogan || 'Restoring Vehicles, Reviving Peace of Mind'}</p>
            </div>
            <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
              <div style={{ width: 60, height: 60, borderRadius: 12, background: 'white', padding: 5, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                {business?.logoUrl ? (
                  <img src={business.logoUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 900, color: '#000' }}>
                    {(business?.businessName || 'A')[0]}
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 950, fontSize: '1.4rem', color: '#000', lineHeight: 1 }}>{business?.businessName?.toUpperCase()}</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#333', marginTop: 5 }}>Mob: {business?.phone}</div>
                {business?.panNo && <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#333' }}>PAN: {business.panNo}</div>}
                {business?.gstin && <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#333' }}>GSTIN: {business.gstin}</div>}
                <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#000', marginTop: 5 }}>{getTranslatedText('Bill No')}: {bill.billNumber || getTranslatedText('Draft')}</div>
              </div>
            </div>
          </div>

          <div style={{ padding: '40px' }}>
            {/* 2. Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, marginBottom: 40 }}>
              <div>
                <div style={{ background: themeColor, padding: '5px 12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.75rem', borderRadius: 4, marginBottom: 15 }}>{getTranslatedText('Customer Information')}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.95rem' }}>
                  <div style={{ display: 'flex' }}><span style={{ fontWeight: 700, width: 80 }}>{getTranslatedText('Name')}:</span> <span style={{ flex: 1 }}>{bill.customerName || bill.party?.name || '—'}</span></div>
                  <div style={{ display: 'flex' }}><span style={{ fontWeight: 700, width: 80 }}>{getTranslatedText('Address')}:</span> <span style={{ flex: 1 }}>{bill.customerAddress || bill.party?.address || ''} {bill.customerCity || bill.party?.city || ''}</span></div>
                  <div style={{ display: 'flex' }}><span style={{ fontWeight: 700, width: 80 }}>{getTranslatedText('Phone')}:</span> <span style={{ flex: 1 }}>{bill.customerPhone || bill.party?.phone || '—'}</span></div>
                </div>
              </div>
              <div>
                <div style={{ background: themeColor, padding: '5px 12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.75rem', borderRadius: 4, marginBottom: 15 }}>{getTranslatedText('Vehicle Information')}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.95rem' }}>
                  <div style={{ display: 'flex' }}><span style={{ fontWeight: 700, width: 100 }}>{getTranslatedText('Make')}:</span> <span style={{ flex: 1 }}>{bill.vehicleCompany || '—'}</span></div>
                  <div style={{ display: 'flex' }}><span style={{ fontWeight: 700, width: 100 }}>{getTranslatedText('Model')}:</span> <span style={{ flex: 1 }}>{bill.vehicleModel || '—'}</span></div>
                  <div style={{ display: 'flex' }}><span style={{ fontWeight: 700, width: 100 }}>{getTranslatedText('Reg No')}:</span> <span style={{ flex: 1, fontWeight: 900 }}>{bill.vehicleNo?.toUpperCase()}</span></div>
                  <div style={{ display: 'flex' }}><span style={{ fontWeight: 700, width: 100 }}>{getTranslatedText('KMs')}:</span> <span style={{ flex: 1 }}>{bill.kmReading?.toLocaleString() || '—'}</span></div>
                  {bill.nextServiceKm && <div style={{ display: 'flex' }}><span style={{ fontWeight: 700, width: 100 }}>{getTranslatedText('Next KMs')}:</span> <span style={{ flex: 1 }}>{bill.nextServiceKm.toLocaleString()}</span></div>}
                  {bill.nextServiceDate && <div style={{ display: 'flex' }}><span style={{ fontWeight: 700, width: 100 }}>{getTranslatedText('Next Date')}:</span> <span style={{ flex: 1 }}>{dayjs(bill.nextServiceDate).format('DD MMM YYYY')}</span></div>}
                </div>
              </div>
            </div>

            {/* 3. Repair Table */}
            <div style={{ marginBottom: 30 }}>
              <div style={{ background: themeColor, padding: '5px 12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.75rem', borderRadius: 4, marginBottom: 15 }}>
                {business?.repairDetailsLabel || getTranslatedText('Repair Details')}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
                <thead>
                  <tr style={{ background: themeColor }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.85rem', fontWeight: 900, border: '1px solid rgba(0,0,0,0.1)' }}>{getTranslatedText('Description')}</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 900, width: '12%', border: '1px solid rgba(0,0,0,0.1)' }}>{getTranslatedText('Qty')}</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '0.85rem', fontWeight: 900, width: '18%', border: '1px solid rgba(0,0,0,0.1)' }}>{getTranslatedText('Rate')}</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '0.85rem', fontWeight: 900, width: '18%', border: '1px solid rgba(0,0,0,0.1)' }}>{getTranslatedText('Total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {chunk.map((item, i) => (
                    <tr key={i}>
                      <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '0.9rem' }}>{item.description}</td>
                      <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '0.9rem', textAlign: 'center' }}>{item.qty || 1}</td>
                      <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '0.9rem', textAlign: 'right' }}>{parseFloat(item.rate || item.amount).toLocaleString()}</td>
                      <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '0.9rem', textAlign: 'right', fontWeight: 700 }}>{parseFloat(item.amount).toLocaleString()}</td>
                    </tr>
                  ))}

                  {pageIndex === itemChunks.length - 1 && (
                    <>
                      <tr>
                        <td colSpan="3" style={{ padding: '10px 12px', border: '1px solid #ddd', textAlign: 'left', fontSize: '0.85rem', fontWeight: 700, color: '#374151' }}>{getTranslatedText('Parts Subtotal')}</td>
                        <td style={{ padding: '10px 12px', border: '1px solid #ddd', textAlign: 'right', fontSize: '0.9rem', fontWeight: 900 }}>₹{parseFloat(bill.partsTotal || 0).toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td colSpan="3" style={{ padding: '10px 12px', border: '1px solid #ddd', textAlign: 'left', fontSize: '0.85rem', fontWeight: 700, color: '#374151' }}>{getTranslatedText('Labour Charge')}</td>
                        <td style={{ padding: '10px 12px', border: '1px solid #ddd', textAlign: 'right', fontSize: '0.9rem', fontWeight: 900 }}>₹{parseFloat(bill.laborCharge || 0).toLocaleString()}</td>
                      </tr>
                      {bill.discount > 0 && (
                        <tr>
                          <td colSpan="3" style={{ padding: '10px 12px', border: '1px solid #ddd', textAlign: 'left', fontSize: '0.85rem', fontWeight: 700, color: '#374151' }}>{getTranslatedText('Discount')} {bill.discountPercent ? `(${bill.discountPercent}%)` : ''}</td>
                          <td style={{ padding: '10px 12px', border: '1px solid #ddd', textAlign: 'right', fontSize: '0.9rem', fontWeight: 900, color: '#DC2626' }}>-₹{parseFloat(bill.discount || 0).toLocaleString()}</td>
                        </tr>
                      )}
                      {bill.gstAmount > 0 && (
                        <tr>
                          <td colSpan="3" style={{ padding: '10px 12px', border: '1px solid #ddd', textAlign: 'left', fontSize: '0.85rem', fontWeight: 700, color: '#374151' }}>{getTranslatedText('GST')} ({bill.gstPercent}%)</td>
                          <td style={{ padding: '10px 12px', border: '1px solid #ddd', textAlign: 'right', fontSize: '0.9rem', fontWeight: 900 }}>₹{parseFloat(bill.gstAmount || 0).toLocaleString()}</td>
                        </tr>
                      )}
                      <tr>
                        <td colSpan="3" style={{ padding: '12px', border: '1px solid #ddd', fontWeight: 950, fontSize: '1rem', textAlign: 'left', background: '#F9FAFB' }}>{getTranslatedText('Grand Total')}</td>
                        <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 950, fontSize: '1.25rem', background: '#F9FAFB' }}>₹{parseFloat(bill.grandTotal || 0).toLocaleString()}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* 5. Footer Section - Fixed at bottom */}
            <div style={{ position: 'absolute', bottom: '40px', left: '40px', right: '40px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 40, alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
                    <div style={{ background: '#F9FAFB', padding: '8px 12px', fontSize: '0.75rem', fontWeight: 800, borderBottom: '1px solid #E5E7EB' }}>{getTranslatedText('BANK DETAILS')}</div>
                    <div style={{ padding: '10px 12px', backgroundColor: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.7rem' }}><span style={{ fontWeight: 600, color: '#555' }}>A/c No : </span><span style={{ fontWeight: 900 }}>{business?.bankDetails?.accountNumber || business?.bankAccNo || ''}</span></div>
                        <div style={{ fontSize: '0.7rem' }}><span style={{ fontWeight: 600, color: '#555' }}>IFSC : </span><span style={{ fontWeight: 900 }}>{(business?.bankDetails?.ifsc || business?.bankIfsc || '').toUpperCase()}</span></div>
                        <div style={{ fontSize: '0.7rem', marginTop: 3 }}><span style={{ fontWeight: 600, color: '#555' }}>Name : </span><span style={{ fontWeight: 900 }}>{business?.bankDetails?.accountName || business?.name || ''}</span></div>
                        <div style={{ fontSize: '0.7rem', marginTop: 3 }}><span style={{ fontWeight: 600, color: '#555' }}>Bank : </span><span style={{ fontWeight: 900 }}>{business?.bankDetails?.bankName || business?.bankName || ''}</span></div>
                      </div>
                      <PaymentQr business={business} bill={bill} size={64} />
                    </div>
                  </div>
                  <div style={{ border: '1px solid #E5E7EB', padding: '10px 12px', borderRadius: 8, background: '#F9FAFB' }}>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase' }}>{getTranslatedText('Terms and Conditions')}</h4>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#6B7280', lineHeight: 1.4 }}>
                      By signing, customer authorizes {business?.businessName || 'the garage'} to proceed with repairs.
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 900, marginBottom: 5 }}>For, {business?.businessName?.toUpperCase()}</div>
                  <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 5 }}>
                    {business?.signatureUrl ? (
                      <img src={business.signatureUrl} style={{ maxHeight: '100%', maxWidth: 200, objectFit: 'contain', mixBlendMode: 'multiply' }} />
                    ) : (
                      <div style={{ width: 180, borderBottom: '2px solid #000', marginTop: 30 }} />
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: '#374151' }}>(AUTHORIZED SIGNATORY)</div>
                </div>
              </div>
              <div style={{ textAlign: 'center', fontSize: '0.7rem', color: '#999', marginTop: 10 }}>
                <div style={{ marginBottom: 2, fontWeight: 900, color: '#555' }}>Generated by transbilling.in</div>
                <div>Page {pageIndex + 1} of {itemChunks.length}</div>
              </div>
            </div>
          </div>
          {/* Bottom Yellow Banner with slogan */}
          <div style={{ height: 30, background: themeColor, borderRadius: '0 0 8px 8px', position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800, color: '#000' }}>
            {business?.slogan || 'Restoring Vehicles, Reviving Peace of Mind'}
          </div>
        </div>
      ))}
    </div>
  )
}
