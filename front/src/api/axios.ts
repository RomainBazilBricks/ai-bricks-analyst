import axios, { type AxiosRequestConfig } from "axios";
import { useAuthStore } from '@/stores/auth';

export const BASE_URL =
  import.meta.env.VITE_API_ENV === "production" ? "/api-prod" : "http://localhost:3001/api";

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
