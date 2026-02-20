import React from 'react'

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

        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full ${percent > 85 ? 'bg-orange-500' : 'bg-blue-500'}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <hr className="border-slate-700 mt-4 mb-6" />
    </>
  )
}

export default RDBanner
