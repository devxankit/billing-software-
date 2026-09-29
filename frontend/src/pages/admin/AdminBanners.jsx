import React, { useState, useEffect } from 'react'
import {
  Image, Plus, Trash2, Save, ExternalLink, 
  Info, Loader2, CheckCircle2, Layout, AlertCircle
} from 'lucide-react'
import { apiClient } from '../../api/apiClient'

export default function AdminBanners() {
  const [banners, setBanners] = useState([
    { id: '1', title: 'Insurance Service', subtitle: 'Secure your fleet with 20+ insurers starting at ₹2094/yr', link: '/insurance', badge: 'NEW', active: true },
    { id: '2', title: 'GPS Tracking', subtitle: 'Real-time tracking for your entire fleet with live alerts', link: '/gps', badge: 'POPULAR', active: false },
  ])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(null) // ID of banner being uploaded
  const [success, setSuccess] = useState(false)
  const accentColor = '#7C3AED'

  useEffect(() => {
    fetchBanners()
  }, [])

  const fetchBanners = async () => {
    try {
      const res = await apiClient.get('/system/banners')
      if (res.data.success && res.data.banners?.length > 0) {
        setBanners(res.data.banners)
      }
    } catch (e) {
      console.error('Failed to fetch banners:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiClient.post('/system/banners', { banners })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (e) {
      alert('Failed to save banners')
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (id, file) => {
    if (!file) return
    setUploading(id)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await apiClient.post('/uploads/single', formData)
      if (res.data.success) {
        updateBanner(id, 'imageUrl', res.data.url)
      }
    } catch (e) {
      alert('Failed to upload image')
    } finally {
      setUploading(null)
    }
  }

  const addBanner = () => {
    const newBanner = {
      id: Date.now().toString(),
      title: 'New Banner',
      subtitle: 'Banner description here',
      link: '#',
      badge: '',
      targetApp: 'both',
      active: true
    }
    setBanners([...banners, newBanner])
  }

  const updateBanner = (id, field, value) => {
    setBanners(banners.map(b => b.id === id ? { ...b, [field]: value } : b))
  }

  const removeBanner = (id) => {
    setBanners(banners.filter(b => b.id !== id))
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Loader2 className="animate-spin" size={32} color={accentColor} />
    </div>
  )

  return (
    <div className="animate-fadeIn" style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0F172A', margin: 0 }}>Dashboard Banners</h1>
          <p style={{ color: '#64748B', fontSize: '0.9rem', marginTop: 4 }}>Manage promotional banners shown on the Transport Dashboard</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
           <button 
             onClick={addBanner} 
             className="btn btn-ghost"
             style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: '#475569' }}
           >
             <Plus size={18} /> Add New
           </button>
           <button 
             onClick={handleSave} 
             className="btn btn-primary" 
             disabled={saving}
             style={{ background: accentColor, borderColor: accentColor, minWidth: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
           >
             {saving ? <Loader2 size={18} className="animate-spin" /> : success ? <CheckCircle2 size={18} /> : <Save size={18} />}
             {saving ? 'Saving...' : success ? 'Saved!' : 'Save Changes'}
           </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {banners.map((banner, index) => (
          <div key={banner.id} className="card" style={{ padding: 24, border: banner.active ? `1px solid ${accentColor}30` : '1px solid var(--border)', background: banner.active ? 'white' : '#F8FAFC' }}>
            <div style={{ display: 'flex', gap: 24 }}>
              {/* Preview */}
              <div style={{ width: 300, flexShrink: 0 }}>
                <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>Preview</p>
                <div style={{ 
                  padding: '16px 20px', borderRadius: 20, background: 'white', 
                  border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
                  display: 'flex', alignItems: 'center', gap: 14, opacity: banner.active ? 1 : 0.5
                }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: '#F5F3FF', color: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {banner.imageUrl ? (
                      <img src={banner.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="B" />
                    ) : (
                      <AlertCircle size={22} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 900, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 8 }}>
                      {banner.title || 'Untitled Banner'}
                      {banner.badge && (
                        <span style={{ fontSize: '0.6rem', fontWeight: 900, background: '#F3811E', color: 'white', padding: '1px 6px', borderRadius: 6 }}>{banner.badge}</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: 2, fontWeight: 500 }}>{banner.subtitle || 'No description provided'}</div>
                  </div>
                </div>
              </div>

              {/* Edit Form */}
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Banner Title</label>
                  <input 
                    className="form-input" 
                    value={banner.title} 
                    onChange={e => updateBanner(banner.id, 'title', e.target.value)} 
                    placeholder="e.g., Insurance Service"
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Description / Subtitle</label>
                  <input 
                    className="form-input" 
                    value={banner.subtitle} 
                    onChange={e => updateBanner(banner.id, 'subtitle', e.target.value)} 
                    placeholder="e.g., Secure your fleet starting at ₹2094/yr"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Badge Text (Optional)</label>
                  <input 
                    className="form-input" 
                    value={banner.badge} 
                    onChange={e => updateBanner(banner.id, 'badge', e.target.value)} 
                    placeholder="e.g., NEW, HOT, OFF"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Target Application</label>
                  <select 
                    className="form-input" 
                    value={banner.targetApp || 'both'} 
                    onChange={e => updateBanner(banner.id, 'targetApp', e.target.value)}
                  >
                    <option value="both">Both (Transport & Garage)</option>
                    <option value="transport">Transport App Only</option>
                    <option value="garage">Garage App Only</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Action Link / Target URL (for Get Started button)</label>
                  <input 
                    className="form-input" 
                    value={banner.link || ''} 
                    onChange={e => updateBanner(banner.id, 'link', e.target.value)} 
                    placeholder="e.g., /insurance, /transport/trips, or https://example.com"
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                    Banner Image
                    {banner.imageUrl && <span style={{ color: '#10B981', fontWeight: 800 }}>✓ Uploaded</span>}
                  </label>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input 
                      type="file" 
                      id={`file-${banner.id}`} 
                      hidden 
                      accept="image/*"
                      onChange={e => handleImageUpload(banner.id, e.target.files[0])}
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
                    <label 
                      htmlFor={`file-${banner.id}`}
                      className="btn btn-sm btn-ghost"
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 40, border: '1.5px dashed #E2E8F0', cursor: 'pointer' }}
                    >
                      {uploading === banner.id ? <Loader2 size={16} className="animate-spin" /> : <Image size={16} />}
                      {uploading === banner.id ? 'Uploading...' : 'Choose Image'}
                    </label>
                    {banner.imageUrl && (
                      <button 
                        onClick={() => updateBanner(banner.id, 'imageUrl', null)}
                        className="btn btn-sm" 
                        style={{ height: 40, background: '#F8FAFC', border: '1px solid #E2E8F0' }}
                      >
                        <Trash2 size={16} color="#DC2626" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ width: 100, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-end' }}>
                 <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 0 }}>Status</p>
                 <button 
                   onClick={() => updateBanner(banner.id, 'active', !banner.active)}
                   style={{ 
                     width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                     background: banner.active ? accentColor : '#E2E8F0',
                     position: 'relative', transition: '0.3s'
                   }}
                 >
                   <div style={{ 
                     width: 18, height: 18, borderRadius: '50%', background: 'white',
                     position: 'absolute', top: 3, left: banner.active ? 23 : 3, transition: '0.3s',
                     boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                   }} />
                 </button>
                 <button 
                   onClick={() => removeBanner(banner.id)}
                   style={{ 
                     marginTop: 'auto', width: 36, height: 36, borderRadius: 10, border: 'none', 
                     background: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', 
                     justifyContent: 'center', cursor: 'pointer' 
                   }}
                 >
                   <Trash2 size={18} />
                 </button>
              </div>
            </div>
          </div>
        ))}

        {banners.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', background: '#F8FAFC', borderRadius: 24, border: '2px dashed #E2E8F0' }}>
            <Image size={48} color="#94A3B8" style={{ marginBottom: 16 }} />
            <h3 style={{ margin: 0, fontWeight: 800, color: '#475569' }}>No Banners Configured</h3>
            <p style={{ color: '#94A3B8', fontSize: '0.875rem', marginTop: 4 }}>Add your first dashboard banner to get started</p>
            <button onClick={addBanner} className="btn btn-primary" style={{ marginTop: 20, background: accentColor, borderColor: accentColor }}><Plus size={18} /> Add Banner</button>
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
      `}</style>
    </div>
  )
}
