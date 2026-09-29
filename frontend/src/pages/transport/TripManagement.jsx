import React, { useState, useEffect, useMemo, useRef } from 'react'
import { usePageTranslation } from '../../hooks/usePageTranslation'
import { 
  Truck, MapPin, Plus, Calendar, Trash2, 
  Search, ArrowLeft, Loader2, CheckCircle2,
  Navigation, Hash, ArrowRight, X, Eye,
  FileText, User, ExternalLink, CreditCard
} from 'lucide-react'
import { useVehicles } from '../../context/VehicleContext'
import { useParties } from '../../context/PartyContext'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { getTrips, createTrip, updateTrip, deleteTrip as deleteTripApi } from '../../api/transportApi'
import { getDrafts as getDraftsApi, createBill, updateBill as updateBillApi } from '../../api/billApi'

const emptyDelivery = (from = '') => ({
  from, to: '', chalanNumbers: '',
  amount: '', haltDays: '', haltAmount: '', extraCharges: '', returnCharges: ''
})

const num = (v) => parseFloat(v) || 0

// Trip grand total: freight + hold + hamali + return + GST
const tripTotal = (t) => num(t.amount) + num(t.haltAmount) + num(t.extraCharges) + num(t.returnCharges) + num(t.gstAmount)

// UI Components
const JourneyDetailModal = ({ isOpen, onClose, trip, onDeleteLeg, getTranslatedText }) => {
  if (!isOpen || !trip) return null;
  const legs = trip.rawLegs || [];
  
  return (
    <div className="preview-modal" onClick={onClose}>
      <div className="modal-content journey-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-info">
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>{getTranslatedText('Journey Breakdown')}</h3>
            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{legs.length} {getTranslatedText('Continuous Legs')}</span>
          </div>
          <button className="close-preview-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="legs-list-container">
          {legs.map((leg, i) => (
            <div key={leg._id || i} className="leg-item">
              <div className="leg-marker">
                <div className="marker-dot"></div>
                {i < legs.length - 1 && <div className="marker-line"></div>}
              </div>
              <div className="leg-content">
                <div className="leg-route" style={{ flexWrap: 'wrap', gap: '4px 8px' }}>
                  {(() => {
                    const chain = [];
                    if (leg.deliveries && leg.deliveries.length > 0) {
                      chain.push(leg.deliveries[0].from);
                      leg.deliveries.forEach(d => {
                        if (d.from !== chain[chain.length - 1]) chain.push(d.from);
                        chain.push(d.to);
                      });
                    } else {
                      chain.push(leg.source, leg.destination);
                    }
                    return chain.map((loc, idx) => (
                      <React.Fragment key={idx}>
                        <span>{getTranslatedText(loc)}</span>
                        {idx < chain.length - 1 && <ArrowRight size={12} style={{ flexShrink: 0 }} />}
                      </React.Fragment>
                    ));
                  })()}
                </div>
                <div className="leg-meta" style={{ flexWrap: 'wrap', rowGap: '8px' }}>
                  <span style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>₹{parseFloat(leg.amount).toLocaleString()}</span>
                  {leg.extraCharges > 0 && <span style={{ color: '#D97706', whiteSpace: 'nowrap', flexShrink: 0 }}>+₹{leg.extraCharges} (Hamali)</span>}
                  {leg.haltAmount > 0 && <span style={{ color: '#7C3AED', whiteSpace: 'nowrap', flexShrink: 0 }}>+₹{leg.haltAmount} (Hold)</span>}
                  {leg.returnCharges > 0 && <span style={{ color: '#047857', whiteSpace: 'nowrap', flexShrink: 0 }}>+₹{leg.returnCharges} (Ret)</span>}
                  {leg.gstAmount > 0 && <span style={{ color: '#0369A1', whiteSpace: 'nowrap', flexShrink: 0 }}>+₹{leg.gstAmount} (GST)</span>}
                  <span style={{ flexShrink: 0 }}>•</span>
                  <span style={{ flexShrink: 0 }}>
                    {Array.isArray(leg.chalanNumbers) && leg.chalanNumbers.length > 0 
                      ? leg.chalanNumbers.join(', ') 
                      : (leg.chalanNumber || dayjs(leg.startDate).format('DD MMM'))}
                  </span>
                  {leg.haltDays > 0 && <span style={{ fontSize: '0.65rem', background: '#F5F3FF', color: '#7C3AED', padding: '2px 6px', borderRadius: 4, marginLeft: 4, flexShrink: 0 }}>{leg.haltDays} {getTranslatedText('Days Hold')}</span>}
                </div>
              </div>
              <button className="leg-delete-btn" onClick={() => onDeleteLeg(leg._id || leg.id)}><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
        
        <div className="journey-summary-footer">
          {[
            { label: getTranslatedText('Trip Amount'), value: num(trip.amount) },
            { label: `${getTranslatedText('Hold Charges')}${num(trip.haltDays) > 0 ? ` (${num(trip.haltDays)} ${getTranslatedText('Days')})` : ''}`, value: num(trip.haltAmount) },
            { label: getTranslatedText('Hamali Charges'), value: num(trip.extraCharges) },
            { label: getTranslatedText('Return Charges'), value: num(trip.returnCharges) },
            { label: getTranslatedText('GST Amount'), value: num(trip.gstAmount) },
          ].map(row => (
            <div key={row.label} className="summary-breakdown-row">
              <span>{row.label}</span>
              <span>₹{row.value.toLocaleString()}</span>
            </div>
          ))}
          <div className="summary-item" style={{ borderTop: '1px dashed #E2E8F0', paddingTop: 10, marginTop: 6 }}>
            <span className="label">{getTranslatedText('Total Amount')}</span>
            <span className="value">₹{tripTotal(trip).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function TripManagement() {
  const { getTranslatedText } = usePageTranslation([
    'Detailed Trip Management', 'Track route operations and generate consolidated bills.',
    'Generate Bill', 'Cancel', 'Log New Trip', 'Total Trips', 'Pending Trips', 'Billed Trips',
    'Add Trip Details', 'Date', 'Select Vehicle', 'Select...', 'Trips', 'Select Party/Account',
    'Select party...', 'Pending', 'Number of Deliveries', '1 Delivery', '2 Deliveries', '3 Deliveries',
    'Amount (₹)', 'Delivery Locations', 'From Location', 'To Location', 'Challan No. / Bill No.', 'Hold Days',
    'Hold Charge (₹)', 'Return Charge', 'Required Unloading', 'Hamali Charges', 'Trip is completed',
    'Reason if Incomplete', 'Explain why trip was not completed...', 'Saving...', 'Save Trip Record',
    'Search trips...', 'Journeys', 'Deselect All', 'Select All for Bill', 'View', 'Deliveries',
    'Journey Breakdown', 'Continuous Legs', 'Return', 'Hamali', 'Incomplete', 'Billed', 'In Draft',
    'Challan', 'View Journey Breakdown', 'No trips found for your search', 'No unbilled trips found.',
    'Start logging your trips today!', 'Trips Selected', 'Clear', 'Draft', 'Draft Bills', 'Total Amount', 'Days Hold',
    'GST (%)', 'GST Amount (₹)', 'No GST', 'Trip Amount', 'Hold Charges', 'Return Charges', 'GST Amount', 'Days'
  ])
  const { vehicles } = useVehicles()
  const { parties } = useParties()
  const navigate = useNavigate()

  
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedJourney, setSelectedJourney] = useState(null)
  
  // Local state for trips (since "no backend changes" requested)
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  

  
  // Selection & Billing
  const [selectedIds, setSelectedIds] = useState([])
  const [drafts, setDrafts] = useState([])
  const [showDraftSelect, setShowDraftSelect] = useState(false)
  const [isBilling, setIsBilling] = useState(false)
  const isBillingRef = useRef(false)
  const [billingMode, setBillingMode] = useState(true)
  const [expandedParties, setExpandedParties] = useState([])
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const isSavingRef = useRef(false)
  
  // Form state
  const [formData, setFormData] = useState({
    startDate: dayjs().format('YYYY-MM-DD'),
    vehicleId: '',
    partyId: '',
    groupId: null, // Link to existing journey
    source: '',
    destination: '',
    numberOfTrips: '1',
    amount: '',
    chalanNumber: '',
    haltDays: '',
    haltAmount: '',
    extraCharges: '',
    returnCharges: '',
    isCompleted: true,
    reason: '',
    gstPercent: '',
    gstAmount: '',
    deliveries: [emptyDelivery()]
  })

  // Trip-level charges are the sum of each delivery's charges
  const activeDeliveries = formData.deliveries.slice(0, parseInt(formData.numberOfTrips) || 1)
  const formTotals = useMemo(() => {
    const sum = (key) => activeDeliveries.reduce((acc, d) => acc + num(d[key]), 0)
    return {
      amount: sum('amount'),
      haltDays: sum('haltDays'),
      haltAmount: sum('haltAmount'),
      extraCharges: sum('extraCharges'),
      returnCharges: sum('returnCharges'),
    }
  }, [formData.deliveries, formData.numberOfTrips])
  const formSubtotal = formTotals.amount + formTotals.haltAmount + formTotals.extraCharges + formTotals.returnCharges

  const updateDelivery = (idx, patch) => {
    setFormData(prev => {
      const newD = [...prev.deliveries]
      newD[idx] = { ...newD[idx], ...patch }
      return { ...prev, deliveries: newD }
    })
  }

  // Load trips from API
  // Filter & Search Logic
  const filteredTrips = useMemo(() => {
    const groups = {}
    trips.forEach(t => {
      const from = t.source || t.fromLocation || ''
      const to = t.destination || t.toLocation || ''
      const d = t.startDate || t.date || ''
      const vId = typeof t.vehicle === 'object' ? t.vehicle?._id : t.vehicle
      const pId = typeof t.party === 'object' ? t.party?._id : t.party

      const key = t.groupId || `${d}_${vId}_${pId}`
      if (!groups[key]) groups[key] = []
      groups[key].push({ ...t, fromLocation: from, toLocation: to, date: d, vehicleId: vId, partyId: pId })
    })

    const grouped = Object.values(groups).map(group => {
      const sorted = [...group].sort((a, b) => {
        const diff = new Date(a.createdAt || a.date || 0) - new Date(b.createdAt || b.date || 0)
        if (diff !== 0) return diff
        return (a._id || a.id || '').localeCompare(b._id || b.id || '')
      })
      let displayFrom = sorted[0].fromLocation
      let displayTo = sorted[0].toLocation
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i-1]; const curr = sorted[i];
        if (curr.fromLocation.toLowerCase().trim() === prev.toLocation.toLowerCase().trim()) {
           displayTo += ` + ${curr.toLocation}`
        } else {
           displayTo += ` + ${curr.fromLocation} to ${curr.toLocation}`
        }
      }
      const totalAmount = sorted.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0)
      const totalCount = sorted.reduce((sum, t) => sum + (parseInt(t.numberOfTrips) || 1), 0)
      
      // Aggregate all charge types
      const totalExtra = sorted.reduce((sum, t) => sum + (parseFloat(t.extraCharges) || 0), 0)
      const totalHaltAmount = sorted.reduce((sum, t) => sum + (parseFloat(t.haltAmount) || 0), 0)
      const totalHaltDays = sorted.reduce((sum, t) => sum + (parseFloat(t.haltDays) || 0), 0)
      const totalReturn = sorted.reduce((sum, t) => sum + (parseFloat(t.returnCharges) || 0), 0)
      const totalGstAmount = sorted.reduce((sum, t) => sum + (parseFloat(t.gstAmount) || 0), 0)
      const anyIncomplete = sorted.some(t => t.isCompleted === false)
      const reasons = sorted.map(t => t.reason).filter(Boolean)

      const chalanNums = [...new Set(sorted.map(t => t.chalanNumber).filter(Boolean))].join(', ')
      const allBilled = sorted.every(t => t.billed)

      let sequence = []
      if (sorted.length > 0) {
        sequence.push(sorted[0].fromLocation)
        sorted.forEach((t, i) => {
          if (i > 0 && t.fromLocation !== sorted[i-1].toLocation) sequence.push(t.fromLocation)
          sequence.push(t.toLocation)
        })
      }
      return {
        ...sorted[0], id: [...new Set(sorted.map(t => t._id || t.id))].sort().join(','), 
        amount: totalAmount, numberOfTrips: totalCount, extraCharges: totalExtra,
        haltAmount: totalHaltAmount, haltDays: totalHaltDays,
        returnCharges: totalReturn, gstAmount: totalGstAmount, isCompleted: !anyIncomplete, reasons,
        chalanNumber: chalanNums, routePoints: sequence, rawLegs: sorted,
        fromLocation: displayFrom, toLocation: displayTo, billed: allBilled,
        memberIds: sorted.map(s => s._id || s.id), groupId: sorted[0].groupId
      }
    })

    if (!search) return grouped
    const s = search.toLowerCase()
    return grouped.filter(t => 
      t.fromLocation.toLowerCase().includes(s) || t.toLocation.toLowerCase().includes(s) ||
      (t.vehicle?.vehicleNumber || t.vehicleNumber || '').toLowerCase().includes(s) ||
      (t.party?.name || t.partyName || '').toLowerCase().includes(s) ||
      (t.party?.phone || '').toLowerCase().includes(s)
    )
  }, [trips, search])
  
  const filteredByParty = useMemo(() => {
    let list = filteredTrips.filter(t => !t.billed && !t.billId)
    const groups = {}
    list.forEach(t => {
      const pId = t.party?._id || t.partyId || 'none'
      const pName = t.party?.name || 'Uncategorized'
      if (!groups[pId]) groups[pId] = { id: pId, name: pName, trips: [], totalPending: 0 }
      groups[pId].trips.push(t)
      if (!t.billed && !t.billId) {
        const tExtras = (parseFloat(t.extraCharges) || 0) + (parseFloat(t.returnCharges) || 0) + (parseFloat(t.haltAmount) || 0) + (parseFloat(t.gstAmount) || 0)
        groups[pId].totalPending += (parseFloat(t.amount) || 0) + tExtras
      }
    })
    return Object.values(groups).sort((a,b) => {
      const dateA = new Date(a.trips?.[0]?.startDate || a.trips?.[0]?.date || 0);
      const dateB = new Date(b.trips?.[0]?.startDate || b.trips?.[0]?.date || 0);
      return dateB - dateA;
    })
  }, [filteredTrips, billingMode])

  const loadTrips = async () => {
    try {
      const res = await getTrips()
      if (res.success) setTrips(res.trips)
    } catch (e) {
      console.error("Failed to load trips", e)
    } finally {
      setLoading(false)
    }
  }

  const loadDrafts = async () => {
    try {
      const res = await getDraftsApi()
      if (res.success) setDrafts(res.drafts)
    } catch (e) {
      console.error("Failed to load drafts", e)
    }
  }

  useEffect(() => {
    loadTrips()
    loadDrafts()
  }, [])

  useEffect(() => {
    if (filteredByParty.length > 0 && expandedParties.length === 0) {
      setExpandedParties([filteredByParty[0].id])
    }
  }, [filteredByParty])

  // Dynamic GST calculation on complete subtotal (Base + Hold + Return + Hamali)
  useEffect(() => {
    const percent = parseFloat(formData.gstPercent) || 0;
    const calculatedGst = (formSubtotal * percent) / 100;
    const nextGstAmt = calculatedGst > 0 ? calculatedGst.toFixed(2) : '';

    if (formData.gstAmount !== nextGstAmt) {
      setFormData(prev => ({
        ...prev,
        gstAmount: nextGstAmt
      }));
    }
  }, [formSubtotal, formData.gstPercent, formData.gstAmount]);

  const handleBulkAddToDraft = async (draftId = null, forceStatus = 'draft') => {
    if (isBillingRef.current || selectedIds.length === 0) return
    isBillingRef.current = true;
    setIsBilling(true)
    try {
      // Flatten joined IDs (from grouped trips) into a list of individual IDs
      const allIndividualIds = selectedIds.flatMap(id => id.split(','));
      const selectedTripDocs = trips.filter(t => allIndividualIds.includes(t._id || t.id))
      
      if (selectedTripDocs.length === 0) {
        alert("No trips found for selection.");
        setIsBilling(false);
        return;
      }

      const firstTrip = selectedTripDocs[0]
      const partyObj = firstTrip.party
      const partyId = partyObj?._id || partyObj
      
      const uniqueParties = [...new Set(selectedTripDocs.map(t => (t.party?._id || t.party)))]
      if (uniqueParties.length > 1) {
        alert("Please select trips for the same Party/Account to group them in one bill.")
        setIsBilling(false)
        return
      }

      // Build List-Wise Items
      const billItems = []
      selectedTripDocs.forEach(trip => {
        const date = dayjs(trip.startDate).format('YYYY-MM-DD')
        const chalanNo = trip.chalanNumber || ''
        const tExtras = parseFloat(trip.extraCharges) || 0
        const tReturns = parseFloat(trip.returnCharges) || 0
        const tHalt = parseFloat(trip.haltAmount) || 0
        const tHaltDays = parseFloat(trip.haltDays) || 0
        const tGstPercent = parseFloat(trip.gstPercent) || 0
        const tGstAmount = parseFloat(trip.gstAmount) || 0
        
        // Robust vehicle number retrieval
        const tripVehicleId = trip.vehicle?._id || trip.vehicle;
        const vNumDoc = trip.vehicle?.vehicleNumber || trip.vehicleNumber;
        const vObj = vehicles.find(v => (v._id || v.id) === tripVehicleId);
        const vNum = vNumDoc || vObj?.vehicleNumber || '—';
        
        if (trip.deliveries && trip.deliveries.length > 0) {
          trip.deliveries.forEach((del, idx) => {
            const joinedChalan = Array.isArray(del.chalanNumbers) 
              ? del.chalanNumbers.join(', ') 
              : del.chalanNumbers;
            const deliveryChalan = joinedChalan || chalanNo;

            // Newer trips store charges per delivery — bill each row with its own entered values
            if (del.amount != null) {
              const rowSubtotal = num(del.amount) + num(del.haltAmount) + num(del.extraCharges) + num(del.returnCharges)
              billItems.push({
                date,
                companyFrom: del.from,
                companyTo: del.to,
                chalanNo: deliveryChalan,
                tempoNo: vNum,
                extraAmount: num(del.extraCharges).toString(),
                returnAmount: num(del.returnCharges).toString(),
                gstPercent: tGstPercent,
                gstAmount: parseFloat(((rowSubtotal * tGstPercent) / 100).toFixed(2)),
                haltDays: num(del.haltDays),
                haltAmount: num(del.haltAmount),
                amount: num(del.amount).toString(),
                tripIds: [trip._id || trip.id]
              })
              return
            }

            // Older trips: all charges were entered once per trip, so they sit on the first row
            billItems.push({
              date,
              companyFrom: del.from,
              companyTo: del.to,
              chalanNo: deliveryChalan,
              tempoNo: vNum,
              extraAmount: idx === 0 ? tExtras.toString() : '0',
              returnAmount: idx === 0 ? tReturns.toString() : '0',
              gstPercent: idx === 0 ? tGstPercent : 0,
              gstAmount: idx === 0 ? tGstAmount : 0,
              haltDays: idx === 0 ? tHaltDays : 0,
              haltAmount: idx === 0 ? tHalt : 0,
              amount: idx === 0 ? (parseFloat(trip.amount)).toString() : '0',
              tripIds: [trip._id || trip.id]
            })
          })
        } else {
          billItems.push({
            date,
            companyFrom: trip.source || trip.fromLocation,
            companyTo: trip.destination || trip.toLocation,
            chalanNo,
            tempoNo: vNum,
            extraAmount: tExtras.toString(),
            returnAmount: tReturns.toString(),
            gstPercent: tGstPercent,
            gstAmount: tGstAmount,
            haltDays: tHaltDays,
            haltAmount: tHalt,
            amount: (parseFloat(trip.amount)).toString(),
            tripIds: [trip._id || trip.id]
          })
        }
      })

      let finalBill;
      if (draftId) {
        const draft = drafts.find(d => d._id === draftId)
        finalBill = await updateBillApi(draftId, { 
          trips: [...(draft.trips || []), ...selectedIds],
          items: [...(draft.items || []), ...billItems]
        })
      } else {
        finalBill = await createBill({
          party: partyId,
          billedToName: partyObj?.name,
          billedToPhone: partyObj?.phone,
          billedToEmail: partyObj?.email,
          billedToAddress: partyObj?.address,
          billedToCity: partyObj?.city,
          billedToState: partyObj?.state,
          billedToPincode: partyObj?.pincode,
          billedToGstin: partyObj?.gstin,
          billedToPan: partyObj?.pan,
          billType: 'transport',
          status: forceStatus,
          trips: allIndividualIds,
          items: billItems
        })
      }
      
      // alert("Trips added to bill successfully!")
      const billUrlId = finalBill?.bill?._id || finalBill?.bill?.id || finalBill?._id || finalBill?.id
      if (billUrlId) navigate(`/bills/${billUrlId}`)
      
      setSelectedIds([])
      setShowDraftSelect(false)
      loadTrips()
      loadDrafts()
    } catch (e) {
      console.error(e)
      if (e.response?.status === 403 && e.response?.data?.requiresSubscription) {
        navigate('/subscription', { state: { fromBill: true } })
      } else {
        alert("Failed to update bill")
      }
    } finally {
      setIsBilling(false)
      isBillingRef.current = false;
    }
  }

  const toggleTripSelection = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleAddLeg = (trip) => {
    // Scroll to top and open form
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setShowForm(true)
    
    // Pre-fill with previous leg's data
    setFormData({
      startDate: dayjs(trip.startDate).format('YYYY-MM-DD'),
      vehicleId: trip.vehicle?._id || trip.vehicle,
      partyId: trip.party?._id || trip.party,
      groupId: trip.groupId, // Link to this specific journey
      source: trip.destination || trip.toLocation,
      destination: '',
      numberOfTrips: 1,
      amount: '',
      chalanNumber: '',
      loadingCharge: '',
      unloadingCharge: '',
      detentionCharge: '',
      haltDays: '',
      haltAmount: '',
      otherCharge: '',
      deliveries: [emptyDelivery(trip.destination || trip.toLocation)]
    })
  }

  const handleAddTrip = async (e) => {
    e.preventDefault()
    if (isSavingRef.current) return
    isSavingRef.current = true
    setSaving(true)
    
    // Detailed validation
    if (!formData.startDate) { setSaving(false); isSavingRef.current = false; return alert("Please select a Date"); }
    if (!formData.vehicleId) { setSaving(false); isSavingRef.current = false; return alert("Please select a Vehicle"); }
    if (!formData.partyId) { setSaving(false); isSavingRef.current = false; return alert("Please select an Account/Party"); }
    if (!formData.source) { setSaving(false); isSavingRef.current = false; return alert("Please enter the Starting Location (From)"); }
    if (!formData.destination) { setSaving(false); isSavingRef.current = false; return alert("Please enter the Destination (To)"); }
    if (activeDeliveries.some(d => d.amount === '' || d.amount == null)) { setSaving(false); isSavingRef.current = false; return alert("Please enter the Amount (₹) for every delivery"); }

    const payload = {
      ...formData,
      vehicle: formData.vehicleId,
      party: formData.partyId,
      numberOfTrips: parseInt(formData.numberOfTrips) || 1,
      amount: formTotals.amount,
      extraCharges: formTotals.extraCharges,
      haltDays: formTotals.haltDays,
      haltAmount: formTotals.haltAmount,
      returnCharges: formTotals.returnCharges,
      gstPercent: parseFloat(formData.gstPercent) || 0,
      gstAmount: parseFloat(formData.gstAmount) || 0,
      isCompleted: formData.isCompleted,
      reason: formData.reason,
      deliveries: activeDeliveries.map(d => ({
        ...d,
        amount: num(d.amount),
        haltDays: num(d.haltDays),
        haltAmount: num(d.haltAmount),
        extraCharges: num(d.extraCharges),
        returnCharges: num(d.returnCharges),
        chalanNumbers: typeof d.chalanNumbers === 'string' 
          ? d.chalanNumbers.split(',').map(s => s.trim()).filter(Boolean)
          : d.chalanNumbers
      }))
    }

    try {
      const res = await createTrip(payload)
      if (res.success) {
        setTrips(prev => [res.trip, ...prev])
        setShowForm(false)
        setFormData({
          startDate: dayjs().format('YYYY-MM-DD'),
          vehicleId: '',
          partyId: '',
          groupId: null,
          source: '',
          destination: '',
          numberOfTrips: '1',
          amount: '',
          chalanNumber: '',
          haltDays: '',
          haltAmount: '',
          extraCharges: '',
          returnCharges: '',
          isCompleted: true,
          reason: '',
          gstPercent: '',
          gstAmount: '',
          deliveries: [emptyDelivery()]
        })
        // Enforce 5 second delay to prevent double submissions
        setTimeout(() => {
          setSaving(false)
          isSavingRef.current = false
        }, 5000)
      } else {
        alert(res.message || "Failed to save trip")
        setSaving(false)
        isSavingRef.current = false
      }
    } catch (e) {
      console.error("Save trip error:", e)
      alert(e.response?.data?.message || "Something went wrong while saving the trip")
      setSaving(false)
      isSavingRef.current = false
    }
  }

  const handleDelete = async (id) => {
    const idsToDelete = id.split(',')
    const msg = idsToDelete.length > 1 
      ? `Delete this entire journey (${idsToDelete.length} legs)?` 
      : 'Delete this trip record?'
      
    if (window.confirm(msg)) {
       try {
         await Promise.all(idsToDelete.map(tid => deleteTripApi(tid)))
         setTrips(prev => prev.filter(t => !idsToDelete.includes(t._id || t.id)))
       } catch (e) {
         alert('Delete failed')
       }
    }
  }

  if (showForm) {
    return (
      <form onSubmit={handleAddTrip} className="page-wrapper animate-fadeIn trip-form-card" style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', paddingBottom: 'calc(var(--bottom-nav-h) + 60px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Navigation size={22} color="var(--primary)" /> {getTranslatedText('Add Trip Details')}
          </h2>
          <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost" style={{ height: 40, borderRadius: 10, padding: '0 12px', fontWeight: 700, fontSize: '0.8rem' }}>
             <ArrowLeft size={16} /> {getTranslatedText('Cancel')}
          </button>
        </div>

        <div className="responsive-grid" style={{ gap: 16 }}>
          <div className="form-group">
            <label className="form-label">{getTranslatedText('Date')}</label>
            <input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="form-input" required />
          </div>
          <div className="form-group">
            <label className="form-label">{getTranslatedText('Select Vehicle')}</label>
            <select value={formData.vehicleId} onChange={e => setFormData({...formData, vehicleId: e.target.value})} className="form-input" required>
              <option value="">{getTranslatedText('Select...')}</option>
              {vehicles.map(v => (
                <option key={v._id || v.id} value={v._id || v.id}>
                  {v.vehicleNumber} {v.tripCount > 0 ? `(${v.tripCount} ${getTranslatedText('Trips')})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">{getTranslatedText('Select Party/Account')}</label>
          <select value={formData.partyId} onChange={e => setFormData({...formData, partyId: e.target.value})} className="form-input" required>
            <option value="">{getTranslatedText('Select party...')}</option>
            {parties.map(p => {
              const pId = p._id || p.id
              const pendingCount = trips.filter(t => {
                const tpId = t.party?._id || t.party
                return tpId === pId && !t.billed
              }).length
              return <option key={pId} value={pId}>{p.name} {pendingCount > 0 ? `(${pendingCount} ${getTranslatedText('Pending')})` : ''}</option>
            })}
          </select>
        </div>

        <div className="responsive-grid" style={{ gap: 16 }}>
          <div className="form-group">
            <label className="form-label">{getTranslatedText('Number of Deliveries')}</label>
            <select 
              value={formData.numberOfTrips} 
              onChange={e => {
                const val = parseInt(e.target.value);
                const newDeliveries = [...formData.deliveries];
                while(newDeliveries.length < val) newDeliveries.push(emptyDelivery());
                setFormData({...formData, numberOfTrips: e.target.value, deliveries: newDeliveries});
              }} 
              className="form-input"
            >
              <option value="1">{getTranslatedText('1 Delivery')}</option>
              <option value="2">{getTranslatedText('2 Deliveries')}</option>
              <option value="3">{getTranslatedText('3 Deliveries')}</option>
            </select>
          </div>
        </div>

        {/* Dynamic Delivery Locations */}
        <div style={{ background: '#F8FAFC', padding: 16, borderRadius: 16, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>{getTranslatedText('Delivery Locations & Challans')}</span>
          {Array.from({ length: parseInt(formData.numberOfTrips) || 1 }).map((_, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12, background: 'white', borderRadius: 12, border: '1.5px solid #F1F5F9' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <input 
                    value={formData.deliveries[idx]?.from || ''} 
                    onChange={e => {
                      const newD = [...formData.deliveries];
                      newD[idx] = { ...newD[idx], from: e.target.value };
                      const update = { deliveries: newD };
                      if(idx === 0) update.source = e.target.value;
                      setFormData({...formData, ...update});
                    }} 
                    placeholder={`${getTranslatedText('From Location')} ${idx + 1}`} 
                    className="form-input" 
                    required 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <input 
                    value={formData.deliveries[idx]?.to || ''} 
                    onChange={e => {
                      const newD = [...formData.deliveries];
                      newD[idx] = { ...newD[idx], to: e.target.value };
                      const update = { deliveries: newD };
                      if(idx === (parseInt(formData.numberOfTrips) - 1)) update.destination = e.target.value;
                      setFormData({...formData, ...update});
                    }} 
                    placeholder={`${getTranslatedText('To Location')} ${idx + 1}`} 
                    className="form-input" 
                    required 
                  />
                </div>
              </div>
              <input 
                value={formData.deliveries[idx]?.chalanNumbers || ''} 
                onChange={e => {
                  const newD = [...formData.deliveries];
                  newD[idx] = { ...newD[idx], chalanNumbers: e.target.value.toUpperCase().replace(/[^A-Z0-9-,\s]/g, '') };
                  setFormData({...formData, deliveries: newD});
                }} 
                placeholder={`${getTranslatedText('Challan No. / Bill No.')} (e.g. 123, 456)`} 
                className="form-input" 
                style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}
              />
              <div className="delivery-charges-grid">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{getTranslatedText('Amount (₹)')}</label>
                  <div className="input-group">
                    <span className="input-prefix">₹</span>
                    <input type="number" value={formData.deliveries[idx]?.amount ?? ''} onChange={e => updateDelivery(idx, { amount: e.target.value })} placeholder="1500" className="form-input" required />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#7C3AED' }}>{getTranslatedText('Hold Days')}</label>
                  <input type="number" value={formData.deliveries[idx]?.haltDays ?? ''} onChange={e => updateDelivery(idx, { haltDays: e.target.value })} placeholder={getTranslatedText('Days')} className="form-input" style={{ color: '#7C3AED', fontWeight: 700 }} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#7C3AED' }}>{getTranslatedText('Hold Charge (₹)')}</label>
                  <div className="input-group">
                    <span className="input-prefix" style={{ color: '#7C3AED' }}>₹</span>
                    <input type="number" value={formData.deliveries[idx]?.haltAmount ?? ''} onChange={e => updateDelivery(idx, { haltAmount: e.target.value })} placeholder="0" className="form-input" style={{ color: '#7C3AED', fontWeight: 700 }} />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#D97706' }}>{getTranslatedText('Hamali Charges')}</label>
                  <div className="input-group">
                    <span className="input-prefix" style={{ color: '#D97706' }}>₹</span>
                    <input type="number" value={formData.deliveries[idx]?.extraCharges ?? ''} onChange={e => updateDelivery(idx, { extraCharges: e.target.value })} placeholder="0" className="form-input" style={{ color: '#D97706', fontWeight: 700 }} />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: !formData.isCompleted ? '#DC2626' : '#047857', fontWeight: !formData.isCompleted ? 900 : 700 }}>
                    {getTranslatedText('Return Charge')} {!formData.isCompleted && <span style={{ fontSize: '0.6rem' }}>{getTranslatedText('Required Unloading')}</span>}
                  </label>
                  <div className="input-group">
                    <span className="input-prefix" style={{ color: !formData.isCompleted ? '#DC2626' : '#047857' }}>₹</span>
                    <input type="number" value={formData.deliveries[idx]?.returnCharges ?? ''} onChange={e => updateDelivery(idx, { returnCharges: e.target.value })} placeholder="0" className="form-input" style={{ color: !formData.isCompleted ? '#DC2626' : '#047857', fontWeight: 900 }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input 
            type="checkbox" 
            id="isCompleted"
            checked={formData.isCompleted} 
            onChange={e => setFormData({...formData, isCompleted: e.target.checked})} 
            style={{ width: 20, height: 20, cursor: 'pointer' }}
          />
          <label htmlFor="isCompleted" className="form-label" style={{ marginBottom: 0, cursor: 'pointer' }}>{getTranslatedText('Trip is completed')}</label>
        </div>

        {!formData.isCompleted && (
          <div className="form-group animate-fadeIn">
            <label className="form-label" style={{ color: '#DC2626' }}>{getTranslatedText('Reason if Incomplete')}</label>
            <textarea 
              value={formData.reason} 
              onChange={e => setFormData({...formData, reason: e.target.value})} 
              placeholder={getTranslatedText('Explain why trip was not completed...')} 
              className="form-input"
              style={{ height: 80, resize: 'none' }}
            />
          </div>
        )}

        {/* Taxes & Totals Card */}
        <div style={{ background: 'white', borderRadius: 20, padding: 20, border: '1.5px solid #F1F5F9', boxShadow: '0 10px 25px rgba(0,0,0,0.02)', marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16A34A' }}>
              <FileText size={20} />
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#1E293B', margin: 0 }}>Taxes & Totals</h3>
          </div>

          <div className="responsive-grid" style={{ gap: 16, marginBottom: 20 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.7 }}>GST %</label>
              <select value={formData.gstPercent} onChange={e => setFormData({...formData, gstPercent: e.target.value})} className="form-input" style={{ height: 48, borderRadius: 14 }}>
                <option value="">{getTranslatedText('No GST')}</option>
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
                <option value="28">28%</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.7 }}>GST Type</label>
              <select className="form-input" style={{ height: 48, borderRadius: 14, background: '#F8FAFC' }}>
                <option>CGST+SGST</option>
                <option>IGST</option>
              </select>
            </div>
          </div>

          <div style={{ background: '#1E1B4B', borderRadius: 20, padding: '20px 24px', color: 'white', display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 15px 35px rgba(30, 27, 75, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.8 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Subtotal</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 800 }}>₹{formSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.8 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>GST Amount</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 800 }}>₹{(parseFloat(formData.gstAmount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div style={{ height: 1, background: 'rgba(255, 255, 255, 0.1)', margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 900 }}>Total</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 950, letterSpacing: '-0.02em' }}>₹{(formSubtotal + num(formData.gstAmount)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: 24, height: 50, borderRadius: 16, fontWeight: 800, width: '100%' }}>
            {saving ? <><Loader2 size={18} className="spin" /> {getTranslatedText('Saving...')}</> : getTranslatedText('Save Trip Record')}
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="page-wrapper animate-fadeIn trip-mgmt-container">
      
      {/* Header section */}
      <div className="trip-header">
        <div className="trip-header-info">
          <h1 className="trip-title">{getTranslatedText('Detailed Trip Management')}</h1>
          <p className="trip-subtitle">{getTranslatedText('Track route operations and generate consolidated bills.')}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>

          <button onClick={() => navigate('/bills/new?type=transport')} className="btn btn-ghost" style={{ height: 44, borderRadius: 12, padding: '0 16px', fontWeight: 700, fontSize: '0.875rem', border: '1.5px solid #F1F5F9' }}>
            <FileText size={18} /> {getTranslatedText('Generate Bill')}
          </button>
          <button onClick={() => setShowForm(!showForm)} className="btn btn-primary add-trip-btn">
            {showForm ? <><ArrowLeft size={18} /> {getTranslatedText('Cancel')}</> : <><Plus size={18} /> {getTranslatedText('Log New Trip')}</>}
          </button>
        </div>
      </div>



      {/* Stats row */}
      <div className="stats-grid-compact">
        <div className="stat-card">
          <div className="stat-label">{getTranslatedText('Total Trips')}</div>
          <div className="stat-value">{trips.length}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">{getTranslatedText('Billed Trips')}</div>
          <div className="stat-value">{trips.filter(t => t.billed).length}</div>
        </div>
      </div>


      <div className="search-container">
        <Search size={20} color="#9CA3AF" />
        <input 
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder={getTranslatedText('Search trips...')} 
          className="search-input"
        />
      </div>

      {/* Grouped Trips List */}
      <div className="trips-list">
        {filteredByParty.length > 0 ? filteredByParty.map((group) => (
          <div key={group.id} className={`party-accordion-item ${expandedParties.includes(group.id) ? 'expanded' : ''}`} style={{ marginBottom: 12 }}>
            <div 
              className="party-accordion-header"
              onClick={() => setExpandedParties(prev => prev.includes(group.id) ? prev.filter(id => id !== group.id) : [...prev, group.id])}
              style={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                padding: '12px 16px', background: 'white', borderRadius: 16, 
                border: '1.5px solid #F1F5F9', cursor: 'pointer', transition: '0.2s'
              }}
            >
               <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                 <div style={{ 
                    width: 36, height: 36, borderRadius: 12, 
                    background: expandedParties.includes(group.id) ? 'var(--primary)' : '#EDE9FE', 
                    color: expandedParties.includes(group.id) ? 'white' : '#7C3AED', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.9rem', transition: '0.3s'
                 }}>{group.name[0]}</div>
                 <div>
                   <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0F0D2E' }}>{getTranslatedText(group.name)}</h3>
                   <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>{group.trips.length} {getTranslatedText('Journeys')}</p>
                 </div>
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                 {group.totalPending > 0 && (
                   <div style={{ fontSize: '0.75rem', fontWeight: 950, color: '#DC2626', background: '#FEE2E2', padding: '4px 12px', borderRadius: 10 }}>
                     ₹{group.totalPending.toLocaleString()}
                   </div>
                 )}
                 <div style={{ transform: expandedParties.includes(group.id) ? 'rotate(180deg)' : 'rotate(0)', transition: '0.3s', color: '#94A3B8' }}>
                   <Navigation size={16} />
                 </div>
               </div>
            </div>
            
            {expandedParties.includes(group.id) && (
              <div className="party-accordion-content animate-fadeIn" style={{ padding: '12px 4px 4px 4px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {billingMode && (
                  <div style={{ marginBottom: 4, display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        const pIds = group.trips.filter(t => !t.billed && !t.billId).map(t => t.id);
                        setSelectedIds(prev => {
                          const other = prev.filter(id => !pIds.includes(id));
                          const allSelected = pIds.every(id => prev.includes(id));
                          return allSelected ? other : [...other, ...pIds];
                        });
                      }}
                      style={{ border: 'none', background: '#F5F3FF', color: '#4F46E5', fontSize: '0.7rem', fontWeight: 800, padding: '4px 12px', borderRadius: 8, cursor: 'pointer' }}
                    >
                      {group.trips.filter(t => !t.billed && !t.billId).every(t => selectedIds.includes(t.id)) ? getTranslatedText('Deselect All') : getTranslatedText('Select All for Bill')}
                    </button>
                  </div>
                )}
                {group.trips.map((trip) => (
                  <div 
                    key={trip.id} 
                    className={`animate-fadeInUp trip-card-mobile ${selectedIds.includes(trip.id) ? 'selected' : ''} ${(trip.billed || trip.billId) ? 'billed-item' : ''}`} 
                    onClick={() => {
                      const billId = trip.billId || trip.bill?._id || trip.bill;
                      if (billId) {
                        navigate(`/bills/${billId}`);
                      } else {
                        toggleTripSelection(trip.id);
                      }
                    }}
                  >
                    <div className="trip-card-main">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div className="trip-route-sequence">
                          {trip.routePoints?.map((point, idx) => (
                            <React.Fragment key={idx}>
                              <span className="location">{point}</span>
                              {idx < trip.routePoints.length - 1 && <ArrowRight size={14} className="route-arrow" />}
                            </React.Fragment>
                          ))}
                        </div>
                        {/* Selection Indicator */}
                        {!(trip.billed || trip.billId) && (
                          <div style={{ width: 22, height: 22, borderRadius: 6, border: '1.5px solid #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', background: selectedIds.includes(trip.id) ? 'var(--primary)' : 'white' }}>
                            {selectedIds.includes(trip.id) && <CheckCircle2 size={14} color="white" />}
                          </div>
                        )}
                        {(trip.billed || trip.billId) && (
                          <div style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.65rem', fontWeight: 800 }}>
                            {getTranslatedText('View')} <Eye size={14} />
                          </div>
                        )}
                      </div>
                      
                      <div className="trip-meta-grid">
                        <div className="meta-item"><Hash size={12} /> {trip.vehicle?.vehicleNumber || trip.vehicleNumber}</div>
                        <div className="meta-item"><Calendar size={12} /> {dayjs(trip.date).format('DD MMM')}</div>

                        <div className="trip-badge">{trip.numberOfTrips} {getTranslatedText('Deliveries')}</div>
                        {(parseFloat(trip.returnCharges) || 0) > 0 && 
                          <div className="trip-badge return" style={{ background: '#D1FAE5', color: '#047857' }}>
                            +₹{(parseFloat(trip.returnCharges)).toLocaleString()} {getTranslatedText('Return')}
                          </div>
                        }
                        {(parseFloat(trip.extraCharges) || 0) > 0 && 
                          <div className="trip-badge extra" style={{ background: '#FEF3C7', color: '#D97706' }}>
                            +₹{(parseFloat(trip.extraCharges)).toLocaleString()} {getTranslatedText('Hamali')}
                          </div>
                        }
                        {(parseFloat(trip.haltAmount) || 0) > 0 && 
                          <div className="trip-badge halt" style={{ background: '#F5F3FF', color: '#7C3AED' }}>
                            +₹{(parseFloat(trip.haltAmount)).toLocaleString()} ({trip.haltDays}D Hold)
                          </div>
                        }
                        {(parseFloat(trip.gstAmount) || 0) > 0 && 
                          <div className="trip-badge gst" style={{ background: '#E0F2FE', color: '#0369A1' }}>
                            +₹{(parseFloat(trip.gstAmount)).toLocaleString()} GST
                          </div>
                        }
                        {!trip.isCompleted && (
                          <div className="trip-badge alert" style={{ background: '#FEE2E2', color: '#DC2626' }}>
                            {getTranslatedText('Incomplete')} {trip.reasons?.length > 0 && `(${trip.reasons[0].slice(0, 15)}...)`}
                          </div>
                        )}
                        <div className="billing-status-chip" style={{ 
                          background: trip.billed ? '#DCFCE7' : trip.billId ? '#EEF2FF' : '#FEF3C7',
                          color: trip.billed ? '#16A34A' : trip.billId ? '#4F46E5' : '#D97706'
                        }}>
                          {trip.billed ? getTranslatedText('Billed') : trip.billId ? getTranslatedText('In Draft') : getTranslatedText('Pending')}
                        </div>
                      </div>
                    </div>

                    <div className="trip-card-actions" onClick={e => e.stopPropagation()}>
                      <div className="action-left">
                        {trip.amount > 0 && <div className="trip-amount-badge">₹{tripTotal(trip).toLocaleString()}</div>}
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedJourney(trip); setIsDetailOpen(true); }}
                          title={getTranslatedText('View Journey Breakdown')}
                          style={{ height: 34, width: 34, borderRadius: 9, border: '1.5px solid #F1F5F9', background: 'white', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        >
                          <Eye size={16} />
                        </button>


                        <button className="delete-trip-btn" onClick={() => handleDelete(trip.id)} aria-label="Delete trip">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )) : (
          <div className="empty-state">
            <Truck size={48} className="empty-icon" />
            <div className="empty-title">{getTranslatedText('No trips found for your search')}</div>
            <p className="empty-subtitle">{billingMode ? getTranslatedText('No unbilled trips found.') : getTranslatedText('Start logging your trips today!')}</p>
          </div>
        )}
      </div>

      {/* Floating Action Bar for Bulk Billing */}
      {selectedIds.length > 0 && (
        <div className="animate-slideUp billing-action-bar">
          <div className="action-bar-info">
            <span className="selection-count">{selectedIds.length} {getTranslatedText('Trips Selected')}</span>
            <button className="btn-clear-selection" style={{ background: 'transparent', border: 'none', color: '#64748B', fontWeight: 800, cursor: 'pointer', fontSize: '0.75rem' }} onClick={() => setSelectedIds([])}>{getTranslatedText('Clear')}</button>
          </div>
          <div className="action-bar-btns" style={{ display: 'flex', gap: 10 }}>
            <button 
              className="btn" 
              style={{ height: 44, borderRadius: 12, border: '1.5px solid #CBD5E1', background: 'white', color: '#475569', padding: '0 20px', fontWeight: 850, fontSize: '0.75rem' }}
              onClick={() => handleBulkAddToDraft(null, 'draft')}
              disabled={isBilling}
            >
              {getTranslatedText('Draft')}
            </button>
            <button 
              className="btn btn-primary" 
              style={{ height: 44, borderRadius: 12, padding: '0 24px', fontWeight: 950, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 10px 25px -5px rgba(124, 58, 237, 0.4)' }}
              onClick={() => handleBulkAddToDraft(null, 'unpaid')}
              disabled={isBilling}
            >
              {isBilling ? <Loader2 size={18} className="spin" /> : <Plus size={18} />}
              {getTranslatedText('Generate Bill')}
            </button>
            
            {showDraftSelect && (
              <div className="draft-selector animate-fadeIn" style={{ position: 'absolute', bottom: 60, right: 0, width: 200, background: 'white', border: '1.5px solid #F1F5F9', borderRadius: 16, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', padding: 12, zIndex: 100 }}>
                <div className="draft-selector-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                   <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>{getTranslatedText('Draft Bills')}</span>
                   <X size={14} onClick={() => setShowDraftSelect(false)} style={{ cursor: 'pointer' }} />
                </div>
                <div className="draft-items-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 150, overflowY: 'auto' }}>
                  {drafts.length > 0 ? drafts.map(d => (
                    <div key={d._id} className="draft-item" onClick={() => handleBulkAddToDraft(d._id)}>
                      <div style={{ fontWeight: 700, fontSize: '0.75rem' }}>{d.billNumber || getTranslatedText('No #')}</div>
                      <div style={{ fontSize: '0.6rem', opacity: 0.7 }}>{d.party?.name}</div>
                    </div>
                  )) : <div className="draft-empty">{getTranslatedText('No drafts found')}</div>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Journey Detail Modal */}
      <JourneyDetailModal 
        isOpen={isDetailOpen} 
        onClose={() => setIsDetailOpen(false)} 
        trip={selectedJourney}
        onDeleteLeg={async (lid) => {
          if (window.confirm(getTranslatedText('Delete this leg?'))) {
            try {
              await deleteTripApi(lid);
              setTrips(prev => prev.filter(t => (t._id || t.id) !== lid));
              setIsDetailOpen(false);
            } catch (e) { alert(getTranslatedText('Failed to delete leg')) }
          }
        }}
        getTranslatedText={getTranslatedText}
      />

      <style>{`
        .trip-mgmt-container { padding-bottom: 20px; }
        .trip-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
        .trip-title { fontSize: 1.25rem; font-weight: 900; color: #0F0D2E; margin: 0; }
        .trip-subtitle { color: #6B7280; font-size: 0.8125rem; margin-top: 2px; }
        .add-trip-btn { height: 44px; border-radius: 12px; padding: 0 16px; display: flex; alignItems: center; gap: 8px; font-weight: 700; font-size: 0.875rem; }
        
        .stats-grid-compact { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
        .stat-card { background: white; border-radius: 18px; padding: 16px; border: 1px solid rgba(0,0,0,0.04); box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
        .stat-card.accent { background: #EEF2FF; border-color: #E0E7FF; }
        .stat-label { color: #6B7280; font-size: 0.65rem; font-weight: 800; text-transform: uppercase; margin-bottom: 4px; }
        .accent .stat-label { color: #4F46E5; }
        .stat-value { font-size: 1.25rem; font-weight: 900; color: #0F0D2E; }
        .accent .stat-value { color: #4338CA; }

        .search-container { background: white; border-radius: 16px; padding: 0 16px; display: flex; align-items: center; gap: 10px; margin-bottom: 16px; border: 1.5px solid #F1F5F9; }
        .search-input { border: none; background: transparent; flex: 1; height: 44px; outline: none; font-size: 0.875rem; font-weight: 500; }
        
        .trips-list { display: flex; flex-direction: column; gap: 12px; }
        .trip-card-mobile { background: white; border-radius: 20px; padding: 16px; border: 1px solid #F1F5F9; box-shadow: 0 2px 10px rgba(0,0,0,0.02); }
        .trip-card-main { margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px dashed #F1F5F9; }
        .trip-route-sequence { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; margin-bottom: 8px; }
        .location { font-size: 0.9375rem; font-weight: 800; color: #0F0D2E; }
        .route-arrow { color: #94A3B8; }
        .trip-amount-badge { background: #F1F5F9; color: #0F0D2E; padding: 4px 10px; border-radius: 8px; font-weight: 950; font-size: 0.85rem; border: 1px solid rgba(0,0,0,0.05); }
        
        .trip-meta-grid { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; }
        .meta-item { display: flex; align-items: center; gap: 4px; font-size: 0.75rem; color: #64748B; font-weight: 600; }
        .trip-badge { background: #F8FAFC; color: #475569; padding: 2px 8px; border-radius: 6px; font-weight: 800; font-size: 0.625rem; letter-spacing: 0.02em; }
        
        .trip-card-actions { display: flex; align-items: center; justify-content: space-between; }
        .action-left { display: flex; align-items: center; gap: 12px; }

        
        .delete-trip-btn:active { color: #EF4444; transform: scale(0.9); }
        
        /* Journey Modal Styles */
        .journey-modal { max-width: 450px !important; padding: 0 !important; overflow: hidden; background: white; border-radius: 24px; }
        .modal-header { padding: 20px; border-bottom: 1.5px solid #F1F5F9; display: flex; justify-content: space-between; align-items: center; }
        .legs-list-container { padding: 20px; max-height: 400px; overflow-y: auto; background: #FAFBFE; }
        
        .leg-item { display: flex; gap: 16px; margin-bottom: 24px; position: relative; padding: 12px; background: white; border-radius: 16px; border: 1px solid #F1F5F9; }
        .leg-item:last-child { margin-bottom: 0; }
        .leg-marker { display: flex; flex-direction: column; align-items: center; padding-top: 6px; }
        .marker-dot { width: 10px; height: 10px; border-radius: 50%; background: #7C3AED; border: 2.5px solid #DDD6FE; z-index: 1; }
        .marker-line { width: 2px; flex: 1; background: #E2E8F0; margin: 4px 0; }
        
        .leg-content { flex: 1; }
        .leg-route { font-weight: 800; color: #0F0D2E; font-size: 0.9375rem; display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
        .leg-route svg { opacity: 0.4; }
        .leg-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 0.75rem; color: #64748B; font-weight: 600; }
        
        .leg-delete-btn { background: #FEE2E2; color: #EF4444; border: none; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; }
        .leg-delete-btn:hover { background: #EF4444; color: white; }
        
        .journey-summary-footer { padding: 20px; background: #F8FAFC; border-top: 1.5px solid #F1F5F9; }
        .summary-breakdown-row { display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 700; color: #64748B; margin-bottom: 6px; }
        .summary-item { display: flex; justify-content: space-between; align-items: center; }
        .summary-item .label { font-weight: 800; color: #64748B; font-size: 0.875rem; }
        .summary-item .value { font-weight: 950; color: #0F0D2E; font-size: 1.25rem; }
        
        .party-accordion-header:hover { border-color: #DDD6FE !important; background: #FDFDFF !important; }
        .party-accordion-item.expanded .party-accordion-header { border-bottom-left-radius: 0; border-bottom-right-radius: 0; border-color: #EDE9FE !important; }
        
        .empty-state { text-align: center; padding: 40px 20px; }
        .empty-icon { opacity: 0.1; margin-bottom: 8px; color: #0F0D2E; }
        .empty-title { font-size: 0.9375rem; font-weight: 700; color: #334155; }
        .empty-subtitle { font-size: 0.8125rem; color: #64748B; margin-top: 4px; }
        
        .preview-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 16px; backdrop-filter: blur(4px); }
        .modal-content { position: relative; width: 100%; max-width: 400px; }

        .close-preview-btn { position: absolute; top: -50px; right: 0; background: white; border: none; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        
        .trip-form-card { background: white; border-radius: 24px; padding: 20px; border: 1px solid #F1F5F9; }

        .billing-action-bar { position: fixed; bottom: 96px; left: 16px; right: 16px; background: rgba(15, 13, 46, 0.95); backdrop-filter: blur(12px); border-radius: 20px; padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; z-index: 900; box-shadow: 0 20px 40px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); }
        .selection-count { color: white; font-weight: 800; font-size: 0.9rem; }
        .btn-clear-selection { background: transparent; border: none; color: #94A3B8; font-size: 0.75rem; font-weight: 700; margin-left: 10px; cursor: pointer; }
        
        .draft-selector { position: absolute; bottom: 100%; right: 0; width: 280px; background: white; border-radius: 20px; margin-bottom: 12px; box-shadow: 0 15px 40px rgba(0,0,0,0.15); overflow: hidden; border: 1px solid #F1F5F9; }
        .draft-selector-header { padding: 14px 18px; background: #F8FAFC; display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; font-weight: 900; color: #475569; border-bottom: 1.5px solid #F1F5F9; }
        .draft-items-list { max-height: 220px; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 6px; }
        .draft-item { padding: 12px; border-radius: 14px; cursor: pointer; transition: 0.2s; color: #0F0D2E; border: 1px solid transparent; }
        .draft-item:hover { background: #F5F3FF; color: #7C3AED; border-color: #DDD6FE; }
        .draft-empty { padding: 30px 20px; text-align: center; color: #94A3B8; font-size: 0.8rem; font-weight: 600; }
        .btn-new-draft { width: 100%; border: none; background: #0F0D2E; color: white; padding: 14px; font-weight: 800; font-size: 0.8rem; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .btn-new-draft:hover { background: #1E293B; }
        .btn-new-draft:active { transform: scale(0.98); }
        
        .billing-status-chip { font-size: 0.6rem; font-weight: 950; padding: 3px 10px; border-radius: 8px; letter-spacing: 0.05em; }
        .trip-card-mobile.selected { border: 2px solid var(--primary); background: #f5f3ff; }
        .trip-card-mobile.billed-item { border-left: 4px solid #10B981; cursor: pointer; }
        .trip-card-mobile.billed-item:hover { background: #F0FDF4; }
        .responsive-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .span-2 { grid-column: span 2; }
        .delivery-charges-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .delivery-charges-grid > :first-child { grid-column: span 2; }
        @media (max-width: 640px) {
          .responsive-grid {
            grid-template-columns: 1fr !important;
          }
          .span-2 {
            grid-column: span 1 !important;
          }
        }
        .animate-slideUp { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        * { -webkit-overflow-scrolling: touch; }
      `}</style>
    </div>
  )
}
