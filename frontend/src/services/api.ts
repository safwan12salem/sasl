import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://sasl-backend.onrender.com' 
    : 'http://localhost:8000');

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true',
  },
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('sasl_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;