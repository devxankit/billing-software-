import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { getParties, createParty, updateParty, deleteParty } from '../api/partyApi'

const PartyContext = createContext(null)

// Generate simple unique IDs
const uid = () => `party_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

export function PartyProvider({ children }) {
  const { user } = useAuth()
  const [parties, setParties] = useState([])
  const [loaded, setLoaded]   = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await getParties()
      if (res.success) {
        setParties(res.parties.map(p => ({ ...p, id: p._id || p.id })))
      }
    } catch (e) {
      console.error('Failed to load parties:', e.message)
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (user) load()
  }, [user, load])

  const addPartyApi = useCallback(async (data) => {
    try {
      const res = await createParty(data)
      if (res.success) {
        const normalized = { ...res.party, id: res.party._id || res.party.id }
        setParties(prev => [normalized, ...prev])
        return normalized
      }
    } catch (e) {
      console.error('Add party failed:', e.message)
    }
  }, [])

  const updatePartyApi = useCallback(async (id, data) => {
    try {
      const res = await updateParty(id, data)
      if (res.success) {
        const normalized = { ...res.party, id: res.party._id || res.party.id }
        setParties(prev => prev.map(p => (p._id === id || p.id === id) ? normalized : p))
        return normalized
      }
    } catch (e) {
      console.error('Update party failed:', e.message)
    }
  }, [])

  const deletePartyApi = useCallback(async (id) => {
    try {
      const res = await deleteParty(id)
      if (res.success) {
        setParties(prev => prev.filter(p => p._id !== id))
        return true
      }
    } catch (e) {
      console.error('Delete party failed:', e.message)
      alert(e.response?.data?.message || 'Failed to delete party. Please try again.')
    }
    return false
  }, [])

  const getParty = useCallback((id) => parties.find(p => p._id === id || p.id === id), [parties])

  return (
    <PartyContext.Provider value={{ parties, loaded, addParty: addPartyApi, updateParty: updatePartyApi, deleteParty: deletePartyApi, getParty }}>
      {children}
    </PartyContext.Provider>
  )
}

export function useParties() {
  const ctx = useContext(PartyContext)
  if (!ctx) throw new Error('useParties must be inside <PartyProvider>')
  return ctx
}
