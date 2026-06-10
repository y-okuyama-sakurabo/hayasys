"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/apiClient";

export type UserRole = "executive" | "accounting" | "manager" | "store_manager" | "staff" | null;

type RoleState = { role: UserRole; isSuperuser: boolean } | null;

let cache: RoleState = null;

/** ログアウト時にキャッシュをリセットするための関数 */
export function clearRoleCache() {
  cache = null;
}

export function useUserRole(): { role: UserRole; isSuperuser: boolean } {
  const [state, setState] = useState<RoleState>(cache);

  useEffect(() => {
    if (cache !== null) {
      setState(cache);
      return;
    }
    apiClient
      .get("/auth/user/")
      .then((res) => {
        const fetched: RoleState = {
          role: res.data.role ?? null,
          isSuperuser: !!res.data.is_superuser,
        };
        cache = fetched;
        setState(fetched);
      })
      .catch(() => {});
  }, []);

  return state ?? { role: null, isSuperuser: false };
}

/** ①役員 ②経理総務 またはスーパーユーザー → true */
export function isPrivileged(roleOrState: UserRole | { role: UserRole; isSuperuser: boolean }): boolean {
  if (roleOrState === null) return false;
  if (typeof roleOrState === "string") {
    return roleOrState === "executive" || roleOrState === "accounting";
  }
  return (
    roleOrState.isSuperuser ||
    roleOrState.role === "executive" ||
    roleOrState.role === "accounting"
  );
}
