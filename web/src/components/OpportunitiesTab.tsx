import React, { useState } from 'react'
import { useDashboard } from '../hooks/useDashboard'
import { useOpportunities } from '../hooks/useOpportunities'
import { OpportunitiesStats } from './OpportunitiesStats'
import { OpportunitiesKanban } from './OpportunitiesKanban'
import { ProjectDetailModal } from './ProjectDetailModal'
import { LoadingSpinner } from './LoadingSpinner'
import type { OpportunitySummary, Project } from '../types'

export const OpportunitiesTab: React.FC = () => {
  const { data: dashboardData } = useDashboard()
  const { stats, pipeline, loading, error } = useOpportunities()
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  const handleOpportunityClick = (opp: OpportunitySummary) => {
    const fullProject = dashboardData?.projects.find((p) => p.id.toString() === opp.id.toString())
    if (fullProject) {
      setSelectedProject(fullProject)
      setIsDetailModalOpen(true)
    }
  }

  if (loading) return <LoadingSpinner />
  if (error) return <div className="text-center py-12 text-red-400">Erreur : {error.message}</div>

  return (
    <div className="max-w-full">
      <OpportunitiesStats stats={stats} />
      <OpportunitiesKanban pipeline={pipeline} onOpportunityClick={handleOpportunityClick} />
      
      <ProjectDetailModal
        project={selectedProject}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false)
          setSelectedProject(null)
        }}
      />
    </div>
  )
}
