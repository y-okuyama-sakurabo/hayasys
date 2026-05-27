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

    // リフレッシュエンドポイント自体の401はループを防ぐためスキップ
    const isRefreshEndpoint = originalRequest?.url?.includes("/auth/refresh/");
    const isLoginEndpoint   = originalRequest?.url?.includes("/auth/token/");

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isRefreshEndpoint &&
      !isLoginEndpoint
    ) {
      originalRequest._retry = true;

      try {
        await apiClient.post("/auth/refresh/");
        return apiClient(originalRequest);
      } catch {
        // リフレッシュトークンも期限切れ → ログインページへ
        // ただしすでに /login にいる場合はループを防ぐためリダイレクトしない
        if (!window.location.pathname.startsWith("/login")) {
          console.warn("セッション期限切れ。ログインページへリダイレクトします。");
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

