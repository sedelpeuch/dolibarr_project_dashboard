import { useState, useEffect } from 'react'
import { api } from '../api'

export interface MetaProject {
  id: string
  name: string
  projectIds: number[]
  createdAt: string
}

export const useMetaProjects = () => {
  const [metaProjects, setMetaProjects] = useState<MetaProject[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Load from API on mount
  useEffect(() => {
    loadMetaProjects()
  }, [])

  const loadMetaProjects = async () => {
    setLoading(true)
    try {
      const response = await api.get('/meta-projects')
      setMetaProjects(response.data || [])
      setError(null)
    } catch (err) {
      console.error('Failed to load meta projects:', err)
      setError('Failed to load meta projects')
    } finally {
      setLoading(false)
      setIsLoaded(true)
    }
  }

  const create = async (name: string, projectIds: number[]) => {
    try {
      const newMetaProject: MetaProject = {
        id: `mp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        projectIds,
        createdAt: new Date().toISOString(),
      }

      const response = await api.post('/meta-projects', newMetaProject)
      await loadMetaProjects()
      return response.data
    } catch (err) {
      console.error('Failed to create meta project:', err)
      throw err
    }
  }

  const update = async (id: string, name: string, projectIds: number[]) => {
    try {
      const metaProject: MetaProject = {
        id,
        name,
        projectIds,
        createdAt: metaProjects.find(p => p.id === id)?.createdAt || new Date().toISOString(),
      }

      const response = await api.put(`/meta-projects/${id}`, metaProject)
      await loadMetaProjects()
      return response.data
    } catch (err) {
      console.error('Failed to update meta project:', err)
      throw err
    }
  }

  const delete_ = async (id: string) => {
    try {
      await api.delete(`/meta-projects/${id}`)
      await loadMetaProjects()
    } catch (err) {
      console.error('Failed to delete meta project:', err)
      throw err
    }
  }

  const getById = (id: string) => {
    return metaProjects.find((mp) => mp.id === id)
  }

  return {
    metaProjects,
    isLoaded,
    loading,
    error,
    create,
    update,
    delete: delete_,
    getById,
    refresh: loadMetaProjects,
  }
}
