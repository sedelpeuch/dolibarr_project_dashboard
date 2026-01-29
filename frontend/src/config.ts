export const API_URL = import.meta.env.VITE_API_URL || 'http://0.0.0.0:41587/api'

export const DOLIBARR_URL = import.meta.env.VITE_DOLIBARR_URL || 'https://your-dolibarr.com'

// Links to Dolibarr resources
export const dolibarrLinks = {
  project: (id: number) => `${DOLIBARR_URL}/projet/card.php?id=${id}`,
  proposal: (id: number) => `${DOLIBARR_URL}/comm/propal/card.php?id=${id}`,
  invoice: (id: number) => `${DOLIBARR_URL}/compta/facture/card.php?id=${id}`,
  contact: (id: number) => `${DOLIBARR_URL}/contact/card.php?id=${id}`,
  user: (id: number) => `${DOLIBARR_URL}/user/card.php?id=${id}`,
  company: (id: number) => `${DOLIBARR_URL}/societe/card.php?socid=${id}`,
  thirdparty: (id: string | number) => `${DOLIBARR_URL}/societe/project.php?socid=${id}`,
}
