import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { CreditCard, Building2, Check, Info, Shield, Loader2, ArrowRight, FileText } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import logo from '../../assets/trans-logo.png'
import { usePageTranslation } from '../../hooks/usePageTranslation'

function Field({ label, error, children, required, sublabel }) {
  return (
    <div className="form-group" style={{ marginBottom: 12 }}>
      {label && (
        <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 650, color: '#374151', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
          {label} {required && <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span>}
          {sublabel && <span style={{ fontSize: '0.62rem', color: '#94A3B8', fontWeight: 500 }}>({sublabel})</span>}
        </label>
      )}
      {children}
      {error && <span className="form-error" style={{ color: 'var(--danger)', fontSize: '0.7rem', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
        <Info size={11} /> {error.message}
      </span>}
    </div>
  )
}

const PAGE_TEXTS = [
  'Complete Your Profile', 'Add your bank and KYC details for payments', 'KYC & Bank Details', 'Finish Setup',
  'Skip for now', 'Update failed', 'Something went wrong. Please try again.', 'Aadhar Number', 'PAN Number',
  'Bank Account No', 'Account Number', 'IFSC Code', 'Bank IFSC', 'Bank Name', 'e.g. SBI',
  'Aadhar No is required', 'Invalid Aadhar (12 digits)', 'PAN is required', 'Invalid PAN',
  'Account no is required', 'Invalid Account Number', 'IFSC is required', 'Invalid IFSC',
  'Bank name is required', 'Only letters are allowed',
]

export default function BankDetailsSetup() {
  const { getTranslatedText: t } = usePageTranslation(PAGE_TEXTS)
  const { user, updateProfile, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
      return
    }
    // If they already have bank details, they might want to skip or we can let them see this once
    if (user?.bankDetails?.accountNumber) {
        // navigate('/dashboard', { replace: true })
    }
  }, [user, navigate, isAuthenticated])

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      aadharNo: user?.aadharNo || '',
      panNo: user?.panNo || '',
      bankAccNo: user?.bankDetails?.accountNumber || '',
      bankIfsc: user?.bankDetails?.ifsc || '',
      bankName: user?.bankDetails?.bankName || '',
    }
  })

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const formattedData = {
        aadharNo: data.aadharNo,
        panNo: data.panNo,
        bankDetails: {
          accountName: user?.name,
          accountNumber: data.bankAccNo,
          ifsc: data.bankIfsc?.toUpperCase(),
          bankName: data.bankName
        }
      }
      const res = await updateProfile(formattedData)
      if (res.success) {
        navigate('/dashboard', { replace: true })
      } else {
        alert(res.message || t('Update failed'))
      }
    } catch (error) {
      alert(t('Something went wrong. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fadeIn" style={{ maxWidth: 500, margin: '0 auto', padding: 0 }}>
      <div style={{ textAlign: 'center', marginBottom: 24, position: 'relative' }}>
        {/* Back Button */}
        <button 
          onClick={() => navigate('/subscription')}
          style={{
            position: 'absolute', left: 0, top: 10, width: 36, height: 36,
            borderRadius: 12, background: 'white', border: '1px solid #F1F5F9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            color: '#64748B'
          }}
        >
          <ArrowRight size={18} style={{ transform: 'rotate(180deg)' }} />
        </button>

        <div style={{ width: 60, height: 60, borderRadius: 18, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
          <img src={logo} alt="Logo" style={{ width: '70%', height: '70%', objectFit: 'contain' }} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0F172A', marginBottom: 4 }}>{t('Complete Your Profile')}</h2>
        <p style={{ fontSize: '0.875rem', color: '#64748B' }}>{t('Add your bank and KYC details for payments')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card" style={{ padding: '24px', borderRadius: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 4, height: 12, background: '#7C3AED', borderRadius: 2 }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 850, color: '#1E293B', textTransform: 'uppercase' }}>{t('KYC & Bank Details')}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 4 }}>
            <Field label={t('Aadhar Number')} error={errors.aadharNo} required>
                <div className="input-group">
                <span className="input-prefix"><Shield size={14} /></span>
                <input {...register('aadharNo', { 
                    required: t('Aadhar No is required'),
                    pattern: { value: /^[0-9]{12}$/, message: t('Invalid Aadhar (12 digits)') }
                })} 
                onInput={(e) => e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 12)}
                placeholder="1234 5678 9012" className="form-input" style={{ borderRadius: 12, height: 44 }} />
                </div>
            </Field>

            <Field label={t('PAN Number')} error={errors.panNo} required>
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

            <Field label={t('Bank Account No')} error={errors.bankAccNo} required>
                <div className="input-group">
                <span className="input-prefix"><CreditCard size={14} /></span>
                <input {...register('bankAccNo', { 
                    required: t('Account no is required'),
                    pattern: { value: /^[0-9]{9,18}$/, message: t('Invalid Account Number') }
                })} 
                onInput={(e) => e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 18)}
                placeholder={t('Account Number')} className="form-input" style={{ borderRadius: 12, height: 44 }} />
                </div>
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label={t('IFSC Code')} error={errors.bankIfsc} required>
                    <div className="input-group">
                    <span className="input-prefix"><Building2 size={14} /></span>
                    <input {...register('bankIfsc', { 
                        required: t('IFSC is required'),
                        pattern: { value: /^[A-Z]{4}0[A-Z0-9]{6}$/i, message: t('Invalid IFSC') }
                    })} 
                    onInput={(e) => e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11)}
                    placeholder={t('Bank IFSC')} className="form-input" style={{ borderRadius: 12, height: 44 }} />
                    </div>
                </Field>

                <Field label={t('Bank Name')} error={errors.bankName} required>
                    <div className="input-group">
                    <span className="input-prefix"><Building2 size={14} /></span>
                    <input {...register('bankName', { 
                      required: t('Bank name is required'),
                      pattern: { value: /^[a-zA-Z\s.]+$/, message: t('Only letters are allowed') }
                    })} 
                    onInput={(e) => e.target.value = e.target.value.replace(/[^a-zA-Z\s.]/g, '').replace(/\b\w/g, c => c.toUpperCase())}
                    placeholder={t('e.g. SBI')} className="form-input" style={{ borderRadius: 12, height: 44 }} />
                    </div>
                </Field>
            </div>
        </div>

        <button 
          type="submit" 
          className="btn btn-primary btn-full" 
          disabled={loading}
          style={{ height: 50, borderRadius: 16, marginTop: 12, fontWeight: 800, fontSize: '0.9375rem' }}
        >
          {loading ? <Loader2 size={18} className="spin" /> : <>{t('Finish Setup')} <ArrowRight size={18} /></>}
        </button>

        <button 
          type="button" 
          onClick={() => navigate('/subscription')}
          className="btn btn-ghost btn-full" 
          style={{ height: 50, borderRadius: 16, marginTop: 10, fontWeight: 700, fontSize: '0.875rem' }}
        >
          {t('Skip for now')}
        </button>
      </form>

      <style>{`
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
