export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:41587/api'

// This will be fetched at runtime from the API
let DOLIBARR_URL = import.meta.env.VITE_DOLIBARR_URL || ''

// Function to load Dolibarr URL from API
export async function initializeConfig() {
  if (!DOLIBARR_URL) {
    try {
      const response = await fetch(`${API_URL.replace('/api', '')}/api/config`)
      const data = await response.json()
      DOLIBARR_URL = data.dolibarrUrl
    } catch (error) {
      console.error('Failed to load Dolibarr URL from API:', error)
      // Fallback to env var if API fails
      DOLIBARR_URL = import.meta.env.VITE_DOLIBARR_URL || 'https://your-dolibarr.com'
    }
  }
}

export function getDolibarrUrl(): string {
  return DOLIBARR_URL
}

// Links to Dolibarr resources
export const dolibarrLinks = {
  project: (id: number) => `${getDolibarrUrl()}/projet/card.php?id=${id}`,
  proposal: (id: number) => `${getDolibarrUrl()}/comm/propal/card.php?id=${id}`,
  invoice: (id: number) => `${getDolibarrUrl()}/compta/facture/card.php?id=${id}`,
  contact: (id: number) => `${getDolibarrUrl()}/contact/card.php?id=${id}`,
  user: (id: number) => `${getDolibarrUrl()}/user/card.php?id=${id}`,
  company: (id: number) => `${getDolibarrUrl()}/societe/card.php?socid=${id}`,
  thirdparty: (id: string | number) => `${getDolibarrUrl()}/societe/project.php?socid=${id}`,
}
