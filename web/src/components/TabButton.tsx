import React from 'react'

interface TabButtonProps {
  label: string
  count: number
  isActive: boolean
  onClick: () => void
}

export const TabButton: React.FC<TabButtonProps> = ({ label, count, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`py-4 px-6 font-semibold transition-all duration-200 whitespace-nowrap ${
      isActive
        ? 'text-blue-400 border-b-2 border-blue-500'
        : 'text-slate-400 hover:text-slate-300 border-b-2 border-transparent'
    }`}
  >
    {label} <span className="text-xs ml-1 opacity-75">({count})</span>
  </button>
)
