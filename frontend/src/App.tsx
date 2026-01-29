import React, { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useDashboard } from './hooks/useDashboard'
import { ProjectsList } from './components/ProjectsList'
import { LoadingSpinner } from './components/LoadingSpinner'
import { ErrorMessage } from './components/ErrorMessage'

type TabType = 'projects' | 'opportunities' | 'rd'

function App() {
  const { data, loading, error, refetch } = useDashboard()
  const [activeTab, setActiveTab] = useState<TabType>('projects')

  if (loading) {
    return <LoadingSpinner message="Chargement du dashboard..." />
  }

  if (error) {
    return <ErrorMessage error={error} onRetry={refetch} />
  }

  const projects = data?.projects.filter(p => !p.is_opportunity && !p.is_rd) || []
  const opportunities = data?.projects.filter(p => p.is_opportunity) || []
  const rd = data?.projects.filter(p => p.is_rd) || []

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

      {/* Tabs */}
      <div className="bg-slate-900 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 flex gap-4">
          <button
            onClick={() => setActiveTab('projects')}
            className={`py-4 px-4 font-medium border-b-2 transition-colors ${
              activeTab === 'projects'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            Projets
          </button>
          <button
            onClick={() => setActiveTab('opportunities')}
            className={`py-4 px-4 font-medium border-b-2 transition-colors ${
              activeTab === 'opportunities'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            Opportunités
          </button>
          <button
            onClick={() => setActiveTab('rd')}
            className={`py-4 px-4 font-medium border-b-2 transition-colors ${
              activeTab === 'rd'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            RD
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'projects' && (
          <>
            {projects.length > 0 ? (
              <ProjectsList projects={projects} />
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-400">Aucun projet trouvé</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'opportunities' && (
          <>
            {opportunities.length > 0 ? (
              <ProjectsList projects={opportunities} />
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-400">Aucune opportunité trouvée</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'rd' && (
          <>
            {rd.length > 0 ? (
              <ProjectsList projects={rd} />
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-400">Aucun projet RD trouvé</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default App
