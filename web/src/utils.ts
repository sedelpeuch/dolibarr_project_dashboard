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

export const computeElapsedPercent = (startTs: number, endTs: number, now?: Date): number => {
  if (!startTs || !endTs || endTs <= startTs) return 0
  const n = now ? Math.floor(now.getTime() / 1000) : Math.floor(Date.now() / 1000)
  const percent = ((n - startTs) / (endTs - startTs)) * 100
  return Math.min(100, Math.max(0, percent))
}

export const computeYearPercent = (year: number, now?: Date): number => {
  const n = now || new Date()
  const start = new Date(year, 0, 1).getTime()
  const end = new Date(year + 1, 0, 1).getTime()
  const percent = ((n.getTime() - start) / (end - start)) * 100
  return Math.min(100, Math.max(0, percent))
}

export const extractPaymentSchedule = (
  code: string,
  proposal: { date_signature: number | null; delivery_date: number | null; total: number },
): Array<{ percentage: number; date: number | null; label: string }> => {
  if (!code) return []

  const schedule: Array<{ percentage: number; date: number | null; label: string }> = []
  const parts = code.replace('PaymentCondition', '').replace('PT_', '')

  if (parts.match(/^\d{4}$/)) {
    const first = parseInt(parts.substring(0, 2))
    const second = parseInt(parts.substring(2, 4))

    if (first > 0 && proposal.date_signature) {
      schedule.push({ percentage: first, date: proposal.date_signature, label: `${first}% signature` })
    }
    if (second > 0 && proposal.delivery_date) {
      schedule.push({ percentage: second, date: proposal.delivery_date, label: `${second}% livraison` })
    }
  }

  if ((parts === '100' || parts === '000100') && proposal.delivery_date) {
    schedule.push({ percentage: 100, date: proposal.delivery_date, label: '100% livraison' })
  }

  return schedule
}
