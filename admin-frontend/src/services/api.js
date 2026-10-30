import axios from 'axios';

// The UI routes API requests through the reverse proxy (/api) - no hardcoded backend IP or port
const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('apurva_admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle unauthorized access
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (localStorage.getItem('apurva_admin_token')) {
        localStorage.removeItem('apurva_admin_token');
        localStorage.removeItem('apurva_admin_user');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
