import React, { useState, useMemo } from 'react'
import { format, eachMonthOfInterval } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useProjectTimeline } from '../hooks/useProjectTimeline'
import type { Project } from '../types'

const getColorClass = (color: 'green' | 'orange' | 'red'): string => {
  switch (color) {
    case 'green':
      return 'bg-emerald-400'
    case 'orange':
      return 'bg-amber-400'
    case 'red':
      return 'bg-rose-400'
  }
}

const getGlowClass = (color: 'green' | 'orange' | 'red'): string => {
  switch (color) {
    case 'green':
      return 'shadow-emerald-500/50'
    case 'orange':
      return 'shadow-amber-500/50'
    case 'red':
      return 'shadow-rose-500/50'
  }
}

export const ProjectTimeline: React.FC<{
  projects: Project[]
  onProjectClick?: (project: Project) => void
}> = ({ projects, onProjectClick }) => {
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const { minDate, maxDate, todayTimestamp, todayPosition, timelineItems } = useProjectTimeline(projects)

  // Generate month labels - MUST be called before early return
  const months = useMemo(() => {
    if (!minDate || !maxDate) return []
    return eachMonthOfInterval({
      start: new Date(minDate),
      end: new Date(maxDate),
    })
  }, [minDate, maxDate])

  if (!minDate || !maxDate || timelineItems.length === 0) {
    return null
  }

  // Convert timestamps to Date objects
  const minDateObj = new Date(minDate)
  const maxDateObj = new Date(maxDate)
  const range = maxDate - minDate
  const totalDays = Math.max(Math.ceil(range / (1000 * 60 * 60 * 24)), 1)

  const getMonthPosition = (monthDate: Date): number => {
    const daysFromStart = Math.ceil((monthDate.getTime() - minDate) / (1000 * 60 * 60 * 24))
    const position = (daysFromStart / totalDays) * 100
    return Math.max(0, Math.min(100, position))
  }

  return (
    <div className="mb-12 py-8">
      {/* Month labels - exclude first and last */}
      <div className="relative mb-12 h-5 px-2">
        {months.map((month, idx) => {
          // Skip first and last month
          if (idx === 0 || idx === months.length - 1) return null
          return (
            <div
              key={idx}
              className="absolute text-xs font-semibold text-slate-400 -translate-x-1/2 top-0 tracking-wider opacity-60 hover:opacity-100 transition-opacity"
              style={{ left: `${getMonthPosition(month)}%` }}
            >
              {format(month, 'MMM', { locale: fr }).toUpperCase()}
            </div>
          )
        })}
      </div>

      {/* Timeline bar */}
      <div className="relative px-2" style={{ height: '80px' }}>
        {/* Central line - prominent */}
        <div className="absolute inset-x-0 top-1/2 h-1 bg-gradient-to-r from-transparent via-slate-500/60 to-transparent transform -translate-y-1/2 rounded-full" />

        {/* Today marker - just the dot */}
        <div
          className="absolute top-1/2 transform -translate-y-1/2 z-20"
          style={{ left: `${todayPosition}%` }}
        >
          <div className="relative -translate-x-1/2">
            {/* Outer ring */}
            <div className="absolute -inset-3 bg-blue-400/20 rounded-full animate-pulse" />
            {/* Main dot */}
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-300 to-blue-500 shadow-lg shadow-blue-400/50" />
          </div>
        </div>

        {/* Markers */}
        {timelineItems.map((item) => (
          <div
            key={item.id}
            className="absolute top-1/2 z-10"
            style={{ left: `${item.positionPercent}%` }}
            onClick={() => {
              const project = projects.find((p) => p.id === item.id)
              if (project) {
                onProjectClick?.(project)
              }
            }}
            onMouseEnter={() => setHoveredId(item.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            {/* Marker positioned on the line */}
            <div className="relative cursor-pointer group/marker transform -translate-x-1/2 -translate-y-1/2">
              {/* Outer glow on hover */}
              <div
                className={`absolute -inset-3 rounded-full opacity-0 group-hover/marker:opacity-100 blur-md transition-all duration-300 ${getGlowClass(item.color)}`}
                style={{ boxShadow: `0 0 16px currentColor` }}
              />
              
              {/* Inner circle */}
              <div
                className={`w-4 h-4 rounded-full transition-all duration-200 group-hover/marker:scale-150 shadow-lg ${getColorClass(item.color)} ${getGlowClass(item.color)}`}
              />
            </div>

            {/* Tooltip */}
            {hoveredId === item.id && (
              <div className="absolute left-1/2 transform -translate-x-1/2 -top-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white px-4 py-3 rounded-xl text-xs border border-white/10 shadow-2xl z-50 backdrop-blur-md whitespace-nowrap">
                <div className="font-bold text-slate-100 tracking-tight">{item.title}</div>
                <div className="text-slate-300 text-xs mt-1.5">
                  {format(new Date(item.deadline), 'd MMM yyyy', { locale: fr })}
                </div>
                {item.daysUntilDeadline > 0 ? (
                  <div className="text-slate-400 text-xs mt-1.5 font-medium">J-{item.daysUntilDeadline}</div>
                ) : (
                  <div className="text-rose-400 text-xs mt-1.5 font-medium">Dépassé</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
