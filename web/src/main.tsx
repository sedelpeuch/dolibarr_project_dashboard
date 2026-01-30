import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializeConfig } from './config'
import { LoadingSpinner } from './components/LoadingSpinner'

function RootWrapper() {
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    initializeConfig()
      .then(() => setIsReady(true))
      .catch((err) => {
        console.error('Failed to initialize:', err)
        setError('Failed to initialize application')
      })
  }, [])

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">⚠️ {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  if (!isReady) return <LoadingSpinner message="Initialisation..." />

  return <App />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootWrapper />
  </React.StrictMode>,
)
