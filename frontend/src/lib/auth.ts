// src/lib/auth.ts
import apiClient from "./apiClient";

export interface LoginResponse {
  access: string;
  refresh: string;
}

export async function loginUser(login_id: string, password: string): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>("auth/token/", {
    login_id, // ← username → login_id に変更！
    password,
  });
  return response.data;
}
