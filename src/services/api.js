/**
 * Nexus QA - API Service
 * Backend ile iletişim için axios client
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Token varsa ekle (gelecekte auth için)
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error.response?.data || error);
  }
);

// ==================== PROJECTS ====================

export const projectsAPI = {
  getAll: (params) => api.get('/projects', { params }),
  getById: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  getStats: (id) => api.get(`/projects/${id}/stats`),
};

// ==================== AGENTS ====================

export const agentsAPI = {
  getAll: () => api.get('/agents'),
  getById: (id) => api.get(`/agents/${id}`),
  getStatus: (id) => api.get(`/agents/${id}/status`),
  updateStatus: (id, data) => api.put(`/agents/${id}/status`, data),
  start: (id, data) => api.post(`/agents/${id}/start`, data),
  stop: (id) => api.post(`/agents/${id}/stop`),
  reset: () => api.post('/agents/reset'),
  getLogs: (id, params) => api.get(`/agents/${id}/logs`, { params }),
};

// ==================== TEST SUITES ====================

export const testSuitesAPI = {
  getAll: (params) => api.get('/tests/suites', { params }),
  getById: (id) => api.get(`/tests/suites/${id}`),
  create: (data) => api.post('/tests/suites', data),
  update: (id, data) => api.put(`/tests/suites/${id}`, data),
  delete: (id) => api.delete(`/tests/suites/${id}`),
  run: (id, data) => api.post(`/tests/suites/${id}/run`, data),
};

// ==================== TEST CASES ====================

export const testCasesAPI = {
  getBySuite: (suiteId, params) => api.get(`/tests/suites/${suiteId}/cases`, { params }),
  create: (suiteId, data) => api.post(`/tests/suites/${suiteId}/cases`, data),
  update: (id, data) => api.put(`/tests/cases/${id}`, data),
  delete: (id) => api.delete(`/tests/cases/${id}`),
};

// ==================== TEST RUNS ====================

export const testRunsAPI = {
  getAll: (params) => api.get('/tests/runs', { params }),
  getById: (id) => api.get(`/tests/runs/${id}`),
  getLogs: (id) => api.get(`/tests/runs/${id}/logs`),
  cancel: (id) => api.post(`/tests/runs/${id}/cancel`),
};

// ==================== LOGS ====================

export const logsAPI = {
  getAll: (params) => api.get('/tests/logs', { params }),
  create: (data) => api.post('/tests/logs', data),
};

// ==================== DOCUMENTS ====================

export const documentsAPI = {
  getAll: (params) => api.get('/documents', { params }),
  getById: (id) => api.get(`/documents/${id}`),
  upload: (formData) => api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  parse: (id) => api.post(`/documents/${id}/parse`),
  delete: (id) => api.delete(`/documents/${id}`),
  generateFromText: (data) => api.post('/documents/generate-from-text', data, { timeout: 180000 }), // 3 min timeout for AI
};

// ==================== SCENARIOS ====================

export const scenariosAPI = {
  getAll: (params) => api.get('/scenarios', { params }),
  getById: (id) => api.get(`/scenarios/${id}`),
  create: (data) => api.post('/scenarios', data),
  update: (id, data) => api.put(`/scenarios/${id}`, data),
  delete: (id) => api.delete(`/scenarios/${id}`),
  automate: (id, data) => api.post(`/scenarios/${id}/automate`, data),
};

// ==================== DASHBOARD ====================

export const dashboardAPI = {
  getStats: () => api.get('/tests/dashboard'),
};

// ==================== AUTOMATION ====================

export const automationAPI = {
  // Tam otomasyon iş akışı
  start: (data) => api.post('/automation/start', data),

  // Tek senaryo işlemleri
  discoverElements: (scenarioId, data) => api.post(`/automation/discover/${scenarioId}`, data),
  generateScript: (scenarioId) => api.post(`/automation/generate/${scenarioId}`),
  runTest: (scenarioId) => api.post(`/automation/run/${scenarioId}`),

  // İş akışı yönetimi
  getWorkflowStatus: (workflowId) => api.get(`/automation/status/${workflowId}`),
  cancelWorkflow: (workflowId) => api.post(`/automation/cancel/${workflowId}`),

  // Proje konfigürasyonu
  testConnection: (data) => api.post('/automation/test-connection', data),
  analyzePage: (data) => api.post('/automation/analyze-page', data),
  updateProjectConfig: (projectId, data) => api.put(`/automation/project-config/${projectId}`, data),
};

export default api;
