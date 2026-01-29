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
  client_id: string
  client_name: string
  status: string
  date_start: number
  date_end: number
  budget_total: number
  total_invoiced: number
  budget_remaining: number
  is_opportunity: boolean
  is_rd: boolean
  description: string
  unittech: number[]
  wp_days: number
  rd_days: number
  budget_amount: number
  opp_amount: number
  opp_percent: number
  time_spent_total: number
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
