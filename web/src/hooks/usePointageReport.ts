import { useState, useEffect } from 'react'
import { apiService } from '../api'
import type { PersonReport } from '../types'

export function usePointageReport(year?: number) {
  const [report, setReport] = useState<PersonReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiService.getPersonReport(year)
      setReport(data)
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetch() }, [year])

  return { report, loading, error, refetch: fetch }
}
