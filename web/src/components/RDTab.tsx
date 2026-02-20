import React from 'react'
import type { Project } from '../types'
import { RDBanner } from './RDBanner'
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
    <>
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
    </>
  )
}

export default RDTab
