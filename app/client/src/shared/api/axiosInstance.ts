import axios from "axios";

import { env } from "@/shared/model/config";

const axiosInstance = axios.create({
  baseURL: env.API_URL,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// Add token to requests
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user_data");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
