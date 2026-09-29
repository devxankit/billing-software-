import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../context/AuthContext'
import { apiClient } from '../../api/apiClient'
import {
  ArrowLeft, User, Mail, Phone, Lock, Eye, EyeOff,
  CheckCircle2, Loader2, Shield, Edit3, KeyRound
} from 'lucide-react'

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

export default function AdminProfile() {
  const { user, updateProfile } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('edit') // 'view' | 'edit' | 'password' — opens directly on edit
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [errMsg, setErrMsg] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    }
  })

  // Pre-fill the edit form once the user profile is available
  useEffect(() => {
    reset({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' })
  }, [user, reset])

  const { register: regPwd, handleSubmit: handlePwd, formState: { errors: pwdErrors }, watch: watchPwd, reset: resetPwd } = useForm()

  const onEditSubmit = async (data) => {
    setSaving(true)
    setSuccess('')
    setErrMsg('')
    try {
      const res = await updateProfile({ name: data.name, email: data.email })
      if (res?.success) {
        setSuccess('Profile updated successfully!')
      } else {
        setErrMsg(res?.message || 'Update failed.')
      }
    } catch (e) {
      setErrMsg('Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  const onPasswordSubmit = async (data) => {
    setSaving(true)
    setSuccess('')
    setErrMsg('')
    try {
      const res = await apiClient.post('/admin/change-password', {
        oldPassword: data.oldPassword,
        newPassword: data.newPassword,
      })
      if (res.data?.success) {
        setSuccess('Password changed successfully!')
        resetPwd()
        setTab('edit')
      } else {
        setErrMsg(res.data?.message || 'Failed to change password.')
      }
    } catch (e) {
      setErrMsg(e.response?.data?.message || 'Incorrect current password or server error.')
    } finally {
      setSaving(false)
    }
  }

  const initials = (user?.name || user?.email || 'AD')
    .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 0', minHeight: 'calc(100dvh - 160px)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => navigate('/admin/dashboard')}
          style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: 'rgba(0,0,0,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: '1.125rem', color: '#0F0D2E', margin: 0 }}>Admin Profile</h2>
          <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: 0 }}>View and manage admin account</p>
        </div>
      </div>

      {/* Avatar Card */}
      <div style={{
        background: 'linear-gradient(135deg, #1E1B4B, #4C1D95)',
        borderRadius: 20, padding: '28px 24px', marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 18, position: 'relative'
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.5rem', fontWeight: 900, color: 'white', flexShrink: 0
        }}>
          {initials}
        </div>
        <div>
          <div style={{ color: 'white', fontWeight: 800, fontSize: '1.05rem' }}>{user?.name || 'Admin'}</div>
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem', marginTop: 2 }}>{user?.email || user?.phone || '—'}</div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'rgba(255,255,255,0.15)', padding: '3px 10px', borderRadius: 99,
            marginTop: 8
          }}>
            <Shield size={11} color="white" />
            <span style={{ color: 'white', fontSize: '0.7rem', fontWeight: 700 }}>Super Admin</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { key: 'view', label: 'Details', icon: User },
          { key: 'edit', label: 'Edit Profile', icon: Edit3 },
          { key: 'password', label: 'Change Password', icon: KeyRound },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setSuccess(''); setErrMsg('') }}
            style={{
              flex: 1, padding: '9px 4px', borderRadius: 12, border: 'none',
              background: tab === key ? '#7C3AED' : '#F1F5F9',
              color: tab === key ? 'white' : '#64748B',
              fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              transition: 'all 0.15s'
            }}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* Feedback */}
      {success && (
        <div style={{ background: '#DCFCE7', color: '#16A34A', padding: '12px 16px', borderRadius: 12, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', fontWeight: 600 }}>
          <CheckCircle2 size={16} /> {success}
        </div>
      )}
      {errMsg && (
        <div style={{ background: '#FEE2E2', color: '#DC2626', padding: '12px 16px', borderRadius: 12, marginBottom: 14, fontSize: '0.85rem', fontWeight: 600 }}>
          {errMsg}
        </div>
      )}

      {/* ─── View Details ─── */}
      {tab === 'view' && (
        <div style={{ background: 'white', borderRadius: 20, padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)' }}>
          {[
            { icon: User, label: 'Full Name', value: user?.name || '—' },
            { icon: Mail, label: 'Email Address', value: user?.email || '—' },
            { icon: Shield, label: 'Role', value: 'Super Admin' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '1px solid #F8FAFC' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={16} color="#7C3AED" />
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F0D2E', marginTop: 2 }}>{value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Edit Profile ─── */}
      {tab === 'edit' && (
        <div style={{ background: 'white', borderRadius: 20, padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)' }}>
          <form onSubmit={handleSubmit(onEditSubmit)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Full Name" error={errors.name} required>
                <div className="input-group">
                  <span className="input-prefix"><User size={15} /></span>
                  <input
                    {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Minimum 2 characters' } })}
                    placeholder="Admin Name"
                    className={`form-input ${errors.name ? 'error' : ''}`}
                  />
                </div>
              </Field>
              <Field label="Email Address" error={errors.email}>
                <div className="input-group">
                  <span className="input-prefix"><Mail size={15} /></span>
                  <input
                    {...register('email', {
                      pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Invalid email address' }
                    })}
                    placeholder="admin@example.com"
                    className={`form-input ${errors.email ? 'error' : ''}`}
                  />
                </div>
              </Field>
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={saving}
              style={{ marginTop: 20, height: 48 }}
            >
              {saving ? <><Loader2 size={17} className="spin" /> Saving…</> : <><CheckCircle2 size={17} /> Save Changes</>}
            </button>
          </form>
        </div>
      )}

      {/* ─── Change Password ─── */}
      {tab === 'password' && (
        <div style={{ background: 'white', borderRadius: 20, padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)' }}>
          <form onSubmit={handlePwd(onPasswordSubmit)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Current Password" error={pwdErrors.oldPassword} required>
                <div className="input-group" style={{ position: 'relative' }}>
                  <span className="input-prefix"><Lock size={15} /></span>
                  <input
                    {...regPwd('oldPassword', { required: 'Current password is required' })}
                    type={showOld ? 'text' : 'password'}
                    placeholder="Enter current password"
                    className={`form-input ${pwdErrors.oldPassword ? 'error' : ''}`}
                    style={{ paddingRight: 40 }}
                  />
                  <button type="button" onClick={() => setShowOld(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 0 }}>
                    {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>
              <Field label="New Password" error={pwdErrors.newPassword} required>
                <div className="input-group" style={{ position: 'relative' }}>
                  <span className="input-prefix"><Lock size={15} /></span>
                  <input
                    {...regPwd('newPassword', {
                      required: 'New password is required',
                      minLength: { value: 6, message: 'Minimum 6 characters' }
                    })}
                    type={showNew ? 'text' : 'password'}
                    placeholder="Enter new password"
                    className={`form-input ${pwdErrors.newPassword ? 'error' : ''}`}
                    style={{ paddingRight: 40 }}
                  />
                  <button type="button" onClick={() => setShowNew(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 0 }}>
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>
              <Field label="Confirm Password" error={pwdErrors.confirmPassword} required>
                <div className="input-group" style={{ position: 'relative' }}>
                  <span className="input-prefix"><Lock size={15} /></span>
                  <input
                    {...regPwd('confirmPassword', {
                      required: 'Please confirm password',
                      validate: v => v === watchPwd('newPassword') || 'Passwords do not match'
                    })}
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Re-enter new password"
                    className={`form-input ${pwdErrors.confirmPassword ? 'error' : ''}`}
                    style={{ paddingRight: 40 }}
                  />
                  <button type="button" onClick={() => setShowConfirm(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 0 }}>
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={saving}
              style={{ marginTop: 20, height: 48 }}
            >
              {saving ? <><Loader2 size={17} className="spin" /> Updating…</> : <><KeyRound size={17} /> Update Password</>}
            </button>
          </form>
        </div>
      )}
      <style>{`.spin { animation: spin 0.8s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
