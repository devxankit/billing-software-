import { apiClient } from './apiClient'

export async function getGarageStats() {
  const { data } = await apiClient.get('/garage/stats')
  return data
}

export async function getGarageVehicles() {
  const { data } = await apiClient.get('/garage/vehicles')
  return data
}

export async function addGarageVehicle(vehicleData) {
  const { data } = await apiClient.post('/garage/vehicles', vehicleData)
  return data
}

export async function updateGarageVehicle(id, vehicleData) {
  const { data } = await apiClient.patch(`/garage/vehicles/${id}`, vehicleData)
  return data
}

export async function deleteGarageVehicle(id) {
  const { data } = await apiClient.delete(`/garage/vehicles/${id}`)
  return data
}
