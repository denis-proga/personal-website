// import axios from 'axios';
//
// // В dev proxy настроен в vite.config.js -> /api идёт на 127.0.0.1:8000
// // В проде поменять baseURL на реальный домен бэкенда.
// const apiClient = axios.create({
//   baseURL: '/api/',
//   withCredentials: true, // нужно для Django SessionAuthentication
// });
//
// export default apiClient;
//
import axios from 'axios';

// В dev прокси настроен в vite.config.js -> /api идёт на 127.0.0.1:8000
// В проде baseURL берётся из переменной окружения VITE_API_URL
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/` : '/api/',
  withCredentials: true, // нужно для Django SessionAuthentication
});

export default apiClient;
