// src/lib/apiClient.ts
import axios from "axios";

const apiClient = axios.create({
  baseURL: "http://localhost:8000/api/",
  withCredentials: true, // ← Cookie が自動で送られる
});

// --- Cookie から Authorization を付ける必要はない（HttpOnly のため）
//     ここは削除！！
// apiClient.interceptors.request.use...

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    // access token が期限切れ → refresh 実行
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // refresh は Cookie で自動的に refresh_token が送信される
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
