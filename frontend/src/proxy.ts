// src/proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 1. 保護したいルート
const protectedRoutes = ["/dashboard", "/estimates"];

// 2. ログイン済みなら入れないルート
const authRoutes = ["/login", "/register"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Cookieからトークンを取得
  const accessToken = req.cookies.get("access_token")?.value;
  const refreshToken = req.cookies.get("refresh_token")?.value;

  // どちらかのトークンがあればログイン扱い
  const isLoggedIn = !!(accessToken || refreshToken);

  // protectedRoutes のいずれかで始まるパスか？
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  // A. 未ログインで保護ページへ → loginへ
  if (isProtectedRoute && !isLoggedIn) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // B. ログイン済みでログイン画面へ → /dashboardへ
  if (authRoutes.includes(pathname) && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

// matcher
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
