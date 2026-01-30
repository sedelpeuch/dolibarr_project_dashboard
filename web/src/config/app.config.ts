// Configuration from environment variables
export const APP_CONFIG = {
  APP_NAME: import.meta.env.VITE_APP_NAME || 'Balthazar',
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  STORAGE_PREFIX: import.meta.env.VITE_APP_NAME?.toLowerCase().replace(/\s+/g, '_') || 'balthazar',
  ENABLE_META_PROJECTS: import.meta.env.VITE_ENABLE_META_PROJECTS !== 'false',
}
