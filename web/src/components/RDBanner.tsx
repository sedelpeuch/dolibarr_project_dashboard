import React from 'react'
import ProgressBar from './ProgressBar'

export const RDBanner: React.FC = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const end = new Date(now.getFullYear() + 1, 0, 1)
  const percent = Math.min(
    100,
    Math.max(0, ((now.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100),
  )

  return (
    <>
      <div className="mb-6 p-4 bg-slate-900/40">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Consommation de l'année</p>
          </div>
          <div className="text-slate-300 font-semibold">{percent.toFixed(0)}%</div>
        </div>

        <ProgressBar percent={percent} />
      </div>

      <hr className="border-slate-700 mt-4 mb-6" />
    </>
  )
}

export default RDBanner
