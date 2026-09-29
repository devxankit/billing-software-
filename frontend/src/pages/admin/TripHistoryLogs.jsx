import React, { useState, useEffect, useCallback } from 'react'
import { MapPin, Search, Truck, ArrowRight, ChevronLeft, ChevronRight, CheckCircle2, Clock, Loader2 } from 'lucide-react'
import { useAdmin } from '../../context/AdminContext'
import { getAdminTripHistory } from '../../api/adminApi'
import dayjs from 'dayjs'

const ITEMS_PER_PAGE = 10

export default function TripHistoryLogs() {
  const { mode } = useAdmin()
  const accentColor = '#7C3AED'
  
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  const fetchTrips = useCallback(async () => {
    try {
      setLoading(true)
      const res = await getAdminTripHistory({
        page,
        limit: ITEMS_PER_PAGE,
        status: statusFilter
      })
      if (res.success) {
        setTrips(res.trips)
        setTotal(res.pagination.total)
      }
    } catch (error) {
      console.error('Failed to fetch trips:', error)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => {
    fetchTrips()
  }, [fetchTrips])

  // Same status the transporter sees on their trips page: Billed / In Draft / Pending
  const getTripStatus = (trip) => {
     const status = trip.status?.toLowerCase()
     if (status === 'cancelled') return 'cancelled'
     if (trip.billed) return 'billed'
     if (trip.billId) return 'in draft'
     return 'pending'
  }

  const getStatusColor = (s) => {
     const status = s?.toLowerCase()
     if (status === 'billed') return { bg: '#DCFCE7', text: '#16A34A', icon: CheckCircle2 }
     if (status === 'in draft') return { bg: '#EEF2FF', text: '#4F46E5', icon: Clock }
     if (status === 'completed') return { bg: '#DCFCE7', text: '#16A34A', icon: CheckCircle2 }
     if (status === 'ongoing' || status === 'in transit' || status === 'active') return { bg: '#DBEAFE', text: '#2563EB', icon: Truck }
     if (status === 'cancelled') return { bg: '#FEE2E2', text: '#EF4444', icon: Clock }
     return { bg: '#FEF3C7', text: '#D97706', icon: Clock }
  }

  // Frontend filtering for search (optional, or could move to backend)
  const filteredTrips = trips.filter(t => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return t.tripId?.toLowerCase().includes(q) ||
      t.owner?.businessName?.toLowerCase().includes(q) ||
      t.vehicle?.vehicleNumber?.toLowerCase().includes(q)
  })

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <MapPin size={18} color={accentColor} />
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
               Trip Management · Logistics Oversight
            </span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0 }}>Global Trip History</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Monitor all cross-platform trips and logistics operations
          </p>
        </div>
        <button className="btn btn-primary" onClick={fetchTrips} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" size={18} /> : 'Refresh Data'}
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <div className="input-group" style={{ flex: 1, minWidth: '240px' }}>
            <Search className="input-icon" size={18} />
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search by ID, Business or Vehicle..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              style={{ paddingLeft: 44, height: 44 }} 
            />
          </div>
          <select 
            className="form-input" 
            style={{ width: '180px', height: 44 }}
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="billed">Billed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button className="btn btn-ghost" style={{ height: 44 }} onClick={() => { setSearch(''); setStatusFilter(''); setPage(1); }}>Reset</button>
        </div>

        <div style={{ overflowX: 'auto', minHeight: '300px', position: 'relative' }}>
          {loading && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
               <Loader2 className="animate-spin" size={32} color={accentColor} />
            </div>
          )}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'var(--bg-alt)', borderBottom: '1px solid var(--border)' }}>
              <tr>
                {['Trip ID / Date', 'Business / Owner', 'Vehicle & Route', 'Status', 'Total Value'].map(h => (
                   <th key={h} style={{ padding: '13px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTrips.map(trip => {
                const tripStatus = getTripStatus(trip)
                const colors = getStatusColor(tripStatus)
                return (
                  <tr key={trip._id} style={{ borderBottom: '1px solid var(--border)' }} className="table-row-hover">
                    <td style={{ padding: '16px 24px' }}>
                      <p style={{ margin: 0, fontWeight: 800, fontSize: '0.85rem' }}>{trip.tripId}</p>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{dayjs(trip.startDate).format('DD MMM YYYY')}</p>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{trip.owner?.businessName || 'N/A'}</div>
                      <div style={{ fontSize: '0.7rem', color: accentColor, fontWeight: 700 }}>{trip.owner?.name}</div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                         <Truck size={16} color="var(--text-muted)" />
                         <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{trip.vehicle?.vehicleNumber || 'N/A'}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                         {trip.source} <ArrowRight size={10} /> {trip.destination}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ 
                        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 99,
                        background: colors.bg, color: colors.text, fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase'
                      }}>
                        <colors.icon size={12} />
                        {tripStatus}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', fontWeight: 900, fontSize: '1rem', color: '#111' }}>
                       ₹{trip.amount?.toLocaleString() || 0}
                    </td>
                  </tr>
                )
              })}
              {!loading && filteredTrips.length === 0 && (
                <tr>
                   <td colSpan="5" style={{ padding: '80px 24px', textAlign: 'center' }}>
                      <MapPin size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                      <h3 style={{ fontWeight: 800, color: 'var(--text-secondary)' }}>No trip records found</h3>
                      <p style={{ color: 'var(--text-muted)' }}>Trip data will appear once transporters log their route information.</p>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
           <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Records: {total}</p>
           <div style={{ display: 'flex', gap: 8 }}>
             <button className="btn btn-ghost btn-sm" disabled={page === 1 || loading} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} /></button>
             <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', fontWeight: 700 }}>Page {page} of {Math.ceil(total/ITEMS_PER_PAGE) || 1}</span>
             <button className="btn btn-ghost btn-sm" disabled={page >= Math.ceil(total/ITEMS_PER_PAGE) || loading} onClick={() => setPage(p => p + 1)}><ChevronRight size={16} /></button>
           </div>
        </div>
      </div>
    </div>
  )
}
