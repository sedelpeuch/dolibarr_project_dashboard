import React from 'react'
import { ExternalLink } from 'lucide-react'
import { Project } from '../api'
import { dolibarrLinks } from '../config'

interface ProjectCardProps {
  project: Project
}

const getUnitechBadge = (unittech: number): string => {
  switch (unittech) {
    case 1: return 'SIDO'
    case 2: return 'SONU'
    case 3: return 'HOMA'
    default: return ''
  }
}

const getUnitechColor = (unittech: number): string => {
  switch (unittech) {
    case 1: return 'bg-blue-500'      // SIDO
    case 2: return 'bg-green-500'     // SONU
    case 3: return 'bg-orange-500'    // HOMA
    default: return 'bg-slate-600'
  }
}

const getUnittechs = (unittechs: number[]): { badge: string; color: string }[] => {
  return unittechs
    .map((ut) => ({
      badge: getUnitechBadge(ut),
      color: getUnitechColor(ut),
    }))
    .filter((ut) => ut.badge !== '')
}

const formatDate = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleDateString('fr-FR')
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const isDeadlineUrgent = project.date_end
    ? (project.date_end * 1000) - Date.now() < 7 * 24 * 60 * 60 * 1000
    : false
  
  // Calculate amount to display based on project type
  const displayAmount = project.is_opportunity
    ? (project.opp_amount * project.opp_percent / 100)
    : project.budget_amount
  
  const unittechs = getUnittechs(project.unittech)

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-200">
      {/* Header with title and badges */}
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
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

          <p className="text-xs text-slate-500 mb-2">{project.ref}</p>
        </div>

        {/* Badges - right aligned */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {unittechs.map((ut) => (
            <span key={ut.badge} className={`${ut.color} text-white text-xs px-2 py-1 rounded font-semibold whitespace-nowrap`}>
              {ut.badge}
            </span>
          ))}
        </div>
      </div>

      {/* Client name */}
      <a
        href={dolibarrLinks.thirdparty(project.client_id)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-blue-400 hover:text-blue-300 hover:underline block mb-3"
      >
        {project.client_name || 'N/A'}
      </a>

      {/* Description */}
      {project.description && (
        <p className="text-xs text-slate-400 mb-3 line-clamp-2" dangerouslySetInnerHTML={{ __html: project.description }} />
      )}

      {/* Days and dates */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {project.wp_days > 0 && (
          <div className="bg-slate-800 rounded p-2">
            <p className="text-xs text-slate-400">Travail</p>
            <p className="text-sm font-semibold text-slate-100">{project.wp_days.toFixed(1)}j</p>
          </div>
        )}
        {project.rd_days > 0 && (
          <div className="bg-slate-800 rounded p-2">
            <p className="text-xs text-slate-400">R&D</p>
            <p className="text-sm font-semibold text-slate-100">{project.rd_days.toFixed(1)}j</p>
          </div>
        )}
        <div className="bg-slate-800 rounded p-2">
          <p className="text-xs text-slate-400">Fin</p>
          <p className={`text-sm font-semibold ${isDeadlineUrgent ? 'text-red-400' : 'text-slate-100'}`}>
            {formatDate(project.date_end)}
          </p>
        </div>
      </div>

      {/* Budget/Amount */}
      <div className="bg-slate-800 rounded p-3">
        <p className="text-xs text-slate-400 mb-1">{project.is_opportunity ? 'Opportunité' : 'Valeur vendue'}</p>
        <p className="text-lg font-semibold text-slate-100">€{displayAmount.toFixed(2)}</p>
      </div>
    </div>
  )
}
