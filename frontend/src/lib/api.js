import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: attach Bearer token from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('leadup_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('leadup_token')
      localStorage.removeItem('leadup_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

// Auth
export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
}

// Leads
export const leadsApi = {
  getToday: () => api.get('/leads/today'),
  getWeekPipeline: () => api.get('/leads/week-pipeline'),
  updateStatus: (assignmentId, status, notes) =>
    api.patch(`/leads/${assignmentId}/status`, { status, notes }),
  updateFollowup: (assignmentId, followUpDate) =>
    api.patch(`/leads/${assignmentId}/followup`, { follow_up_date: followUpDate }),
  revealPhone: (assignmentId) =>
    api.post(`/leads/${assignmentId}/reveal-phone`),
  generateReport: (assignmentId) =>
    api.post(`/leads/${assignmentId}/generate-report`),
  clearReportCache: (assignmentId) =>
    api.delete(`/leads/${assignmentId}/report-cache`),
  getCallLogs: (assignmentId) =>
    api.get(`/leads/${assignmentId}/call-logs`),
  createCallLog: (assignmentId, data) =>
    api.post(`/leads/${assignmentId}/call-logs`, data),
  getObjections: (assignmentId, force = false) =>
    api.post(`/leads/${assignmentId}/objections${force ? '?force=true' : ''}`),
  updateRejectionFeedback: (assignmentId, feedback) =>
    api.patch(`/leads/${assignmentId}/rejection-feedback`, { feedback }),
}

// Notes
export const notesApi = {
  update: (assignmentId, notes) => api.patch(`/notes/${assignmentId}`, { notes }),
  get: (assignmentId) => api.get(`/notes/${assignmentId}`),
}

// Contacts
export const contactsApi = {
  update: (contactId, data) => api.patch(`/contacts/${contactId}`, data),
}

// Reminders
export const remindersApi = {
  list: (assignmentId) => api.get(`/assignments/${assignmentId}/reminders`),
  create: (assignmentId, data) => api.post(`/assignments/${assignmentId}/reminders`, data),
  update: (assignmentId, reminderId, data) =>
    api.patch(`/assignments/${assignmentId}/reminders/${reminderId}`, data),
  delete: (assignmentId, reminderId) =>
    api.delete(`/assignments/${assignmentId}/reminders/${reminderId}`),
}

// Admin
export const adminApi = {
  assignNow: (userId = null, count = 20, industry = null) =>
    api.post('/admin/assign-now', { user_id: userId, count, ...(industry ? { industry } : {}) }),
  getAnalytics: () => api.get('/admin/analytics'),
  toggleLeadSearch: (userId, enabled) =>
    api.patch('/admin/lead-search-toggle', { user_id: userId, enabled }),
  updateUserSettings: (userId, settings) =>
    api.put(`/admin/users/${userId}/settings`, settings),
  triggerEnrichment: () => api.post('/admin/trigger-enrichment'),
  lushaLoad: () => api.post('/admin/lusha-load'),
  getUnassignedLeads: () => api.get('/admin/unassigned-leads'),
  assignBulk: (assignments) => api.post('/admin/assign-bulk', { assignments }),
  getPendingByNiche: () => api.get('/admin/pending-by-niche'),
  exportNotes: () => api.get('/admin/export-notes', { responseType: 'blob' }),
}

// Companies
export const companiesApi = {
  sectorAnalysis: (companyId) => api.post(`/companies/${companyId}/sector-analysis`),
}

// Import Leads
export const importApi = {
  upload: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/admin/import/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  validate: (data) => api.post('/admin/import/validate', data),
  assign: (payload) => api.post('/admin/import/assign', payload),
}
