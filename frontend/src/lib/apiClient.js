/**
 * apiClient.js — Thin wrapper around the existing axios instance.
 * Adds standard error handling: 401 → logout, 4xx/5xx → toast event.
 * Response envelope: { success, data, error }
 */

import api from './api'

// Dispatch a toast via a custom DOM event so any toast listener can pick it up
// without introducing a new dependency.
function emitToast(message, type = 'error') {
  window.dispatchEvent(new CustomEvent('leadup:toast', { detail: { message, type } }))
}

async function request(method, url, data, options = {}) {
  try {
    const config = { method, url, ...options }
    if (data !== undefined) {
      config.data = data
    }
    const res = await api.request(config)
    return { success: true, data: res.data, error: null }
  } catch (err) {
    const status = err.response?.status
    const detail =
      err.response?.data?.detail ||
      err.response?.data?.error ||
      err.message ||
      'Error inesperado'

    // 401 is already handled globally by the axios interceptor (redirect to /login)
    if (status !== 401) {
      emitToast(detail)
    }

    return { success: false, data: null, error: detail }
  }
}

const apiClient = {
  get: (url, options) => request('GET', url, undefined, options),
  post: (url, data, options) => request('POST', url, data, options),
  patch: (url, data, options) => request('PATCH', url, data, options),
  delete: (url, options) => request('DELETE', url, undefined, options),
}

export default apiClient
