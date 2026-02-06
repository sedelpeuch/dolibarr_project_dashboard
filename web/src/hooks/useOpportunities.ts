import { useState, useEffect } from 'react'
import { apiService } from '../api'
import type { OpportunityStats, OpportunityStageGroup } from '../types'

export const useOpportunities = () => {
  const [stats, setStats] = useState<OpportunityStats | null>(null)
  const [pipeline, setPipeline] = useState<OpportunityStageGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchAll = async () => {
    try {
      setLoading(true)
      setError(null)
      const [statsRes, pipelineRes] = await Promise.all([
        apiService.getOpportunitiesStats(),
        apiService.getOpportunitiesPipeline(),
      ])
      setStats(statsRes)
      setPipeline(pipelineRes.pipeline)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  return { stats, pipeline, loading, error, refetch: fetchAll }
}
