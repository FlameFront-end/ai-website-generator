import axios from "axios";

import { TOKEN_KEY, notifyAuthError, safeStorage } from "@/lib";
import { env } from "@/model";

const axiosInstance = axios.create({
  baseURL: env.API_URL,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// Add token to requests
axiosInstance.interceptors.request.use((config) => {
  const token = safeStorage.getString(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors — delegate to auth event system instead of hard redirect
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      notifyAuthError();
    }
    return Promise.reject(error as Error);
  },
);

export default axiosInstance;
