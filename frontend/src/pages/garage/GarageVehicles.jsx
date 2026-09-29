import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { 
  Wrench, Plus, Trash2, CheckCircle2, Loader2, 
  ArrowLeft, ChevronDown, Search, FileText, Calendar, 
  ArrowRight, X 
} from 'lucide-react'
import { useVehicles } from '../../context/VehicleContext'
import { useBills } from '../../context/BillContext'
import { usePageTranslation } from '../../hooks/usePageTranslation'
import dayjs from 'dayjs'
import { PERSON_NAME_PATTERN, stripNonPersonName } from '../../utils/nameValidation'

const formatName = (str) => {
  if (!str) return ''
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

const CAR_TYPES = ['Car', 'SUV', 'Bike', 'Truck', 'Bus', 'Auto', 'Van', 'Other']
const COMPANIES  = ['Maruti', 'Hyundai', 'Tata', 'Honda', 'Toyota', 'Mahindra', 'Ford', 'Kia', 'MG', 'Renault', 'Volkswagen', 'Skoda', 'Other']

function Field({ label, error, children, required }) {
  return (
    <div className="form-group" style={{ marginBottom: 12 }}>
      <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: 4 }}>{label}{required && <span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span>}</label>
      {children}
      {error && <span className="form-error">{error.message}</span>}
    </div>
  )
}

const VCard = ({ v, onDelete, onViewHistory, getTranslatedText }) => (
  <div 
    onClick={() => onViewHistory(v)}
    style={{ 
      background: 'white', borderRadius: 18, padding: '16px', 
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)', display: 'flex', 
      alignItems: 'center', gap: 14, border: '1.5px solid #F1F5F9',
      cursor: 'pointer', transition: '0.2s', position: 'relative',
      overflow: 'hidden'
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = '#7C3AED'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(124,58,237,0.08)' }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = '#F1F5F9'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)' }}
  >
    <div style={{ width: 44, height: 44, borderRadius: 14, background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Wrench size={20} color="#7C3AED" />
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F0D2E' }}>{getTranslatedText(v.company)} {v.model}</div>
        <div style={{ fontSize: '0.65rem', fontWeight: 800, background: '#F1F5F9', padding: '2px 8px', borderRadius: 10, color: '#475569', textTransform: 'uppercase' }}>{v.vehicleNumber}</div>
      </div>
      <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: 2, fontWeight: 600 }}>{getTranslatedText('Current:')} {v.kmReading?.toLocaleString()} km</div>
      <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 1 }}>{getTranslatedText(v.customerName) || getTranslatedText('No owner name')}</div>
      {v.nextServiceKm && (
        <div style={{ fontSize: '0.7rem', color: '#D97706', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#D97706' }} />
          {getTranslatedText('Next service:')} {v.nextServiceKm.toLocaleString()} km
        </div>
      )}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <button 
        onClick={(e) => { e.stopPropagation(); onDelete(v.id || v._id); }} 
        style={{ 
          width: 32, height: 32, border: 'none', background: 'rgba(239, 68, 68, 0.05)', 
          borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', 
          justifyContent: 'center', transition: '0.2s'
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'}
      >
        <Trash2 size={15} color="#EF4444" />
      </button>
      <ArrowRight size={20} color="#CBD5E1" />
    </div>
  </div>
)

export default function GarageVehicles() {
  const { getTranslatedText } = usePageTranslation([
    'Garage Fleet', 'Manage party vehicles and tracking history', 'Add Vehicle',
    'Search by vehicle number or owner...', 'Register New Vehicle', 'Vehicle Type',
    'Vehicle Company', 'Model', 'Vehicle Number', 'Current KM', 'Owner Name', 'Owner Phone',
    'Cancel', 'Registering…', 'Register Vehicle', 'Vehicle Not Found',
    'No vehicles match your search. Register a new one to start tracking.', 'Register Now',
    'Service History', 'No owner name', 'No service records found',
    'This vehicle hasn\'t been billed yet.', 'Job Card #', 'Draft', 'Current:', 'Next service:',
    'Car', 'SUV', 'Bike', 'Truck', 'Bus', 'Auto', 'Van', 'Other', 'Done',
    'Maruti', 'Hyundai', 'Tata', 'Honda', 'Toyota', 'Mahindra', 'Ford', 'Kia', 'MG', 'Renault', 'Volkswagen', 'Skoda'
  ])
  const { vehicles, addVehicle, deleteVehicle } = useVehicles()
  const { bills } = useBills()
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedVehicle, setSelectedVehicle] = useState(null)

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { vehicleNumber: '', company: 'Maruti', model: '', vehicleType: 'Car', kmReading: '', nextServiceKm: '', customerName: '', customerPhone: '' }
  })

  const onSubmit = async (data) => {
    addVehicle({ ...data, garageVehicle: true })
    reset()
    setShowForm(false)
  }

  const filteredVehicles = useMemo(() => {
    // Show all vehicles by default so "previously registered" ones aren't hidden
    let list = vehicles || []
    if (!searchTerm) return list
    
    const s = searchTerm.toLowerCase().replace(/\s+/g, '')
    return list.filter(v => {
      const vNum = (v.vehicleNumber || '').toLowerCase().replace(/\s+/g, '')
      const comp = (v.company || '').toLowerCase().replace(/\s+/g, '')
      const mod = (v.model || '').toLowerCase().replace(/\s+/g, '')
      const fullVehicleName = `${comp}${mod}`
      const custName = (v.customerName || '').toLowerCase().replace(/\s+/g, '')
      
      return vNum.includes(s) || 
             fullVehicleName.includes(s) ||
             custName.includes(s)
    })
  }, [vehicles, searchTerm])

  const serviceHistory = useMemo(() => {
    if (!selectedVehicle) return []
    // Match by vehicle number (case insensitive, no spaces)
    const vNum = selectedVehicle.vehicleNumber?.toUpperCase().replace(/\s+/g, '')
    return bills
      .filter(b => b.billType === 'garage' && b.vehicleNo?.toUpperCase().replace(/\s+/g, '') === vNum)
      .sort((a, b) => dayjs(b.billingDate || b.createdAt).unix() - dayjs(a.billingDate || a.createdAt).unix())
  }, [selectedVehicle, bills])

  return (
    <div className="page-wrapper animate-fadeIn" style={{ position: 'relative', minHeight: '80vh' }}>
      
      {/* Header & Search */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontWeight: 800, fontSize: '1.5rem', color: '#0F0D2E', marginBottom: 4, letterSpacing: '-0.02em' }}>{getTranslatedText('Garage Fleet')}</h2>
            <p style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>{getTranslatedText('Manage party vehicles and tracking history')}</p>
          </div>
          <button id="btn-add-garage-vehicle" className="btn btn-primary" onClick={() => setShowForm(s => !s)} style={{ borderRadius: 14, height: 44 }}>
            <Plus size={18} /> {getTranslatedText('Add Vehicle')}
          </button>
        </div>

        <div style={{ position: 'relative' }}>
           <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}>
              <Search size={18} />
           </div>
           <input 
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
             placeholder={getTranslatedText('Search by vehicle number or owner...')} 
             style={{ 
               width: '100%', height: 52, borderRadius: 16, border: '2px solid #F1F5F9', 
               padding: '0 16px 0 48px', fontSize: '1rem', fontWeight: 600, color: '#0F0D2E',
               boxShadow: '0 2px 10px rgba(0,0,0,0.02)', outline: 'none', transition: '0.2s'
             }}
             onFocus={e => e.currentTarget.style.borderColor = '#7C3AED'}
             onBlur={e => e.currentTarget.style.borderColor = '#F1F5F9'}
           />
        </div>
      </div>

      {showForm && (
        <div className="animate-fadeInDown" style={{ background: 'white', borderRadius: 24, padding: '24px', marginBottom: 20, boxShadow: '0 8px 30px rgba(124,58,237,0.12)', border: '2px solid #EDE9FE' }}>
          <h3 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0F0D2E', marginBottom: 20 }}>{getTranslatedText('Register New Vehicle')}</h3>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="responsive-grid" style={{ gap: 16, marginBottom: 20 }}>
              <Field label={getTranslatedText('Vehicle Type')}>
                <select {...register('vehicleType')} className="form-input" style={{ paddingRight: 32, height: 44 }}>
                  {CAR_TYPES.map(c => <option key={c}>{getTranslatedText(c)}</option>)}
                </select>
              </Field>
              <Field label={getTranslatedText('Vehicle Company')}>
                <input {...register('company')} placeholder="e.g. Tata, Honda" className="form-input" style={{ height: 44 }} />
              </Field>
              <Field label={getTranslatedText('Model')} error={errors.model} required>
                <input {...register('model', { required: 'Required' })} placeholder="e.g. Swift, i20" className="form-input" style={{ height: 44 }} />
              </Field>
              <Field label={getTranslatedText('Vehicle Number')} error={errors.vehicleNumber} required>
                <input 
                  {...register('vehicleNumber', { 
                    required: 'Required',
                    pattern: { 
                      value: /^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/i, 
                      message: 'Format: GJ15AB1234' 
                    }
                  })} 
                  onInput={(e) => {
                    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
                  }}
                  placeholder="GJ15AB1234" 
                  className="form-input" 
                  style={{ textTransform: 'uppercase', height: 44 }} 
                />
              </Field>
              <Field label={getTranslatedText('Current KM')} error={errors.kmReading} required>
                <input {...register('kmReading', { required: 'Required' })} type="number" placeholder="45000" className="form-input" inputMode="numeric" style={{ height: 44 }} />
              </Field>
              <Field label={getTranslatedText('Owner Name')} error={errors.customerName}>
                <input 
                  {...register('customerName', {
                    pattern: { value: PERSON_NAME_PATTERN, message: 'Only letters allowed' }
                  })} 
                  onInput={e => {
                    e.target.value = stripNonPersonName(e.target.value)
                    setValue('customerName', e.target.value)
                  }}
                  onBlur={e => setValue('customerName', formatName(e.target.value))}
                  placeholder="e.g. Rahul Sharma" 
                  className={`form-input ${errors.customerName ? 'error' : ''}`} 
                  style={{ height: 44, textTransform: 'capitalize' }} 
                />
              </Field>
              <Field label={getTranslatedText('Owner Phone')} error={errors.customerPhone}>
                <input 
                  {...register('customerPhone', {
                    pattern: { value: /^[6-9]\d{9}$/, message: 'Invalid 10-digit number' }
                  })} 
                  placeholder="10-digit number" 
                  className="form-input" 
                  inputMode="numeric" 
                  maxLength={10} 
                  style={{ height: 44 }} 
                />
              </Field>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" className="btn btn-ghost" style={{ flex: 1, borderRadius: 12 }} onClick={() => setShowForm(false)}>{getTranslatedText('Cancel')}</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 2, borderRadius: 12 }} disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 size={18} className="spin" /> {getTranslatedText('Registering…')}</> : <><CheckCircle2 size={18} /> {getTranslatedText('Register Vehicle')}</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {filteredVehicles.length === 0 ? (
        <div style={{ background: 'white', borderRadius: 24, padding: '64px 32px', textAlign: 'center', border: '2px dashed #F1F5F9' }}>
          <div style={{ width: 72, height: 72, borderRadius: 24, background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Wrench size={32} color="#7C3AED" />
          </div>
          <h3 style={{ fontWeight: 800, marginBottom: 8, color: '#0F0D2E' }}>{getTranslatedText('Vehicle Not Found')}</h3>
          <p style={{ color: '#64748B', fontSize: '0.9rem', maxWidth: 280, margin: '0 auto 24px', fontWeight: 600 }}>{getTranslatedText('No vehicles match your search. Register a new one to start tracking.')}</p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ borderRadius: 14 }}><Plus size={18} /> {getTranslatedText('Register Now')}</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {filteredVehicles.map(v => <VCard key={v.id || v._id} v={v} onDelete={deleteVehicle} onViewHistory={setSelectedVehicle} getTranslatedText={getTranslatedText} />)}
        </div>
      )}

      {selectedVehicle && (
        <div style={{ 
          position: 'fixed', inset: 0, background: 'rgba(15, 13, 46, 0.6)', 
          backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', 
          alignItems: 'flex-end', justifyContent: 'center' 
        }} onClick={() => setSelectedVehicle(null)}>
           <div 
             className="animate-slideUp"
             style={{ 
               width: '100%', maxWidth: 500, background: 'white', 
               borderTopLeftRadius: 32, borderTopRightRadius: 32, 
               maxHeight: '90vh', overflowY: 'auto', padding: '24px',
               boxShadow: '0 -10px 40px rgba(0,0,0,0.2)'
             }}
             onClick={e => e.stopPropagation()}
           >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                 <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                       <span style={{ fontSize: '0.75rem', fontWeight: 900, background: '#7C3AED', color: 'white', padding: '2px 8px', borderRadius: 8 }}>{selectedVehicle.vehicleNumber}</span>
                       <h3 style={{ fontWeight: 900, fontSize: '1.25rem', color: '#0F0D2E', margin: 0 }}>{getTranslatedText('Service History')}</h3>
                    </div>
                    <p style={{ margin: 0, color: '#64748B', fontSize: '0.85rem', fontWeight: 600 }}>{getTranslatedText(selectedVehicle.company)} {selectedVehicle.model} • {selectedVehicle.customerName || getTranslatedText('No owner name')}</p>
                 </div>
                 <button 
                   onClick={() => setSelectedVehicle(null)}
                   style={{ width: 36, height: 36, borderRadius: 12, border: 'none', background: '#F1F5F9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                 >
                    <X size={20} color="#64748B" />
                 </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                 {serviceHistory.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', background: '#F8FAFC', borderRadius: 24, border: '1.5px dashed #E2E8F0' }}>
                       <Calendar size={32} color="#CBD5E1" style={{ marginBottom: 12 }} />
                       <p style={{ color: '#64748B', fontSize: '0.9rem', margin: 0, fontWeight: 700 }}>{getTranslatedText('No service records found')}</p>
                       <p style={{ color: '#94A3B8', fontSize: '0.75rem', marginTop: 4 }}>{getTranslatedText('This vehicle hasn\'t been billed yet.')}</p>
                    </div>
                 ) : (
                    serviceHistory.map(bill => (
                       <div 
                         key={bill._id} 
                         onClick={() => navigate(`/bills/${bill._id}`)}
                         style={{ 
                           padding: '16px', background: 'white', borderRadius: 20, 
                           border: '1.5px solid #F1F5F9', cursor: 'pointer',
                           transition: '0.2s', display: 'flex', alignItems: 'center', gap: 14
                         }}
                         onMouseEnter={e => { e.currentTarget.style.borderColor = '#7C3AED'; e.currentTarget.style.background = '#F9F8FF' }}
                         onMouseLeave={e => { e.currentTarget.style.borderColor = '#F1F5F9'; e.currentTarget.style.background = 'white' }}
                       >
                          <div style={{ width: 44, height: 44, borderRadius: 14, background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                             <FileText size={20} color="#7C3AED" />
                          </div>
                          <div style={{ flex: 1 }}>
                             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0F0D2E' }}>{getTranslatedText('Job Card #')}{bill.billNumber || getTranslatedText('Draft')}</div>
                                <div style={{ fontWeight: 900, color: '#16A34A', fontSize: '0.9rem' }}>₹{bill.grandTotal?.toLocaleString()}</div>
                             </div>
                             <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                   <Calendar size={12} /> {dayjs(bill.billingDate).format('DD MMM YYYY')}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>
                                   {bill.kmReading || 0} km
                                </div>
                             </div>
                          </div>
                       </div>
                    ))
                 )}
              </div>

              <button 
                className="btn btn-primary" 
                style={{ width: '100%', height: 52, borderRadius: 16, fontSize: '0.95rem' }}
                onClick={() => {
                  setSelectedVehicle(null)
                }}
              >
                 {getTranslatedText('Done')}
              </button>
           </div>
        </div>
      )}

      <style>{`
        .animate-fadeInDown { animation: fadeInDown 0.3s ease both; }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
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
        .animate-slideUp { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        * { -webkit-overflow-scrolling: touch; }
      `}</style>
    </div>
  )
}
