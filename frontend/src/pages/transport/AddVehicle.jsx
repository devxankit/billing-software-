import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Truck, CheckCircle2, Loader2, ArrowLeft, ChevronDown } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { useEffect } from 'react'
import { useVehicles } from '../../context/VehicleContext'
import { useAuth } from '../../context/AuthContext'
import TranslatedText from '../../components/TranslatedText'
import { usePageTranslation } from '../../hooks/usePageTranslation'
import { PERSON_NAME_PATTERN, stripNonPersonName } from '../../utils/nameValidation'

const VEHICLE_TYPES = ['Tempo', 'Truck', 'Mini Truck', 'Heavy Truck', 'Container', 'Tanker', 'Trailer', 'Other']

function Field({ label, error, children, required }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}{required && <span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span>}</label>
      {children}
      {error && <span className="form-error">{error.message}</span>}
    </div>
  )
}

export default function AddVehicle() {
  const { getTranslatedText } = usePageTranslation([
    'Edit Vehicle', 'Add Vehicle', 'Update vehicle details', 'Add a new vehicle to your fleet',
    'Vehicle Details', 'Vehicle Number', 'Vehicle number is required', 'Vehicle Type',
    'Owner Name', 'Owner name (Optional)', 'Notes', 'Any notes (optional)...', 'Cancel',
    'Saving...', 'Save Changes'
  ])
  const { addVehicle, updateVehicle, vehicles } = useVehicles()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { vehicleNumber: '', vehicleType: 'Tempo', ownerName: '', model: '', notes: '' }
  })

  useEffect(() => {
    if (isEdit && vehicles.length > 0) {
      const v = vehicles.find(x => x._id === id)
      if (v) reset(v)
    }
  }, [isEdit, id, vehicles, reset])

  const onSubmit = async (data) => {
    try {
      if (isEdit) {
        await updateVehicle(id, data)
      } else {
        await addVehicle({ ...data, vehicleNumber: data.vehicleNumber.toUpperCase() })
      }
      navigate('/transport/vehicles')
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to save vehicle')
    }
  }

  return (
    <div className="page-wrapper animate-fadeIn" style={{ maxWidth: 540, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => navigate('/transport/vehicles')} style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: 'rgba(0,0,0,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: '1.125rem', color: '#0F0D2E', margin: 0 }}>{isEdit ? getTranslatedText('Edit Vehicle') : getTranslatedText('Add Vehicle')}</h2>
          <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: 0 }}>{isEdit ? getTranslatedText('Update vehicle details') : getTranslatedText('Add a new vehicle to your fleet')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div style={{ background: 'white', borderRadius: 20, padding: '20px 20px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 20, border: '1px solid rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Truck size={16} color="#D97706" />
            </div>
            <h3 style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0F0D2E', margin: 0 }}>{getTranslatedText('Vehicle Details')}</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label={getTranslatedText('Vehicle Number')} error={errors.vehicleNumber} required>
              <input
                id="field-vehicle-number"
                {...register('vehicleNumber', {
                  required: getTranslatedText('Vehicle number is required'),
                  pattern: { 
                    value: /^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/i, 
                    message: 'Invalid Format (e.g. GJ15AB1234)' 
                  }
                })}
                onInput={e => {
                  e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)
                  setValue('vehicleNumber', e.target.value)
                }}
                autoComplete="off"
                placeholder="GJ15AB1234"
                className={`form-input ${errors.vehicleNumber ? 'error' : ''}`}
                style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, fontSize: '1.125rem' }}
              />
            </Field>

            <Field label={getTranslatedText('Vehicle Type')}>
              <select id="field-vehicle-type" {...register('vehicleType')} className="form-input">
                {VEHICLE_TYPES.map(vt => <option key={vt} value={vt}>{getTranslatedText(vt)}</option>)}
              </select>
            </Field>

            <Field label={getTranslatedText('Owner Name')} error={errors.ownerName}>
              <input 
                id="field-vehicle-owner" 
                {...register('ownerName', {
                  pattern: { value: PERSON_NAME_PATTERN, message: 'Only letters allowed' }
                })} 
                placeholder={getTranslatedText('Owner name (Optional)')} 
                className={`form-input ${errors.ownerName ? 'error' : ''}`}
                style={{ textTransform: 'capitalize' }}
                onInput={e => {
                  e.target.value = stripNonPersonName(e.target.value)
                  setValue('ownerName', e.target.value)
                }}
                onBlur={e => {
                  const val = e.target.value.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
                  setValue('ownerName', val)
                }}
              />
            </Field>
            
            <Field label="Model / Make">
              <input id="field-vehicle-model" {...register('model')} placeholder="e.g. Tata Ace, Mahindra Bolero" className="form-input" />
            </Field>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button type="button" className="btn btn-ghost btn-full" onClick={() => navigate('/transport/vehicles')}>{getTranslatedText('Cancel')}</button>
          <button id="btn-save-vehicle" type="submit" className="btn btn-primary btn-full btn-lg" disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 size={18} className="spin" /> {getTranslatedText('Saving...')}</> : <><CheckCircle2 size={18} /> {isEdit ? getTranslatedText('Save Changes') : getTranslatedText('Add Vehicle')}</>}
          </button>
        </div>
      </form>
      <style>{`.spin { animation: spin 0.8s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
