import { useState, useMemo } from 'react'
import { Plus, Search, Filter, TrendingUp, TrendingDown, Wallet, CreditCard, ArrowRightLeft, Calendar } from 'lucide-react'
import { useFinance } from '../../context/FinanceContext'
import { useParties } from '../../context/PartyContext'
import { useBills } from '../../context/BillContext'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { 
  AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts'
import { usePageTranslation } from '../../hooks/usePageTranslation'

const TxCard = ({ tx, partyName, getTranslatedText, onClick }) => {
  const isIncome = tx.type === 'income'
  const displayParty = partyName || 'N/A'
  const displayCategory = tx.category ? getTranslatedText(tx.category) : getTranslatedText('General')
  const subInfo = tx.bill ? `Bill Ref: ${tx.bill.slice(-6).toUpperCase()}` : ''

  return (
    <div onClick={onClick} style={{
      background: 'white', borderRadius: 16, padding: '14px 16px', cursor: 'pointer',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 14,
      border: '1px solid rgba(0,0,0,0.03)', marginBottom: 10
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isIncome ? '#DCFCE7' : '#FEE2E2', flexShrink: 0
      }}>
        {isIncome ? <TrendingUp size={20} color="#16A34A" /> : <TrendingDown size={20} color="#DC2626" />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <div style={{ fontWeight: 800, fontSize: '0.875rem', color: '#0F0D2E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {displayParty}
          </div>
          <span style={{ background: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: 6, fontSize: '0.6rem', fontWeight: 700, color: '#4B5563' }}>
            {displayCategory}
          </span>
        </div>
        {subInfo && (
          <div style={{ fontSize: '0.7rem', color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>
            {subInfo}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', color: '#9CA3AF', marginTop: 3 }}>
          <span style={{ fontWeight: 600 }}>{dayjs(tx.date).format('DD MMM')}</span>
          <span>•</span>
          <span style={{ textTransform: 'capitalize' }}>{getTranslatedText(tx.paymentMode || 'cash')}</span>
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: isIncome ? '#16A34A' : '#DC2626' }}>
          {isIncome ? '+' : '-'} ₹{parseFloat(tx.amount || 0).toLocaleString('en-IN')}
        </div>
      </div>
    </div>
  )
}

export default function Finance() {
  const { getTranslatedText } = usePageTranslation([
    'Transport Finance', 'Garage Finance', 'Track your cash flow and receivables',
    'CASH BALANCE', 'TOTAL EXPENSES', 'TOTAL SPENT', 'Cash Flow Trend', 'Income', 'Expense',
    'Payments', 'Parties', 'Movements', 'All', 'Cash In', 'Cash Out', 'No movements yet', 'General',
    'Fuel', 'Maintenance', 'Other', 'Loading', 'Unloading', 'Detention', 'Halt', 'Toll', 'Salary', 'Rent',
    'cash', 'online', 'cheque', 'bank_transfer', 'upi', 'card'
  ])
  const { transactions, stats: apiStats, loaded } = useFinance()
  const { parties } = useParties()
  const { bills } = useBills()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')
  const [showDateFilters, setShowDateFilters] = useState(false)
  const [rangeFrom, setRangeFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'))
  const [rangeTo, setRangeTo] = useState(dayjs().format('YYYY-MM-DD'))

  const userRole = user?.role || 'transport'
  const modulePrefix = userRole === 'transport' ? '/transport' : '/garage'

  const liveStats = useMemo(() => {
    if (apiStats) return apiStats
    
    // Fallback if not loaded yet
    return { totalIncome: 0, totalExpense: 0, cashBalance: 0, receivables: 0 }
  }, [apiStats])

  const filtered = useMemo(() => {
    let list = transactions

    if (filter !== 'all') {
      list = list.filter(t => t.type === filter)
    }

    if (showDateFilters) {
      list = list.filter(t => {
        const tDate = dayjs(t.date).format('YYYY-MM-DD')
        return (tDate >= rangeFrom && tDate <= rangeTo)
      })
    }

    return list
  }, [transactions, filter, showDateFilters, rangeFrom, rangeTo])

  return (
    <div className="page-wrapper animate-fadeIn">
      <div style={{ marginBottom: 20 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontWeight: 800, fontSize: '1.25rem', color: '#0F0D2E', marginBottom: 2 }}>{userRole === 'transport' ? getTranslatedText('Transport Finance') : getTranslatedText('Garage Finance')}</h2>
        <p style={{ fontSize: '0.8rem', color: '#6B7280' }}>{getTranslatedText('Track your cash flow and receivables')}</p>
      </div>
      </div>

      {/* Main Stats Card */}
      {/* ... (rest of the card code remains the same) ... */}

      {/* Main Stats Card */}
      <div style={{
        background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', borderRadius: 24, padding: '24px',
        color: 'white', boxShadow: '0 10px 25px rgba(79, 70, 229, 0.25)', marginBottom: 24,
        position: 'relative', overflow: 'hidden'
      }}>
        {/* Decorative circle */}
        <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.9, marginBottom: 6 }}>
          <Wallet size={16} /> <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{getTranslatedText('CASH BALANCE')}</span>
        </div>
        <div style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: 24 }}>₹{liveStats.cashBalance.toLocaleString('en-IN')}</div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px 16px', borderRadius: 16 }}>
            <div style={{ fontSize: '0.7rem', opacity: 0.8, marginBottom: 4, fontWeight: 600 }}>{getTranslatedText('TOTAL EXPENSES')}</div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>₹{liveStats.totalIncome.toLocaleString('en-IN')}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px 16px', borderRadius: 16 }}>
            <div style={{ fontSize: '0.7rem', opacity: 0.8, marginBottom: 4, fontWeight: 600 }}>{getTranslatedText('TOTAL SPENT')}</div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>₹{liveStats.totalExpense.toLocaleString('en-IN')}</div>
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      {userRole !== 'garage' && (
      <div className="card" style={{ padding: '20px 14px', marginBottom: 24 }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: 16 }}>{getTranslatedText('Cash Flow Trend')}</h3>
        <div style={{ width: '100%', height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={transactions.slice(-7).map(t => ({ name: dayjs(t.date).format('D MMM'), amt: t.amount, type: t.type }))}>
              <defs>
                <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16A34A" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#16A34A" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Area type="monotone" dataKey="amt" stroke="#7C3AED" strokeWidth={2} fillOpacity={1} fill="url(#colorInc)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      )}

      {/* Quick Actions Grid */}
      {userRole === 'garage' ? (
        <button 
          onClick={() => navigate('/finance/add?type=expense')} 
          style={{
            width: '100%', background: 'white', border: '1.5px dashed #E5E7EB', borderRadius: 16, padding: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer',
            marginBottom: 24, transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ width: 36, height: 36, borderRadius: 12, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <TrendingDown size={18} color="#DC2626" />
          </div>
          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1E293B' }}>{getTranslatedText('Record New Expense')}</span>
        </button>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: 10, marginBottom: 24 }}>
          {[
            { icon: TrendingUp, label: 'Income', bg: '#DCFCE7', color: '#16A34A', to: '/finance/add?type=income' },
            { icon: TrendingDown, label: 'Expense', bg: '#FEE2E2', color: '#DC2626', to: '/finance/add?type=expense' },
            { icon: CreditCard, label: 'Payments', bg: '#DBEAFE', color: '#2563EB', to: '/finance/add?type=income' },
            { icon: Wallet, label: 'Parties', bg: '#F3F4F6', color: '#4B5563', to: `${modulePrefix}/parties` },
          ].map(item => (
            <button key={item.label} onClick={() => navigate(item.to)} style={{
              background: 'white', border: 'none', borderRadius: 16, padding: '12px 4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6
            }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <item.icon size={18} color={item.color} />
              </div>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#4B5563' }}>{getTranslatedText(item.label)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Recent Transactions List */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#0F0D2E' }}>
          {getTranslatedText('Movements')}
          {showDateFilters && (
            <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600, marginLeft: 8 }}>
              ({filtered.length})
            </span>
          )}
        </h3>
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'income', 'expense'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '4px 12px', borderRadius: 99, border: 'none', fontSize: '0.7rem', fontWeight: 700,
              background: filter === f ? '#7C3AED' : 'rgba(0,0,0,0.05)',
              color: filter === f ? 'white' : '#6B7280', cursor: 'pointer', transition: 'all 0.15s'
            }}>
              {f === 'all' ? getTranslatedText('All') : f === 'income' ? getTranslatedText('Cash In') : getTranslatedText('Cash Out')}
            </button>
          ))}
          <button 
            onClick={() => setShowDateFilters(!showDateFilters)} 
            style={{
              padding: '4px 8px', borderRadius: 99, border: 'none', 
              background: showDateFilters ? '#0F0D2E' : 'rgba(0,0,0,0.05)',
              color: showDateFilters ? 'white' : '#6B7280', cursor: 'pointer', transition: '0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <Filter size={14} />
          </button>
        </div>
      </div>

      {/* Date Filters UI */}
      {showDateFilters && (
        <div className="animate-fadeIn" style={{ background: 'white', padding: '16px', borderRadius: 16, marginBottom: 16, border: '1px solid #F1F5F9', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: 6, marginLeft: 4 }}>{getTranslatedText('From Date')}</label>
              <input 
                type="date" 
                value={rangeFrom} 
                max={dayjs().format('YYYY-MM-DD')}
                onChange={e => setRangeFrom(e.target.value)} 
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 12, border: '1px solid #E2E8F0', fontSize: '0.85rem', fontWeight: 700, background: 'white', color: '#1E293B', outline: 'none' }} 
              />
            </div>
            <div>
              <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: 6, marginLeft: 4 }}>{getTranslatedText('To Date')}</label>
              <input 
                type="date" 
                value={rangeTo} 
                max={dayjs().format('YYYY-MM-DD')}
                onChange={e => setRangeTo(e.target.value)} 
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 12, border: '1px solid #E2E8F0', fontSize: '0.85rem', fontWeight: 700, background: 'white', color: '#1E293B', outline: 'none' }} 
              />
            </div>
          </div>
        </div>
      )}

      {!loaded ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 16 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: 'white', borderRadius: 20, padding: '40px 20px', textAlign: 'center', border: '1px dashed #E5E7EB' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <ArrowRightLeft size={24} color="#9CA3AF" />
          </div>
          <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: 0 }}>{getTranslatedText('No movements yet')}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {filtered.map(tx => {
            // Support both populated and unpopulated party field
            const txPartyId = (typeof tx.party === 'object') ? tx.party?._id : tx.party
            const party = parties.find(p => p._id === txPartyId || p.id === txPartyId)
            const partyName = (typeof tx.party === 'object') ? tx.party?.name : (party?.name || tx.category)
            
            // Bill payments are managed on their bill; manual entries open in the editor
            const openTx = () => tx.bill ? navigate(`/bills/${tx.bill}`) : navigate(`/finance/add?edit=${tx._id || tx.id}`)
            return <TxCard key={tx._id || tx.id} tx={tx} partyName={partyName} getTranslatedText={getTranslatedText} onClick={openTx} />
          })}
        </div>
      )}
    </div>
  )
}
