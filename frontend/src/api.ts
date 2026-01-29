import axios, { AxiosInstance } from 'axios'
import { API_URL } from './config'

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export interface Project {
  id: number
  ref: string
  title: string
  client_name: string
  status: string
  deadline: string | null
  budget_total: number
  total_invoiced: number
  budget_remaining: number
}

export interface DashboardData {
  projects: Project[]
}

export const apiService = {
  getDashboard: async (): Promise<DashboardData> => {
    const response = await api.get('/dashboard')
    return response.data
  },
}

export default api
