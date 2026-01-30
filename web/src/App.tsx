import { RefreshCw, Settings } from 'lucide-react'
import { useDashboard } from './hooks/useDashboard'
import { useAppLogic } from './hooks/useAppLogic'
import { useMetaProjects } from './hooks/useMetaProjects'
import { ProjectsList } from './components/ProjectsList'
import { LoadingSpinner } from './components/LoadingSpinner'
import { ErrorMessage } from './components/ErrorMessage'
import { ProjectsConfigModal } from './components/ProjectsConfigModal'
import { ProjectDetailModal } from './components/ProjectDetailModal'
import { MetaProjectsTab } from './components/MetaProjectsTab'
import { MetaProjectDetailModal } from './components/MetaProjectDetailModal'
import { TabButton } from './components/TabButton'
import { APP_NAME, ENABLE_META_PROJECTS } from './config'
import { ClosedSection } from './components/ClosedSection'
import type { TabType } from './types'

function App() {
  const { data, loading, error, refetch } = useDashboard()
  const app = useAppLogic(data?.projects || [])
  const { getById } = useMetaProjects()

  if (loading) return <LoadingSpinner message="Chargement du dashboard..." />
  if (error) return <ErrorMessage error={error} onRetry={refetch} />

  const tabsConfig: Array<{ type: TabType; label: string; projects: any[] }> = [
    { type: 'projects', label: 'Projets', projects: app.filtered.projects },
    { type: 'opportunities', label: 'Opportunités', projects: app.filtered.opportunities },
    { type: 'rd', label: 'RD', projects: app.filtered.rd },
  ]

  const renderTabContent = () => {
    const config = tabsConfig.find((c) => c.type === app.activeTab)
    if (!config) return <MetaProjectsTab allProjects={data?.projects || []} onViewMetaProject={(mp) => {
      app.setSelectedMetaProjectId(mp.id)
      app.setIsMetaProjectDetailOpen(true)
    }} />

    const openProjects = config.projects.filter((p) => p.status !== '2')
    const closedProjects = config.projects.filter((p) => p.status === '2')

    return (
      <>
        {openProjects.length > 0 ? (
          <ProjectsList
            projects={openProjects}
            onProjectClick={(proj) => {
              app.setSelectedProject(proj)
              app.setIsDetailModalOpen(true)
            }}
          />
        ) : (
          <div className="text-center py-16">
            <p className="text-slate-400 text-lg">Aucun élément ouvert trouvé</p>
          </div>
        )}

        {closedProjects.length > 0 && (
          <ClosedSection
            label={config.label}
            projects={closedProjects}
            isOpen={app.showClosed}
            onToggle={() => app.setShowClosed(!app.showClosed)}
            onProjectClick={(proj) => {
              app.setSelectedProject(proj)
              app.setIsDetailModalOpen(true)
            }}
          />
        )}
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700/50 sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            {APP_NAME}
          </h1>
          <div className="flex gap-3">
            <button
              onClick={() => app.setIsConfigModalOpen(true)}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2.5 px-5 rounded-lg transition-all"
              title="Gérer les projets"
            >
              <Settings size={18} />
              Gérer
            </button>
            <button
              onClick={refetch}
              disabled={loading}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-slate-700 disabled:to-slate-700 text-white font-semibold py-2.5 px-5 rounded-lg transition-all shadow-lg hover:shadow-blue-500/20"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              Rafraîchir
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-slate-900/50 border-b border-slate-700/30 backdrop-blur-sm overflow-x-auto">
        <div className="max-w-7xl mx-auto px-6 flex gap-1">
          {tabsConfig.map((tab) => (
            <TabButton
              key={tab.type}
              label={tab.label}
              count={tab.projects.filter((p) => p.status !== '2').length}
              isActive={app.activeTab === tab.type}
              onClick={() => app.setActiveTab(tab.type)}
            />
          ))}
          {ENABLE_META_PROJECTS && (
            <TabButton
              label="Meta-Projects"
              count={0}
              isActive={app.activeTab === 'meta-projects'}
              onClick={() => app.setActiveTab('meta-projects')}
            />
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-10">{renderTabContent()}</main>

      {/* Modals */}
      <ProjectsConfigModal isOpen={app.isConfigModalOpen} onClose={() => app.setIsConfigModalOpen(false)} />
      <ProjectDetailModal
        project={app.selectedProject}
        isOpen={app.isDetailModalOpen}
        onClose={() => {
          app.setIsDetailModalOpen(false)
          app.setSelectedProject(null)
        }}
      />
      {app.selectedMetaProjectId && getById(app.selectedMetaProjectId) && (
        <MetaProjectDetailModal
          metaProject={getById(app.selectedMetaProjectId)!}
          allProjects={data?.projects || []}
          onClose={() => {
            app.setIsMetaProjectDetailOpen(false)
            app.setSelectedMetaProjectId(null)
          }}
        />
      )}
    </div>
  )
}

export default App
