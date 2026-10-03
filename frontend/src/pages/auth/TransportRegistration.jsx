import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Truck, User, MapPin, Phone, Loader2, ArrowRight, FileText, Image, Files, Building2, Check, Info, PenTool, Shield, CreditCard } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import SetupHeader from '../../components/SetupHeader'
import { uploadSingleFile } from '../../api/uploadApi'
import { PERSON_NAME_PATTERN, stripNonPersonName } from '../../utils/nameValidation'
import { usePageTranslation } from '../../hooks/usePageTranslation'

function Field({ label, error, children, required, sublabel }) {
  return (
    <div className="form-group" style={{ marginBottom: 12 }}>
      {label && (
        <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, opacity: 0.8 }}>
          {label} {required && <span style={{ color: '#DC2626', marginLeft: 2 }}>*</span>}
          {sublabel && <span style={{ fontSize: '0.62rem', color: '#94A3B8', fontWeight: 600 }}>({sublabel})</span>}
        </label>
      )}
      {children}
      {error && <span className="form-error" style={{ color: '#DC2626', fontSize: '0.7rem', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 750 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Info size={11} /> {error.message}</span>
      </span>}
    </div>
  )
}

const DOC_TEXTS = ['File selected', 'Already uploaded', 'Upload proof', 'is required']

function DocUploadField({ label, icon: Icon, register, name, required, existingUrl }) {
  const [hasFile, setHasFile] = useState(false)
  const { getTranslatedText: t } = usePageTranslation(DOC_TEXTS)
  const isUploaded = hasFile || !!existingUrl
  return (
    <div style={{ position: 'relative' }}>
      <label style={{ 
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', 
        border: '1.5px dashed #E2E8F0', borderRadius: '16px', background: '#F8FAFC',
        cursor: 'pointer', transition: 'all 0.2s', borderStyle: isUploaded ? 'solid' : 'dashed',
        borderColor: isUploaded ? '#16A34A' : '#E2E8F0',
        backgroundColor: isUploaded ? '#F0FDF4' : '#F8FAFC',
        minHeight: 48
      }} className="hover:border-purple-300 hover:bg-purple-50">
        <div style={{ 
          width: 32, height: 32, borderRadius: 10, background: 'white', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          color: isUploaded ? '#16A34A' : '#7C3AED',
          boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
          flexShrink: 0
        }}>
          {isUploaded ? <Check size={16} /> : <Icon size={16} />}
        </div>
        
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
          <div style={{ fontSize: '0.62rem', color: isUploaded ? '#16A34A' : '#94A3B8', fontWeight: 600 }}>
            {hasFile ? t('File selected') : existingUrl ? t('Already uploaded') : t('Upload proof')}
          </div>
        </div>

        <input 
          type="file" 
          {...register(name, { 
            required: (required && !existingUrl) ? `${label} ${t('is required')}` : false,
            onChange: (e) => setHasFile(e.target.files.length > 0)
          })}
          accept="image/*, application/pdf, .jpg, .jpeg, .png, .pdf"
          style={{ position: 'absolute', opacity: 0, inset: 0, cursor: 'pointer' }} 
          onClick={(e) => {
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
          }}
        />
      </label>
    </div>
  )
}

const PAGE_TEXTS = [
  'Setup Your Transport', 'Basic business information', 'KYC & Bank details', 'Upload required documents',
  'BASIC INFORMATION', 'KYC & BANK DETAILS', 'REQUIRED DOCUMENTS', 'Next Step', 'Back', 'Finish Setup',
  'SKIP DOCUMENTS FOR NOW', 'Setup failed. Please try again.', 'Registration Failed. Please check your data.',
  'OWNER NAME', 'Full Name', 'CONTACT NUMBER', 'Phone Number', 'TRANSPORT NAME', 'Trade Name',
  'e.g. Radhe Logistics', 'OFFICE ADDRESS', 'Complete Office Address', 'AADHAR NUMBER', 'PAN NUMBER',
  'BANK ACCOUNT NO', 'Account Number', 'IFSC CODE', 'Bank IFSC', 'BANK NAME', 'Bank Name', 'Aadhar Card',
  'PAN Card', 'Authorized Signature', 'Transport Logo', 'Owner name is required', 'Only letters are allowed',
  'Phone is required', 'Business name is required', 'Address is required', 'Aadhar No is required',
  'Invalid Aadhar', 'PAN is required', 'Invalid PAN', 'Account no is required',
  'Account no must be 9-18 digits', 'IFSC is required', 'Invalid IFSC format', 'Bank name is required',
]

export default function TransportRegistration() {
  const { getTranslatedText: t } = usePageTranslation(PAGE_TEXTS)
  const { user, completeTransportSetup, isTransport, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const editMode = location.state?.editMode === true
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(editMode ? 3 : 1)

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
      return
    }
    // Skip redirect if user is coming back from vehicle setup (editMode)
    if (user?.setupComplete && isTransport && !editMode) {
      navigate('/setup/vehicles', { replace: true })
    }
  }, [user, isTransport, navigate, isAuthenticated, editMode])

  const { register, handleSubmit, formState: { errors }, trigger, watch } = useForm({
    mode: 'onBlur',
    defaultValues: (() => {
      const saved = sessionStorage.getItem('draft_transport_setup')
      let parsed = {}
      if (saved) {
        try { 
          parsed = JSON.parse(saved)
        } catch(e) {}
      }
      return {
        name: parsed.name || user?.name || '',
        businessName: parsed.businessName || user?.businessName || '',
        phone: parsed.phone || user?.phone || '',
        address: parsed.address || user?.address || '',
        aadharNo: parsed.aadharNo || user?.aadharNo || '',
        panNo: parsed.panNo || user?.panNo || '',
        bankAccNo: parsed.bankAccNo || user?.bankDetails?.accountNumber || '',
        bankIfsc: parsed.bankIfsc || user?.bankDetails?.ifsc || '',
        bankName: parsed.bankName || user?.bankDetails?.bankName || '',
      }
    })()
  })

  useEffect(() => {
    const subscription = watch((value) => {
      const draft = { ...value }
      delete draft.docSignature
      delete draft.docLogo
      delete draft.docAadhar
      delete draft.docPan
      
      const saved = sessionStorage.getItem('draft_transport_setup')
      let existingDraft = {}
      if (saved) {
        try { existingDraft = JSON.parse(saved) } catch(e) {}
      }
      
      const updatedDraft = { ...existingDraft }
      for (const key in draft) {
        if (draft[key] !== undefined) {
          updatedDraft[key] = draft[key]
        }
      }
      sessionStorage.setItem('draft_transport_setup', JSON.stringify(updatedDraft))
    })
    return () => subscription.unsubscribe()
  }, [watch])

  const handleNext = async () => {
    if (step === 1) {
      const isValid = await trigger(['name', 'phone', 'address', 'businessName']);
      if (isValid) setStep(2);
    } else if (step === 2) {
      const isValid = await trigger(['aadharNo', 'panNo', 'bankAccNo', 'bankIfsc', 'bankName']);
      if (isValid) setStep(3);
    }
  }

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const folder = `trans/users/${user?.phone || 'unknown'}/transport`
      const [signatureUpload, logoUpload, aadharUpload, panUpload] = await Promise.all([
        uploadSingleFile(data.docSignature?.[0], { folder }),
        uploadSingleFile(data.docLogo?.[0], { folder }),
        uploadSingleFile(data.docAadhar?.[0], { folder }),
        uploadSingleFile(data.docPan?.[0], { folder }),
      ])

      const signatureUrl = signatureUpload?.url || user?.signatureUrl || null
      const logoUrl = logoUpload?.url || user?.logoUrl || null
      const documents = {
        aadharUrl: aadharUpload?.url || user?.documents?.aadharUrl || null,
        panUrl: panUpload?.url || user?.documents?.panUrl || null,
      }

      // In editMode, user may only be updating documents — use existing user data as fallback
      const formattedData = {
        name: data.name || user?.name,
        businessName: data.businessName || user?.businessName,
        phone: data.phone || user?.phone,
        address: data.address || user?.address,
        aadharNo: data.aadharNo || user?.aadharNo,
        panNo: data.panNo || user?.panNo,
        ...(signatureUrl && { signatureUrl }),
        ...(logoUrl && { logoUrl }),
        documents,
        bankDetails: (data.bankAccNo || user?.bankDetails?.accountNumber) ? {
          accountName: data.name || user?.name,
          accountNumber: data.bankAccNo || user?.bankDetails?.accountNumber,
          ifsc: (data.bankIfsc || user?.bankDetails?.ifsc)?.toUpperCase(),
          bankName: data.bankName || user?.bankDetails?.bankName
        } : user?.bankDetails || undefined
      }

      const res = await completeTransportSetup(formattedData)
      if (res.success) {
        sessionStorage.removeItem('draft_transport_setup')
        navigate('/setup/vehicles', { replace: true })
      } else {
        setLoading(false)
        alert(res.message || t('Setup failed. Please try again.'))
      }
    } catch (error) {
      setLoading(false)
      console.error('Registration error:', error)
      alert(t('Registration Failed. Please check your data.'))
    }
  }

  return (
    <div className="animate-fadeIn" style={{ maxWidth: 480, margin: '0 auto', paddingBottom: 24 }}>
      <SetupHeader
        title={t('Setup Your Transport')}
        step={step}
        subtitle={step === 1 ? t('Basic business information') : step === 2 ? t('KYC & Bank details') : t('Upload required documents')}
      />

      <form onSubmit={handleSubmit(onSubmit)} style={{ 
        background: 'white', padding: '24px 20px', borderRadius: 28, 
        border: '1px solid #F1F5F9', boxShadow: '0 20px 50px rgba(0,0,0,0.03)',
        position: 'relative'
      }}>
        <div style={{ display: step === 1 ? 'block' : 'none' }} className="animate-slideInRight">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{ width: 4, height: 14, background: '#7C3AED', borderRadius: 2 }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#1E293B', letterSpacing: '0.02em' }}>{t('BASIC INFORMATION')}</span>
            </div>

            <div className="grid sm-grid-cols-2 gap-3">
              <Field label={t('OWNER NAME')} error={errors.name} required>
                <div className="input-group">
                  <span className="input-prefix"><User size={14} /></span>
                  <input 
                    {...register('name', { 
                      required: t('Owner name is required'),
                      pattern: { value: PERSON_NAME_PATTERN, message: t('Only letters are allowed') }
                    })} 
                    onInput={(e) => { 
                      e.target.value = stripNonPersonName(e.target.value);
                      e.target.value = e.target.value.replace(/\b\w/g, c => c.toUpperCase()); 
                    }}
                    placeholder={t('Full Name')} className="form-input" style={{ borderRadius: 12, height: 44, fontSize: '0.875rem' }} 
                  />
                </div>
              </Field>
              
              <Field label={t('CONTACT NUMBER')} error={errors.phone} required>
                <div className="input-group">
                  <span className="input-prefix"><Phone size={14} /></span>
                  <input {...register('phone', { required: t('Phone is required') })} placeholder={t('Phone Number')} className="form-input" readOnly style={{ borderRadius: 12, height: 44, background: '#F8FAFC', fontSize: '0.875rem' }} />
                </div>
              </Field>

              <Field label={t('TRANSPORT NAME')} error={errors.businessName} required sublabel={t('Trade Name')}>
                <div className="input-group">
                  <span className="input-prefix"><Truck size={14} /></span>
                  <input 
                    {...register('businessName', { required: t('Business name is required') })} 
                    onInput={(e) => { e.target.value = e.target.value.replace(/\b\w/g, c => c.toUpperCase()); }}
                    placeholder={t('e.g. Radhe Logistics')} className="form-input" style={{ borderRadius: 12, height: 44, fontSize: '0.875rem' }} 
                  />
                </div>
              </Field>
            </div>

            <Field label={t('OFFICE ADDRESS')} error={errors.address} required>
              <div className="input-group">
                <span className="input-prefix" style={{ top: 12, transform: 'none' }}><MapPin size={14} /></span>
                <textarea {...register('address', { required: t('Address is required') })} placeholder={t('Complete Office Address')} className="form-input" style={{ minHeight: 64, paddingTop: 8, borderRadius: 12, fontSize: '0.875rem', resize: 'none' }} />
              </div>
            </Field>

            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <button type="button" onClick={handleNext} className="btn btn-primary" style={{ 
                flex: 1, height: 50, borderRadius: 16, fontSize: '0.9rem', fontWeight: 900, 
                background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)', 
                boxShadow: '0 8px 24px rgba(124, 58, 237, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
              }}>
                {t('Next Step')} <ArrowRight size={18} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: step === 2 ? 'block' : 'none' }} className="animate-slideInRight">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{ width: 4, height: 14, background: '#7C3AED', borderRadius: 2 }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#1E293B', letterSpacing: '0.02em' }}>{t('KYC & BANK DETAILS')}</span>
            </div>

            <div className="grid sm-grid-cols-2 gap-3">
              <Field label={t('AADHAR NUMBER')} error={errors.aadharNo} required>
                <div className="input-group">
                  <span className="input-prefix"><Shield size={14} /></span>
                  <input {...register('aadharNo', { 
                    required: t('Aadhar No is required'),
                    pattern: { value: /^[0-9]{12}$/, message: t('Invalid Aadhar') }
                  })} 
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={12}
                  onInput={(e) => e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 12)}
                  placeholder="1234 5678 9012" className="form-input" style={{ borderRadius: 12, height: 44 }} />
                </div>
              </Field>

              <Field label={t('PAN NUMBER')} error={errors.panNo} required>
                <div className="input-group">
                  <span className="input-prefix"><FileText size={14} /></span>
                  <input {...register('panNo', { 
                    required: t('PAN is required'),
                    pattern: { value: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i, message: t('Invalid PAN') }
                  })} 
                  onInput={(e) => e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)}
                  placeholder="ABCDE1234F" className="form-input" style={{ borderRadius: 12, height: 44 }} />
                </div>
              </Field>

              <Field label={t('BANK ACCOUNT NO')} error={errors.bankAccNo} required>
                <div className="input-group">
                  <span className="input-prefix"><CreditCard size={14} /></span>
                  <input {...register('bankAccNo', { 
                    required: t('Account no is required'),
                    pattern: { value: /^[0-9]{9,18}$/, message: t('Account no must be 9-18 digits') }
                  })} 
                  onInput={(e) => e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 18)}
                  placeholder={t('Account Number')} className="form-input" style={{ borderRadius: 12, height: 44 }} />
                </div>
              </Field>

              <Field label={t('IFSC CODE')} error={errors.bankIfsc} required>
                <div className="input-group">
                  <span className="input-prefix"><Building2 size={14} /></span>
                  <input {...register('bankIfsc', { 
                    required: t('IFSC is required'),
                    pattern: { value: /^[A-Z]{4}0[A-Z0-9]{6}$/, message: t('Invalid IFSC format') }
                  })} 
                  onInput={(e) => e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11)}
                  placeholder={t('Bank IFSC')} className="form-input" style={{ borderRadius: 12, height: 44 }} />
                </div>
              </Field>

              <Field label={t('BANK NAME')} error={errors.bankName} required>
                <div className="input-group">
                  <span className="input-prefix"><Building2 size={14} /></span>
                  <input {...register('bankName', { 
                    required: t('Bank name is required'),
                    pattern: { value: /^[a-zA-Z\s.]+$/, message: t('Only letters are allowed') }
                  })} 
                  onInput={(e) => {
                    e.target.value = e.target.value.replace(/[^a-zA-Z\s.]/g, '');
                    e.target.value = e.target.value.replace(/\b\w/g, c => c.toUpperCase());
                  }}
                  placeholder={t('Bank Name')} className="form-input" style={{ borderRadius: 12, height: 44 }} />
                </div>
              </Field>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button type="button" onClick={() => setStep(1)} className="btn btn-ghost" style={{ flex: 1, height: 50, borderRadius: 14, fontWeight: 800 }}>{t('Back')}</button>
              <button type="button" onClick={handleNext} className="btn btn-primary" style={{ 
                flex: 2, height: 50, borderRadius: 14, fontWeight: 900,
                background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
                boxShadow: '0 8px 24px rgba(124, 58, 237, 0.2)'
              }}>{t('Next Step')} <ArrowRight size={18} strokeWidth={2.5} /></button>
            </div>
          </div>
        </div>

        <div style={{ display: step === 3 ? 'block' : 'none' }} className="animate-slideInRight">
          <div>
             <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{ width: 4, height: 14, background: '#7C3AED', borderRadius: 2 }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#1E293B', letterSpacing: '0.02em' }}>{t('REQUIRED DOCUMENTS')}</span>
            </div>

            <div style={{ marginBottom: 12, padding: '14px', background: '#F8FAFB', borderRadius: 20, border: '1px solid #F1F5F9' }}>
              <div className="grid sm-grid-cols-2 gap-3">
                <DocUploadField label={t('Aadhar Card')} icon={Shield} register={register} name="docAadhar" existingUrl={user?.documents?.aadharUrl} />
                <DocUploadField label={t('PAN Card')} icon={FileText} register={register} name="docPan" existingUrl={user?.documents?.panUrl} />
                <DocUploadField label={t('Authorized Signature')} icon={PenTool} register={register} name="docSignature" existingUrl={user?.signatureUrl} />
                <DocUploadField label={t('Transport Logo')} icon={Image} register={register} name="docLogo" existingUrl={user?.logoUrl} />
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 16 }}>
              <button type="button" onClick={() => setStep(2)} className="btn btn-ghost" style={{ flex: '1 1 80px', height: 50, borderRadius: 14, fontWeight: 800 }}>{t('Back')}</button>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ 
                flex: '2 1 150px', height: 50, borderRadius: 14, fontWeight: 900,
                background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
                boxShadow: '0 8px 24px rgba(124, 58, 237, 0.2)'
              }}>
                {loading ? <Loader2 size={18} className="spin" /> : <>{t('Finish Setup')} <ArrowRight size={18} strokeWidth={2.5} /></>}
              </button>
              <button type="button" onClick={handleSubmit(onSubmit)} className="btn btn-link" style={{ flex: '1 1 100%', color: '#64748B', fontSize: '0.75rem', marginTop: 8, fontWeight: 800, textAlign: 'center' }}>
                {t('SKIP DOCUMENTS FOR NOW')}
              </button>
            </div>
          </div>
        </div>
      </form>

      <style>{`
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-slideInRight { animation: slideInRight 0.4s ease-out forwards; }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        .form-input::placeholder { color: #CBD5E1; font-weight: 500; }
        .btn:active { transform: scale(0.97); }
      `}</style>
    </div>
  )
}
