import axios from 'axios';

// В dev proxy настроен в vite.config.js -> /api идёт на 127.0.0.1:8000
// В проде поменять baseURL на реальный домен бэкенда.
const apiClient = axios.create({
  baseURL: '/api/',
  withCredentials: true, // нужно для Django SessionAuthentication
});

export default apiClient;
