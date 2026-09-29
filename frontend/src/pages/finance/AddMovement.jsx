import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { 
  ArrowLeft, CheckCircle2, Loader2, TrendingUp, TrendingDown, 
  Calendar, CreditCard, User, Tag, FileText, ChevronDown 
} from 'lucide-react'
import { useFinance } from '../../context/FinanceContext'
import { useParties } from '../../context/PartyContext'
import { useBills } from '../../context/BillContext'
import { useAuth } from '../../context/AuthContext'
import dayjs from 'dayjs'

function Field({ label, error, children, required }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}{required && <span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span>}</label>
      {children}
      {error && <span className="form-error">{error.message}</span>}
    </div>
  )
}

export default function AddMovement() {
  const [searchParams] = useSearchParams()
  const typeParam = searchParams.get('type') || 'income'
  const partyIdParam = searchParams.get('partyId') || ''
  const billIdParam = searchParams.get('billId') || ''
  const amountParam = searchParams.get('amount') || ''
  
  const { user } = useAuth()
  const { addTransaction } = useFinance()
  const { parties } = useParties()
  const { recordPayment } = useBills()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      type: typeParam,
      date: dayjs().format('YYYY-MM-DD'),
      amount: amountParam,
      partyId: partyIdParam,
      billId: billIdParam,
      paymentMode: 'cash',
      category: billIdParam ? 'Bill Payment' : '',
      notes: billIdParam ? `Payment for Bill #${billIdParam.split('_')[1]}` : '',
    }
  })

  const type = watch('type')

  const onSubmit = async (data) => {
    setSaving(true)
    try {
      // Map frontend partyId to backend party field
      const payload = {
        ...data,
        type: type, // explicitly use the watched type state
        party: data.partyId || null,
        bill: data.billId || null,
        amount: parseFloat(data.amount)
      }

      if (data.billId) {
        // Recording a bill payment creates its own income entry and party adjustment
        const billModes = { cash: 'Cash', online: 'Online', bank: 'Bank Transfer', check: 'Cheque' }
        await recordPayment(data.billId, {
          amount: parseFloat(data.amount),
          date: data.date,
          mode: billModes[data.paymentMode] || 'Cash',
          notes: data.notes || '',
        })
      } else {
        await addTransaction(payload)
      }
      
      setDone(true)
      setTimeout(() => navigate('/finance'), 800)
    } catch (e) {
      alert("Failed to save transaction")
    } finally {
      setSaving(false)
    }
  }

  if (done) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
      <div style={{ width: 64, height: 64, borderRadius: 20, background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CheckCircle2 size={32} color="#16A34A" />
      </div>
      <h3 style={{ fontWeight: 800 }}>Success!</h3>
      <p style={{ color: '#6B7280' }}>Transaction recorded.</p>
    </div>
  )

  return (
    <div className="page-wrapper animate-fadeIn" style={{ maxWidth: 540, margin: '0 auto', paddingBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <button 
          onClick={() => navigate('/finance')} 
          style={{ 
            width: 40, height: 40, borderRadius: 12, border: 'none', 
            background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', 
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#64748B'
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 style={{ fontWeight: 900, fontSize: '1.25rem', color: '#0F0D2E', margin: 0 }}>
            {type === 'income' ? 'Record Income' : 'Record Expense'}
          </h2>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B' }}>Add a new financial transaction</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div style={{ 
          background: 'white', borderRadius: 28, padding: '28px', 
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.04), 0 8px 10px -6px rgba(0,0,0,0.04)', 
          border: '1px solid rgba(0,0,0,0.03)',
          display: 'flex', flexDirection: 'column', gap: 20 
        }}>
          
          {/* Type Toggle */}
          <div style={{ 
            display: 'flex', background: '#F8FAFC', borderRadius: 18, 
            padding: '6px', gap: 6, border: '1px solid #F1F5F9' 
          }}>
            {[
              { val: 'income', label: 'Cash In', color: '#16A34A', bg: '#DCFCE7', icon: TrendingUp },
              { val: 'expense', label: 'Cash Out', color: '#DC2626', bg: '#FEE2E2', icon: TrendingDown },
            ].map(opt => {
              const isActive = type === opt.val
              return (
                <button 
                  key={opt.val} type="button" 
                  onClick={() => setValue('type', opt.val)}
                  style={{
                    flex: 1, padding: '12px', borderRadius: 14, border: 'none', 
                    fontSize: '0.875rem', fontWeight: 800,
                    background: isActive ? opt.bg : 'transparent',
                    color: isActive ? opt.color : '#94A3B8',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', 
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  <opt.icon size={18} style={{ opacity: isActive ? 1 : 0.5 }} />
                  {opt.label}
                </button>
              )
            })}
          </div>
          <input type="hidden" {...register('type')} />

          {/* Amount Section */}
          <div style={{ 
            background: '#F8FAFC', padding: '20px', borderRadius: 20, 
            border: '1.5px solid #F1F5F9', textAlign: 'center' 
          }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 12 }}>
              Transaction Amount
            </label>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 900, color: type === 'income' ? '#16A34A' : '#DC2626' }}>₹</span>
              <input 
                {...register('amount', { required: 'Required', min: 1 })} 
                type="number" placeholder="0" 
                style={{ 
                  background: 'transparent', border: 'none', outline: 'none',
                  fontSize: '2.5rem', fontWeight: 900, color: '#0F0D2E',
                  width: '100%', maxWidth: 200, textAlign: 'center'
                }} 
                inputMode="numeric" 
              />
            </div>
            {errors.amount && <p style={{ color: '#DC2626', fontSize: '0.75rem', margin: '8px 0 0', fontWeight: 700 }}>{errors.amount.message}</p>}
          </div>

          <div className="responsive-grid" style={{ gap: 20 }}>
            <Field label="Date" required>
              <input {...register('date')} type="date" className="form-input" style={{ borderRadius: 16 }} />
            </Field>
            <Field label="Payment Mode">
              <div className="input-group">
                <CreditCard size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <select {...register('paymentMode')} className="form-input" style={{ paddingLeft: 44, borderRadius: 16 }}>
                  <option value="cash">Cash</option>
                  <option value="online">Online</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="check">Cheque</option>
                </select>
              </div>
            </Field>
          </div>

          <Field label="Related Party (Optional)">
            <div className="input-group">
              <User size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <select {...register('partyId')} className="form-input" style={{ paddingLeft: 44, borderRadius: 16 }}>
                <option value="">— Select Party —</option>
                {parties
                  .filter(p => p.partyType === (user?.role || 'transport'))
                  .map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>)
                }
              </select>
            </div>
          </Field>

          <Field label="Category">
             <div className="input-group">
              <Tag size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input {...register('category')} placeholder="e.g. Fuel, Salary, Rent..." className="form-input" style={{ paddingLeft: 44, borderRadius: 16 }} />
            </div>
          </Field>



          <button 
            type="submit" 
            className="btn btn-primary btn-full" 
            disabled={saving} 
            style={{ 
              marginTop: 10, height: 56, borderRadius: 18, fontSize: '1.05rem', 
              fontWeight: 800, background: type === 'income' ? '#16A34A' : '#7C3AED',
              borderColor: type === 'income' ? '#16A34A' : '#7C3AED',
              boxShadow: `0 8px 20px ${type === 'income' ? 'rgba(22,163,74,0.2)' : 'rgba(124,58,237,0.2)'}`
            }}
          >
            {saving ? <Loader2 className="spin" size={20} /> : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={20} />
                Save {type === 'income' ? 'Income' : 'Expense'}
              </div>
            )}
          </button>
        </div>
      </form>
      <style>{`
        .spin { animation: spin 0.8s linear infinite; } 
        @keyframes spin { to { transform: rotate(360deg); } }
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
