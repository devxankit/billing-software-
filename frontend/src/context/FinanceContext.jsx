import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { getTransactions, addTransaction as addTxApi, updateTransaction as updateTxApi, deleteTransaction as deleteTxApi, getFinanceStats } from '../api/financeApi'

const FinanceContext = createContext(null)

export function FinanceProvider({ children }) {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [stats, setStats] = useState(null)
  const [loaded, setLoaded] = useState(false)

  const loadFinanceData = useCallback(async () => {
    if (!user) return
    try {
      const [txRes, statsRes] = await Promise.all([
        getTransactions(),
        getFinanceStats()
      ])
      
      if (txRes.success) setTransactions(txRes.transactions)
      if (statsRes.success) setStats(statsRes.stats)
    } catch (e) {
      console.error("Failed to load finance data", e)
    } finally {
      setLoaded(true)
    }
  }, [user])

  useEffect(() => {
    loadFinanceData()
  }, [loadFinanceData])

  const addTransaction = useCallback(async (formData) => {
    try {
      const res = await addTxApi(formData)
      if (res.success) {
        setTransactions(prev => [res.transaction, ...prev])
        // Refresh stats after new tx
        loadFinanceData()
        return res.transaction
      }
    } catch (e) {
      console.error("Failed to add transaction", e)
      throw e
    }
  }, [loadFinanceData])

  const updateTransaction = useCallback(async (id, formData) => {
    const res = await updateTxApi(id, formData)
    if (res.success) {
      setTransactions(prev => prev.map(t => (t._id === id ? res.transaction : t)))
      loadFinanceData()
      return res.transaction
    }
  }, [loadFinanceData])

  const deleteTransaction = useCallback(async (id) => {
    const res = await deleteTxApi(id)
    if (res.success) {
      setTransactions(prev => prev.filter(t => t._id !== id))
      loadFinanceData()
      return true
    }
    return false
  }, [loadFinanceData])

  return (
    <FinanceContext.Provider value={{
      transactions,
      stats,
      loaded,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      refreshFinance: loadFinanceData 
    }}>
      {children}
    </FinanceContext.Provider>
  )
}

export function useFinance() {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be inside <FinanceProvider>')
  return ctx
}
