/**
 * API Client — Axios instance configured for the FastAPI backend.
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses — redirect to login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default apiClient;

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authApi = {
  googleLogin: () => apiClient.get('/auth/google/login'),
  microsoftLogin: () => apiClient.get('/auth/microsoft/login'),
  refreshToken: (refreshToken: string) =>
    apiClient.post('/auth/refresh', { refresh_token: refreshToken }),
  getMe: () => apiClient.get('/auth/me'),
};

// ─── Screenshots API ──────────────────────────────────────────────────────────

export const screenshotsApi = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/screenshots/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  process: (id: string) => apiClient.post(`/screenshots/${id}/process`),
  list: (page = 1, pageSize = 20) =>
    apiClient.get('/screenshots/', { params: { page, page_size: pageSize } }),
  get: (id: string) => apiClient.get(`/screenshots/${id}`),
  delete: (id: string) => apiClient.delete(`/screenshots/${id}`),
  share: (id: string, data: { user_ids: string[]; is_public: boolean }) =>
    apiClient.post(`/screenshots/${id}/share`, data),
};

// ─── Simulations API ──────────────────────────────────────────────────────────

export const simulationsApi = {
  liquidationPrice: (data: {
    balance: number;
    credit: number;
    used_margin: number;
    positions: Array<{
      symbol: string;
      type: 'buy' | 'sell';
      volume: number;
      open_price: number;
      current_price?: number;
    }>;
  }) => apiClient.post('/simulations/liquidation-price', data),

  balanceAdjustment: (data: {
    balance: number;
    credit: number;
    used_margin: number;
    target_price: number;
    positions: Array<{
      symbol: string;
      type: 'buy' | 'sell';
      volume: number;
      open_price: number;
      current_price?: number;
    }>;
  }) => apiClient.post('/simulations/balance-adjustment', data),

  history: (simType?: string, limit = 50) =>
    apiClient.get('/simulations/history', { params: { sim_type: simType, limit } }),
};

// ─── Instruments API ──────────────────────────────────────────────────────────

export const instrumentsApi = {
  list: (category?: string) =>
    apiClient.get('/instruments/', { params: { category } }),
  get: (symbol: string) => apiClient.get(`/instruments/${symbol}`),
  create: (data: any) => apiClient.post('/instruments/', data),
  update: (symbol: string, data: any) => apiClient.patch(`/instruments/${symbol}`, data),
  delete: (symbol: string) => apiClient.delete(`/instruments/${symbol}`),
};

// ─── Admin API ────────────────────────────────────────────────────────────────

export const adminApi = {
  listUsers: (page = 1, pageSize = 20, role?: string) =>
    apiClient.get('/admin/users', { params: { page, page_size: pageSize, role } }),
  updateUser: (userId: string, data: { role?: string; is_approved?: boolean }) =>
    apiClient.patch(`/admin/users/${userId}`, data),
  undeleteUser: (userId: string) => apiClient.post(`/admin/users/${userId}/undelete`),
  auditLogs: (page = 1, pageSize = 50, action?: string) =>
    apiClient.get('/admin/audit-logs', { params: { page, page_size: pageSize, action } }),
  getBranding: () => apiClient.get('/admin/config/branding'),
};
