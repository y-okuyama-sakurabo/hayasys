// src/lib/auth.ts
import apiClient from "./apiClient";

export interface LoginResponse {
  access: string;
  refresh: string;
}

export async function loginUser(login_id: string, password: string): Promise<LoginResponse> {
  console.log("送信データ:", { login_id, password });
  const response = await apiClient.post<LoginResponse>("auth/token/", {
    login_id, // ← username → login_id に変更！
    password,
  });
  return response.data;
}
