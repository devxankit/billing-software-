import React from 'react'
import { IndianRupee, CheckCircle, AlertCircle, TrendingUp, TrendingDown, Wallet } from 'lucide-react'

export default function FinanceDashboard({ stats, invoices, payments }) {
  const accentColor = '#7C3AED'
  const accentLight = '#EDE9FE'

  const cards = [
    { label: 'Total Receivable', value: `₹${stats.totalReceivable.toLocaleString()}`, icon: Wallet, color: accentColor, bg: accentLight },
    { label: 'Total Received', value: `₹${stats.totalReceived.toLocaleString()}`, icon: CheckCircle, color: '#10B981', bg: '#D1FAE5' },
    { label: 'Total Pending', value: `₹${stats.totalPending.toLocaleString()}`, icon: AlertCircle, color: '#EF4444', bg: '#FEE2E2' },
  ]

  return (
    <div className="animate-fadeIn">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 32 }}>
        {cards.map((s, idx) => (
          <div key={idx} className="card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <s.icon size={28} color={s.color} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{s.label}</p>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 900, margin: '4px 0 0', overflowWrap: 'anywhere', lineHeight: 1.2 }}>{s.value}</h2>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
        {/* Recent Activity Mini-List (Optional but nice) */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem' }}>Recent Payments</h3>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: accentColor }}>LAST 5 ENTRIES</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {payments.slice(0, 5).map(pay => (
              <div key={pay.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px', borderRadius: 12, background: 'var(--bg-alt)' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={18} color="#10B981" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: '0.85rem' }}>{pay.partyName}</p>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{pay.date} • {pay.paymentMode}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontWeight: 900, fontSize: '1rem', color: '#10B981' }}>+ ₹{pay.amount.toLocaleString()}</p>
                </div>
              </div>
            ))}
            {payments.length === 0 && (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)' }}>No payments recorded yet.</div>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem' }}>Receivable Status</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {['paid', 'partial', 'unpaid'].map(status => {
              const count = invoices.filter(i => i.status === status).length
              const color = status === 'paid' ? '#10B981' : status === 'partial' ? '#F59E0B' : '#EF4444'
              const percentage = Math.round((count / invoices.length) * 100) || 0
              return (
                <div key={status}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>{status} INVOICES ({count})</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color }}>{percentage}%</span>
                  </div>
                  <div style={{ width: '100%', height: 8, borderRadius: 4, background: 'var(--bg-alt)', overflow: 'hidden' }}>
                    <div style={{ width: `${percentage}%`, height: '100%', background: color, borderRadius: 4 }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
