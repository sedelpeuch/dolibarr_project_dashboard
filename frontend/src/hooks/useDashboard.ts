import { useState, useEffect } from 'react'
import { DashboardData, apiService } from '../api'

interface UseDashboardState {
  data: DashboardData | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export const useDashboard = (): UseDashboardState => {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await apiService.getDashboard()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const refetch = async () => {
    await fetchData()
  }

  return { data, loading, error, refetch }
}
