import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import {
  Wrench, User, Plus, Trash2, CheckCircle2,
  Loader2, ArrowLeft, ChevronDown, FileText, Car, CreditCard
} from 'lucide-react'

import { useBills } from '../../context/BillContext'
import { useParties } from '../../context/PartyContext'
import { useVehicles } from '../../context/VehicleContext'
import { usePageTranslation } from '../../hooks/usePageTranslation'
import dayjs from 'dayjs'

// Import car models data
import carModelsData from '../../data/car_models.json'

// Pre-process car data
const UNIQUE_BRANDS = [...new Set(carModelsData.map(item => item.brand))].sort();
const BRAND_MODELS_MAP = carModelsData.reduce((acc, item) => {
  if (!acc[item.brand]) acc[item.brand] = [];
  acc[item.brand].push(item.model);
  return acc;
}, {});

// Import services data from CSV (raw text)
import servicesRaw from '../../data/services.csv?raw'

// Parse labels: extract strings starting with [ ], remove brackets, trim
// Headers are lines that don't start with whitespace
const SERVICES_DATA = servicesRaw
  .split('\n')
  .filter(line => line.includes('[ ]'))
  .map(line => {
    const isHeader = !line.startsWith(' ') && !line.startsWith('\t');
    const label = line.replace(/\[\s*\]/, '').trim();
    return { label, isHeader };
  })
  .filter(item => item.label.length > 0);

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

function SectionCard({ icon: Icon, iconBg, iconColor, title, children }) {
  return (
    <div style={{ background: 'white', borderRadius: 20, padding: '18px 18px 22px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', marginBottom: 14, border: '1px solid rgba(0,0,0,0.04)' }}>
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



export default function GarageBill({ initialData }) {
  const { addBill, updateBill } = useBills()
  const { parties } = useParties()
  const { getTranslatedText } = usePageTranslation([
    'Garage Bill', 'Cash Credit Memo / Estimate', 'Party', 'Search or Select Party...',
    'Registered Parties', 'No registered parties found', '+ Add New Party',
    'Party Name', 'Phone', 'Email', 'Address', 'City', 'State', 'Pincode', 'GSTIN', 'PAN',
    'No Location Details', 'Change Party', 'Vehicle', 'Vehicle Number', 'KM Reading', 'Company',
    'Search Brand (e.g. Maruti)', 'Model', 'Search Model (e.g. Swift)', 'No models found for this brand',
    'Select a brand first', 'Next Service KM', 'Next Service Date', 'Parts & Services',
    'Description', 'Qty', 'Rate', 'Amount', 'Service / Part name', 'Add Another Item',
    'Labour Charge (₹)', 'GST Percentage', 'Discount (%)', 'Parts Subtotal', 'Labour Charge',
    'Discount', 'GST Amount', 'Grand Total', 'Notes', 'Warranty, terms...', 'Cancel',
    'Save as Draft', 'Generating…', 'Update Bill', 'Create Bill', 'Bill Created!',
    'Bill Number:', 'View Invoice', 'New Bill', 'All Bills', 'Loading bill data...',
    'No Phone', 'SELECT', 'Required', 'Invalid email address', '6-digit Pincode',
    '15-digit GSTIN', '10-digit PAN', 'Failed to save bill. Please try again.',
    'No services yet', 'Service bills will appear here once added', 'Party', 'paid', 'unpaid', 'draft', 'pending',
    'Oil Service', 'Tyre Change', 'Brake Service', 'Battery', 'AC Service', 'General Repair', 'Spare Parts', 'Custom',
    'Maruti', 'Hyundai', 'Tata', 'Honda', 'Toyota', 'Mahindra', 'Ford', 'Kia', 'MG', 'Renault', 'Volkswagen', 'Skoda',
    'Party', 'Search or Select Party...', 'Search Brand (e.g. Maruti)', 'Search Model (e.g. Swift)',
    'Service / Part name', 'Add Another Item', 'Warranty, terms...', 'Email', 'Phone', 'Address', 'City', 'State', 'Pincode',
    'No parties found', '+ Add New Party', 'No matches found',
    ...parties.map(p => p.name)
  ])
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const vehicleNoFromUrl = searchParams.get('vehicleNo') || ''
  const categoryFromUrl = searchParams.get('category') || ''
  // Pre-selected customer, e.g. "New Job" from a service reminder
  const partyIdFromUrl = searchParams.get('partyId') || ''
  const customerNameFromUrl = searchParams.get('customerName') || ''
  const customerPhoneFromUrl = searchParams.get('customerPhone') || ''

  const [saving, setSaving] = useState(false)
  const [savedBill, setSavedBill] = useState(null)
  const isSubmitting = useRef(false)

  const isEdit = !!initialData?._id

  // Custom dropdown state
  const [activeIdx, setActiveIdx] = useState(null)
  const [partySearch, setPartySearch] = useState('')
  const [showPartyList, setShowPartyList] = useState(false)

  // Car models selection state
  const [brandSearch, setBrandSearch] = useState('')
  const [showBrandList, setShowBrandList] = useState(false)
  const [modelSearch, setModelSearch] = useState('')
  const [showModelList, setShowModelList] = useState(false)

  const { register, handleSubmit, watch, setValue, control, formState: { errors }, reset } = useForm({
    defaultValues: {
      billDate: dayjs(initialData?.billingDate || initialData?.billDate).format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD'),
      partyId: initialData?.party?._id || initialData?.party || partyIdFromUrl,
      customerName: initialData?.customerName || customerNameFromUrl,
      customerPhone: initialData?.customerPhone || customerPhoneFromUrl,
      customerEmail: initialData?.customerEmail || '',
      customerAddress: initialData?.customerAddress || '',
      customerCity: initialData?.customerCity || '',
      customerState: initialData?.customerState || '',
      customerPincode: initialData?.customerPincode || '',
      customerGstin: initialData?.customerGstin || '',
      customerPan: initialData?.customerPan || '',
      customerSignatureUrl: initialData?.customerSignatureUrl || '',
      vehicleNo: initialData?.vehicleNo || vehicleNoFromUrl || '',
      vehicleModel: initialData?.vehicleModel || '',
      vehicleCompany: initialData?.vehicleCompany || '',
      kmReading: initialData?.kmReading || '',
      nextServiceKm: initialData?.nextServiceKm || '',
      nextServiceDate: initialData?.nextServiceDate ? dayjs(initialData.nextServiceDate).format('YYYY-MM-DD') : '',
      gstPercent: initialData?.gstPercent?.toString() || '0',
      discountPercent: initialData?.discountPercent?.toString() || '0',
      laborCharge: initialData?.laborCharge?.toString() || '0',
      notes: initialData?.notes || '',
      items: initialData?.items?.map(it => ({ ...it, qty: it.qty?.toString(), rate: it.rate?.toString(), amount: it.amount?.toString() })) || [{ description: categoryFromUrl, qty: '', rate: '', amount: '' }],
    }
  })

  // Load unsaved bill details if redirected back from subscription page
  useEffect(() => {
    try {
      const unsaved = sessionStorage.getItem('unsaved_garage_bill')
      if (unsaved) {
        const data = JSON.parse(unsaved)
        reset({
          billDate: dayjs(data.billingDate || data.billDate).format('YYYY-MM-DD'),
          partyId: data.party || data.partyId || '',
          customerName: data.customerName || '',
          customerPhone: data.customerPhone || '',
          customerEmail: data.customerEmail || '',
          customerAddress: data.customerAddress || '',
          customerCity: data.customerCity || '',
          customerState: data.customerState || '',
          customerPincode: data.customerPincode || '',
          customerGstin: data.customerGstin || '',
          customerPan: data.customerPan || '',
          customerSignatureUrl: data.customerSignatureUrl || '',
          vehicleNo: data.vehicleNo || '',
          vehicleModel: data.vehicleModel || '',
          vehicleCompany: data.vehicleCompany || '',
          kmReading: data.kmReading || '',
          nextServiceKm: data.nextServiceKm || '',
          nextServiceDate: data.nextServiceDate ? dayjs(data.nextServiceDate).format('YYYY-MM-DD') : '',
          gstPercent: data.gstPercent?.toString() || '0',
          discountPercent: data.discountPercent?.toString() || '0',
          laborCharge: data.laborCharge?.toString() || '0',
          notes: data.notes || '',
          items: data.items?.map(it => ({ ...it, qty: it.qty?.toString(), rate: it.rate?.toString(), amount: it.amount?.toString() })) || [],
        })
        sessionStorage.removeItem('unsaved_garage_bill')
      }
    } catch (e) {
      console.error('Failed to load unsaved garage bill:', e)
    }
  }, [reset])

  useEffect(() => {
    if (initialData?._id) {
      reset({
        billDate: dayjs(initialData.billingDate || initialData.billDate).format('YYYY-MM-DD'),
        partyId: initialData.party?._id || initialData.party || '',
        customerName: initialData.customerName || '',
        customerPhone: initialData.customerPhone || '',
        customerEmail: initialData.customerEmail || '',
        customerAddress: initialData.customerAddress || '',
        customerCity: initialData.customerCity || '',
        customerState: initialData.customerState || '',
        customerPincode: initialData.customerPincode || '',
        customerGstin: initialData.customerGstin || '',
        customerPan: initialData.customerPan || '',
        customerSignatureUrl: initialData.customerSignatureUrl || '',
        vehicleNo: initialData.vehicleNo || '',
        vehicleModel: initialData.vehicleModel || '',
        vehicleCompany: initialData.vehicleCompany || '',
        kmReading: initialData.kmReading || '',
        nextServiceKm: initialData.nextServiceKm || '',
        nextServiceDate: initialData?.nextServiceDate ? dayjs(initialData.nextServiceDate).format('YYYY-MM-DD') : '',
        gstPercent: initialData.gstPercent?.toString() || '0',
        discountPercent: initialData.discountPercent?.toString() || '0',
        laborCharge: initialData.laborCharge?.toString() || '0',
        notes: initialData.notes || '',
        items: initialData.items?.map(it => ({ ...it, qty: it.qty?.toString(), rate: it.rate?.toString(), amount: it.amount?.toString() })) || [{ description: '', qty: '1', rate: '', amount: '' }],
      })
    }
  }, [initialData, reset])

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const gstPercent = watch('gstPercent')
  const discountPercent = watch('discountPercent')
  const laborCharge = watch('laborCharge')
  const items = watch('items')
  const partyId = watch('partyId')
  const customerName = watch('customerName')
  const vehicleNo = watch('vehicleNo')

  const { vehicles } = useVehicles()

  // Auto-fill from vehicle number
  const autoFilledVehicle = useRef(initialData?.vehicleNo || '')

  useEffect(() => {
    if (!vehicleNo || vehicleNo.length < 4) return
    if (autoFilledVehicle.current === vehicleNo) return

    const v = vehicles.find(x => x.vehicleNumber?.toUpperCase().replace(/\s+/g, '') === vehicleNo.toUpperCase().replace(/\s+/g, ''))

    if (v) {
      if (v.company) setValue('vehicleCompany', v.company)
      if (v.model) setValue('vehicleModel', v.model)
      if (v.kmReading) setValue('kmReading', v.kmReading)
      if (v.nextServiceKm) setValue('nextServiceKm', v.nextServiceKm)

      // If vehicle is linked to a party, auto-fill party as well
      if (v.partyId && !partyId) {
        setValue('partyId', v.partyId)
      } else if (v.customerName && !partyId) {
        // Fallback for independent vehicles
        setValue('customerName', v.customerName)
        if (v.customerPhone) setValue('customerPhone', v.customerPhone)
      }
      autoFilledVehicle.current = vehicleNo
    }
  }, [vehicleNo, vehicles, setValue, partyId])

  // Auto-fill from party
  const prevPartyId = useRef(initialData?.party?._id || initialData?.party || '')

  useEffect(() => {
    if (!partyId) return

    // Only auto-fill if the partyId has actually changed from the last known one
    if (partyId === prevPartyId.current) return

    const p = parties.find(x => (x._id || x.id) === partyId)
    if (p) {
      setValue('customerName', p.name)
      setValue('customerPhone', p.phone || '')
      setValue('customerEmail', p.email || '')
      setValue('customerAddress', p.address || '')
      setValue('customerCity', p.city || '')
      setValue('customerState', p.state || '')
      setValue('customerPincode', p.pincode || '')
      setValue('customerGstin', p.gstin || '')
      setValue('customerPan', p.pan || '')
      setValue('customerSignatureUrl', p.signatureUrl || '')
      prevPartyId.current = partyId
    }
  }, [partyId, parties, setValue, initialData])

  // Auto-calc item amounts
  useEffect(() => {
    (items || []).forEach((item, i) => {
      const qty = parseFloat(item.qty) || 0
      const rate = parseFloat(item.rate) || 0
      const amt = (qty * rate).toFixed(2)
      if (item.amount !== amt) setValue(`items.${i}.amount`, amt)
    })
  }, [items?.map(i => `${i.qty}_${i.rate}`).join(',')])

  const partsTotal = (items || []).reduce((s, i) => s + (parseFloat(i.amount) || 0), 0)
  const labor = parseFloat(laborCharge) || 0
  const subtotal = partsTotal + labor
  const discountAmount = subtotal * (parseFloat(discountPercent) || 0) / 100
  const taxableAmount = subtotal - discountAmount
  const gstAmount = taxableAmount * (parseFloat(gstPercent) || 0) / 100
  const grandTotal = taxableAmount + gstAmount

  const onSubmit = async (data, statusArg = 'unpaid') => {
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    setSaving(true)
    // Declared outside try so the catch can stash it when redirecting to the subscription page
    let payload
    try {
      const finalStatus = statusArg === 'draft' ? 'draft' : 'unpaid';

      payload = {
        billType: 'garage',
        billingDate: data.billDate,
        party: data.partyId,
        ...data,
        partsTotal,
        laborCharge: labor,
        subTotal: subtotal,
        discountPercent: parseFloat(discountPercent) || 0,
        discount: discountAmount,
        gstAmount,
        grandTotal,
        status: finalStatus,
      }

      let res;
      if (isEdit) {
        res = await updateBill(initialData._id, payload)
      } else {
        res = await addBill(payload)
      }
      setSavedBill(res)
    } catch (e) {
      if (e.response?.status === 403 && e.response?.data?.requiresSubscription) {
        sessionStorage.setItem('unsaved_garage_bill', JSON.stringify(payload))
        navigate('/subscription', { state: { fromBill: true } })
      } else {
        alert(getTranslatedText('Failed to save bill. Please try again.'))
      }
    } finally {
      setSaving(false)
      isSubmitting.current = false;
    }
  }

  if (savedBill) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16, textAlign: 'center', padding: 24 }}>
      <div style={{ width: 68, height: 68, borderRadius: 20, background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeInUp 0.3s ease both' }}>
        <CheckCircle2 size={36} color="#16A34A" />
      </div>
      <h2 style={{ fontWeight: 800, color: '#0F0D2E' }}>{getTranslatedText('Bill Created!')}</h2>
      <p style={{ color: '#6B7280' }}>{getTranslatedText('Bill Number:')} #{savedBill.billNumber || getTranslatedText('Draft')}</p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={() => navigate(`/bills/${savedBill._id || savedBill.id}`)}><FileText size={16} /> {getTranslatedText('View Invoice')}</button>
        <button className="btn" onClick={() => { setSavedBill(null); reset(); navigate('/garage/bills/new'); }} style={{ background: '#0F0D2E', color: '#FFFFFF', border: 'none', fontWeight: 800 }}><Plus size={16} /> {getTranslatedText('New Bill')}</button>
        <button className="btn btn-ghost" onClick={() => navigate('/garage/bills')}>{getTranslatedText('All Bills')}</button>
      </div>
    </div>
  )

  return (
    <div className="page-wrapper animate-fadeIn" style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => {
          if (location.state?.fromHome) {
            navigate('/garage/dashboard')
          } else if (isEdit) {
            navigate(`/bills/${initialData._id}`)
          } else {
            navigate('/garage/bills')
          }
        }} style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: 'rgba(0,0,0,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: '1.125rem', color: '#0F0D2E', margin: 0 }}>{getTranslatedText('Garage Bill')}</h2>
          <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: 0 }}>{getTranslatedText('Cash Credit Memo / Estimate')}</p>
        </div>
        <div style={{ marginLeft: 'auto', flexShrink: 0, minWidth: '140px' }}>
          <input type="date" {...register('billDate')} className="form-input" max={dayjs().format('YYYY-MM-DD')} style={{ fontSize: '0.8125rem', padding: '6px 10px', borderRadius: 10, background: 'white', width: '100%' }} />
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>

        {/* Customer */}
        <SectionCard icon={User} iconBg="#EDE9FE" iconColor="#7C3AED" title={getTranslatedText('Party')}>
          {!partyId ? (
            <div className="grid grid-cols-1 gap-3">
              <Field label={getTranslatedText('Party')}>
                <div style={{ position: 'relative' }}>
                  {parties.length > 0 ? (
                    <div className="input-group">
                      <User className="input-icon" size={18} color="#7C3AED" />
                      <input
                        type="text" className="form-input"
                        placeholder={getTranslatedText('Search or Select Party...')}
                        style={{ paddingLeft: 44 }}
                        value={partySearch || (partyId ? customerName : '')}
                        onChange={e => {
                          setPartySearch(e.target.value)
                          setShowPartyList(true)
                          if (partyId) setValue('partyId', '') // Reset if searching
                        }}
                        onFocus={() => setShowPartyList(true)}
                        onBlur={() => setTimeout(() => setShowPartyList(false), 200)}
                      />
                      <ChevronDown size={15} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="form-input" style={{ flex: 1, color: '#9CA3AF', background: '#F9FAFB', display: 'flex', alignItems: 'center', fontSize: '0.875rem', paddingLeft: 12 }}>
                        {getTranslatedText('No parties found')}
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate('/garage/parties/add')}
                        style={{ background: '#EDE9FE', color: '#7C3AED', border: 'none', borderRadius: 10, padding: '10px 14px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        {getTranslatedText('+ Add New Party')}
                      </button>
                    </div>
                  )}

                  {showPartyList && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                      background: 'white', border: '1px solid #E5E7EB', borderRadius: 16,
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                      marginTop: 6, maxHeight: 250, overflowY: 'auto'
                    }}>
                      <div style={{ padding: '8px 12px', fontSize: '0.65rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#F8FAFC' }}>
                        {getTranslatedText('Registered Parties')}
                      </div>
                      {parties
                        .filter(p => !partySearch || p.name.toLowerCase().includes(partySearch.toLowerCase()) || p.phone?.includes(partySearch))
                        .map(p => (
                          <div
                            key={p.id}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              setValue('partyId', p.id)
                              setPartySearch('')
                              setShowPartyList(false)
                            }}
                            style={{
                              padding: '12px 14px', borderBottom: '1px solid #F1F5F9', cursor: 'pointer',
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0F0D2E' }}>{getTranslatedText(p.name)}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{p.phone || getTranslatedText('No Phone')}</div>
                            </div>
                            <div style={{ fontSize: '0.65rem', background: '#EDE9FE', color: '#7C3AED', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>{getTranslatedText('SELECT')}</div>
                          </div>
                        ))}
                      {parties.length > 0 && parties.filter(p => !partySearch || p.name.toLowerCase().includes(partySearch.toLowerCase()) || p.phone?.includes(partySearch)).length === 0 && (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8', fontSize: '0.8rem' }}>
                          {getTranslatedText('No matches found')} "{partySearch}"
                        </div>
                      )}
                      {parties.length === 0 && (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8', fontSize: '0.8rem' }}>
                          {getTranslatedText('No registered parties found')}
                        </div>
                      )}
                      <button
                        type="button"
                        onMouseDown={() => navigate('/garage/parties/add')}
                        style={{
                          width: '100%', padding: '14px', textAlign: 'center', background: '#F5F3FF', border: 'none',
                          color: '#7C3AED', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer'
                        }}
                      >
                        {getTranslatedText('+ Add New Party')}
                      </button>
                    </div>
                  )}
                </div>
              </Field>
              <div className="grid sm-grid-cols-2 gap-3">
                <Field label={getTranslatedText('Party Name')} error={errors.customerName} required>
                  <input
                    {...register('customerName', {
                      required: getTranslatedText('Required'),
                      minLength: { value: 3, message: getTranslatedText('Minimum 3 characters') }
                    })}
                    placeholder={getTranslatedText('Party Name')}
                    className={`form-input ${errors.customerName ? 'error' : ''}`}
                    onBlur={e => setValue('customerName', formatName(e.target.value))}
                  />
                </Field>
                <Field label={getTranslatedText('Phone')}>
                  <input {...register('customerPhone')} placeholder={getTranslatedText('Phone')} className="form-input" inputMode="numeric" maxLength={10} />
                </Field>
                <Field label={getTranslatedText('Email')} error={errors.customerEmail}>
                  <input
                    {...register('customerEmail', {
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Invalid email address"
                      }
                    })}
                    placeholder={getTranslatedText('Email')}
                    className={`form-input ${errors.customerEmail ? 'error' : ''}`}
                  />
                </Field>
                <Field label={getTranslatedText('Address')} error={errors.customerAddress} required>
                  <input
                    {...register('customerAddress', { required: getTranslatedText('Required') })}
                    placeholder={getTranslatedText('Address')}
                    className={`form-input ${errors.customerAddress ? 'error' : ''}`}
                  />
                </Field>
                <Field label={getTranslatedText('City')}>
                  <input
                    {...register('customerCity')}
                    placeholder={getTranslatedText('City')}
                    className="form-input"
                    onChange={e => {
                      const val = e.target.value.replace(/[^a-zA-Z\s]/g, '')
                      setValue('customerCity', val)
                    }}
                    onBlur={e => setValue('customerCity', formatName(e.target.value))}
                  />
                </Field>
                <Field label={getTranslatedText('State')}>
                  <input
                    {...register('customerState')}
                    placeholder={getTranslatedText('State')}
                    className="form-input"
                    onChange={e => {
                      const val = e.target.value.replace(/[^a-zA-Z\s]/g, '')
                      setValue('customerState', val)
                    }}
                    onBlur={e => setValue('customerState', formatName(e.target.value))}
                  />
                </Field>
                <Field label={getTranslatedText('Pincode')} error={errors.customerPincode} required>
                  <input
                    {...register('customerPincode', {
                      required: getTranslatedText('Required'),
                      pattern: { value: /^\d{6}$/, message: getTranslatedText('6-digit Pincode') }
                    })}
                    placeholder={getTranslatedText('6-digit Pincode')}
                    className={`form-input ${errors.customerPincode ? 'error' : ''}`}
                    inputMode="numeric"
                    maxLength={6}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                      setValue('customerPincode', val)
                    }}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label={getTranslatedText('GSTIN')} error={errors.customerGstin}>
                    <input
                      {...register('customerGstin', {
                        pattern: { value: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/, message: getTranslatedText('Invalid GSTIN format') }
                      })}
                      placeholder="27AAAAA0000A1Z5"
                      className="form-input"
                      style={{ textTransform: 'uppercase' }}
                      onChange={e => {
                        const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 15)
                        setValue('customerGstin', val)
                      }}
                    />
                    <p style={{ margin: '4px 0 0', fontSize: '0.62rem', color: '#94A3B8', fontWeight: 500 }}>
                      15-digit GSTIN format
                    </p>
                  </Field>
                  <Field label={getTranslatedText('PAN')} error={errors.customerPan}>
                    <input
                      {...register('customerPan', {
                        pattern: { value: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, message: getTranslatedText('Invalid PAN (e.g. ABCDE1234F)') }
                      })}
                      placeholder="ABCDE1234F"
                      className="form-input"
                      style={{ textTransform: 'uppercase' }}
                      onChange={e => {
                        const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10)
                        setValue('customerPan', val)
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
                <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0F0D2E', marginBottom: 2 }}>{watch('customerName')}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 700 }}>
                  {[
                    watch('customerPhone'),
                    [watch('customerCity'), watch('customerState')].filter(Boolean).join(', ')
                  ].filter(Boolean).join(' • ')}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setValue('partyId', '')
                  setValue('customerName', '')
                  setValue('customerPhone', '')
                  setValue('customerEmail', '')
                  setValue('customerAddress', '')
                  setValue('customerCity', '')
                  setValue('customerState', '')
                  setValue('customerPincode', '')
                  setValue('customerGstin', '')
                  setValue('customerPan', '')
                }}
                style={{ background: 'white', color: '#7C3AED', border: '1.5px solid #7C3AED', borderRadius: 12, padding: '8px 16px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', transition: '0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#F5F3FF' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'white' }}
              >
                {getTranslatedText('Change Party')}
              </button>
            </div>
          )}
        </SectionCard>

        {/* Vehicle */}
        <SectionCard icon={Car} iconBg="#FEF3C7" iconColor="#D97706" title={getTranslatedText('Vehicle')}>
          <div className="grid sm-grid-cols-2 gap-3">
            <Field label={getTranslatedText('Vehicle Number')} error={errors.vehicleNo} required>
              <input {...register('vehicleNo', { required: getTranslatedText('Required') })} placeholder="GJ15AB1234" className={`form-input ${errors.vehicleNo ? 'error' : ''}`} style={{ textTransform: 'uppercase' }} autoCapitalize="characters" />
            </Field>
            <Field label={getTranslatedText('KM Reading')}>
              <input
                {...register('kmReading')}
                type="number"
                placeholder="45000"
                className="form-input"
                inputMode="numeric"
                onFocus={(e) => e.target.value === '0' && setValue('kmReading', '')}
              />
            </Field>
            <Field label={getTranslatedText('Company')}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text" className="form-input"
                  placeholder={getTranslatedText('Search Brand (e.g. Maruti)')}
                  value={brandSearch || watch('vehicleCompany')}
                  onChange={e => {
                    setBrandSearch(e.target.value)
                    setShowBrandList(true)
                    setValue('vehicleCompany', e.target.value)
                    setValue('vehicleModel', '') // Reset model if brand changes
                    setModelSearch('')
                  }}
                  onFocus={() => setShowBrandList(true)}
                  onBlur={() => setTimeout(() => setShowBrandList(false), 200)}
                  autoComplete="off"
                />
                <ChevronDown size={15} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
                {showBrandList && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                    background: 'white', border: '1px solid #E5E7EB', borderRadius: 12,
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                    marginTop: 4, maxHeight: 200, overflowY: 'auto'
                  }}>
                    {UNIQUE_BRANDS
                      .filter(b => !brandSearch || b.toLowerCase().includes(brandSearch.toLowerCase()))
                      .map(b => (
                        <div
                          key={b}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            setValue('vehicleCompany', b)
                            setBrandSearch('')
                            setShowBrandList(false)
                          }}
                          style={{ padding: '10px 14px', fontSize: '0.875rem', cursor: 'pointer', borderBottom: '1px solid #F1F5F9' }}
                        >
                          {getTranslatedText(b)}
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            </Field>
            <Field label={getTranslatedText('Model')}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text" className="form-input"
                  placeholder={getTranslatedText('Search Model (e.g. Swift)')}
                  value={modelSearch || watch('vehicleModel')}
                  onChange={e => {
                    setModelSearch(e.target.value)
                    setShowModelList(true)
                    setValue('vehicleModel', e.target.value)
                  }}
                  onFocus={() => setShowModelList(true)}
                  onBlur={() => setTimeout(() => setShowModelList(false), 200)}
                  autoComplete="off"
                />
                <ChevronDown size={15} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
                {showModelList && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                    background: 'white', border: '1px solid #E5E7EB', borderRadius: 12,
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                    marginTop: 4, maxHeight: 200, overflowY: 'auto'
                  }}>
                    {(BRAND_MODELS_MAP[watch('vehicleCompany')] || [])
                      .filter(m => !modelSearch || m.toLowerCase().includes(modelSearch.toLowerCase()))
                      .map(m => (
                        <div
                          key={m}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            setValue('vehicleModel', m)
                            setModelSearch('')
                            setShowModelList(false)
                          }}
                          style={{ padding: '10px 14px', fontSize: '0.875rem', cursor: 'pointer', borderBottom: '1px solid #F1F5F9' }}
                        >
                          {getTranslatedText(m)}
                        </div>
                      ))
                    }
                    {watch('vehicleCompany') && (BRAND_MODELS_MAP[watch('vehicleCompany')] || []).length === 0 && (
                      <div style={{ padding: '10px 14px', fontSize: '0.8rem', color: '#94A3B8' }}>{getTranslatedText('No models found for this brand')}</div>
                    )}
                    {!watch('vehicleCompany') && (
                      <div style={{ padding: '10px 14px', fontSize: '0.8rem', color: '#94A3B8' }}>{getTranslatedText('Select a brand first')}</div>
                    )}
                  </div>
                )}
              </div>
            </Field>
            <Field label={getTranslatedText('Next Service KM')}>
              <input
                {...register('nextServiceKm')}
                type="number"
                placeholder="50000"
                className="form-input"
                inputMode="numeric"
                onFocus={(e) => e.target.value === '0' && setValue('nextServiceKm', '')}
              />
            </Field>
            <Field label={getTranslatedText('Next Service Date')}>
              <input {...register('nextServiceDate')} type="date" className="form-input" min={dayjs().format('YYYY-MM-DD')} />
            </Field>
          </div>
        </SectionCard>

        {/* Service Items */}
        <SectionCard icon={Wrench} iconBg="#DCFCE7" iconColor="#16A34A" title={getTranslatedText('Parts & Services')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Header - Desktop only */}
            <div className="hide-mobile" style={{ display: 'grid', gridTemplateColumns: '2fr 0.6fr 0.8fr 0.8fr 36px', gap: 8, padding: '0 4px' }}>
              {['Description', 'Qty', 'Rate', 'Amount', ''].map(h => (
                <div key={h} style={{ fontSize: '0.625rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h ? getTranslatedText(h) : ''}</div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {fields.map((field, index) => {
                const currentDesc = watch(`items.${index}.description`) || ''
                const filtered = SERVICES_DATA.filter(item =>
                  currentDesc === '' || item.label.toLowerCase().includes(currentDesc.toLowerCase())
                )

                return (
                  <div key={field.id} className="item-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 0.6fr 0.8fr 0.8fr 36px',
                    gap: 8,
                    alignItems: 'center',
                    position: 'relative'
                  }}>
                    {/* Description */}
                    <div className="item-field" style={{ position: 'relative' }}>
                      <input
                        {...register(`items.${index}.description`, { required: true })}
                        placeholder={getTranslatedText('Service / Part name')}
                        className="form-input"
                        style={{ fontSize: '0.875rem', padding: '10px', width: '100%' }}
                        onFocus={() => setActiveIdx(index)}
                        onBlur={() => setTimeout(() => setActiveIdx(null), 200)}
                        autoComplete="off"
                      />

                      {activeIdx === index && filtered.length > 0 && (
                        <div style={{
                          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                          background: 'white', border: '1px solid #E5E7EB', borderRadius: 12,
                          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                          marginTop: 4, maxHeight: 200, overflowY: 'auto'
                        }}>
                          {filtered.map((item, i) => (
                            <div key={i} onMouseDown={(e) => {
                              if (item.isHeader) return
                              e.preventDefault()
                              setValue(`items.${index}.description`, item.label, { shouldValidate: true })
                              setActiveIdx(null)
                            }} style={{
                              padding: '10px 14px', fontSize: '0.8125rem',
                              fontWeight: item.isHeader ? 800 : 500,
                              color: item.isHeader ? '#7C3AED' : '#0F0D2E',
                              background: item.isHeader ? '#F9F8FF' : 'white',
                            }}>
                              {getTranslatedText(item.label)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Qty */}
                    <div className="item-field">
                      <input
                        {...register(`items.${index}.qty`, { required: getTranslatedText('Required') })}
                        type="number" min="0.1" step="0.1"
                        placeholder={getTranslatedText('Qty')} className={`form-input ${errors.items?.[index]?.qty ? 'error' : ''}`}
                        style={{ fontSize: '0.75rem', padding: '10px 4px', textAlign: 'center' }}
                        inputMode="decimal"
                        onFocus={(e) => (e.target.value === '0' || e.target.value === '1') && setValue(`items.${index}.qty`, '')}
                      />
                    </div>

                    {/* Rate */}
                    <div className="item-field">
                      <input
                        {...register(`items.${index}.rate`, {
                          validate: (val, formValues) => {
                            const qty = formValues.items[index]?.qty;
                            if (qty && parseFloat(qty) > 0 && !val) {
                              return getTranslatedText('Required');
                            }
                            return true;
                          }
                        })}
                        type="number" min="0" step="0.01"
                        placeholder={getTranslatedText('Rate')}
                        className={`form-input ${errors.items?.[index]?.rate ? 'error' : ''}`}
                        style={{ fontSize: '0.75rem', padding: '10px 4px' }}
                        inputMode="decimal"
                        onFocus={(e) => e.target.value === '0' && setValue(`items.${index}.rate`, '')}
                      />
                    </div>

                    {/* Amount */}
                    <div className="item-field amount-box" style={{ background: '#F1F5F9', borderRadius: 10, padding: '10px', fontSize: '0.875rem', fontWeight: 700, color: '#0F0D2E', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                      ₹{parseFloat(items[index]?.amount || 0).toFixed(0)}
                    </div>

                    {/* Delete */}
                    <button type="button" onClick={() => fields.length > 1 && remove(index)}
                      className="delete-btn"
                      disabled={fields.length === 1}
                      style={{ width: 32, height: 32, borderRadius: 10, border: 'none', background: fields.length > 1 ? '#FEE2E2' : '#F1F5F9', cursor: fields.length > 1 ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trash2 size={14} color={fields.length > 1 ? '#DC2626' : '#CBD5E1'} />
                    </button>
                  </div>
                )
              })}
            </div>

            <button type="button" onClick={() => append({ description: '', qty: '', rate: '', amount: '' })}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#EDE9FE', color: '#7C3AED', border: 'none', borderRadius: 12, padding: '10px 16px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8125rem', width: 'fit-content', marginTop: 8 }}>
              <Plus size={16} /> {getTranslatedText('Add Another Item')}
            </button>

            {/* Labor + GST */}
            <div style={{ borderTop: '1px dashed #E2E8F0', paddingTop: 16, marginTop: 8 }}>
              <div className="grid sm-grid-cols-2 gap-3 mb-4">
                <Field label={getTranslatedText('Labour Charge (₹)')}>
                  <div className="input-group">
                    <span className="input-prefix">₹</span>
                    <input
                      {...register('laborCharge')}
                      type="number" min="0" step="0.01"
                      placeholder="0" className="form-input"
                      inputMode="decimal"
                      onFocus={(e) => e.target.value === '0' && setValue('laborCharge', '')}
                    />
                  </div>
                </Field>
                <Field label={getTranslatedText('GST Percentage')}>
                  <select {...register('gstPercent')} className="form-input">
                    {['0', '5', '12', '18'].map(g => <option key={g} value={g}>{g}%</option>)}
                  </select>
                </Field>
                <Field label={getTranslatedText('Discount (%)')}>
                  <input
                    {...register('discountPercent')}
                    type="number" min="0" max="100" step="0.1"
                    placeholder="0" className="form-input"
                    inputMode="decimal"
                    onFocus={(e) => e.target.value === '0' && setValue('discountPercent', '')}
                  />
                </Field>
              </div>

              {/* Summary Box */}
              <div style={{ background: '#1E1B4B', borderRadius: 18, padding: '16px 20px', boxShadow: '0 10px 25px -5px rgba(30, 27, 75, 0.2)', marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: '0.8125rem', marginBottom: 6 }}>
                  <span>{getTranslatedText('Parts Subtotal')}</span><span>₹{partsTotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: '0.8125rem', marginBottom: 6 }}>
                  <span>{getTranslatedText('Labour Charge')}</span><span>₹{labor.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#F87171', fontSize: '0.8125rem', marginBottom: 6 }}>
                  <span>{getTranslatedText('Discount')} ({discountPercent}%)</span><span>-₹{discountAmount.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: '0.8125rem', marginBottom: 10 }}>
                  <span>{getTranslatedText('GST Amount')} ({gstPercent}%)</span><span>₹{gstAmount.toFixed(2)}</span>
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', color: 'white', fontWeight: 800, fontSize: '1.25rem' }}>
                  <span>{getTranslatedText('Grand Total')}</span><span>₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Payment Mode */}



        <div className="btn-group btn-group-mobile-col" style={{ gap: 12 }}>
          <button type="button" className="btn btn-ghost btn-full" onClick={() => {
            if (location.state?.fromHome) {
              navigate('/garage/dashboard')
            } else if (isEdit) {
              navigate(`/bills/${initialData._id}`)
            } else {
              navigate('/garage/bills')
            }
          }} style={{ height: 52 }}>{getTranslatedText('Cancel')}</button>

          <div style={{ flex: 2, display: 'flex', gap: 12 }}>
            <button
              type="button"
              className="btn btn-ghost btn-full"
              onClick={handleSubmit(d => onSubmit(d, 'draft'))}
              disabled={saving}
              style={{ height: 52, flex: 1, border: '1.5px solid #E5E7EB' }}
            >
              {getTranslatedText('Save as Draft')}
            </button>
            <button
              id="btn-save-garage-bill"
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={saving}
              style={{ height: 52, flex: 1.5 }}
            >
              {saving ? <><Loader2 size={18} className="spin" /> {getTranslatedText('Generating…')}</> : <><CheckCircle2 size={18} /> {isEdit ? getTranslatedText('Update Bill') : getTranslatedText('Create Bill')}</>}
            </button>
          </div>
        </div>
      </form>
      <style>{`
        .spin { animation: spin 0.8s linear infinite; } 
        @keyframes spin { to { transform: rotate(360deg); } }
        
        @media (max-width: 600px) {
          .item-grid {
            grid-template-columns: 1fr 1fr 1.2fr 36px !important;
            grid-template-areas: 
              "desc desc desc delete"
              "qty rate amount amount" !important;
            gap: 10px !important;
            padding: 15px !important;
            background: #F8FAFC !important;
            border-radius: 16px !important;
            border: 1px solid #F1F5F9 !important;
          }
          .item-field[style*="position: relative"] { grid-area: desc; }
          .delete-btn { grid-area: delete; justify-self: flex-end; }
          .item-grid .item-field:nth-child(2) { grid-area: qty; }
          .item-grid .item-field:nth-child(3) { grid-area: rate; }
          .amount-box { grid-area: amount; }
          
          .item-field input { background: white !important; }
        }
      `}</style>
    </div>
  )
}
