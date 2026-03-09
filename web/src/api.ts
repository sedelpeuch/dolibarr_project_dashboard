import axios, { AxiosInstance } from 'axios'
import { API_URL } from './config'
import type { DashboardData, OpportunityStats, OpportunityStageGroup } from './types'

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

export const apiService = {
  getDashboard: async (): Promise<DashboardData> => {
    const response = await api.get('/dashboard')
    return response.data
  },
  getOpportunitiesStats: async (): Promise<OpportunityStats> => {
    const response = await api.get('/opportunities/stats')
    return response.data
  },
  getOpportunitiesPipeline: async (): Promise<{ pipeline: OpportunityStageGroup[] }> => {
    const response = await api.get('/opportunities/pipeline')
    return response.data
  },
  getCoordinatorProjects: async (): Promise<number[]> => {
    try {
      const response = await api.get('/coordinator-projects')
      return response.data.coordinatorProjects || []
    } catch (error) {
      console.error('Error loading coordinator projects:', error)
      return []
    }
  },
  saveCoordinatorProjects: async (projectIds: number[]): Promise<void> => {
    try {
      await api.post('/coordinator-projects', { coordinatorProjects: projectIds })
    } catch (error) {
      console.error('Error saving coordinator projects:', error)
      throw error
    }
  },
}

export default api
