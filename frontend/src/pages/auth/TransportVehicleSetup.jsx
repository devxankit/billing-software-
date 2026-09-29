import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Truck, Plus, Loader2, ArrowLeft, X, Info, CheckCircle2, Check, ChevronRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useVehicles } from '../../context/VehicleContext'
import logo from '../../assets/trans-logo.png'

export default function TransportVehicleSetup() {
  const { user, logout } = useAuth()
  const { addVehicle, vehicles } = useVehicles()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { vehicleNumber: '', vehicleType: 'Truck' }
  })

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const res = await addVehicle({ ...data, vehicleNumber: data.vehicleNumber.toUpperCase() })
      if (!res) {
        // addVehicle in VehicleContext doesn't return anything on error but logs it.
        // Let's assume the context handles the broad error, but we want to know why.
      }
      reset()
    } catch (e) {
      console.error('Add vehicle error:', e)
      const msg = e.response?.data?.message || 'Failed to add vehicle. Possibly already registered.'
      alert(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fadeIn setup-page-container" style={{ maxWidth: 640, margin: '0 auto', paddingBottom: 40 }}>
      {/* Header (Outside Card) */}
      <div className="setup-header-fixed" style={{ textAlign: 'center', marginBottom: 20, position: 'sticky', top: 0, zIndex: 30, background: 'rgba(248, 250, 252, 0.98)', paddingTop: 10, paddingBottom: 14, borderRadius: '0 0 20px 20px', borderBottom: '1px solid #E2E8F0' }}>
        {/* Back Button */}
        <button
          onClick={() => navigate('/register/transport', { state: { editMode: true, startStep: 3 } })}
          style={{
            position: 'absolute', left: 0, top: 4,
            width: 38, height: 38, borderRadius: 12,
            background: 'white', border: '1px solid #E2E8F0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#64748B',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)', transition: 'all 0.2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#7C3AED'; e.currentTarget.style.borderColor = '#EDE9FE'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#64748B'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
        >
          <ArrowLeft size={18} strokeWidth={2.5} />
        </button>

        <div style={{ 
          width: 50, height: 50, borderRadius: 16, background: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.06)'
        }}>
          <img src={logo} alt="Logo" style={{ width: '70%', height: '70%', objectFit: 'contain' }} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0F172A', marginBottom: 6, letterSpacing: '-0.02em' }}>
          Step 4: Your Fleet
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#64748B', fontWeight: 500 }}>
          Add at least one vehicle to your transport business.
        </p>
      </div>

      <div style={{ 
        background: 'white', 
        borderRadius: 24, 
        padding: '24px', 
        boxShadow: '0 20px 50px rgba(0,0,0,0.04)',
        border: '1px solid rgba(0,0,0,0.05)'
      }}>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ background: '#F8FAFC', borderRadius: 20, padding: 16, marginBottom: 16, border: '1px solid #E2E8F0' }}>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="form-group">
                 <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 6, display: 'block' }}>Vehicle Number</label>
                 <input 
                   {...register('vehicleNumber', { 
                     required: 'Required',
                     pattern: { 
                       value: /^[A-Z]{2}\s?\d{2}\s?[A-Z]{1,2}\s?\d{4}$/i, 
                       message: 'Format: MH 12 AB 1234' 
                     }
                   })} 
                   placeholder="MH 12 AB 1234"
                   autoCapitalize="characters"
                   style={{ height: 48, borderRadius: 14, background: 'white' }}
                   className={`form-input ${errors.vehicleNumber ? 'error' : ''}`}
                 />
                 {errors.vehicleNumber && <span style={{ color: '#EF4444', fontSize: '0.65rem', fontWeight: 700, marginTop: 4, display: 'block' }}>{errors.vehicleNumber.message}</span>}
               </div>
               <div className="form-group">
                 <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 6, display: 'block' }}>Type</label>
                 <select 
                   {...register('vehicleType')} 
                   style={{ height: 48, borderRadius: 14, background: 'white' }}
                   className="form-input"
                 >
                   <option>Tempo</option>
                   <option>Truck</option>
                   <option>Container</option>
                   <option>Tanker</option>
                   <option>Trailer</option>
                 </select>
               </div>
             </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                width: 56, height: 56, borderRadius: '50%', background: '#7C3AED', 
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 20px rgba(124, 58, 237, 0.3)', border: 'none', cursor: 'pointer'
              }}
            >
              {loading ? <Loader2 size={24} className="spin" /> : <Plus size={28} />}
            </button>
          </div>
        </form>

        {vehicles.length > 0 && (
          <div style={{ marginTop: 30 }}>
            <h4 style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '0.02em' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A' }} />
              Ready Fleet ({vehicles.length})
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
              {vehicles.map(v => (
                <div key={v._id} style={{ 
                  background: '#F8FAFC', padding: '8px 12px', borderRadius: '16px', 
                  display: 'flex', flexDirection: 'column', gap: 2, border: '1px solid #E2E8F0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Truck size={14} color="#7C3AED" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1E293B', letterSpacing: '0.02em' }}>{v.vehicleNumber}</span>
                  </div>
                  <span style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 600 }}>{v.vehicleType || 'Truck'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

          <button 
            onClick={() => navigate('/subscription')}
            style={{ 
              width: '100%', height: 48, borderRadius: 14, 
              background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
              color: 'white', fontSize: '0.875rem', fontWeight: 800, border: 'none',
              marginTop: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 10px 20px rgba(124, 58, 237, 0.2)', transition: 'all 0.2s'
            }}
            className="hover:scale-[1.01] active:scale-[0.98]"
          >
            {vehicles.length > 0 ? 'Continue' : 'Skip for now'} <ChevronRight size={18} />
          </button>
      </div>

      <style>{`
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
