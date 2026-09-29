import { apiClient } from './apiClient'

export async function getFinanceStats() {
  const { data } = await apiClient.get('/finance/stats')
  return data
}

export async function getTransactions() {
  const { data } = await apiClient.get('/finance?t=' + Date.now())
  return data
}

export async function addTransaction(txData) {
  const { data } = await apiClient.post('/finance', txData)
  return data
}

export async function updateTransaction(id, txData) {
  const { data } = await apiClient.patch(`/finance/${id}`, txData)
  return data
}

export async function deleteTransaction(id) {
  const { data } = await apiClient.delete(`/finance/${id}`)
  return data
}
