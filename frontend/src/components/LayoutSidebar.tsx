"use client";

import * as React from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Button,
  IconButton,
  Collapse,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { usePathname, useRouter } from "next/navigation";
import {
  Dashboard,
  People,
  Description,
  Schedule,
  Logout,
  Menu as MenuIcon,
  Settings,
} from "@mui/icons-material";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import MailIcon        from "@mui/icons-material/Mail";
import TrendingUpIcon  from "@mui/icons-material/TrendingUp";
import ArticleIcon     from "@mui/icons-material/Article";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import HistoryIcon     from "@mui/icons-material/History";
import StoreIcon       from "@mui/icons-material/Store";
import BusinessIcon    from "@mui/icons-material/Business";
import CreditCardIcon  from "@mui/icons-material/CreditCard";
import apiClient from "@/lib/apiClient";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";
import InactivityWarningDialog from "@/components/InactivityWarningDialog";
import { useUserRole, isPrivileged, clearRoleCache } from "@/hooks/useUserRole";

const drawerWidth = 240;

// ─────────────────────────────────────────────
// メニュー定義型
// ─────────────────────────────────────────────
type ChildItem = { text: string; path: string; icon?: React.ReactNode };
type MenuItem =
  | { text: string; icon: React.ReactNode; path: string; children?: undefined; privilegedOnly?: boolean }
  | { text: string; icon: React.ReactNode; children: ChildItem[]; path?: undefined; privilegedOnly?: boolean };

// ─────────────────────────────────────────────
// メニュー定義
// ─────────────────────────────────────────────
const MENUS: MenuItem[] = [
  { text: "顧客管理",   icon: <People />,       path: "/dashboard/customers" },
  { text: "見積管理",   icon: <Description />,  path: "/dashboard/estimates" },
  { text: "受注管理",   icon: <Description />,  path: "/dashboard/orders" },
  { text: "納品入金管理", icon: <Description />, path: "/dashboard/management" },
  { text: "スケジュール", icon: <Schedule />,    path: "/dashboard/schedules" },
  { text: "業務連絡",   icon: <MailIcon />,      path: "/dashboard/business-communications" },
  {
    text: "分析",
    icon: <TrendingUpIcon />,
    children: [
      { text: "売上分析", path: "/dashboard/analytics/sales" },
      { text: "商品分析", path: "/dashboard/analytics/product" },
      { text: "作業分析", path: "/dashboard/analytics/staff" },
    ],
  },
  { text: "帳票管理", icon: <ArticleIcon />, path: "/dashboard/reports" },
  { text: "キャンセル承認", icon: <Description />, path: "/dashboard/cancel-requests", privilegedOnly: true },
  {
    text: "システム設定",
    icon: <Settings />,
    privilegedOnly: true,
    children: [
      { text: "スタッフ管理",   path: "/dashboard/staffs",               icon: <AdminPanelSettingsIcon fontSize="small" /> },
      { text: "店舗管理",       path: "/dashboard/settings/shops",        icon: <StoreIcon fontSize="small" /> },
      { text: "会社設定",       path: "/dashboard/settings/company",      icon: <BusinessIcon fontSize="small" /> },
      { text: "カテゴリ管理",   path: "/dashboard/settings/categories",        icon: <AccountTreeIcon fontSize="small" /> },
      { text: "支払会社管理",   path: "/dashboard/settings/payment-companies", icon: <CreditCardIcon fontSize="small" /> },
      { text: "操作ログ",       path: "/dashboard/audit-logs",                 icon: <HistoryIcon fontSize="small" /> },
    ],
  },
];

// ─────────────────────────────────────────────
// コンポーネント
// ─────────────────────────────────────────────
export default function LayoutSidebar({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const userRole = useUserRole();

  const [displayName,    setDisplayName]    = React.useState("");
  const [shopName,       setShopName]       = React.useState("");
  const [drawerOpen,     setDrawerOpen]     = React.useState(true);
  const [logoutDialogOpen, setLogoutDialogOpen] = React.useState(false);

  // サブメニューの開閉状態を汎用管理
  const [openSubMenus, setOpenSubMenus] = React.useState<Record<string, boolean>>({});

  const toggleSubMenu = (key: string) =>
    setOpenSubMenus((prev) => ({ ...prev, [key]: !prev[key] }));

  // 現在のパスに対応するサブメニューを自動展開
  React.useEffect(() => {
    MENUS.forEach((item) => {
      if (item.children) {
        const isActive = item.children.some((c) => pathname.startsWith(c.path));
        if (isActive) {
          setOpenSubMenus((prev) => ({ ...prev, [item.text]: true }));
        }
      }
    });
  }, [pathname]);

  // ── ユーザー情報取得 ──────────────────────
  React.useEffect(() => {
    apiClient
      .get("/auth/user/")
      .then((res) => {
        setDisplayName(res.data.display_name || res.data.login_id || "未設定");
        setShopName(res.data.shop_name || "");
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  // ── ログアウト ────────────────────────────
  const handleLogout = async () => {
    try { await apiClient.post("/auth/logout/"); } catch {}
    clearRoleCache();
    setLogoutDialogOpen(false);
    router.push("/login");
  };

  // ── 自動ログアウト（60分無操作） ─────────
  const { showWarning, countdown, handleContinue, doLogout } = useInactivityLogout(
    () => router.push("/login")
  );

  // ── アクティブ判定 ────────────────────────
  const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/");

  return (
    <Box sx={{ display: "flex" }}>
      {/* ── AppBar ──────────────────────────────── */}
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, backgroundColor: "#146ec8" }}
      >
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          <Box display="flex" alignItems="center" gap={3}>
            <IconButton color="inherit" onClick={() => setDrawerOpen((p) => !p)}>
              <MenuIcon />
            </IconButton>
            <Box
              component="img"
              src="/logo.png"
              alt="Links"
              sx={{ height: 35, cursor: "pointer" }}
              onClick={() => router.push("/dashboard")}
            />
          </Box>

          <Box display="flex" alignItems="center" gap={1.5}>
            {/* 店舗名 Chip */}
            {shopName && (
              <Chip
                label={shopName}
                size="small"
                sx={{
                  bgcolor: "rgba(255,255,255,0.15)",
                  color: "white",
                  fontWeight: 500,
                  fontSize: 12,
                  maxWidth: 120,
                  "& .MuiChip-label": {
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  },
                }}
              />
            )}

            {/* ユーザー名（truncation あり） */}
            <Typography
              sx={{
                color: "white",
                fontWeight: 500,
                maxWidth: 140,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={`${displayName}さん`}
            >
              {displayName}さん
            </Typography>

            <Box sx={{ width: "1px", height: 20, bgcolor: "rgba(255,255,255,0.3)", flexShrink: 0 }} />

            {/* ログアウトボタン → 確認ダイアログを開く */}
            <Button
              color="inherit"
              startIcon={<Logout />}
              onClick={() => setLogoutDialogOpen(true)}
              sx={{ textTransform: "none", fontWeight: 500, flexShrink: 0 }}
            >
              ログアウト
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* ── Drawer ──────────────────────────────── */}
      <Drawer
        variant="persistent"
        open={drawerOpen}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          position: "fixed",
          left: 0,
          top: 64,
          height: "calc(100% - 64px)",
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            transition: "transform 0.3s ease",
            transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
            position: "fixed",
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: "auto", pb: 4 }}>
          <List dense>
            {MENUS.filter((item) => !item.privilegedOnly || isPrivileged(userRole)).map((item, idx) => {
              // ── サブメニューあり ──
              if (item.children) {
                const isOpen = !!openSubMenus[item.text];
                const hasActiveChild = item.children.some((c) => isActive(c.path));

                return (
                  <React.Fragment key={item.text}>
                    {/* システム設定の前に区切り線 */}
                    {item.text === "システム設定" && (
                      <Divider sx={{ my: 0.5, mx: 1 }} />
                    )}
                    <ListItemButton
                      onClick={() => toggleSubMenu(item.text)}
                      sx={{
                        borderRadius: 1,
                        mx: 0.5,
                        fontWeight: hasActiveChild ? 700 : 400,
                        bgcolor: hasActiveChild ? "primary.50" : "transparent",
                      }}
                    >
                      <ListItemIcon sx={{ color: hasActiveChild ? "primary.main" : "inherit" }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.text}
                        primaryTypographyProps={{
                          fontWeight: hasActiveChild ? 700 : 400,
                          fontSize: 14,
                        }}
                      />
                      {isOpen ? <ExpandLess /> : <ExpandMore />}
                    </ListItemButton>

                    <Collapse in={isOpen} timeout="auto" unmountOnExit>
                      <List component="div" disablePadding>
                        {item.children.map((child) => {
                          const active = isActive(child.path);
                          return (
                            <ListItemButton
                              key={child.text}
                              sx={{
                                pl: child.icon ? 3.5 : 4,
                                borderRadius: 1,
                                mx: 0.5,
                                bgcolor: active ? "primary.main" : "transparent",
                                color: active ? "white" : "inherit",
                                "&:hover": {
                                  bgcolor: active ? "primary.dark" : "action.hover",
                                },
                              }}
                              onClick={() => router.push(child.path)}
                            >
                              {child.icon && (
                                <ListItemIcon
                                  sx={{
                                    minWidth: 32,
                                    color: active ? "white" : "text.secondary",
                                  }}
                                >
                                  {child.icon}
                                </ListItemIcon>
                              )}
                              <ListItemText
                                primary={child.text}
                                primaryTypographyProps={{ fontSize: 13, fontWeight: active ? 700 : 400 }}
                              />
                            </ListItemButton>
                          );
                        })}
                      </List>
                    </Collapse>
                  </React.Fragment>
                );
              }

              // ── 通常メニュー ──
              const active = isActive(item.path);
              return (
                <ListItemButton
                  key={item.text}
                  onClick={() => router.push(item.path)}
                  sx={{
                    borderRadius: 1,
                    mx: 0.5,
                    bgcolor: active ? "primary.main" : "transparent",
                    color: active ? "white" : "inherit",
                    "&:hover": { bgcolor: active ? "primary.dark" : "action.hover" },
                  }}
                >
                  <ListItemIcon sx={{ color: active ? "white" : "inherit" }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{ fontSize: 14, fontWeight: active ? 700 : 400 }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        </Box>
      </Drawer>

      {/* ── ログアウト確認ダイアログ ─────────── */}
      <Dialog
        open={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>ログアウトしますか？</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ログアウトすると、保存していない変更は失われます。
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setLogoutDialogOpen(false)} color="inherit">
            キャンセル
          </Button>
          <Button
            onClick={handleLogout}
            variant="contained"
            color="error"
            startIcon={<Logout />}
          >
            ログアウト
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── 自動ログアウト警告ダイアログ ─────── */}
      <InactivityWarningDialog
        open={showWarning}
        countdown={countdown}
        onContinue={handleContinue}
        onLogout={doLogout}
      />

      {/* ── メインコンテンツ ──────────────────── */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: "#f9f9f9",
          mt: 8,
          p: 3,
          transition: "margin 0.3s ease",
          ml: drawerOpen ? `${drawerWidth}px` : "0px",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
