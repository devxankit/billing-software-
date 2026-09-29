import React, { useMemo, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Car, Bell, ArrowLeft, Plus, Share2, AlertTriangle, ChevronRight, Check } from 'lucide-react'
import { useBills } from '../../context/BillContext'
import { useAuth } from '../../context/AuthContext'
import { usePageTranslation } from '../../hooks/usePageTranslation'
import dayjs from 'dayjs'

export default function GarageAlerts() {
  const navigate = useNavigate()
  const { bills, loaded } = useBills()
  const { user } = useAuth()

  // Track shared alerts locally in memory only for the current view
  const [sharedIds, setSharedIds] = useState([])

  const garageBills = useMemo(() => bills.filter(b => b.billType === 'garage'), [bills])

  const remindersList = useMemo(() => {
    const today = dayjs().startOf('day')
    const latestByVehicle = {}

    garageBills.forEach(b => {
      if (!b.vehicleNo) return
      if (!latestByVehicle[b.vehicleNo] || dayjs(b.billingDate || b.createdAt).isAfter(dayjs(latestByVehicle[b.vehicleNo].billingDate || latestByVehicle[b.vehicleNo].createdAt))) {
        latestByVehicle[b.vehicleNo] = b
      }
    })

    return Object.values(latestByVehicle)
      .filter(b => b.nextServiceDate)
      .map(b => {
        const dueDate = dayjs(b.nextServiceDate)
        const daysDiff = dueDate.diff(today, 'day')
        let status = 'upcoming'
        if (daysDiff < 0) status = 'overdue'
        else if (daysDiff === 0) status = 'due_today'
        else if (daysDiff <= 7) status = 'upcoming_soon'

        // Check if already notified/shared (using both possible ID fields)
        const currentId = b._id || b.id
        const isShared = currentId ? sharedIds.includes(currentId) : false

        return { ...b, daysLeft: daysDiff, reminderStatus: status, isShared }
      })
      .filter(r => r.daysLeft <= 180)
      .sort((a, b) => a.daysLeft - b.daysLeft)
  }, [garageBills, sharedIds])

  const { getTranslatedText } = usePageTranslation([
    'Service Alerts', 'Vehicle service reminders and maintenance tracking', 'No active service reminders.',
    'Due', 'Delayed by', 'days', 'In', 'New Job', 'Share', 'Due Today', 'Upcoming Soon', 'Overdue', 'Upcoming',
    'due today', 'upcoming soon', 'Notified', ...remindersList.map(r => r.customerName)
  ])

  const handleShare = (r) => {
    const vehicleNo = formatVehicleNo(r.vehicleNo)
    const garageName = user?.businessName || 'Your Garage'
    const customerPhone = r.customerPhone || r.billedToPhone || r.party?.phone || ''
    const message = `Hello Sir,\n\nYour vehicle (No. ${vehicleNo}) is due for service. Kindly bring it in at your convenience.\n\n– ${garageName}`

    // Clean phone number: remove all non-numeric chars
    const cleanPhone = customerPhone.replace(/\D/g, '')
    // Ensure 91 prefix if it's a 10-digit Indian number
    const finalPhone = (cleanPhone.length === 10) ? `91${cleanPhone}` : cleanPhone

    const waUrl = `https://api.whatsapp.com/send?phone=${finalPhone}&text=${encodeURIComponent(message)}`
    window.open(waUrl, '_blank')

    const billId = r._id || r.id
    if (billId && !sharedIds.includes(billId)) {
      setSharedIds(prev => [...prev, billId])
    }
  }

  const formatVehicleNo = (no) => {
    if (!no) return '—'
    const clean = no.toUpperCase().replace(/\s+/g, '')
    if (clean.length === 10) return `${clean.slice(0, 2)} ${clean.slice(2, 4)} ${clean.slice(4, 6)} ${clean.slice(6)}`
    return clean
  }

  return (
    <div className="page-wrapper animate-fadeIn">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ width: 40, height: 40, borderRadius: 12, border: 'none', background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0F172A', margin: 0 }}>
            {getTranslatedText('Service Alerts')}
          </h1>
          <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: 0 }}>
            {getTranslatedText('Vehicle service reminders and maintenance tracking')}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {remindersList.length > 0 ? remindersList.map((r, index) => (
          <div key={index} className="card" style={{ padding: '16px', border: r.isShared ? '1.5px solid #16A34A' : '1px solid #F1F5F9', background: r.isShared ? '#F0FDF4' : 'white', transition: 'all 0.3s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: r.isShared ? '#DCFCE7' : '#EFF6FF', color: r.isShared ? '#16A34A' : '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Car size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A' }}>{formatVehicleNo(r.vehicleNo)}</div>
                <div style={{ fontSize: '0.8125rem', color: '#64748B', fontWeight: 500 }}>{getTranslatedText(r.customerName)}</div>
              </div>
              <div style={{
                fontSize: '0.625rem',
                fontWeight: 900,
                padding: '4px 10px',
                borderRadius: 8,
                background: r.isShared ? '#DCFCE7' : (r.reminderStatus === 'overdue' ? '#FEE2E2' : r.reminderStatus === 'due_today' ? '#DBEAFE' : '#FEF3C7'),
                color: r.isShared ? '#16A34A' : (r.reminderStatus === 'overdue' ? '#DC2626' : r.reminderStatus === 'due_today' ? '#2563EB' : '#D97706'),
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                {r.isShared && <Check size={10} strokeWidth={3} />}
                {getTranslatedText(r.isShared ? 'Notified' : r.reminderStatus.replace('_', ' '))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', padding: '10px 12px', background: r.isShared ? '#DCFCE7' : '#F8FAFC', borderRadius: 12, marginBottom: 14, border: '1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748B' }}>
                <AlertTriangle size={14} />
                <span>{getTranslatedText('Due')}: <span style={{ color: '#0F172A', fontWeight: 700 }}>{dayjs(r.nextServiceDate).format('DD MMM YYYY')}</span></span>
              </div>
              <div style={{ fontWeight: 800, color: r.isShared ? '#16A34A' : (r.reminderStatus === 'overdue' ? '#DC2626' : '#2563EB') }}>
                {r.reminderStatus === 'overdue' ? `${getTranslatedText('Delayed by')} ${Math.abs(r.daysLeft)} ${getTranslatedText('days')}` : `${getTranslatedText('In')} ${r.daysLeft} ${getTranslatedText('days')}`}
              </div>
            </div>

            {!r.isShared ? (
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => {
                    // Carry the reminder's customer so the job card opens with the party selected
                    const params = new URLSearchParams({ vehicleNo: r.vehicleNo || '' })
                    const partyId = r.party?._id || r.party?.id || (typeof r.party === 'string' ? r.party : '')
                    if (partyId) params.set('partyId', partyId)
                    const name = r.customerName || r.party?.name
                    const phone = r.customerPhone || r.party?.phone
                    if (name) params.set('customerName', name)
                    if (phone) params.set('customerPhone', phone)
                    navigate(`/garage/bills/new?${params.toString()}`)
                  }}
                  style={{ flex: 1, background: '#0F172A', color: 'white', border: 'none', borderRadius: 12, padding: '12px', fontSize: '0.8125rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <Plus size={16} /> {getTranslatedText('New Job')}
                </button>
                <button
                  onClick={() => handleShare(r)}
                  style={{ width: 44, height: 44, background: '#F1F5F9', color: '#64748B', border: 'none', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.3s' }}
                  title={getTranslatedText('Share')}
                >
                  <Share2 size={18} />
                </button>
              </div>
            ) : (
              <div style={{ width: '100%', padding: '12px', background: '#DCFCE7', borderRadius: 12, color: '#16A34A', fontSize: '0.8125rem', fontWeight: 800, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Check size={16} /> {getTranslatedText('Reminder Sent Successfully')}
              </div>
            )}
          </div>
        )) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: '#F8FAFC', color: '#CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Bell size={32} />
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>{getTranslatedText('All caught up!')}</h3>
            <p style={{ fontSize: '0.875rem', color: '#64748B' }}>{getTranslatedText('No active service reminders.')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
