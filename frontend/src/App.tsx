import React from 'react'
import { RefreshCw } from 'lucide-react'
import { useDashboard } from './hooks/useDashboard'
import { ProjectsList } from './components/ProjectsList'
import { LoadingSpinner } from './components/LoadingSpinner'
import { ErrorMessage } from './components/ErrorMessage'

function App() {
  const { data, loading, error, refetch } = useDashboard()

  if (loading) {
    return <LoadingSpinner message="Chargement du dashboard..." />
  }

  if (error) {
    return <ErrorMessage error={error} onRetry={refetch} />
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Dashboard Dolibarr</h1>
            <p className="text-sm text-slate-400">Coordinateur de projets</p>
          </div>
          <button
            onClick={refetch}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Rafraîchir
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-slate-100 mb-6">Mes Projets ({data?.projects.length || 0})</h2>
          {data && <ProjectsList projects={data.projects} />}
        </section>
      </main>
    </div>
  )
}

export default App
