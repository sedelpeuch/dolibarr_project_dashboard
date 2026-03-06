import React from 'react'
import type { Project } from '../types'
import { RDBanner } from './RDBanner'
import RDTimeline from './RDTimeline'
import { ProjectsList } from './ProjectsList'
import { ClosedSection } from './ClosedSection'

interface RDTabProps {
  projects: Project[]
  showClosed: boolean
  onToggleClosed: () => void
  onProjectClick: (project: Project) => void
}

export const RDTab: React.FC<RDTabProps> = ({ projects, showClosed, onToggleClosed, onProjectClick }) => {
  const openProjects = projects.filter((p) => p.status !== '2')
  const closedProjects = projects.filter((p) => p.status === '2')

  return (
    <div className="space-y-6">
      {/* Responsive split: on large screens show main content left and timeline right (30%) */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:gap-6">
        <div className="flex-1">
          <RDBanner />

          {openProjects.length > 0 ? (
            <ProjectsList projects={openProjects} onProjectClick={onProjectClick} />
          ) : (
            <div className="text-center py-16">
              <p className="text-slate-400 text-lg">Aucun élément ouvert trouvé</p>
            </div>
          )}

          {closedProjects.length > 0 && (
            <ClosedSection
              label="RD"
              projects={closedProjects}
              isOpen={showClosed}
              onToggle={onToggleClosed}
              onProjectClick={onProjectClick}
            />
          )}
        </div>

        <div className="lg:w-[30%] lg:shrink-0">
          <RDTimeline />
        </div>
      </div>
    </div>
  )
}

export default RDTab
