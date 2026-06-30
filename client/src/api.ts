import axios from 'axios'

/** Empty in local dev — Vite proxies /api to localhost:5000. Set on Vercel to your API host. */
export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''

export const STAFF_TOKEN_KEY = 'gh-admin-token'

export const api = axios.create({
  baseURL: API_BASE || undefined,
})

export function createStaffClient() {
  const token = localStorage.getItem(STAFF_TOKEN_KEY)
  return axios.create({
    baseURL: API_BASE || undefined,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
}

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong.') {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { message?: string })?.message ?? fallback
  }
  return fallback
}
