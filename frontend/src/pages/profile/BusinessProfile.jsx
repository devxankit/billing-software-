import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import {
  Building2, Phone, MapPin, FileText, CreditCard,
  Loader2, CheckCircle2, ArrowLeft, ChevronDown, Camera, PenTool, Type, Image as ImageIcon, X
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { usePageTranslation } from '../../hooks/usePageTranslation'
import logo from '../../assets/trans-logo.png'
import { uploadSingleFile } from '../../api/uploadApi'
import { PERSON_NAME_PATTERN, stripNonPersonName } from '../../utils/nameValidation'

const STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Delhi','J&K','Ladakh','Puducherry',
  'Daman, Diu, and Dadra',
]

function Field({ label, error, children, required }) {
  return (
    <div className="form-group">
      <label className="form-label">
        {label}{required && <span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {error && <span className="form-error">{error.message}</span>}
    </div>
  )
}

export default function BusinessProfile() {
  const { getTranslatedText } = usePageTranslation([
    'Business Profile', 'Manage your company details', 'Business Logo', 'Authorized Signature',
    'Identity & Slogan', 'Wishing Name (e.g. Happy Deepavali)', 'Owner Name', 'Owner name is required',
    'Business Name', 'Business name is required', 'Business Slogan', 'Enter your slogan...',
    'Brand Color', 'Pick a color for your business name on bills',
    'Phone Number', 'Phone number is required', 'Alternate Mobile (Optional)',
    'Alternate phone cannot be same as primary', 'Email Address', 'Invalid email address',
    'Location', 'Detailed Address', 'City', 'Only alphabets allowed', 'Pincode',
    'Tax Information', 'PAN Number', 'GSTIN (Optional)', 'Invalid GSTIN format',
    'Cancel', 'Updating...', 'Profile Saved!', 'Update Profile', 'Move What Matters',
    'Failed to update profile', 'Error updating profile. Please try again.',
    'Registered Customers', 'Registered Owners', 'Daman, Diu, and Dadra',
    'Custom Repair Details Label (e.g. Service Details)'
  ])
  const { user, updateProfile } = useAuth()
  const navigate = useNavigate()
  const [saved, setSaved] = useState(false)
  const [logoPreview, setLogoPreview] = useState(user?.logoUrl || null)
  const [signPreview, setSignPreview] = useState(user?.signatureUrl || null)
  const [logoFile, setLogoFile] = useState(null)
  const [signFile, setSignFile] = useState(null)

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      name: user?.name || '',
      businessName: user?.businessName || '',
      slogan: user?.slogan || 'Move What Matters',
      repairDetailsLabel: user?.repairDetailsLabel || '',
      phone: user?.phone || '',
      email: user?.email || '',
      address: user?.address || '',
      city: user?.city || '',
      state: user?.state || '',
      pincode: user?.pincode || '',
      gstin: user?.gstin || '',
      panNo: user?.panNo || '',
      alternatePhone: user?.alternatePhone || '',
      wishingName: user?.wishingName || '',
      brandColor: user?.brandColor || '#000000',
      wishingColor: user?.wishingColor || '#444444',
      isGstApplicable: user?.isGstApplicable || false,
    }
  })

  useEffect(() => {
    if (user) {
      reset({
        name: user.name || '',
        businessName: user.businessName || '',
        slogan: user.slogan || 'Move What Matters',
        repairDetailsLabel: user.repairDetailsLabel || '',
        phone: user.phone || '',
        email: user.email || '',
        address: user.address || '',
        city: user.city || '',
        state: user.state || '',
        pincode: user.pincode || '',
        gstin: user.gstin || '',
        panNo: user.panNo || '',
        alternatePhone: user.alternatePhone || '',
        wishingName: user.wishingName || '',
        brandColor: user.brandColor || '#000000',
        wishingColor: user.wishingColor || '#444444',
        isGstApplicable: user.isGstApplicable || false,
      })
      if (user.logoUrl) setLogoPreview(user.logoUrl)
      if (user.signatureUrl) setSignPreview(user.signatureUrl)
    }
  }, [user, reset])

  const dataUrlToFile = async (dataUrl, filename = 'image.png') => {
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return null
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    return new File([blob], filename, { type: blob.type || 'application/octet-stream' })
  }

  const onSubmit = async (data) => {
    try {
      const formData = new FormData()
      
      // Append text fields
      // Append text fields
      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && data[key] !== null && key !== 'id') {
          if (typeof data[key] === 'object' && !(data[key] instanceof File) && !(data[key] instanceof FileList)) {
             formData.append(key, JSON.stringify(data[key]))
          } else {
             formData.append(key, data[key])
          }
        }
      })

      // Append files if selected
      if (logoFile) formData.append('logo', logoFile)
      if (signFile) formData.append('signature', signFile)

      const res = await updateProfile(formData)
      
      if (res.success) {
        setSaved(true)
        setTimeout(() => { 
          setSaved(false)
          navigate('/profile') 
        }, 1200)
      } else {
        alert(res.message || getTranslatedText('Failed to update profile'))
      }
    } catch (err) {
      console.error('Profile update failed:', err)
      alert(getTranslatedText('Error updating profile. Please try again.'))
    }
  }

  const handleImage = (e, setter) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setter(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleLogoPick = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    handleImage(e, setLogoPreview)
  }

  const handleSignPick = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSignFile(file)
    handleImage(e, setSignPreview)
  }

  return (
    <div className="page-wrapper animate-fadeIn" style={{ maxWidth: 640, margin: '0 auto', paddingBottom: 300 }}>



      <form onSubmit={handleSubmit(onSubmit)}>

        {/* Branding Assets */}
        <div className="responsive-grid" style={{ gap: 14, marginBottom: 14 }}>
           {/* Logo */}
           <div style={{ background: 'white', borderRadius: 24, padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)', textAlign: 'center' }}>
              <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 12px' }}>
                 {logoPreview ? (
                   <>
                     <img src={logoPreview} alt="Logo" style={{ width: '100%', height: '100%', borderRadius: 16, objectFit: 'contain', background: '#F9FAFB' }} />
                     <button type="button" onClick={() => { setLogoPreview(null); setLogoFile(null); setValue('logoUrl', '') }} style={{ position: 'absolute', top: -6, right: -6, width: 24, height: 24, borderRadius: '50%', background: '#DC2626', color: 'white', border: '2px solid white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }} title="Remove Logo">
                        <X size={12} strokeWidth={3} />
                     </button>
                   </>
                 ) : (
                   <div style={{ width: '100%', height: '100%', borderRadius: 16, overflow: 'hidden', background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ImageIcon size={32} color="#7C3AED" />
                   </div>
                 )}
                 <label htmlFor="logo-upload" style={{ position: 'absolute', bottom: -4, right: -4, width: 28, height: 28, borderRadius: '50%', background: '#7C3AED', cursor: 'pointer', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                   <ImageIcon size={14} color="white" />
                   <input id="logo-upload" type="file" accept="image/*, application/pdf, .jpg, .jpeg, .png, .pdf" style={{ display: 'none' }} onChange={handleLogoPick} onClick={(e) => {
                     if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
                       e.preventDefault();
                       const inputEl = e.target;
                       window.flutter_inappwebview.callHandler('pickImage').then(async (result) => {
                         if (result && typeof result === 'string' && result.startsWith('data:')) {
                           const res = await fetch(result);
                           const blob = await res.blob();
                           const file = new File([blob], 'upload.jpg', { type: blob.type || 'image/jpeg' });
                           const dt = new DataTransfer();
                           dt.items.add(file);
                           inputEl.files = dt.files;
                           inputEl.dispatchEvent(new Event('change', { bubbles: true }));
                         }
                       }).catch(console.error);
                     }
                   }} />
                 </label>
              </div>
              <p style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0F0D2E', margin: 0 }}>{getTranslatedText('Business Logo')}</p>
           </div>

           <div style={{ background: 'white', borderRadius: 24, padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)', textAlign: 'center' }}>
              <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 12px' }}>
                 {signPreview ? (
                   <>
                     <img src={signPreview} alt="Sign" style={{ width: '100%', height: '100%', borderRadius: 16, objectFit: 'contain', background: '#F9FAFB' }} />
                     <button type="button" onClick={() => { setSignPreview(null); setSignFile(null); setValue('signatureUrl', '') }} style={{ position: 'absolute', top: -6, right: -6, width: 24, height: 24, borderRadius: '50%', background: '#DC2626', color: 'white', border: '2px solid white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }} title="Remove Signature">
                        <X size={12} strokeWidth={3} />
                     </button>
                   </>
                 ) : (
                   <div style={{ width: '100%', height: '100%', borderRadius: 16, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <PenTool size={32} color="#DC2626" />
                   </div>
                 )}
                 <label htmlFor="sign-upload" style={{ position: 'absolute', bottom: -4, right: -4, width: 28, height: 28, borderRadius: '50%', background: '#DC2626', cursor: 'pointer', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                   <ImageIcon size={14} color="white" />
                   <input id="sign-upload" type="file" accept="image/*, application/pdf, .jpg, .jpeg, .png, .pdf" style={{ display: 'none' }} onChange={handleSignPick} onClick={(e) => {
                     if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
                       e.preventDefault();
                       const inputEl = e.target;
                       window.flutter_inappwebview.callHandler('pickImage').then(async (result) => {
                         if (result && typeof result === 'string' && result.startsWith('data:')) {
                           const res = await fetch(result);
                           const blob = await res.blob();
                           const file = new File([blob], 'upload.jpg', { type: blob.type || 'image/jpeg' });
                           const dt = new DataTransfer();
                           dt.items.add(file);
                           inputEl.files = dt.files;
                           inputEl.dispatchEvent(new Event('change', { bubbles: true }));
                         }
                       }).catch(console.error);
                     }
                   }} />
                 </label>
              </div>
              <p style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0F0D2E', margin: 0 }}>{getTranslatedText('Authorized Signature')}</p>
           </div>
        </div>

        <div style={{ background: 'white', borderRadius: 24, padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', marginBottom: 14, border: '1px solid rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={18} color="#7C3AED" />
            </div>
            <h3 style={{ fontWeight: 800, fontSize: '1rem', color: '#0F0D2E', margin: 0 }}>{getTranslatedText('Identity & Slogan')}</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label={getTranslatedText('Wishing Name (e.g. Happy Deepavali)')}>
               <div className="input-group">
                 <span className="input-prefix"><Type size={16} /></span>
                 <input {...register('wishingName')} placeholder={getTranslatedText('Wishing Name (e.g. Happy Deepavali)')} className="form-input" />
               </div>
            </Field>
            <div className="responsive-grid" style={{ gap: 12 }}>
              <Field label={getTranslatedText('Owner Name')} error={errors.name} required>
                <input {...register('name', { 
                  required: getTranslatedText('Owner name is required'),
                  pattern: { value: PERSON_NAME_PATTERN, message: 'Only letters are allowed' }
                })} 
                onInput={(e) => {
                  e.target.value = stripNonPersonName(e.target.value);
                }}
                placeholder={getTranslatedText('Owner Name')} className="form-input" />
              </Field>
              <Field label={getTranslatedText('Business Name')} error={errors.businessName} required>
                <input {...register('businessName', { required: getTranslatedText('Business name is required') })} placeholder={getTranslatedText('Business Name')} className="form-input" />
              </Field>
            </div>
            <Field label={getTranslatedText('Business Slogan')}>
               <div className="input-group">
                 <span className="input-prefix"><Type size={16} /></span>
                 <input {...register('slogan')} placeholder={getTranslatedText('Enter your slogan...')} className="form-input" />
               </div>
            </Field>
            {user?.role === 'garage' && (
              <Field label={getTranslatedText('Custom Repair Details Label (e.g. Service Details)')}>
                 <div className="input-group">
                   <span className="input-prefix"><Type size={16} /></span>
                   <input {...register('repairDetailsLabel')} placeholder={getTranslatedText('e.g. Repair Details, Service Details, Work Done')} className="form-input" />
                 </div>
              </Field>
            )}

            <div className="responsive-grid" style={{ gap: 12, alignItems: 'center', background: '#F8FAFC', padding: 16, borderRadius: 16, border: '1px solid #E2E8F0' }}>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Field label={getTranslatedText('Brand Color')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input type="color" {...register('brandColor')} style={{ width: 40, height: 40, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B' }}>{watch('brandColor')}</span>
                    </div>
                  </Field>
                  <Field label={getTranslatedText('Wishing Color')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input type="color" {...register('wishingColor')} style={{ width: 40, height: 40, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B' }}>{watch('wishingColor')}</span>
                    </div>
                  </Field>
               </div>
               <div style={{ textAlign: 'center', padding: '10px', background: 'white', borderRadius: 12, border: '1px dashed #CBD5E1' }}>
                  <div style={{ fontSize: '0.6rem', color: '#64748B', fontWeight: 800, marginBottom: 8, letterSpacing: '0.05em' }}>BILL HEADER PREVIEW</div>
                  <div style={{ fontSize: '0.6rem', fontWeight: 800, color: watch('wishingColor'), marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    || {watch('wishingName') || 'HAPPY DEEPAVALI'} ||
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 950, color: watch('brandColor'), textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1 }}>
                    {watch('businessName') || 'KHAN TRANSPORT'}
                  </div>
               </div>
            </div>

             <div className="responsive-grid" style={{ gap: 12 }}>
              <Field label={getTranslatedText('Phone Number')} error={errors.phone} required>
                <input type="tel" {...register('phone', { 
                  required: getTranslatedText('Phone number is required'),
                  pattern: { value: /^[6-9]\d{9}$/, message: 'Invalid Indian phone number' }
                })} 
                onInput={(e) => {
                  let val = e.target.value.replace(/\D/g, '');
                  if (val.length > 0 && !/^[6-9]/.test(val[0])) val = val.replace(/^[^6-9]+/, '');
                  e.target.value = val.slice(0, 10);
                }}
                maxLength={10}
                placeholder="98765 43210" className="form-input" inputMode="numeric" />
              </Field>
              <Field label={getTranslatedText('Alternate Mobile (Optional)')} error={errors.alternatePhone}>
                <input 
                  type="tel" 
                  {...register('alternatePhone', {
                    pattern: { value: /^[6-9]\d{9}$/, message: 'Invalid Indian phone number' },
                    validate: (value, formValues) => {
                      if (!value) return true;
                      return value !== formValues.phone || getTranslatedText('Alternate phone cannot be same as primary')
                    }
                  })} 
                  onInput={(e) => {
                    let val = e.target.value.replace(/\D/g, '');
                    if (val.length > 0 && !/^[6-9]/.test(val[0])) val = val.replace(/^[^6-9]+/, '');
                    e.target.value = val.slice(0, 10);
                  }}
                  maxLength={10}
                  placeholder={getTranslatedText('Alternate Mobile (Optional)')} 
                  className="form-input" 
                  inputMode="numeric" 
                />
              </Field>
            </div>
            <Field label={getTranslatedText('Email Address')} error={errors.email}>
              <input 
                type="email" 
                {...register('email', {
                  pattern: {
                    value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                    message: getTranslatedText('Invalid email address')
                  }
                })} 
                placeholder="hello@company.com" 
                className="form-input" 
              />
            </Field>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14, marginBottom: 24 }}>
           <div style={{ background: 'white', borderRadius: 24, padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={18} color="#2563EB" />
                </div>
                <h3 style={{ fontWeight: 800, fontSize: '1rem', color: '#0F0D2E', margin: 0 }}>{getTranslatedText('Location')}</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                 <Field label={getTranslatedText('Detailed Address')}>
                    <textarea {...register('address')} placeholder={getTranslatedText('Detailed Address')} className="form-input" style={{ minHeight: 60, resize: 'none' }} />
                 </Field>
                 <div className="responsive-grid" style={{ gap: 10 }}>
                    <Field label={getTranslatedText('City')} error={errors.city}>
                      <input 
                        {...register('city', {
                          pattern: { value: /^[A-Za-z\s]+$/, message: getTranslatedText('Only alphabets allowed') }
                        })} 
                        onInput={(e) => {
                          e.target.value = e.target.value.replace(/[^A-Za-z\s]/g, '');
                        }}
                        placeholder={getTranslatedText('City')} 
                        className="form-input" 
                      />
                    </Field>
                    <Field label={getTranslatedText('Pincode')} error={errors.pincode}>
                      <input 
                        {...register('pincode', {
                          pattern: { value: /^[0-9]{6}$/, message: 'Invalid pincode (6 digits required)' }
                        })} 
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                          setValue('pincode', val)
                        }}
                        placeholder="396191" 
                        className={`form-input ${errors.pincode ? 'error' : ''}`} 
                        maxLength={6} 
                        inputMode="numeric" 
                      />
                    </Field>
                 </div>
                  <Field label={getTranslatedText('State')} error={errors.state}>
                    <select
                      {...register('state')}
                      value={watch('state') || ''}
                      onChange={(e) => {
                        setValue('state', e.target.value, { shouldValidate: true, shouldDirty: true })
                      }}
                      className="form-input"
                    >
                      <option value="">Select State...</option>
                      {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>

                  {watch('state') && (
                    <Field label={getTranslatedText('Selected State')}>
                      <input 
                        type="text" 
                        value={watch('state')} 
                        readOnly 
                        className="form-input" 
                        style={{ backgroundColor: '#f9fafb', color: '#374151', cursor: 'not-allowed', border: '1px solid #e5e7eb' }}
                      />
                    </Field>
                  )}
              </div>
           </div>

           <div style={{ background: 'white', borderRadius: 24, padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={18} color="#D97706" />
                </div>
                <h3 style={{ fontWeight: 800, fontSize: '1rem', color: '#0F0D2E', margin: 0 }}>{getTranslatedText('Tax Information')}</h3>
              </div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                 <Field label={getTranslatedText('PAN Number')} error={errors.panNo}>
                    <input 
                      {...register('panNo', {
                        pattern: { value: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i, message: getTranslatedText('Invalid PAN (e.g. ABCDE1234F)') }
                      })} 
                      onInput={(e) => {
                        e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
                      }}
                      placeholder="ABCDE1234F" 
                      className="form-input" 
                      style={{ textTransform: 'uppercase' }} 
                      maxLength={10} 
                    />
                 </Field>
                 <Field label={getTranslatedText('GSTIN (Optional)')} error={errors.gstin}>
                    <input 
                      {...register('gstin', {
                        pattern: { value: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/i, message: getTranslatedText('Invalid GSTIN format') }
                      })} 
                      onInput={(e) => {
                        e.target.value = e.target.value.toUpperCase().replace(/\s/g, '').slice(0, 15);
                      }}
                      placeholder="24AAAAA0000A1Z5" 
                      className="form-input" 
                      maxLength={15} 
                    />
                 </Field>
              </div>
           </div>
        </div>

        <div style={{ display: 'flex', flexDirection: window.innerWidth < 640 ? 'column-reverse' : 'row', gap: 12 }}>
          <button type="button" className="btn btn-ghost btn-full" onClick={() => navigate('/profile')}>{getTranslatedText('Cancel')}</button>
          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={isSubmitting}>
            {isSubmitting
              ? <><Loader2 size={18} className="spin" /> {getTranslatedText('Updating...')}</>
              : saved ? <><CheckCircle2 size={18} /> {getTranslatedText('Profile Saved!')}</>
              : <><CheckCircle2 size={18} /> {getTranslatedText('Update Profile')}</>}
          </button>
        </div>
      </form>

      <style>{`
        .spin { animation: spin 0.8s linear infinite; } 
        @keyframes spin { to { transform: rotate(360deg); } }
        .switch { position: relative; display: inline-block; width: 44px; height: 24px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #E2E8F0; transition: .4s; border-radius: 24px; }
        .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .slider { background-color: #7C3AED; }
        input:checked + .slider:before { transform: translateX(20px); }
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
