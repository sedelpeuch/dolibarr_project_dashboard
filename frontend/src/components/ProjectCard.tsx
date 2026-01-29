import React from 'react'
import { ExternalLink } from 'lucide-react'
import { Project } from '../api'
import { dolibarrLinks } from '../config'

interface ProjectCardProps {
  project: Project
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const isDeadlineUrgent = project.deadline
    ? new Date(project.deadline).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000
    : false
  const isBudgetOverrun = project.budget_remaining < 0

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-slate-100">{project.title}</h3>
            <a
              href={dolibarrLinks.project(project.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300"
            >
              <ExternalLink size={16} />
            </a>
          </div>
          <p className="text-sm text-slate-400">Ref: {project.ref}</p>
        </div>
      </div>

      {/* Client and Deadline */}
      <div className="mb-4 space-y-2">
        <p className="text-sm text-slate-300">
          Client:{' '}
          <span className="text-blue-400">
            {project.client_name || 'N/A'}
          </span>
        </p>
        <p className={`text-sm ${isDeadlineUrgent ? 'text-red-400' : 'text-slate-300'}`}>
          Deadline:{' '}
          {project.deadline ? new Date(project.deadline).toLocaleDateString('fr-FR') : 'N/A'}
        </p>
      </div>

      {/* Financial Info */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-slate-800 rounded p-3">
          <p className="text-xs text-slate-400 mb-1">Budget Total</p>
          <p className="text-lg font-semibold text-slate-100">€{(project.budget_total / 1000).toFixed(1)}k</p>
        </div>
        <div className="bg-slate-800 rounded p-3">
          <p className="text-xs text-slate-400 mb-1">Facturé</p>
          <p className="text-lg font-semibold text-green-400">€{(project.total_invoiced / 1000).toFixed(1)}k</p>
        </div>
      </div>

      {/* Budget Remaining */}
      <div className={`bg-slate-800 rounded p-3 ${isBudgetOverrun ? 'border border-red-500' : ''}`}>
        <p className="text-xs text-slate-400 mb-1">Budget Restant</p>
        <p className={`text-lg font-semibold ${isBudgetOverrun ? 'text-red-400' : 'text-slate-100'}`}>
          €{(project.budget_remaining / 1000).toFixed(1)}k
        </p>
      </div>
    </div>
  )
}
