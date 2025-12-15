// src/middleware.ts (場所注意！)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 1. 保護したいルートをここで定義（ここに含まれるパスはログイン必須になる）
// 見積一覧のパスが /estimates だと仮定して追加しています
const protectedRoutes = ["/dashboard", "/estimates"];

// 2. ログイン済みなら入れないルート（ログイン画面など）
const authRoutes = ["/login", "/register"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  console.log("🔥 MIDDLEWARE FIRED:", pathname);

  // Cookieからトークンを取得
  const accessToken = req.cookies.get("access_token")?.value;
  const refreshToken = req.cookies.get("refresh_token")?.value;

  // どちらかのトークンがあれば「ログイン状態」とみなす
  // (accessが切れていても、refreshがあれば画面には行かせて、その後クライアント側のaxiosで更新させるため)
  const isLoggedIn = !!(accessToken || refreshToken);

  // 保護されたルートへのアクセス判定
  // protectedRoutesのいずれかで始まるパスかどうかチェック
  const isProtectedRoute = protectedRoutes.some((route) => 
    pathname.startsWith(route)
  );

  // A. 未ログインで、保護されたページに行こうとした場合
  if (isProtectedRoute && !isLoggedIn) {
    const url = new URL("/login", req.url);
    // ログイン後に元のページに戻れるようにクエリパラメータをつけておくと親切です
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // B. ログイン済みで、ログイン画面に行こうとした場合
  if (authRoutes.includes(pathname) && isLoggedIn) {
    // ダッシュボードまたは見積一覧へ飛ばす
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

// Matcherの設定
// 画像、静的ファイル、favicon、APIルート以外はすべてMiddlewareを通す設定
// こうすることで、新しいページを作ったときに matcher に追加し忘れる事故を防げます
export const config = {
  matcher: [
    /*
     * 以下で始まるパスを除外する:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - publicフォルダ内の画像など (必要に応じて)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};