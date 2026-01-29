import React from 'react'
import { ExternalLink } from 'lucide-react'
import { Project } from '../api'
import { dolibarrLinks } from '../config'

interface ProjectCardProps {
  project: Project
  onDetailClick?: (project: Project) => void
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
    case 1: return 'bg-blue-500'       // SIDO
    case 2: return 'bg-[#45a288]'      // SONU
    case 3: return 'bg-orange-500'     // HOMA
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

const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onDetailClick }) => {
  // Calculate amount to display based on project type
  const displayAmount = project.is_opportunity
    ? (project.opp_amount * project.opp_percent / 100)
    : project.budget_amount
  
  const unittechs = getUnittechs(project.unittech)

  return (
    <div 
      onClick={() => onDetailClick?.(project)}
      className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg p-6 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 cursor-pointer"
    >
      {/* Header with title and badges */}
      <div className="mb-4">
        <div className="flex items-start justify-between mb-2 gap-3">
          <a
            href={dolibarrLinks.project(project.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-2 flex-1 min-w-0 hover:text-blue-300 transition-colors group"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-slate-100">{project.title}</h3>
            <ExternalLink size={14} className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
          </a>

          {/* Badges - right aligned */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {unittechs.map((ut) => (
              <span key={ut.badge} className={`${ut.color} text-white text-xs px-2 py-1 rounded font-semibold whitespace-nowrap shadow-lg`}>
                {ut.badge}
              </span>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-500 truncate">{project.ref}</p>
      </div>

      {/* Client name */}
      {!project.is_rd && (
        <a
          href={dolibarrLinks.thirdparty(project.client_id)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-400 hover:text-blue-300 hover:underline block mb-4 font-medium transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {project.client_name || 'N/A'}
        </a>
      )}

      {/* Info rows */}
      <div className="space-y-2 text-sm">
        {/* Jours */}
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Jours</span>
          <div className="flex gap-2">
            {project.time_spent_total > 0 && (
              <span className="bg-amber-500/20 text-amber-300 px-2 py-1 rounded font-semibold">
                {project.time_spent_total.toFixed(1)}⏱
              </span>
            )}
            {(project.wp_days + project.rd_days) > 0 && (
              <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded font-semibold">
                {(project.wp_days + project.rd_days).toFixed(1)}
              </span>
            )}
            {project.wp_days === 0 && project.rd_days === 0 && project.time_spent_total === 0 && !project.is_opportunity && (
              <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded font-semibold">Aucun jour</span>
            )}
          </div>
        </div>

        {/* Dates */}
        {!project.is_rd && (
          <div className="flex justify-between items-center text-slate-300">
            <span className="text-slate-400">Période</span>
            {(project.date_end === 0 || !project.date_end) && !project.is_opportunity ? (
              <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded font-semibold">Pas de deadline</span>
            ) : (
              <span className="font-semibold">
                {formatDate(project.date_start)} → {formatDate(project.date_end)}
              </span>
            )}
          </div>
        )}

        {/* Budget */}
        {!project.is_rd && (
          <div className="flex justify-between items-center text-slate-300 pt-2 border-t border-slate-700/50">
            <span className="text-slate-400">{project.is_opportunity ? 'Opportunité' : 'Budget'}</span>
            {displayAmount === 0 && project.total_invoiced === 0 && !project.is_opportunity ? (
              <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded font-semibold">Pas de budget</span>
            ) : (
              <span className="font-bold">
                {project.total_invoiced > 0 
                  ? <><span className="text-amber-400">{formatAmount(project.total_invoiced)}</span> / <span className="text-blue-400">{formatAmount(displayAmount)}</span> €</>
                  : <span className="text-blue-400">{formatAmount(displayAmount)} €</span>
                }
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
