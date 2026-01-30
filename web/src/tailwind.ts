/**
 * Reusable Tailwind CSS classes
 */

export const BUTTON = {
  primary: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold py-2.5 px-5 rounded-lg transition-all shadow-lg hover:shadow-blue-500/20',
  secondary: 'bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2.5 px-5 rounded-lg transition-all',
  disabled: 'disabled:from-slate-700 disabled:to-slate-700',
}

export const CARD = {
  gradient: 'bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg p-6',
  hover: 'hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300',
}

export const TEXT = {
  muted: 'text-slate-400 text-sm',
  subtle: 'text-slate-500 text-xs',
  label: 'font-semibold text-lg',
}
