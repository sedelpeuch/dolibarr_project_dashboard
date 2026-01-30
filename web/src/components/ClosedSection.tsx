import React from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { ProjectsList } from './ProjectsList'
import type { Project } from '../types'

interface ClosedSectionProps {
  label: string
  projects: Project[]
  isOpen: boolean
  onToggle: () => void
  onProjectClick: (project: Project) => void
}

export const ClosedSection: React.FC<ClosedSectionProps> = ({
  label,
  projects,
  isOpen,
  onToggle,
  onProjectClick,
}) => (
  <div className="mt-12 pt-10 border-t border-slate-700/50">
    <button
      onClick={onToggle}
      className="flex items-center gap-3 text-slate-400 hover:text-slate-300 transition-colors group mb-6"
    >
      {isOpen ? (
        <ChevronUp size={22} className="text-blue-500" />
      ) : (
        <ChevronDown size={22} className="text-slate-600 group-hover:text-slate-500" />
      )}
      <span className="font-semibold text-lg">
        {label} clôturés ({projects.length})
      </span>
    </button>
    {isOpen && <ProjectsList projects={projects} onProjectClick={onProjectClick} />}
  </div>
)
