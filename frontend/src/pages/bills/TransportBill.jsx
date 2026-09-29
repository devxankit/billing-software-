import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import {
  Truck, MapPin, User, Package, Plus, Trash2,
  CheckCircle2, Loader2, ArrowLeft, ChevronDown, FileText, Calendar, CreditCard
} from 'lucide-react'
import { useBills } from '../../context/BillContext'
import { useParties } from '../../context/PartyContext'
import { useVehicles } from '../../context/VehicleContext'
import { getTrips } from '../../api/transportApi'
import { usePageTranslation } from '../../hooks/usePageTranslation'
import dayjs from 'dayjs'

// Show a stored 0 as an empty field so a typed number replaces it instead of appending to "0"
const blankZero = (v) => (parseFloat(v) ? String(v) : '')

function Field({ label, error, children, required, style }) {
  return (
    <div className="form-group" style={style}>
      <label className="form-label">
        {label}{required && <span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {error && <span className="form-error">{error.message}</span>}
    </div>
  )
}

function SectionCard({ icon: Icon, iconBg, iconColor, title, children }) {
  return (
    <div style={{
      background: 'white', borderRadius: 20, padding: '18px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.05)', marginBottom: 14,
      border: '1px solid rgba(0,0,0,0.04)',
      width: '100%', boxSizing: 'border-box', overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={iconColor} />
        </div>
        <h3 style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0F0D2E', margin: 0 }}>{title}</h3>
      </div>
      {children}
    </div>
  )
}

export default function TransportBill({ initialData }) {
  const { addBill, updateBill } = useBills()
  const { parties } = useParties()
  const { vehicles } = useVehicles()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [savedBill, setSavedBill] = useState(null)
  const isSubmitting = useRef(false)
  
  const [showHalt, setShowHalt] = useState(initialData?.items?.some(it => (parseFloat(it.haltAmount) || 0) > 0) || false)
  const isEdit = !!initialData?._id

  // Batch Translation
  const { getTranslatedText } = usePageTranslation([
    'Transport Bill', 'Consolidated Billing Summary', 'Billed To (Party)', 'Select Party (Quick Fill)', 
    '— Select party —', 'Business Name', 'Phone', 'Email', 'Address', 'City', 'State', 'Pincode', 
    'GSTIN', 'PAN', 'Change Party', 'Billing Summary (Trips / Chalans)', 'Invoice Items', 'Include Hold', 
    'Trip', 'Remove', 'Date', 'From (Origin)', 'To (Destination)', 'Challan No. / Bill No.', 'Vehicle No.', 
    'Amount (₹)', 'Hold Days', 'Hold Charge (₹)', 'Hamali / Return Charge (₹)', 'Add Another Trip', 
    'Taxes & Totals', 'GST %', 'GST Type', 'Subtotal', 'GST Amount', 'Total', 'Cancel', 'Update Draft', 
    'Save as Draft', 'Updating...', 'Generating...', 'Update & Generate', 'Generate Bill', 
    'Bill Created!', 'View Invoice', 'Create Another', 'Required', 'Invalid PAN (e.g. ABCDE1234F)',
    'Origin', 'Destination', 'e.g. 5642', 'Party Name', 'Party Address', 'PAN Number',
    'No parties found', '+ Add New Party',
    ...parties.map(p => p.name)
  ])

  const { register, handleSubmit, watch, setValue, control, formState: { errors }, reset } = useForm({
    defaultValues: {
      billDate: dayjs(initialData?.billingDate || initialData?.billDate).format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD'),
      partyId: initialData?.party?._id || initialData?.party || '',
      billedToName: initialData?.billedToName || '',
      billedToPhone: initialData?.billedToPhone || '',
      billedToEmail: initialData?.billedToEmail || '',
      billedToAddress: initialData?.billedToAddress || '',
      billedToCity: initialData?.billedToCity || '',
      billedToState: initialData?.billedToState || '',
      billedToPincode: initialData?.billedToPincode || '',
      billedToGstin: initialData?.billedToGstin || '',
      billedToPan: initialData?.billedToPan || '',
      items: initialData?.items?.map(it => ({
        ...it,
        date: dayjs(it.date).format('YYYY-MM-DD'),
        amount: blankZero(it.amount),
        tempoNo: it.tempoNo || '',
        haltDays: blankZero(it.haltDays),
        haltAmount: blankZero(it.haltAmount),
        extraAmount: blankZero(it.extraAmount),
        returnAmount: blankZero(it.returnAmount),
        gstPercent: it.gstPercent?.toString() || '0',
        gstAmount: it.gstAmount?.toString() || '0'
      })) || [
        { date: dayjs().format('YYYY-MM-DD'), companyFrom: '', companyTo: '', chalanNo: '', amount: '', tempoNo: '', haltDays: '', haltAmount: '', extraAmount: '', returnAmount: '', gstPercent: '0', gstAmount: '0' }
      ],
      extraCharges: initialData?.extraCharges?.toString() || '0',
      gstPercent: initialData?.gstPercent?.toString() || '0',
      gstType: initialData?.gstType || 'CGST+SGST',
      notes: initialData?.notes || 'Grateful for Moving What Matters to You!',
    }
  })

  // Load unsaved bill details if redirected back from subscription page
  useEffect(() => {
    try {
      const unsaved = sessionStorage.getItem('unsaved_transport_bill')
      if (unsaved) {
        const data = JSON.parse(unsaved)
        reset({
          billDate: dayjs(data.billingDate || data.billDate).format('YYYY-MM-DD'),
          partyId: data.party || data.partyId || '',
          billedToName: data.billedToName || '',
          billedToPhone: data.billedToPhone || '',
          billedToEmail: data.billedToEmail || '',
          billedToAddress: data.billedToAddress || '',
          billedToCity: data.billedToCity || '',
          billedToState: data.billedToState || '',
          billedToPincode: data.billedToPincode || '',
          billedToGstin: data.billedToGstin || '',
          billedToPan: data.billedToPan || '',
          items: data.items?.map(it => ({
            ...it,
            date: dayjs(it.date).format('YYYY-MM-DD'),
            amount: blankZero(it.amount),
            tempoNo: it.tempoNo || '',
            haltDays: blankZero(it.haltDays),
            haltAmount: blankZero(it.haltAmount),
            extraAmount: blankZero(it.extraAmount),
            returnAmount: blankZero(it.returnAmount),
            gstPercent: it.gstPercent?.toString() || '0',
            gstAmount: it.gstAmount?.toString() || '0'
          })) || [],
          extraCharges: data.extraCharges?.toString() || '0',
          gstPercent: data.gstPercent?.toString() || '0',
          gstType: data.gstType || 'CGST+SGST',
          notes: data.notes || '',
        })
        sessionStorage.removeItem('unsaved_transport_bill')
      }
    } catch (e) {
      console.error('Failed to load unsaved transport bill:', e)
    }
  }, [reset])

  useEffect(() => {
    if (initialData?._id) {
      reset({
        billDate: dayjs(initialData.billingDate || initialData.billDate).format('YYYY-MM-DD'),
        partyId: initialData.party?._id || initialData.party || '',
        billedToName: initialData.billedToName || '',
        billedToPhone: initialData.billedToPhone || '',
        billedToEmail: initialData.billedToEmail || '',
        billedToAddress: initialData.billedToAddress || '',
        billedToCity: initialData.billedToCity || '',
        billedToState: initialData.billedToState || '',
        billedToPincode: initialData.billedToPincode || '',
        billedToGstin: initialData.billedToGstin || '',
        billedToPan: initialData.billedToPan || '',
        items: initialData.items?.map(it => ({
          ...it,
          date: dayjs(it.date).format('YYYY-MM-DD'),
          amount: blankZero(it.amount),
          tempoNo: it.tempoNo || '',
          haltDays: blankZero(it.haltDays),
          haltAmount: blankZero(it.haltAmount),
          extraAmount: blankZero(it.extraAmount),
          returnAmount: blankZero(it.returnAmount),
          gstPercent: it.gstPercent?.toString() || '0',
          gstAmount: it.gstAmount?.toString() || '0'
        })) || [{ date: dayjs().format('YYYY-MM-DD'), companyFrom: '', companyTo: '', chalanNo: '', amount: '', tempoNo: '', haltDays: '', haltAmount: '', extraAmount: '', returnAmount: '', gstPercent: '0', gstAmount: '0' }],
        extraCharges: initialData.extraCharges?.toString() || '0',
        gstPercent: initialData.gstPercent?.toString() || '0',
        gstType: initialData.gstType || 'CGST+SGST',
        paymentMode: initialData.paymentMode || 'topay',
        notes: initialData.notes || 'Grateful for Moving What Matters to You!',
      })
    }
  }, [initialData, reset])

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  })

  const watchedItems = watch('items')
  const extraCharges    = watch('extraCharges')
  const gstPercent      = watch('gstPercent')
  const partyId = watch('partyId')
  const prevPartyId = useRef(initialData?.party?._id || initialData?.party || '')

  useEffect(() => {
    if (!partyId) return
    if (partyId === prevPartyId.current) return
    const p = parties.find(x => (x._id || x.id) === partyId)
    if (p) {
      setValue('billedToName', p.name || '')
      setValue('billedToPhone', p.phone || '')
      setValue('billedToEmail', p.email || '')
      setValue('billedToAddress', p.address || '')
      setValue('billedToCity', p.city || '')
      setValue('billedToState', p.state || '')
      setValue('billedToPincode', p.pincode || '')
      setValue('billedToGstin', p.gstin || '')
      setValue('billedToPan', p.pan || '')
      prevPartyId.current = partyId
    }
  }, [partyId, parties, setValue, initialData])

  const itemsTotal = (watchedItems || []).reduce((sum, item) => {
    return sum + (parseFloat(item.amount) || 0) + (parseFloat(item.extraAmount) || 0) + (parseFloat(item.haltAmount) || 0) + (parseFloat(item.returnAmount) || 0)
  }, 0)

  const itemsGstTotal = (watchedItems || []).reduce((sum, item) => {
    return sum + (parseFloat(item.gstAmount) || 0)
  }, 0)
  
  const subtotal = itemsTotal
  const calculatedGst = subtotal * (parseFloat(gstPercent) || 0) / 100
  const finalGstAmount = itemsGstTotal || calculatedGst
  const grandTotal = subtotal + finalGstAmount

  const onSubmit = async (data, statusArg = 'unpaid') => {
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    setSaving(true)
    // Declared outside try so the catch can stash it when redirecting to the subscription page
    let payload
    try {
      const finalStatus = statusArg === 'draft' ? 'draft' : 'unpaid';
      payload = {
        billedToName:    data.billedToName,
        billedToPhone:   data.billedToPhone,
        billedToEmail:   data.billedToEmail,
        billedToAddress: data.billedToAddress,
        billedToCity:    data.billedToCity,
        billedToState:   data.billedToState,
        billedToPincode: data.billedToPincode,
        billedToGstin:   data.billedToGstin,
        billedToPan:     data.billedToPan,
        billType:    'transport',
        billingDate: data.billDate,
        notes:       data.notes,
        gstType:     data.gstType || 'CGST+SGST',
        items: (data.items || []).map(it => ({
          date:        it.date,
          companyFrom: it.companyFrom,
          companyTo:   it.companyTo,
          chalanNo:    it.chalanNo,
          tempoNo:     it.tempoNo,
          haltDays:    parseFloat(it.haltDays) || 0,
          haltAmount:  parseFloat(it.haltAmount) || 0,
          extraAmount: parseFloat(it.extraAmount) || 0,
          returnAmount:parseFloat(it.returnAmount) || 0,
          gstPercent:  parseFloat(it.gstPercent) || 0,
          gstAmount:   parseFloat(it.gstAmount) || 0,
          amount:      parseFloat(it.amount) || 0,
          tripIds:     it.tripIds || [],
        })),
        extraCharges:    0,
        gstPercent: parseFloat(data.gstPercent) || 0,
        gstAmount: finalGstAmount,
        subTotal:   subtotal,
        grandTotal,
        status: finalStatus,
        trips:  (data.items || []).flatMap(it => it.tripIds || []),
      }
      if (data.partyId && data.partyId.trim() !== '') {
        payload.party = data.partyId
        payload.partyId = data.partyId
      }
      let bill;
      if (isEdit) bill = await updateBill(initialData._id, payload)
      else bill = await addBill(payload)
      setSavedBill(bill)
    } catch (e) {
      if (e.response?.status === 403 && e.response?.data?.requiresSubscription) {
        sessionStorage.setItem('unsaved_transport_bill', JSON.stringify(payload))
        navigate('/subscription', { state: { fromBill: true } })
      } else {
        alert('Failed to save bill: ' + (e?.response?.data?.message || e.message || 'Please try again.'))
      }
    } finally {
      setSaving(false)
      isSubmitting.current = false;
    }
  }

  if (savedBill) return (
    <div className="page-wrapper animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16, textAlign: 'center', padding: 24 }}>
      <div style={{ width: 68, height: 68, borderRadius: 20, background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeInUp 0.3s ease both' }}>
        <CheckCircle2 size={36} color="#16A34A" />
      </div>
      <h2 style={{ fontWeight: 800, color: '#0F0D2E' }}>{getTranslatedText('Bill Created!')}</h2>
      <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>Invoice #{savedBill.billNumber || 'Draft'} generated and saved.</p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
        <button className="btn btn-primary" onClick={() => navigate(`/bills/${savedBill._id || savedBill.id}`)}>
          <FileText size={16} /> {getTranslatedText('View Invoice')}
        </button>
        <button className="btn" onClick={() => { setSavedBill(null); reset(); navigate('/transport/bills/new'); }} style={{ background: '#0F0D2E', color: '#FFFFFF', border: 'none', fontWeight: 800 }}>
          <Plus size={16} /> {getTranslatedText('Create Another')}
        </button>
      </div>
    </div>
  )

  return (
    <div className="page-wrapper animate-fadeIn" style={{ maxWidth: 800, margin: '0 auto', width: '100%', boxSizing: 'border-box', overflowX: 'hidden', paddingBottom: 40 }}>
      {/* Header — fixed on mobile so only the form scrolls */}
      <div className="bill-form-header" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: 20, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <button onClick={() => isEdit ? navigate(`/bills/${initialData._id}`) : navigate('/transport/bills')} style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: 'rgba(0,0,0,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', flexShrink: 0 }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0F0D2E', margin: 0 }}>{getTranslatedText('Transport Bill')}</h2>
            <p style={{ fontSize: '0.7rem', color: '#6B7280', margin: 0, lineHeight: 1.2 }}>{getTranslatedText('Consolidated Billing Summary')}</p>
          </div>
        </div>
        <div style={{ flex: '0 1 auto', display: 'flex', justifyContent: 'flex-end', minWidth: 0 }}>
          <input type="date" {...register('billDate')} className="form-input" style={{ fontSize: '0.85rem', padding: '8px 12px', borderRadius: 12, background: 'white', border: '1.5px solid #E2E8F0', width: '100%', maxWidth: '150px' }} />
        </div>
      </div>
      <div className="bill-form-header-spacer" />

      <form onSubmit={handleSubmit(onSubmit)} onFocus={e => { if (e.target.type === 'number') e.target.select() }}>
        {/* Billed To */}
        <SectionCard icon={User} iconBg="#EDE9FE" iconColor="#7C3AED" title={getTranslatedText('Billed To (Party)')}>
          {!partyId ? (
            <div className="grid grid-cols-1 gap-4" style={{ width: '100%', minWidth: 0 }}>
              <Field label={getTranslatedText('Select Party (Quick Fill)')}>
                <div style={{ position: 'relative', width: '100%' }}>
                  {parties.length > 0 ? (
                    <>
                      <select {...register('partyId')} className="form-input" style={{ paddingRight: 36, textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        <option value="">{getTranslatedText('— Select party —')}</option>
                        {parties.map(p => <option key={p.id} value={p.id}>{getTranslatedText(p.name)} ({p.phone})</option>)}
                      </select>
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="form-input" style={{ flex: 1, color: '#9CA3AF', background: '#F9FAFB', display: 'flex', alignItems: 'center', fontSize: '0.875rem' }}>
                        {getTranslatedText('No parties found')}
                      </div>
                      <button 
                        type="button" 
                        onClick={() => navigate('/transport/parties/add')}
                        style={{ background: '#EDE9FE', color: '#7C3AED', border: 'none', borderRadius: 10, padding: '10px 14px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        {getTranslatedText('+ Add New Party')}
                      </button>
                    </div>
                  )}
                </div>
              </Field>
              <div className="grid md-grid-cols-2 gap-3" style={{ width: '100%', minWidth: 0 }}>
                <Field label={getTranslatedText('Business Name')} error={errors.billedToName} required>
                  <input 
                    {...register('billedToName', { 
                      required: getTranslatedText('Required'),
                      minLength: { value: 3, message: getTranslatedText('Minimum 3 characters') }
                    })} 
                    placeholder={getTranslatedText('Party Name')} 
                    className={`form-input ${errors.billedToName ? 'error' : ''}`} 
                  />
                </Field>
                <Field label={getTranslatedText('Phone')} error={errors.billedToPhone}>
                  <input {...register('billedToPhone')} placeholder={getTranslatedText('Phone')} className="form-input" />
                </Field>
                <Field label={getTranslatedText('Email')} error={errors.billedToEmail}>
                  <input 
                    {...register('billedToEmail', {
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: getTranslatedText('Invalid email address')
                      }
                    })} 
                    placeholder={getTranslatedText('Email')} 
                    className={`form-input ${errors.billedToEmail ? 'error' : ''}`} 
                  />
                </Field>
                <Field label={getTranslatedText('Address')} error={errors.billedToAddress} required>
                  <input 
                    {...register('billedToAddress', { required: getTranslatedText('Required') })} 
                    placeholder={getTranslatedText('Party Address')} 
                    className={`form-input ${errors.billedToAddress ? 'error' : ''}`} 
                  />
                </Field>
                <Field label={getTranslatedText('City')}>
                  <input 
                    {...register('billedToCity')} 
                    placeholder={getTranslatedText('City')} 
                    className="form-input" 
                    onChange={e => {
                      const val = e.target.value.replace(/[^a-zA-Z\s]/g, '')
                      setValue('billedToCity', val)
                    }}
                  />
                </Field>
                <Field label={getTranslatedText('State')}>
                  <input 
                    {...register('billedToState')} 
                    placeholder={getTranslatedText('State')} 
                    className="form-input" 
                    onChange={e => {
                      const val = e.target.value.replace(/[^a-zA-Z\s]/g, '')
                      setValue('billedToState', val)
                    }}
                  />
                </Field>
                <Field label={getTranslatedText('Pincode')} error={errors.billedToPincode} required>
                  <input 
                    {...register('billedToPincode', { 
                      required: getTranslatedText('Required'),
                      pattern: { value: /^\d{6}$/, message: getTranslatedText('6-digit Pincode') }
                    })} 
                    placeholder={getTranslatedText('Pincode')} 
                    className={`form-input ${errors.billedToPincode ? 'error' : ''}`} 
                    inputMode="numeric"
                    maxLength={6}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                      setValue('billedToPincode', val)
                    }}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label={getTranslatedText('GSTIN')} error={errors.billedToGstin}>
                    <input 
                      {...register('billedToGstin', {
                        pattern: { value: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/, message: getTranslatedText('Invalid GSTIN format') }
                      })} 
                      placeholder="27AAAAA0000A1Z5" 
                      className="form-input" 
                      style={{ textTransform: 'uppercase' }}
                      onChange={e => {
                        const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 15)
                        setValue('billedToGstin', val)
                      }}
                    />
                    <p style={{ margin: '4px 0 0', fontSize: '0.62rem', color: '#94A3B8', fontWeight: 500 }}>
                      Standard 15-digit GSTIN format
                    </p>
                  </Field>
                  <Field label={getTranslatedText('PAN')} error={errors.billedToPan}>
                    <input 
                      {...register('billedToPan', { 
                        pattern: { value: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, message: getTranslatedText('Invalid PAN (e.g. ABCDE1234F)') } 
                      })} 
                      placeholder="ABCDE1234F" 
                      className="form-input" 
                      style={{ textTransform: 'uppercase' }}
                      onChange={e => {
                        const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10)
                        setValue('billedToPan', val)
                      }}
                    />
                    <p style={{ margin: '4px 0 0', fontSize: '0.62rem', color: '#94A3B8', fontWeight: 500 }}>
                      10-digit PAN format
                    </p>
                  </Field>
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-fadeIn" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', padding: '16px', borderRadius: 20, border: '1.5px solid #F1F5F9' }}>
               <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 950, color: '#0F0D2E', marginBottom: 2 }}>{watch('billedToName')}</div>
                  <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 700, lineHeight: 1.4 }}>
                    {watch('billedToPhone') && <div style={{ marginBottom: 2 }}>Mob: {watch('billedToPhone')}</div>}
                    <div>
                      {watch('billedToAddress') && `${watch('billedToAddress')}, `}
                      {watch('billedToCity') || 'No City'}
                      {watch('billedToState') && `, ${watch('billedToState')}`}
                      {watch('billedToPincode') && ` - ${watch('billedToPincode')}`}
                    </div>
                  </div>
               </div>
               <button type="button" onClick={() => setValue('partyId', '')} style={{ background: 'white', color: '#7C3AED', border: '1.5px solid #7C3AED', borderRadius: 12, padding: '8px 16px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}>{getTranslatedText('Change Party')}</button>
            </div>
          )}
        </SectionCard>

        {/* Billing Summary */}
        <SectionCard icon={Truck} iconBg="#FEF3C7" iconColor="#D97706" title={getTranslatedText('Billing Summary (Trips / Chalans)')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, padding: '0 8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748B' }}>{getTranslatedText('Invoice Items')}</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <div onClick={() => setShowHalt(!showHalt)} style={{ width: 34, height: 20, borderRadius: 10, background: showHalt ? '#7C3AED' : '#E2E8F0', position: 'relative', transition: '0.3s' }}>
                <div style={{ width: 14, height: 14, borderRadius: 7, background: 'white', position: 'absolute', top: 3, left: showHalt ? 17 : 3, transition: '0.3s' }} />
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: showHalt ? '#7C3AED' : '#64748B' }}>{getTranslatedText('Include Hold')}</span>
            </label>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {fields.map((field, index) => (
              <div key={field.id} style={{ background: '#F8FAFC', padding: '16px', borderRadius: 20, border: '1.5px solid #F1F5F9', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 8, borderBottom: '1px dashed #E2E8F0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#7C3AED', background: '#EDE9FE', padding: '3px 8px', borderRadius: 6, textTransform: 'uppercase' }}>{getTranslatedText('Trip')} #{index + 1}</span>
                  </div>
                  {fields.length > 1 && (
                    <button type="button" onClick={() => remove(index)} style={{ border: 'none', background: 'transparent', color: '#DC2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 700 }}>
                      <Trash2 size={14} /> {getTranslatedText('Remove')}
                    </button>
                  )}
                </div>

                <div className="responsive-grid" style={{ gap: '12px 16px' }}>
                  <Field label={getTranslatedText('Date')} className="span-2">
                    <div className="input-group">
                      <span className="input-prefix" style={{ left: 12 }}><Calendar size={14} /></span>
                      <input type="date" {...register(`items.${index}.date`)} className="form-input" />
                    </div>
                  </Field>

                  <Field label={getTranslatedText('From (Origin)')}>
                    <div className="input-group">
                      <span className="input-prefix" style={{ left: 12 }}><MapPin size={14} /></span>
                      <input {...register(`items.${index}.companyFrom`)} placeholder={getTranslatedText('Origin')} className="form-input" />
                    </div>
                  </Field>

                  <Field label={getTranslatedText('To (Destination)')}>
                    <div className="input-group">
                      <span className="input-prefix" style={{ left: 12 }}><MapPin size={14} /></span>
                      <input {...register(`items.${index}.companyTo`)} placeholder={getTranslatedText('Destination')} className="form-input" />
                    </div>
                  </Field>

                  <Field label={getTranslatedText('Challan No. / Bill No.')}>
                    <div className="input-group">
                      <span className="input-prefix" style={{ left: 12 }}><FileText size={14} /></span>
                      <input 
                        {...register(`items.${index}.chalanNo`, {
                          pattern: { value: /^[A-Z0-9-,\s]*$/i, message: getTranslatedText('Invalid format') },
                          onChange: e => {
                            setValue(`items.${index}.chalanNo`, e.target.value.toUpperCase().replace(/[^A-Z0-9-,\s]/g, ''), { shouldValidate: true })
                          }
                        })} 
                        placeholder={getTranslatedText('e.g. 5642')} 
                        className={`form-input ${errors.items?.[index]?.chalanNo ? 'error' : ''}`} 
                        style={{ textTransform: 'uppercase' }}
                      />
                    </div>
                  </Field>

                  <Field label={getTranslatedText('Vehicle No.')}>
                    <div className="input-group">
                      <span className="input-prefix" style={{ left: 12 }}><Truck size={14} /></span>
                      <select {...register(`items.${index}.tempoNo`)} className="form-input" style={{ paddingLeft: 30 }}>
                        <option value="">— Select —</option>
                        {vehicles.map(v => <option key={v._id || v.id} value={v.vehicleNumber}>{v.vehicleNumber}</option>)}
                      </select>
                    </div>
                  </Field>

                  <Field label={getTranslatedText('Amount (₹)')}>
                    <div className="input-group">
                      <span className="input-prefix" style={{ left: 14, fontWeight: 800 }}>₹</span>
                      <input type="number" {...register(`items.${index}.amount`)} placeholder="0.00" className="form-input" />
                    </div>
                  </Field>

                  {showHalt && (
                    <div className="responsive-grid span-2" style={{ gap: 12 }}>
                      <Field label={getTranslatedText('Hold Days')}><input type="number" {...register(`items.${index}.haltDays`)} placeholder="0" className="form-input" /></Field>
                      <Field label={getTranslatedText('Hold Charge (₹)')}><div className="input-group"><span className="input-prefix" style={{ left: 14 }}>₹</span><input type="number" {...register(`items.${index}.haltAmount`)} placeholder="0" className="form-input" /></div></Field>
                    </div>
                  )}

                  <Field label={getTranslatedText('Hamali / Return Charge (₹)')} className="span-2">
                    <div className="responsive-grid" style={{ gap: 12 }}>
                      <input type="number" {...register(`items.${index}.extraAmount`)} placeholder="Hamali" className="form-input" />
                      <input type="number" {...register(`items.${index}.returnAmount`)} placeholder="Return" className="form-input" />
                    </div>
                  </Field>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => append({ date: dayjs().format('YYYY-MM-DD'), companyFrom: '', companyTo: '', chalanNo: '', amount: '', tempoNo: '', haltDays: '', haltAmount: '', extraAmount: '', returnAmount: '', gstPercent: '0', gstAmount: '0' })} style={{ marginTop: 12, width: '100%', padding: '12px', borderRadius: 12, border: '2px dashed #E5E7EB', background: '#F9FAFB', fontWeight: 700, fontSize: '0.875rem', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Plus size={18} /> {getTranslatedText('Add Another Trip')}
          </button>
        </SectionCard>

        {/* Taxes & Totals */}
        <SectionCard icon={FileText} iconBg="#DCFCE7" iconColor="#16A34A" title={getTranslatedText('Taxes & Totals')}>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Field label={getTranslatedText('GST %')} style={{ marginBottom: 0 }}>
              <select {...register('gstPercent')} className="form-input">{['0','5','12','18'].map(g => <option key={g} value={g}>{g}%</option>)}</select>
            </Field>
            <Field label={getTranslatedText('GST Type')} style={{ marginBottom: 0 }}>
              <select {...register('gstType')} className="form-input" style={{ fontSize: '0.8rem', paddingLeft: 8, paddingRight: 24 }}>{['CGST+SGST','IGST'].map(g => <option key={g}>{g}</option>)}</select>
            </Field>
          </div>
          <div style={{ background: '#1E1B4B', borderRadius: 16, padding: '16px', color: 'white', marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.875rem', opacity: 0.7 }}><span>{getTranslatedText('Subtotal')}</span><span>₹{subtotal.toFixed(2)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: '0.875rem', opacity: 0.7 }}><span>{getTranslatedText('GST Amount')}</span><span>₹{finalGstAmount.toFixed(2)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 10, fontWeight: 800, fontSize: '1.25rem' }}><span>{getTranslatedText('Total')}</span><span>₹{grandTotal.toFixed(2)}</span></div>
          </div>
        </SectionCard>

        {/* Submit */}
        <div className="btn-group" style={{ marginBottom: 40, gap: 12, display: 'flex', flexWrap: 'wrap' }}>
          <button type="button" className="btn" onClick={() => isEdit ? navigate(`/bills/${initialData._id}`) : navigate('/transport/bills')} style={{ height: 52, flex: 1, minWidth: 120, background: '#F1F5F9', color: '#475569', border: 'none', fontWeight: 800, borderRadius: 16 }}>{getTranslatedText('Cancel')}</button>
          <div style={{ flex: 2, display: 'flex', gap: 12, minWidth: '100%', flexWrap: 'wrap' }}>
            <button type="button" className="btn" onClick={handleSubmit(d => onSubmit(d, 'draft'))} disabled={saving} style={{ height: 52, flex: 1, border: '1.5px solid #CBD5E1', background: '#F8FAFC', color: '#475569', fontWeight: 800, borderRadius: 16, minWidth: 140 }}>
              {isEdit ? getTranslatedText('Update Draft') : getTranslatedText('Save as Draft')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ height: 52, flex: 1.5, minWidth: 180 }}>
              {saving ? <><Loader2 size={18} className="spin" /> {isEdit ? getTranslatedText('Updating...') : getTranslatedText('Generating...')}</> : <><FileText size={18} /> {isEdit ? getTranslatedText('Update & Generate') : getTranslatedText('Generate Bill')}</>}
            </button>
          </div>
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
        .span-2 { grid-column: span 2; }
        .bill-form-header-spacer { display: none; }
        @media (max-width: 768px) {
          .bill-form-header {
            position: fixed; top: 0; left: 0; right: 0; z-index: 400;
            margin: 0 !important; padding: 10px 16px; box-sizing: border-box;
            background: #FFFFFF; border-bottom: 1px solid rgba(0,0,0,0.06);
          }
          .bill-form-header-spacer { display: block; height: 52px; }
        }
        @media (max-width: 640px) {
          .responsive-grid {
            grid-template-columns: 1fr !important;
          }
          .span-2 {
            grid-column: span 1 !important;
          }
        }
        * { -webkit-overflow-scrolling: touch; }
      `}</style>
    </div>
  )
}
