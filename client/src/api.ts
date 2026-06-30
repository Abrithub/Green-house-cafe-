import axios from 'axios'

/** Render API — update if your Render service URL changes */
const DEFAULT_PRODUCTION_API = 'https://green-house-api-mdhr.onrender.com'

export function getApiBase(): string {
  if (typeof window === 'undefined') {
    return (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''
  }

  const host = window.location.hostname
  const isLocal = host === 'localhost' || host === '127.0.0.1'

  // Local dev: Vite proxies /api → localhost:5000
  if (isLocal) return ''

  const fromEnv = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''
  if (fromEnv.includes('onrender.com')) return fromEnv

  // Production (Vercel etc.): call Render directly — avoids proxy timeout on cold start
  return DEFAULT_PRODUCTION_API
}

export const API_BASE = getApiBase()

export const STAFF_TOKEN_KEY = 'gh-admin-token'

const clientConfig = {
  baseURL: API_BASE || undefined,
  timeout: 90_000,
}

export const api = axios.create(clientConfig)

export function createStaffClient() {
  const token = localStorage.getItem(STAFF_TOKEN_KEY)
  return axios.create({
    ...clientConfig,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
}

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong.') {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.message.toLowerCase().includes('timeout')) {
      return 'Server is waking up (free Render plan can take up to 60 seconds). Tap Try again.'
    }
    if (error.code === 'ERR_NETWORK') {
      return `Cannot reach ${API_BASE || 'the API'}. Check Render is live, then try again.`
    }
    const data = error.response?.data
    if (typeof data === 'string' && data.includes('<!doctype html>')) {
      return 'API returned a web page instead of JSON. Check VITE_API_URL or Render URL.'
    }
    return (data as { message?: string })?.message ?? fallback
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}
