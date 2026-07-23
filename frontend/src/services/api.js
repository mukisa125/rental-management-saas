import axios from 'axios';

const resolveApiUrl = () => {
  const raw = String(import.meta.env.VITE_API_URL || 'http://localhost:5000').trim().replace(/\/+$/, '');
  if (!raw) return 'http://localhost:5000/api';
  if (raw.endsWith('/api')) return raw;
  return `${raw}/api`;
};

const API_URL = resolveApiUrl();

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

export const propertySeekerAPI = {
  getPublicListings: (params) => api.get('/public/vacant-listings', { params }),
  getPricing: () => api.get('/public/property-seeker-pricing'),
  getGoogleAuthConfig: () => api.get('/property-seeker/auth/google/config'),
  googleAuth: (data) => api.post('/property-seeker/auth/google', data),
  getMe: () => api.get('/property-seeker/me'),
  updateProfile: (data) => api.put('/property-seeker/profile', data),
  createPayment: (data) => api.post('/property-seeker/payments', data),
  unlockListing: (listingId) => api.post(`/property-seeker/unlock-listing/${listingId}`),
  getDashboard: () => api.get('/property-seeker/dashboard'),
};

// Properties API
export const propertyAPI = {
  getAll: () => api.get('/properties'),
  getById: (id) => api.get(`/properties/${id}`),
  create: (data) => api.post('/properties', data),
  update: (id, data) => api.put(`/properties/${id}`, data),
  delete: (id) => api.delete(`/properties/${id}`),
};

// Units API
export const unitAPI = {
  getAll: (params) => api.get('/units', { params }),
  getById: (id) => api.get(`/units/${id}`),
  create: (data) => api.post('/units', data),
  update: (id, data) => api.put(`/units/${id}`, data),
  delete: (id) => api.delete(`/units/${id}`),
};

// Tenants API
export const tenantAPI = {
  getAll: () => api.get('/tenants'),
  getById: (id) => api.get(`/tenants/${id}`),
  create: (data) => api.post('/tenants', data),
  update: (id, data) => api.put(`/tenants/${id}`, data),
  delete: (id) => api.delete(`/tenants/${id}`),
  allocateWithAccount: (data) => api.post('/tenants/allocate/full', data),
};

// Payments API
export const paymentAPI = {
  getAll: (params) => api.get('/payments', { params }),
  getById: (id) => api.get(`/payments/${id}`),
  create: (data) => api.post('/payments', data),
  update: (id, data) => api.put(`/payments/${id}`, data),
  delete: (id) => api.delete(`/payments/${id}`),
  getStats: () => api.get('/payments/stats'),
};

// Maintenance API
export const maintenanceAPI = {
  getAll: (params) => api.get('/maintenance', { params }),
  getById: (id) => api.get(`/maintenance/${id}`),
  create: (data) => api.post('/maintenance', data),
  update: (id, data) => api.put(`/maintenance/${id}`, data),
  delete: (id) => api.delete(`/maintenance/${id}`),
};

// Tenant Portal API
export const tenantPortalAPI = {
  getDashboard: () => api.get('/tenant-portal/dashboard'),
  getRentalInfo: () => api.get('/tenant-portal/rental-info'),
  getPayments: (params) => api.get('/tenant-portal/payments', { params }),
  getPaymentById: (id) => api.get(`/tenant-portal/payments/${id}`),
  getMaintenanceRequests: (params) => api.get('/tenant-portal/maintenance', { params }),
  getTenantMaintenanceRequests: (params) => api.get('/tenant-portal/maintenance', { params }),
  createMaintenanceRequest: (data) => api.post('/tenant-portal/maintenance', data),
  getMaintenanceDetail: (id) => api.get(`/tenant-portal/maintenance/${id}`),
  addMaintenanceComment: (id, data) => api.post(`/tenant-portal/maintenance/${id}/comments`, data),
  cancelMaintenanceRequest: (id) => api.patch(`/tenant-portal/maintenance/${id}/cancel`),
  getDocuments: () => api.get('/tenant-portal/documents'),
  getDocumentById: (id) => api.get(`/tenant-portal/documents/${id}`),
  downloadDocument: (id) => api.get(`/tenant-portal/documents/${id}/download`, { responseType: 'blob' }),
  getNotices: (params) => api.get('/tenant-portal/notices', { params }),
  markNoticeRead: (id) => api.patch(`/tenant-portal/notices/${id}/read`),
  deleteNotice: (id) => api.delete(`/tenant-portal/notices/${id}`),
  getProfile: () => api.get('/tenant-portal/profile'),
  updateProfile: (data) => api.put('/tenant-portal/profile', data),
  getSettings: () => api.get('/tenant-portal/settings'),
  updateSettings: (data) => api.put('/tenant-portal/settings', data),
};

// Self Owner API
export const selfOwnerAPI = {
  getDashboard: () => api.get('/self-owner/dashboard'),
  getProperties: (params) => api.get('/self-owner/properties', { params }),
  createProperty: (data) => api.post('/self-owner/properties', data),
  updateProperty: (id, data) => api.put(`/self-owner/properties/${id}`, data),
  deleteProperty: (id) => api.delete(`/self-owner/properties/${id}`),
  getUnits: (params) => api.get('/self-owner/units', { params }),
  createUnit: (data) => api.post('/self-owner/units', data),
  updateUnit: (id, data) => api.put(`/self-owner/units/${id}`, data),
  deleteUnit: (id) => api.delete(`/self-owner/units/${id}`),
  getTenants: (params) => api.get('/self-owner/tenants', { params }),
  createTenant: (data) => api.post('/self-owner/tenants', data),
  updateTenant: (id, data) => api.put(`/self-owner/tenants/${id}`, data),
  deleteTenant: (id) => api.delete(`/self-owner/tenants/${id}`),
  getPayments: (params) => api.get('/self-owner/payments', { params }),
  getPaymentSummary: () => api.get('/self-owner/payments/summary'),
  recordPayment: (data) => api.post('/self-owner/payments', data),
  createInvoice: (data) => api.post('/self-owner/invoices', data),
  generateMonthlyInvoices: (data) => api.post('/self-owner/invoices/monthly', data),
  getMaintenance: (params) => api.get('/self-owner/maintenance', { params }),
  getMaintenanceById: (id) => api.get(`/self-owner/maintenance/${id}`),
  createMaintenance: (data) => api.post('/self-owner/maintenance', data),
  updateMaintenance: (id, data) => api.put(`/self-owner/maintenance/${id}`, data),
  updateMaintenanceStatus: (id, status) => api.patch(`/self-owner/maintenance/${id}/status`, { status }),
  addMaintenanceComment: (id, data) => api.post(`/self-owner/maintenance/${id}/comments`, data),
  deleteMaintenance: (id) => api.delete(`/self-owner/maintenance/${id}`),
  getDocuments: (params) => api.get('/self-owner/documents', { params }),
  getDocumentSummary: (params) => api.get('/self-owner/documents/summary', { params }),
  getDocumentById: (id) => api.get(`/self-owner/documents/${id}`),
  downloadDocument: (id) => api.get(`/self-owner/documents/${id}/download`, { responseType: 'blob' }),
  uploadDocument: (data, config = {}) => api.post('/self-owner/documents', data, config),
  replaceDocument: (id, data, config = {}) => api.put(`/self-owner/documents/${id}`, data, config),
  createDocument: (data) => api.post('/self-owner/documents', data),
  deleteDocument: (id) => api.delete(`/self-owner/documents/${id}`),
  getSettings: () => api.get('/self-owner/settings'),
  getSettingsTab: (tab) => api.get(`/self-owner/settings/tab/${tab}`),
  updateSettingsProfile: (data) => api.put('/self-owner/settings/profile', data),
  updateSettingsBusiness: (data) => api.put('/self-owner/settings/business', data),
  updateSettingsPayments: (data) => api.put('/self-owner/settings/payments', data),
  updateSettingsReceipts: (data) => api.put('/self-owner/settings/receipts', data),
  updateSettingsNotifications: (data) => api.put('/self-owner/settings/notifications', data),
  updateSettingsRentLease: (data) => api.put('/self-owner/settings/rent-lease', data),
  updateSettingsDocuments: (data) => api.put('/self-owner/settings/documents', data),
  updateSettingsSecurity: (data) => api.put('/self-owner/settings/security', data),
  updateSettingsPassword: (data) => api.put('/self-owner/settings/security/password', data),
  updateSettingsPreferences: (data) => api.put('/self-owner/settings/preferences', data),
  deleteSelfOwnerAccount: (data) => api.delete('/self-owner/settings/account', { data }),
};

// Notifications API
export const notificationAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/mark-all-read'),
  delete: (id) => api.delete(`/notifications/${id}`),
};

// Documents API
export const documentAPI = {
  getTenantDocuments: (tenantId) => api.get(`/documents/tenant/${tenantId}`),
  getPropertyDocuments: (propertyId) => api.get(`/documents/property/${propertyId}`),
  upload: (data) => api.post('/documents', data),
  delete: (id) => api.delete(`/documents/${id}`),
};

export default api;
