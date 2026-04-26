import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const api = axios.create({ baseURL: `${API_URL}/api`, timeout: 15000 });

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('ss1_access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const orig = err.config;
    if (err.response?.status === 401 && !orig._retry && typeof window !== 'undefined') {
      orig._retry = true;
      const refresh = localStorage.getItem('ss1_refresh_token');
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken: refresh });
          localStorage.setItem('ss1_access_token', data.accessToken);
          localStorage.setItem('ss1_refresh_token', data.refreshToken);
          orig.headers.Authorization = `Bearer ${data.accessToken}`;
          return api.request(orig);
        } catch { localStorage.clear(); window.location.href = '/auth/login'; }
      }
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  register: (d: any) => api.post('/auth/register', d),
  login: (email: string, pw: string) => api.post('/auth/login', { email, password: pw }),
  me: () => api.get('/auth/me'),
  logout: (rt: string) => api.post('/auth/logout', { refreshToken: rt }),
};

export const affiliateApi = {
  dashboard: () => api.get('/affiliate/dashboard'),
  referrals: (depth = 3) => api.get(`/affiliate/referrals?depth=${depth}`),
  earnings: (page = 1, type?: string) => api.get(`/affiliate/earnings?page=${page}${type ? `&type=${type}` : ''}`),
  earningsSummary: () => api.get('/affiliate/earnings/summary'),
  stats: () => api.get('/affiliate/stats'),
  notifications: (lang = 'fr') => api.get(`/affiliate/notifications?lang=${lang}`),
  markRead: (ids: string[] | 'all') => api.patch('/affiliate/notifications/read', { ids }),
  updateProfile: (d: any) => api.patch('/affiliate/profile', d),
  updateAvatar: (avatarUrl: string) => api.patch('/affiliate/profile/avatar', { avatarUrl }),
  withdraw: (d: any) => api.post('/affiliate/withdraw', d),
  // E-commerce
  products: () => api.get('/affiliate/products'),
  createOrder: (items: any[], method?: string) => api.post('/affiliate/orders', { items, paymentMethod: method }),
  orders: () => api.get('/affiliate/orders'),
  // Tokens
  tokenRates: () => api.get('/affiliate/tokens/rates'),
  generateToken: (amountUsd: number, currency: string) => api.post('/affiliate/tokens/generate', { amountUsd, currency }),
  myTokens: () => api.get('/affiliate/tokens/my'),
  // Vouchers
  generateVoucher: (d: any) => api.post('/affiliate/vouchers/generate', d),
  validateVoucher: (code: string) => api.post('/affiliate/vouchers/validate', { code }),
  applyVoucher: (userId: string, code: string) => api.post('/affiliate/vouchers/apply', { userId, code }),
  myVouchers: () => api.get('/affiliate/vouchers/my'),
  deactivateVoucher: (code: string) => api.patch(`/affiliate/vouchers/${code}/deactivate`),
};

export const adminApi = {
  stats: () => api.get('/admin/stats'),
  users: (p: any) => api.get('/admin/users', { params: p }),
  setStatus: (id: string, status: string) => api.patch(`/admin/users/${id}/status`, { status }),
  setRole: (id: string, role: string) => api.patch(`/admin/users/${id}/role`, { role }),
  setRank: (id: string, rank: string) => api.patch(`/admin/users/${id}/rank`, { rank }),
  credit: (id: string, d: any) => api.post(`/admin/users/${id}/credit`, d),
  withdrawals: (status: string) => api.get(`/admin/withdrawals?status=${status}`),
  updateWithdrawal: (id: string, d: any) => api.patch(`/admin/withdrawals/${id}`, d),
  notify: (d: any) => api.post('/admin/notify', d),
  products: () => api.get('/admin/products'),
  createProduct: (d: any) => api.post('/admin/products', d),
  updateProduct: (id: string, d: any) => api.patch(`/admin/products/${id}`, d),
  calcTopPerformer: (period?: string) => api.post('/admin/top-performer/calculate', { period }),
  createVouchersForStockist: (d: any) => api.post('/admin/vouchers/create-for-stockist', d),
};

export default api;
