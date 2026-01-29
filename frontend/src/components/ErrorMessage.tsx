import { AlertCircle } from 'lucide-react'

interface ErrorMessageProps {
  error: Error
  onRetry?: () => void
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ error, onRetry }) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="text-center max-w-md">
        <div className="flex items-center justify-center mb-6">
          <AlertCircle size={48} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-100 mb-3">Erreur</h2>
        <p className="text-slate-400 mb-8 text-sm">{error.message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold py-2.5 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-blue-500/20"
          >
            Réessayer
          </button>
        )}
      </div>
    </div>
  )
}
