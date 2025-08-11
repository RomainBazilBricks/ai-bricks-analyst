import axios, { type AxiosRequestConfig } from "axios";
import { useAuthStore } from '@/stores/auth';

// Détection automatique de l'environnement de production
const isProduction = import.meta.env.PROD || window.location.hostname !== 'localhost';

export const BASE_URL = isProduction ? "/api" : "http://localhost:3001/api";

console.log('🔧 API Configuration:', {
  'import.meta.env.PROD': import.meta.env.PROD,
  'window.location.hostname': window.location.hostname,
  isProduction,
  BASE_URL
});

const axiosInstance = axios.create({ baseURL: BASE_URL });

// Intercepteur pour ajouter le token Authorization
axiosInstance.interceptors.request.use((config) => {
  const { token } = useAuthStore.getState();
  if (token) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Intercepteur de réponse pour gérer les 401
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

const axiosRequest = async <T>(config: AxiosRequestConfig): Promise<T> => {
  const { headers = {}, ...restConfig } = config;
  const authHeaders = { 'Content-Type': `application/json` };
  return axiosInstance({
    headers: { ...headers, ...authHeaders },
    ...restConfig,
  }).then((response) => response.data);
};

export const axiosPost = <RequestBody, ResponseData>(
  url: string,
  body: RequestBody,
  timeout = 60000
): Promise<ResponseData> =>
  axiosRequest<ResponseData>({ method: "POST", url, data: body, timeout });

export const axiosGet = <_, ResponseData>(
  url: string,
  params: any,
  timeout = 60000
) => axiosRequest<ResponseData>({ method: "GET", url, params, timeout });
