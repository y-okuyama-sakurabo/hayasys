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
  Avatar,
  Menu,
  MenuItem,
  Divider,
} from "@mui/material";
import {
  Dashboard,
  People,
  Description,
  Schedule,
  AdminPanelSettings,
  Logout,
  Menu as MenuIcon,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/apiClient";

const drawerWidth = 240;

export default function LayoutSidebar({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [role, setRole] = React.useState<string | null>(null);
  const [displayName, setDisplayName] = React.useState<string>("");
  const [shopName, setShopName] = React.useState<string>("");
  const [drawerOpen, setDrawerOpen] = React.useState(true);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  // === 初期ロード：ユーザー情報 ===
  React.useEffect(() => {
    const storedRole = localStorage.getItem("user_role");
    setRole(storedRole);

    const fetchUser = async () => {
      try {
        const res = await apiClient.get("/auth/user/");
        setDisplayName(res.data.display_name || res.data.login_id || "未設定");
        setShopName(res.data.shop_name || "");
      } catch (err) {
        console.error("ユーザー情報取得失敗:", err);
      }
    };
    fetchUser();
  }, []);

  // === Drawer 開閉 ===
  const toggleDrawer = () => setDrawerOpen((prev) => !prev);

  // === ログアウト処理 ===
  const handleLogout = async () => {
    try {
      await apiClient.post("/auth/logout/"); // ← これで Cookie 削除！

    } catch (e) {
      console.error("ログアウトAPI失敗:", e);
    }

    // localStorage も一応クリア
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("user_role");

    router.push("/login");
  };


  // === Avatarメニュー開閉 ===
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // === メニュー定義 ===
  const baseMenus = [
    { text: "ダッシュボード", icon: <Dashboard />, path: "/dashboard" },
    { text: "顧客管理", icon: <People />, path: "/dashboard/customers" },
    { text: "見積管理", icon: <Description />, path: "/dashboard/estimates" },
    { text: "受注管理", icon: <Description />, path: "/dashboard/orders" },
    { text: "納品入金管理", icon: <Description />, path: "/dashboard/management" },
    { text: "スケジュール", icon: <Schedule />, path: "/dashboard/schedules" },
  ];

  const adminMenus =
    role === "admin"
      ? [
          {
            text: "スタッフ管理",
            icon: <AdminPanelSettings />,
            path: "/dashboard/staffs/new",
          },
        ]
      : [];

  const menus = [...baseMenus, ...adminMenus];

  return (
    <Box sx={{ display: "flex" }}>
      {/* === 上部バー === */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: "#1976d2",
        }}
      >
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          {/* 左側：ハンバーガー＆タイトル */}
          <Box display="flex" alignItems="center" gap={1}>
            <IconButton color="inherit" onClick={toggleDrawer}>
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap>
              Hayasys
            </Typography>
          </Box>

          {/* 右側：ユーザーアバター */}
          <Box display="flex" alignItems="center">
            <IconButton onClick={handleMenuOpen} sx={{ p: 0 }}>
              <Avatar
                sx={{
                  bgcolor: "#fff",
                  color: "#1976d2",
                  fontWeight: "bold",
                }}
              >
                {displayName?.charAt(0)?.toUpperCase() || "?"}
              </Avatar>
            </IconButton>

            {/* アカウントメニュー */}
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
              <Box sx={{ px: 2, py: 1.5 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {displayName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {shopName || "店舗未設定"}
                </Typography>
              </Box>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <Logout fontSize="small" sx={{ mr: 1 }} />
                ログアウト
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* === サイドバー === */}
      <Drawer
        variant="persistent"
        open={drawerOpen}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          position: "fixed", // ← ← 固定配置にする！
          left: 0,
          top: 64, // AppBarの高さ分ずらす（Toolbar分）
          height: "calc(100% - 64px)",
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            transition: "transform 0.3s ease",
            transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
            position: "fixed", // ← paper自体も固定化！
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: "auto" }}>
          <List>
            {menus.map((item) => (
              <ListItemButton key={item.text} onClick={() => router.push(item.path)}>
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* === メインコンテンツ === */}
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
