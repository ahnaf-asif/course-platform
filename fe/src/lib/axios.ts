import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const instance: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  withCredentials: true,
});

export const axiosInstance = <T>(config: AxiosRequestConfig): Promise<T> => {
  return instance(config).then((response) => response.data);
};

// A small store to keep the access token outside of React
// so interceptors can access it.
let accessToken: string | null = null;
let clearAuthCallback: (() => void) | null = null;
let setAccessTokenCallback: ((token: string | null) => void) | null = null;

export const setAuthHandlers = (
  setToken: (token: string | null) => void,
  clear: () => void
) => {
  setAccessTokenCallback = setToken;
  clearAuthCallback = clear;
};

export const updateAccessToken = (token: string | null, syncToReact = true) => {
  if (accessToken === token) return;
  accessToken = token;
  if (syncToReact && setAccessTokenCallback) {
    setAccessTokenCallback(token);
  }
};

instance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
interface FailedQueueItem {
  resolve: (token: string | null) => void;
  reject: (error: unknown) => void;
}
let failedQueue: FailedQueueItem[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

const redirectToLogin = () => {
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
};

instance.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config;

    const isAuthEndpoint = 
      originalRequest.url?.includes('/auth/login') || 
      originalRequest.url?.includes('/auth/register') ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/logout') ||
      originalRequest.url?.includes('/auth/forgot-password') ||
      originalRequest.url?.includes('/auth/reset-password');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return instance(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/refresh`, {}, {
          withCredentials: true,
        });

        const { access_token: newAccessToken } = response.data;

        updateAccessToken(newAccessToken);
        processQueue(null, newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return instance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        if (clearAuthCallback) clearAuthCallback();
        redirectToLogin();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
