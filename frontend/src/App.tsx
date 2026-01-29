import { useState } from 'react'
import { RefreshCw, ChevronDown, ChevronUp, Settings } from 'lucide-react'
import { useDashboard } from './hooks/useDashboard'
import { ProjectsList } from './components/ProjectsList'
import { LoadingSpinner } from './components/LoadingSpinner'
import { ErrorMessage } from './components/ErrorMessage'
import { ProjectsConfigModal } from './components/ProjectsConfigModal'

type TabType = 'projects' | 'opportunities' | 'rd'

function App() {
  const { data, loading, error, refetch } = useDashboard()
  const [activeTab, setActiveTab] = useState<TabType>('projects')
  const [showClosed, setShowClosed] = useState(false)
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)

  if (loading) {
    return <LoadingSpinner message="Chargement du dashboard..." />
  }

  if (error) {
    return <ErrorMessage error={error} onRetry={refetch} />
  }

  const projects = data?.projects.filter(p => !p.is_opportunity && !p.is_rd) || []
  const opportunities = data?.projects.filter(p => p.is_opportunity) || []
  const rd = data?.projects.filter(p => p.is_rd) || []

  const openProjects = projects.filter(p => p.status !== '2')
  const closedProjects = projects.filter(p => p.status === '2')
  
  const openOpportunities = opportunities.filter(p => p.status !== '2')
  const closedOpportunities = opportunities.filter(p => p.status === '2')
  
  const openRd = rd.filter(p => p.status !== '2')
  const closedRd = rd.filter(p => p.status === '2')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700/50 sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Balthazar</h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2.5 px-5 rounded-lg transition-all duration-200"
              title="Gérer les projets"
            >
              <Settings size={18} />
              Gérer
            </button>
            <button
              onClick={refetch}
              disabled={loading}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-slate-700 disabled:to-slate-700 text-white font-semibold py-2.5 px-5 rounded-lg transition-all duration-200 shadow-lg hover:shadow-blue-500/20"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              Rafraîchir
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-slate-900/50 border-b border-slate-700/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 flex gap-1">
          <button
            onClick={() => setActiveTab('projects')}
            className={`py-4 px-6 font-semibold transition-all duration-200 ${
              activeTab === 'projects'
                ? 'text-blue-400 border-b-2 border-blue-500'
                : 'text-slate-400 hover:text-slate-300 border-b-2 border-transparent'
            }`}
          >
            Projets <span className="text-xs ml-1 opacity-75">({openProjects.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('opportunities')}
            className={`py-4 px-6 font-semibold transition-all duration-200 ${
              activeTab === 'opportunities'
                ? 'text-blue-400 border-b-2 border-blue-500'
                : 'text-slate-400 hover:text-slate-300 border-b-2 border-transparent'
            }`}
          >
            Opportunités <span className="text-xs ml-1 opacity-75">({openOpportunities.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('rd')}
            className={`py-4 px-6 font-semibold transition-all duration-200 ${
              activeTab === 'rd'
                ? 'text-blue-400 border-b-2 border-blue-500'
                : 'text-slate-400 hover:text-slate-300 border-b-2 border-transparent'
            }`}
          >
            RD <span className="text-xs ml-1 opacity-75">({openRd.length})</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        {activeTab === 'projects' && (
          <>
            {openProjects.length > 0 ? (
              <ProjectsList projects={openProjects} />
            ) : (
              <div className="text-center py-16">
                <p className="text-slate-400 text-lg">Aucun projet ouvert trouvé</p>
              </div>
            )}
            
            {closedProjects.length > 0 && (
              <div className="mt-12 pt-10 border-t border-slate-700/50">
                <button
                  onClick={() => setShowClosed(!showClosed)}
                  className="flex items-center gap-3 text-slate-400 hover:text-slate-300 transition-colors group mb-6"
                >
                  {showClosed ? <ChevronUp size={22} className="text-blue-500" /> : <ChevronDown size={22} className="text-slate-600 group-hover:text-slate-500" />}
                  <span className="font-semibold text-lg">Projets clôturés ({closedProjects.length})</span>
                </button>
                {showClosed && <ProjectsList projects={closedProjects} />}
              </div>
            )}
          </>
        )}

        {activeTab === 'opportunities' && (
          <>
            {openOpportunities.length > 0 ? (
              <ProjectsList projects={openOpportunities} />
            ) : (
              <div className="text-center py-16">
                <p className="text-slate-400 text-lg">Aucune opportunité ouverte trouvée</p>
              </div>
            )}
            
            {closedOpportunities.length > 0 && (
              <div className="mt-12 pt-10 border-t border-slate-700/50">
                <button
                  onClick={() => setShowClosed(!showClosed)}
                  className="flex items-center gap-3 text-slate-400 hover:text-slate-300 transition-colors group mb-6"
                >
                  {showClosed ? <ChevronUp size={22} className="text-blue-500" /> : <ChevronDown size={22} className="text-slate-600 group-hover:text-slate-500" />}
                  <span className="font-semibold text-lg">Opportunités clôturées ({closedOpportunities.length})</span>
                </button>
                {showClosed && <ProjectsList projects={closedOpportunities} />}
              </div>
            )}
          </>
        )}

        {activeTab === 'rd' && (
          <>
            {openRd.length > 0 ? (
              <ProjectsList projects={openRd} />
            ) : (
              <div className="text-center py-16">
                <p className="text-slate-400 text-lg">Aucun projet RD ouvert trouvé</p>
              </div>
            )}
            
            {closedRd.length > 0 && (
              <div className="mt-12 pt-10 border-t border-slate-700/50">
                <button
                  onClick={() => setShowClosed(!showClosed)}
                  className="flex items-center gap-3 text-slate-400 hover:text-slate-300 transition-colors group mb-6"
                >
                  {showClosed ? <ChevronUp size={22} className="text-blue-500" /> : <ChevronDown size={22} className="text-slate-600 group-hover:text-slate-500" />}
                  <span className="font-semibold text-lg">Projets RD clôturés ({closedRd.length})</span>
                </button>
                {showClosed && <ProjectsList projects={closedRd} />}
              </div>
            )}
          </>
        )}
      </main>

      {/* Projects Config Modal */}
      <ProjectsConfigModal 
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
      />
    </div>
  )
}

export default App
