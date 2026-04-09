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
import { Collapse } from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { usePathname } from "next/navigation";
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
import MailIcon from "@mui/icons-material/Mail";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";

const drawerWidth = 240;

export default function LayoutSidebar({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [role, setRole] = React.useState<string | null>(null);
  const [displayName, setDisplayName] = React.useState<string>("");
  const [shopName, setShopName] = React.useState<string>("");
  const [drawerOpen, setDrawerOpen] = React.useState(true);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [openAnalytics, setOpenAnalytics] = React.useState(false);
  const pathname = usePathname();

  // === 初期ロード：ユーザー情報 ===
  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await apiClient.get("/auth/user/");

        setDisplayName(res.data.display_name || res.data.login_id || "未設定");
        setShopName(res.data.shop_name || "");
        setRole(res.data.role);
      } catch (err) {
        console.error("ユーザー情報取得失敗:", err);
      }
    };

    fetchUser();
  }, []);

  React.useEffect(() => {
    if (pathname.includes("/analytics")) {
      setOpenAnalytics(true);
    }
  }, [pathname]);

  // === Drawer 開閉 ===
  const toggleDrawer = () => setDrawerOpen((prev) => !prev);

  // === ログアウト処理 ===
  const handleLogout = async () => {
    try {
      await apiClient.post("/auth/logout/");
    } catch (e) {
      console.error("ログアウトAPI失敗:", e);
    }

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

  // === メニュー定義（🔥スタッフ管理を常時表示に変更）===
  const menus = [
    { text: "顧客管理", icon: <People />, path: "/dashboard/customers" },
    { text: "見積管理", icon: <Description />, path: "/dashboard/estimates" },
    { text: "受注管理", icon: <Description />, path: "/dashboard/orders" },
    { text: "納品入金管理", icon: <Description />, path: "/dashboard/management" },
    { text: "スケジュール", icon: <Schedule />, path: "/dashboard/schedules" },
    {
      text: "業務連絡",
      icon: <MailIcon />,
      path: "/dashboard/business-communications",
    },
    {
      text: "分析",
      icon: <TrendingUpIcon />,
      children: [
        { text: "売上分析", path: "/dashboard/analytics/sales" },
        { text: "商品分析", path: "/dashboard/analytics/product" },
        { text: "作業分析", path: "/dashboard/analytics/staff" },
      ],
    },

    // 👇 ★ここが今回の変更
    {
      text: "スタッフ管理",
      icon: <AdminPanelSettings />,
      path: "/dashboard/staffs/new",
    },
  ];

  return (
    <Box sx={{ display: "flex" }}>
      {/* === 上部バー === */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: "#146ec8",
        }}
      >
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          <Box display="flex" alignItems="center" gap={3}>
            <IconButton color="inherit" onClick={toggleDrawer}>
              <MenuIcon />
            </IconButton>
            <Box
              component="img"
              src="/logo.png"
              alt="Links"
              sx={{
                height: 35,
                cursor: "pointer",
              }}
              onClick={() => router.push("/dashboard")}
            />
          </Box>

          <Box display="flex" alignItems="center" gap={2}>
            {/* ユーザー表示 */}
            <Typography
              sx={{
                color: "white",
                fontWeight: 500,
              }}
            >
              {displayName}さん
            </Typography>

            {/* 店舗名 */}
            <Typography
              sx={{
                color: "rgba(255,255,255,0.8)",
                fontSize: 14,
              }}
            >
              ({shopName || "店舗未設定"})
            </Typography>

            {/* 区切り線 */}
            <Box
              sx={{
                width: "1px",
                height: 20,
                bgcolor: "rgba(255,255,255,0.3)",
              }}
            />

            {/* ログアウト */}
            <Button
              color="inherit"
              startIcon={<Logout />}
              onClick={handleLogout}
              sx={{
                textTransform: "none",
                fontWeight: 500,
              }}
            >
              ログアウト
            </Button>
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
        <Box sx={{ overflow: "auto" }}>
          <List>
            {menus.map((item) => {
              // ★ サブメニューあり（分析）
              if (item.children) {
                return (
                  <React.Fragment key={item.text}>
                    <ListItemButton onClick={() => setOpenAnalytics((prev) => !prev)}>
                      <ListItemIcon>{item.icon}</ListItemIcon>
                      <ListItemText primary={item.text} />
                      {openAnalytics ? <ExpandLess /> : <ExpandMore />}
                    </ListItemButton>

                    <Collapse in={openAnalytics} timeout="auto" unmountOnExit>
                      <List component="div" disablePadding>
                        {item.children.map((child) => (
                          <ListItemButton
                            key={child.text}
                            sx={{ pl: 4 }}
                            onClick={() => router.push(child.path)}
                          >
                            <ListItemText primary={child.text} />
                          </ListItemButton>
                        ))}
                      </List>
                    </Collapse>
                  </React.Fragment>
                );
              }

              // ★ 通常メニュー
              return (
                <ListItemButton
                  key={item.text}
                  onClick={() => router.push(item.path)}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              );
            })}
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