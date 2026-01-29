import React from 'react'

interface ErrorMessageProps {
  error: Error
  onRetry?: () => void
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ error, onRetry }) => {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="text-red-500 text-4xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-slate-100 mb-2">Erreur</h2>
        <p className="text-slate-400 mb-6">{error.message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            Réessayer
          </button>
        )}
      </div>
    </div>
  )
}
