export const formatDate = (timestamp: number): string => {
  if (!timestamp) return '-'
  const date = new Date(timestamp * 1000)
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export const formatAmount = (amount: number): string => {
  if (amount === null || amount === undefined) return '0'
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

export const formatPaymentCondition = (code: string): string => {
  const conditions: { [key: string]: string } = {
    PT_5050: '50% à la commande, 50% à la livraison',
    PT_30: '30 jours',
    PT_60: '60 jours',
    PT_90: '90 jours',
    PT_UPON_DELIVERY: 'À la livraison',
    PT_DEPOSITS: 'Acomptes',
    PT_FREE: 'Gratuit'
  }
  return conditions[code] || code
}
