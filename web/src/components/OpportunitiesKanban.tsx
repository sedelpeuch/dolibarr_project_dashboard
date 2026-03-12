import React from 'react'
import type { OpportunityStageGroup, OpportunitySummary } from '../types'

const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Order définit et configuration des étapes
const STAGES_ORDER = [
  'Prospection',
  'Qualification',
  'Proposition',
  'Négociation',
  'En attente',
  'Perdue',
]

const stageConfig: Record<string, { gradient: string; iconColor: string; probability: number }> = {
  'Prospection': { gradient: 'from-blue-500/20 to-blue-600/20 border-blue-500/40', iconColor: 'text-blue-400', probability: 0 },
  'Qualification': { gradient: 'from-cyan-500/20 to-cyan-600/20 border-cyan-500/40', iconColor: 'text-cyan-400', probability: 10 },
  'Proposition': { gradient: 'from-indigo-500/20 to-indigo-600/20 border-indigo-500/40', iconColor: 'text-indigo-400', probability: 30 },
  'Négociation': { gradient: 'from-amber-500/20 to-amber-600/20 border-amber-500/40', iconColor: 'text-amber-400', probability: 50 },
  'En attente': { gradient: 'from-orange-500/20 to-orange-600/20 border-orange-500/40', iconColor: 'text-orange-400', probability: 50 },
  'Perdue': { gradient: 'from-red-500/20 to-red-600/20 border-red-500/40', iconColor: 'text-red-400', probability: 0 },
}

interface OpportunitiesKanbanProps {
  pipeline: OpportunityStageGroup[]
  onOpportunityClick?: (opp: OpportunitySummary) => void
}

export const OpportunitiesKanban: React.FC<OpportunitiesKanbanProps> = ({ pipeline, onOpportunityClick }) => {
  // Créer un map des opportunités par étape pour garantir l'ordre
  const opportunitiesByStage = new Map<string, OpportunitySummary[]>()
  
  // Initialiser avec toutes les étapes (vides)
  STAGES_ORDER.forEach(stage => opportunitiesByStage.set(stage, []))
  
  // Remplir avec les données du pipeline
  pipeline.forEach(stageGroup => {
    if (opportunitiesByStage.has(stageGroup.stage)) {
      opportunitiesByStage.set(stageGroup.stage, stageGroup.opportunities)
    } else {
      // Si l'étape n'est pas reconnue, la mettre en "Non classé"
      const nonClassedOpps = opportunitiesByStage.get('Non classé') || []
      opportunitiesByStage.set('Non classé', [...nonClassedOpps, ...stageGroup.opportunities])
    }
  })

  return (
    <div className="grid grid-cols-3 gap-4">
      {STAGES_ORDER.map((stageName) => {
        const config = stageConfig[stageName]
        const opportunities = opportunitiesByStage.get(stageName) || []

        return (
          <div
            key={stageName}
            className={`rounded-xl overflow-hidden backdrop-blur-sm border-2 transition-all duration-300 shadow-xl hover:shadow-2xl bg-gradient-to-b ${config.gradient}`}
          >
            {/* Stage Header */}
            <div className="bg-gradient-to-r from-slate-900/80 to-slate-800/80 backdrop-blur-sm border-b border-slate-700/50 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-bold text-slate-100 text-sm">{stageName}</h3>
                  <p className="text-xs text-slate-400 mt-1">{opportunities.length} opp</p>
                </div>
                <div className="text-right">
                  <div className={`text-xl font-bold ${config.iconColor}`}>{config.probability}%</div>
                </div>
              </div>
            </div>

            {/* Opportunities Cards */}
            <div className="p-3 min-h-[400px] space-y-3">
              {opportunities.length === 0 ? (
                <div className="flex items-center justify-center h-full min-h-[350px]">
                  <p className="text-slate-500/50 text-xs text-center">Aucune<br/>opportunité</p>
                </div>
              ) : (
                opportunities.map((opp) => (
                  <div
                    key={opp.id}
                    onClick={() => onOpportunityClick?.(opp)}
                    className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-3 shadow-lg border border-slate-600 hover:border-slate-500 hover:shadow-xl transition-all duration-200 cursor-pointer group"
                  >
                    <div className="font-semibold text-slate-100 text-xs truncate group-hover:text-blue-300 transition-colors">
                      {opp.title}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 truncate">{opp.ref}</div>

                    <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-2">
                      <div className="flex justify-between items-end">
                        <span className="text-xs text-slate-500 font-medium">Montant</span>
                        <span className="text-xs font-bold text-slate-200">
                          {formatAmount(opp.opp_amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
