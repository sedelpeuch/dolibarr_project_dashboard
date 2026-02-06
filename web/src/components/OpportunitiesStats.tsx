import React from 'react'
import { TrendingUp } from 'lucide-react'
import type { OpportunityStats } from '../types'

const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export const OpportunitiesStats: React.FC<{ stats: OpportunityStats | null }> = ({ stats }) => {
  if (!stats) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {/* Conversion Rate */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-slate-400 text-sm font-medium mb-2">Taux de transformation</div>
            <div className="text-3xl font-bold text-blue-300">{stats.conversion_rate.toFixed(1)}%</div>
            <div className="text-xs text-slate-500 mt-2">
              {stats.won_count} gagnés / {stats.lost_count} perdues / {stats.open_count} en cours
            </div>
          </div>
          <TrendingUp size={24} className="text-blue-400 opacity-50" />
        </div>
      </div>

      {/* Total Open Amount (not lost) */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700">
        <div>
          <div className="text-slate-400 text-sm font-medium mb-2">Montant ouvert</div>
          <div className="text-2xl font-bold text-green-300">{formatAmount(stats.potential_amount)}</div>
          <div className="text-xs text-slate-500 mt-2">{stats.open_count} opportunités ouvertes</div>
        </div>
      </div>

      {/* Weighted Open Amount */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700">
        <div>
          <div className="text-slate-400 text-sm font-medium mb-2">Montant pondéré ouvert</div>
          <div className="text-2xl font-bold text-amber-300">{formatAmount(stats.weighted_open_amount)}</div>
          <div className="text-xs text-slate-500 mt-2">{stats.open_count} opportunités ouvertes</div>
        </div>
      </div>
    </div>
  )
}
