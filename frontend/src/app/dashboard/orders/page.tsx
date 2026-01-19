"use client";

import React, { Suspense, useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  Select,
  InputLabel,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import DescriptionIcon from "@mui/icons-material/Description";
import DeleteIcon from "@mui/icons-material/Delete";
import { useRouter, useSearchParams } from "next/navigation";
import apiClient from "@/lib/apiClient";

type Order = {
  id: number;
  order_no: string;
  customer?: { name: string } | null;
  items?: { name: string; product?: { name: string } | null }[];
  grand_total?: string | number;
  order_date: string;
  created_at: string;
  created_by?: {
    id: number;
    display_name?: string;
    name?: string;
  } | null;
  party_name?: string | null;
};

type Shop = {
  id: number;
  name: string;
};

function OrderListPageInner() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<number | "all">("all");
  const [loading, setLoading] = useState(true);
  const [menuAnchor, setMenuAnchor] = useState<{ [key: number]: HTMLElement | null }>({});
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const refreshKey = searchParams.get("_r"); // ✅ 依存用に変数化

  // =========================
  // 初期ロード
  // =========================
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const meRes = await apiClient.get("/auth/user/");
        const staffShopId = meRes.data?.shop_id ?? "all";

        const shopRes = await apiClient.get("/masters/shops/");
        const shopList = shopRes.data.results || shopRes.data;
        setShops(shopList);

        setSelectedShop(staffShopId);

        await fetchOrders(staffShopId);
      } catch (err) {
        console.error("初期ロード失敗:", err);
        await fetchOrders("all");
      } finally {
        setLoading(false);
      }
    };

    fetchInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  // =========================
  // 受注一覧取得
  // =========================
  const fetchOrders = async (shopId: number | "all") => {
    try {
      const query = shopId !== "all" ? `?shop_id=${shopId}` : "";
      const res = await apiClient.get(`/orders/${query}`);
      setOrders(res.data.results || res.data || []);
    } catch (err) {
      console.error("受注一覧取得失敗:", err);
    }
  };

  // =========================
  // 店舗変更
  // =========================
  const handleShopChange = async (event: any) => {
    const newShop = event.target.value;
    setSelectedShop(newShop);
    await fetchOrders(newShop);
  };

  // =========================
  // メニュー
  // =========================
  const handleMenuOpen = (event: any, id: number) => {
    setMenuAnchor((prev) => ({ ...prev, [id]: event.currentTarget }));
  };

  const handleMenuClose = (id: number) => {
    setMenuAnchor((prev) => ({ ...prev, [id]: null }));
  };

  // =========================
  // 行アクション
  // =========================
  const handleAction = async (action: string, id: number) => {
    handleMenuClose(id);

    switch (action) {
      case "edit":
        router.push(`/dashboard/orders/${id}/edit?_r=${Date.now()}`);
        break;

      case "detail":
        router.push(`/dashboard/orders/${id}?_r=${Date.now()}`);
        break;

      case "delete": {
        const target = orders.find((o) => o.id === id);
        if (target) setDeleteTarget(target);
        break;
      }
    }
  };

  // =========================
  // 削除
  // =========================
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiClient.delete(`/orders/${deleteTarget.id}/`);
      setOrders((prev) => prev.filter((o) => o.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      alert("削除に失敗しました。");
    }
  };

  // =========================
  // 金額表示
  // =========================
  const formatPrice = (value: any) => {
    if (value == null || isNaN(Number(value))) return "-";
    return `¥${Number(value).toLocaleString()}`;
  };

  if (loading)
    return (
      <Box display="flex" justifyContent="center" mt={10}>
        <CircularProgress />
      </Box>
    );

  return (
    <>
      {/* ヘッダー */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          受注一覧
        </Typography>

        <Box display="flex" alignItems="center" gap={2}>
          {/* 店舗選択 */}
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="shop-select-label">店舗</InputLabel>
            <Select labelId="shop-select-label" value={selectedShop} label="店舗" onChange={handleShopChange}>
              <MenuItem value="all">全店舗</MenuItem>
              {shops.map((shop) => (
                <MenuItem key={shop.id} value={shop.id}>
                  {shop.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* 新規作成 */}
          <Button variant="contained" color="primary" onClick={() => router.push(`/dashboard/orders/new?_r=${Date.now()}`)}>
            新規受注
          </Button>
        </Box>
      </Box>

      {/* テーブル */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: "#f9f9f9" }}>
            <TableRow>
              <TableCell>受注日</TableCell>
              <TableCell>顧客名</TableCell>
              <TableCell>内容</TableCell>
              <TableCell>担当者</TableCell>
              <TableCell align="right">金額</TableCell>
              <TableCell align="center">操作</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {orders.map((o) => {
              const productName = o.items && o.items.length > 0 ? o.items[0].product?.name || o.items[0].name : "-";

              return (
                <TableRow key={o.id} hover onClick={() => router.push(`/dashboard/orders/${o.id}?_r=${Date.now()}`)}>
                  <TableCell>{new Date(o.order_date).toLocaleDateString("ja-JP")}</TableCell>
                  <TableCell>{o.party_name || "（顧客なし）"}</TableCell>
                  <TableCell>{productName}</TableCell>
                  <TableCell>{o.created_by?.display_name || "-"}</TableCell>
                  <TableCell align="right">{formatPrice(o.grand_total)}</TableCell>

                  <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                    <IconButton onClick={(event) => handleMenuOpen(event, o.id)}>
                      <MoreVertIcon />
                    </IconButton>

                    <Menu anchorEl={menuAnchor[o.id]} open={Boolean(menuAnchor[o.id])} onClose={() => handleMenuClose(o.id)}>
                      <MenuItem onClick={() => handleAction("edit", o.id)}>
                        <ListItemIcon>
                          <EditIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="編集" />
                      </MenuItem>

                      <MenuItem onClick={() => handleAction("detail", o.id)}>
                        <ListItemIcon>
                          <DescriptionIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="詳細" />
                      </MenuItem>

                      <MenuItem onClick={() => handleAction("delete", o.id)}>
                        <ListItemIcon>
                          <DeleteIcon fontSize="small" color="error" />
                        </ListItemIcon>
                        <ListItemText primary="削除" />
                      </MenuItem>
                    </Menu>
                  </TableCell>
                </TableRow>
              );
            })}

            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  データがありません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 削除ダイアログ */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>受注削除の確認</DialogTitle>
        <DialogContent>
          <DialogContentText>
            受注「{deleteTarget?.order_no}」を削除しますか？ この操作は取り消せません。
          </DialogContentText>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>キャンセル</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            削除する
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default function OrderListPage() {
  return (
    <Suspense
      fallback={
        <Box display="flex" justifyContent="center" mt={10}>
          <CircularProgress />
        </Box>
      }
    >
      <OrderListPageInner />
    </Suspense>
  );
}
