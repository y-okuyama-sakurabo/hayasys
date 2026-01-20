// src/lib/apiClient.ts
import axios from "axios";

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

const apiClient = axios.create({
  baseURL,
  withCredentials: true, // Cookie を送る
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        await apiClient.post("/auth/refresh/");
        return apiClient(originalRequest);
      } catch {
        console.warn("トークンリフレッシュ失敗");
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

