import { useState } from 'react'
import type { Project, TabType, FilteredProjects } from '../types'

/**
 * Centralized app state and logic
 */
export function useAppLogic(projects: Project[] = []) {
  const [activeTab, setActiveTab] = useState<TabType>('projects')
  const [showClosed, setShowClosed] = useState(false)
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedMetaProjectId, setSelectedMetaProjectId] = useState<string | null>(null)
  const [isMetaProjectDetailOpen, setIsMetaProjectDetailOpen] = useState(false)

  // Filter projects by type
  const filtered = filterProjectsByType(projects)

  // Get projects for current tab
  const getTabProjects = () => {
    const typeMap: Record<TabType, Project[]> = {
      projects: filtered.projects,
      opportunities: filtered.opportunities,
      rd: filtered.rd,
      'meta-projects': [],
      workload: [],
      pointage: [],
    }
    const list = typeMap[activeTab]
    return showClosed ? list : list.filter((p) => p.status !== '2')
  }

  return {
    activeTab,
    setActiveTab,
    showClosed,
    setShowClosed,
    isConfigModalOpen,
    setIsConfigModalOpen,
    selectedProject,
    setSelectedProject,
    isDetailModalOpen,
    setIsDetailModalOpen,
    selectedMetaProjectId,
    setSelectedMetaProjectId,
    isMetaProjectDetailOpen,
    setIsMetaProjectDetailOpen,
    filtered,
    getTabProjects,
  }
}

/**
 * Filter projects by type (projects/opportunities/rd)
 */
export function filterProjectsByType(projects: Project[]): FilteredProjects {
  return {
    projects: projects.filter((p) => !p.is_opportunity && !p.is_rd),
    opportunities: projects.filter((p) => p.is_opportunity),
    rd: projects.filter((p) => p.is_rd),
  }
}

/**
 * Get tab label with count
 */
export function getTabLabel(label: string, count: number): string {
  return `${label} (${count})`
}
