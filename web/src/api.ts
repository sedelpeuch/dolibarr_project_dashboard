import axios, { AxiosInstance } from 'axios'
import { API_URL } from './config'
import type { DashboardData } from './types'

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

export const apiService = {
  getDashboard: async (): Promise<DashboardData> => {
    const response = await api.get('/dashboard')
    return response.data
  },
}

export default api
