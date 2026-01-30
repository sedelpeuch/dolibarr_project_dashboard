import { useState, useEffect } from 'react'

export interface MetaProject {
  id: string
  name: string
  projectIds: number[]
  createdAt: string
}

const STORAGE_KEY = 'balthazar_meta_projects'

export const useMetaProjects = () => {
  const [metaProjects, setMetaProjects] = useState<MetaProject[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setMetaProjects(JSON.parse(stored))
      } catch (error) {
        console.error('Failed to parse stored meta projects:', error)
      }
    }
    setIsLoaded(true)
  }, [])

  // Save to localStorage whenever metaProjects changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(metaProjects))
    }
  }, [metaProjects, isLoaded])

  const create = (name: string, projectIds: number[]) => {
    const newMetaProject: MetaProject = {
      id: `mp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      projectIds,
      createdAt: new Date().toISOString()
    }
    setMetaProjects([...metaProjects, newMetaProject])
    return newMetaProject
  }

  const update = (id: string, name: string, projectIds: number[]) => {
    setMetaProjects(
      metaProjects.map((mp) =>
        mp.id === id
          ? { ...mp, name, projectIds }
          : mp
      )
    )
  }

  const delete_ = (id: string) => {
    setMetaProjects(metaProjects.filter((mp) => mp.id !== id))
  }

  const getById = (id: string) => {
    return metaProjects.find((mp) => mp.id === id)
  }

  return {
    metaProjects,
    create,
    update,
    delete: delete_,
    getById,
    isLoaded
  }
}
