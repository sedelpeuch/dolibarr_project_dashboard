/**
 * Unified configuration - environment + constants
 */

// App metadata
export const APP_NAME = 'Dolibarr Dashboard'

// Build API URL dynamically from current location
const getAPIUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  let url = window.location.href
  url = url.substring(0, url.lastIndexOf(':'))
  return url + ':41587/api'
}

export const API_URL = getAPIUrl()
export const ENABLE_META_PROJECTS = true

// Dolibarr URL loaded from API at runtime
let DOLIBARR_URL = import.meta.env.VITE_DOLIBARR_URL || ''

export async function initializeConfig(): Promise<void> {
  if (!DOLIBARR_URL) {
    try {
      const response = await fetch(`${API_URL.replace('/api', '')}/api/config`)
      const data = await response.json()
      DOLIBARR_URL = data.dolibarrUrl
    } catch (error) {
      console.error('Failed to load Dolibarr URL from API:', error)
      DOLIBARR_URL = import.meta.env.VITE_DOLIBARR_URL || ''
    }
  }
}

export function getDolibarrUrl(): string {
  return DOLIBARR_URL
}

// Dolibarr links builder
export const dolibarrLinks = {
  project: (id: number) => `${getDolibarrUrl()}/projet/card.php?id=${id}`,
  proposal: (id: number) => `${getDolibarrUrl()}/comm/propal/card.php?id=${id}`,
  invoice: (id: number) => `${getDolibarrUrl()}/compta/facture/card.php?id=${id}`,
  contact: (id: number) => `${getDolibarrUrl()}/contact/card.php?id=${id}`,
  user: (id: number) => `${getDolibarrUrl()}/user/card.php?id=${id}`,
  company: (id: number) => `${getDolibarrUrl()}/societe/card.php?socid=${id}`,
  thirdparty: (id: string | number) => `${getDolibarrUrl()}/societe/project.php?socid=${id}`,
  task: (id: number) => `${getDolibarrUrl()}/projet/tasks/task.php?id=${id}&withproject=1`,
}

// Unit tech mapping
export const UNITECH_MAP: Record<number, string> = {
  1: 'SIDO',
  2: 'SONU',
  3: 'HOMA',
}

export const UNITECH_COLORS: Record<number, string> = {
  1: 'bg-blue-500',
  2: 'bg-[#45a288]',
  3: 'bg-orange-500',
}
