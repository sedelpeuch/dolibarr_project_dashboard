import React from 'react'

interface ProgressBarProps {
  percent: number
  heightClass?: string
  warnThreshold?: number
  className?: string
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percent,
  heightClass = 'h-2',
  warnThreshold = 85,
  className = '',
}) => {
  const clamped = Math.max(0, Math.min(100, percent))
  const color = percent > 100 ? 'bg-red-500' : percent > warnThreshold ? 'bg-orange-500' : 'bg-blue-500'

  return (
    <div className={`w-full bg-slate-800 rounded-full ${heightClass} overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${Math.min(100, clamped)}%` }}
      />
    </div>
  )
}

export default ProgressBar
