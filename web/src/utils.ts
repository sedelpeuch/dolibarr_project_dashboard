/**
 * Reusable utility functions
 */

import type { Project } from './types'

export const formatDate = (timestamp: number): string => {
  if (!timestamp) return '-'
  const date = new Date(timestamp * 1000)
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export const formatAmount = (amount: number): string => {
  if (amount === null || amount === undefined) return '0'
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export const formatHours = (hours: number): string => {
  return `${hours.toFixed(2)}h`
}

export const formatPaymentCondition = (code: string): string => {
  const conditions: Record<string, string> = {
    PT_5050: '50% à la commande, 50% à la livraison',
    PT_30: '30 jours',
    PT_60: '60 jours',
    PT_90: '90 jours',
    PT_UPON_DELIVERY: 'À la livraison',
    PT_DEPOSITS: 'Acomptes',
    PT_FREE: 'Gratuit',
  }
  return conditions[code] || code
}

/**
 * Calcule les jours planifiés dans l'ordre de priorité:
 * 1. Si les tâches existent et leur somme > 0, utilise la somme des planned_workload
 * 2. Sinon, utilise wp_days + rd_days
 */
export const getPlannedDays = (project: Project): number => {
  if (project.tasks && project.tasks.length > 0) {
    const taskPlannedDays = project.tasks.reduce(
      (sum, task) => sum + (task.planned_workload || 0),
      0,
    )
    if (taskPlannedDays > 0) {
      return taskPlannedDays
    }
  }
  return project.wp_days + project.rd_days
}
