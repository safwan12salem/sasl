import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://sasl-api-i34r.onrender.com'
    : 'http://localhost:8000');

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 15000, // Reduced from 30000 — fail faster on a dead socket
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — always attach the latest token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('sasl_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => Promise.reject(error));

// Response interceptor — handle 401s and retry network timeouts once
api.interceptors.response.use(
  response => response,
  async error => {
    // Handle 401 gracefully
    if (error.response?.status === 401) {
      localStorage.removeItem('sasl_token');
    }

    // Retry once on network timeout or connection failure
    // The retry opens a fresh TCP connection since the first socket was torn down
    const config = error.config;
    if (
      config &&
      !config._retry &&
      (error.code === 'ECONNABORTED' ||
        error.code === 'ERR_NETWORK' ||
        error.message?.includes('timeout'))
    ) {
      config._retry = true;
      // Small delay to let the dead socket fully close
      await new Promise(resolve => setTimeout(resolve, 500));
      return api(config);
    }

    return Promise.reject(error);
  }
);

export default api;