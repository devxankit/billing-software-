import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Wrench, ArrowLeft, CheckCircle2, Loader2, ChevronDown } from 'lucide-react'
import { useVehicles } from '../../context/VehicleContext'
import { usePageTranslation } from '../../hooks/usePageTranslation'
import carModelsData from '../../data/car_models.json'
import { PERSON_NAME_PATTERN, stripNonPersonName } from '../../utils/nameValidation'

// Pre-process car data
const UNIQUE_BRANDS = [...new Set(carModelsData.map(item => item.brand))].sort();
const BRAND_MODELS_MAP = carModelsData.reduce((acc, item) => {
  if (!acc[item.brand]) acc[item.brand] = [];
  acc[item.brand].push(item.model);
  return acc;
}, {});

const formatName = (str) => {
  if (!str) return ''
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}


function Field({ label, error, children, required }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}{required && <span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span>}</label>
      {children}
      {error && <span className="form-error">{error.message}</span>}
    </div>
  )
}

const VEHICLE_TYPES = ['Car', 'Bike', 'Scooter', 'Auto', 'Truck', 'Bus', 'Tractor', 'Other']
const CAR_TYPES = ['Car'] // types that show car brand/model dropdown

export default function AddGarageVehicle() {
  const { getTranslatedText } = usePageTranslation([
    'Add Vehicle', 'Register a new party vehicle', 'Vehicle Type', 'Company', 'Model', 'Vehicle Number',
    'Current KM', 'Next Service KM', 'Party Name', 'Cancel', 'Saving…', 'Save Vehicle',
    'Required', 'Optional', 'Owner Name', 'e.g. Swift',
    'Car', 'Bike', 'Scooter', 'Auto', 'Truck', 'Bus', 'Tractor', 'Other',
    'Search Brand (e.g. Maruti)', 'Search Model (e.g. Swift)',
    'No models found for this brand', 'Select a brand first',
    'Maruti', 'Hyundai', 'Tata', 'Honda', 'Toyota', 'Mahindra', 'Ford', 'Kia', 'MG', 'Renault', 'Volkswagen', 'Skoda'
  ])
  const navigate = useNavigate()
  const { addVehicle } = useVehicles()
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { vehicleNumber: '', vehicleType: 'Car', company: '', model: '', kmReading: '', nextServiceKm: '', customerName: '', customerPhone: '' }
  })

  // Dropdown states
  const [brandSearch, setBrandSearch] = useState('')
  const [showBrandList, setShowBrandList] = useState(false)
  const [modelSearch, setModelSearch] = useState('')
  const [showModelList, setShowModelList] = useState(false)

  const watchCompany = watch('company')
  const watchModel = watch('model')
  const watchVehicleType = watch('vehicleType')
  const isCar = CAR_TYPES.includes(watchVehicleType)

  const onSubmit = async (data) => {
    const res = await addVehicle({ ...data, garageVehicle: true })
    if (res) navigate('/garage/vehicles')
  }

  return (
    <div className="page-wrapper animate-fadeIn" style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => navigate('/garage/vehicles')} style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: 'rgba(0,0,0,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: '1.25rem', color: '#0F0D2E', margin: 0 }}>{getTranslatedText('Add Vehicle')}</h2>
          <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: 0 }}>{getTranslatedText('Register a new party vehicle')}</p>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: 24, padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.02)' }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="responsive-grid" style={{ gap: 16, marginBottom: 20 }}>
            
            {/* Vehicle Type — always shown first, full width */}
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label={getTranslatedText('Vehicle Type')}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {VEHICLE_TYPES.map(vt => (
                    <button
                      key={vt} type="button"
                      onClick={() => {
                        setValue('vehicleType', vt)
                        setValue('company', '')
                        setValue('model', '')
                        setBrandSearch('')
                        setModelSearch('')
                      }}
                      style={{
                        padding: '7px 16px', borderRadius: 99, fontSize: '0.8125rem', fontWeight: 700,
                        border: watchVehicleType === vt ? '2px solid #7C3AED' : '1.5px solid #E5E7EB',
                        background: watchVehicleType === vt ? '#EDE9FE' : 'white',
                        color: watchVehicleType === vt ? '#7C3AED' : '#6B7280',
                        cursor: 'pointer', transition: 'all 0.15s'
                      }}
                    >
                      {getTranslatedText(vt)}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            {/* Company — searchable for Car, free-text for others */}
            <Field label={getTranslatedText('Company')}>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" className="form-input" 
                  placeholder={isCar ? getTranslatedText('Search Brand (e.g. Maruti)') : 'e.g. Bajaj, Hero'}
                  value={brandSearch || watchCompany}
                  onChange={e => {
                    setBrandSearch(e.target.value)
                    setShowBrandList(isCar)
                    setValue('company', e.target.value)
                    setValue('model', '')
                    setModelSearch('')
                  }}
                  onFocus={() => isCar && setShowBrandList(true)}
                  onBlur={() => setTimeout(() => setShowBrandList(false), 200)}
                  autoComplete="off"
                />
                {isCar && <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />}
                
                {isCar && showBrandList && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
                    background: 'white', border: '1px solid #E5E7EB', borderRadius: 12,
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                    marginTop: 4, maxHeight: 200, overflowY: 'auto'
                  }}>
                    {UNIQUE_BRANDS
                      .filter(b => !brandSearch || b.toLowerCase().includes(brandSearch.toLowerCase()))
                      .map(b => (
                        <div key={b} onMouseDown={(e) => {
                          e.preventDefault()
                          setValue('company', b)
                          setBrandSearch('')
                          setShowBrandList(false)
                        }} style={{ padding: '10px 14px', fontSize: '0.875rem', cursor: 'pointer', borderBottom: '1px solid #F1F5F9' }}>
                          {getTranslatedText(b)}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </Field>

            {/* Model — searchable for Car, free-text for others */}
            <Field label={getTranslatedText('Model')} error={errors.model} required>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" className={`form-input ${errors.model ? 'error' : ''}`} 
                  placeholder={isCar ? getTranslatedText('Search Model (e.g. Swift)') : 'e.g. Splendor, Activa'}
                  value={modelSearch || watchModel}
                  onChange={e => {
                    setModelSearch(e.target.value)
                    setShowModelList(isCar)
                    setValue('model', e.target.value)
                  }}
                  onFocus={() => isCar && setShowModelList(true)}
                  onBlur={() => setTimeout(() => setShowModelList(false), 200)}
                  autoComplete="off"
                />
                {isCar && <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />}
                
                {isCar && showModelList && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
                    background: 'white', border: '1px solid #E5E7EB', borderRadius: 12,
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                    marginTop: 4, maxHeight: 200, overflowY: 'auto'
                  }}>
                    {(BRAND_MODELS_MAP[watchCompany] || [])
                      .filter(m => !modelSearch || m.toLowerCase().includes(modelSearch.toLowerCase()))
                      .map(m => (
                        <div key={m} onMouseDown={(e) => {
                          e.preventDefault()
                          setValue('model', m)
                          setModelSearch('')
                          setShowModelList(false)
                        }} style={{ padding: '10px 14px', fontSize: '0.875rem', cursor: 'pointer', borderBottom: '1px solid #F1F5F9' }}>
                          {getTranslatedText(m)}
                        </div>
                      ))}
                    {isCar && watchCompany && (BRAND_MODELS_MAP[watchCompany] || []).length === 0 && (
                      <div style={{ padding: '14px', textAlign: 'center', color: '#94A3B8', fontSize: '0.8rem' }}>
                        {getTranslatedText('No models found for this brand')}
                      </div>
                    )}
                    {isCar && !watchCompany && (
                      <div style={{ padding: '14px', textAlign: 'center', color: '#94A3B8', fontSize: '0.8rem' }}>
                        {getTranslatedText('Select a brand first')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Field>

            <Field label={getTranslatedText('Vehicle Number')} error={errors.vehicleNumber} required>
              <input 
                {...register('vehicleNumber', { 
                  required: getTranslatedText('Required'),
                  pattern: { 
                    value: /^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/i, 
                    message: 'Invalid Format (e.g. GJ15AB1234)' 
                  }
                })} 
                onInput={(e) => {
                  e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
                }}
                placeholder="GJ15AB1234" 
                className={`form-input ${errors.vehicleNumber ? 'error' : ''}`} 
                style={{ textTransform: 'uppercase' }} 
                autoCapitalize="characters" 
              />
            </Field>
            <Field label={getTranslatedText('Current KM')} error={errors.kmReading} required>
              <input {...register('kmReading', { required: getTranslatedText('Required') })} type="number" placeholder="0" className={`form-input ${errors.kmReading ? 'error' : ''}`} />
            </Field>
            <Field label={getTranslatedText('Next Service KM')}>
              <input {...register('nextServiceKm')} type="number" placeholder={getTranslatedText('Optional')} className="form-input" />
            </Field>
            <Field label={getTranslatedText('Party Name')} error={errors.customerName}>
              <input 
                {...register('customerName', {
                  pattern: { value: PERSON_NAME_PATTERN, message: 'Only letters allowed' }
                })} 
                onBlur={e => setValue('customerName', formatName(e.target.value))}
                onInput={e => {
                  e.target.value = stripNonPersonName(e.target.value)
                  setValue('customerName', e.target.value)
                }}
                placeholder={getTranslatedText('Owner Name')} 
                className={`form-input ${errors.customerName ? 'error' : ''}`} 
                style={{ textTransform: 'capitalize' }}
              />
            </Field>
            <Field label={getTranslatedText('Owner Phone')} error={errors.customerPhone}>
              <input 
                {...register('customerPhone', {
                  pattern: { value: /^[6-9]\d{9}$/, message: 'Invalid 10-digit number' }
                })} 
                placeholder="98765 43210" 
                className="form-input" 
                inputMode="numeric" 
                maxLength={10} 
              />
            </Field>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" className="btn btn-ghost btn-full" onClick={() => navigate('/garage/vehicles')}>{getTranslatedText('Cancel')}</button>
            <button type="submit" className="btn btn-primary btn-full" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 size={18} className="spin" /> {getTranslatedText('Saving…')}</> : <><CheckCircle2 size={18} /> {getTranslatedText('Save Vehicle')}</>}
            </button>
          </div>
        </form>
      </div>
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
