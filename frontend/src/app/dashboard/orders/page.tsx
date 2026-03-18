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
  TextField,
} from "@mui/material";

import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import DescriptionIcon from "@mui/icons-material/Description";
import DeleteIcon from "@mui/icons-material/Delete";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

import { useRouter, useSearchParams } from "next/navigation";
import apiClient from "@/lib/apiClient";

type Order = {
  id: number;
  order_no: string;
  order_date: string;
  party_name?: string | null;
  items?: { name: string; product?: { name: string } | null }[];
  grand_total?: number | string;
  created_by?: { display_name?: string } | null;
};

type Shop = {
  id: number;
  name: string;
};

function OrderListPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refreshKey = searchParams.get("_r");

  const [orders, setOrders] = useState<Order[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<number | "all">("all");

  const [searchInput, setSearchInput] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");

  const [loading, setLoading] = useState(true);
  const [menuAnchor, setMenuAnchor] = useState<{ [key: number]: HTMLElement | null }>({});
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);

  // =========================
  // 受注取得
  // =========================

  const fetchOrders = async (shopId: number | "all") => {
    try {
      const params = new URLSearchParams();

      if (shopId !== "all") params.append("shop_id", String(shopId));
      if (searchInput) params.append("search", searchInput);
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);
      if (amountMin) params.append("amount_min", amountMin);
      if (amountMax) params.append("amount_max", amountMax);

      const query = params.toString() ? `?${params.toString()}` : "";

      const res = await apiClient.get(`/orders/${query}`);

      setOrders(res.data.results || res.data || []);
    } catch (err) {
      console.error("受注一覧取得失敗:", err);
    }
  };

  const applySearch = async () => {
    await fetchOrders(selectedShop);
  };

  // =========================
  // 初期ロード
  // =========================

  useEffect(() => {
    const init = async () => {
      try {
        const meRes = await apiClient.get("/auth/user/");
        const staffShopId = meRes.data?.shop_id ?? "all";

        const shopRes = await apiClient.get("/masters/shops/");
        const shopList = shopRes.data.results || shopRes.data;

        setShops(shopList);
        setSelectedShop(staffShopId);

        await fetchOrders(staffShopId);
      } catch (err) {
        console.error(err);
        await fetchOrders("all");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [refreshKey]);

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

  const handleAction = (action: string, id: number) => {
    handleMenuClose(id);

    switch (action) {
      case "edit":
        router.push(`/dashboard/orders/${id}/edit?_r=${Date.now()}`);
        break;

      case "detail":
        router.push(`/dashboard/orders/${id}?_r=${Date.now()}`);
        break;

      case "delete":
        const target = orders.find((o) => o.id === id);
        if (target) setDeleteTarget(target);
        break;
      
      case "duplicate":
        router.push(`/dashboard/orders/new?copy_from=${id}`);
        break;
    }
  };

  // =========================
  // 削除
  // =========================

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await apiClient.delete(`/orders/${deleteTarget.id}/`);

      setOrders((prev) =>
        prev.filter((o) => o.id !== deleteTarget.id)
      );

      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      alert("削除に失敗しました");
    }
  };

  const formatPrice = (value: any) => {
    if (!value) return "-";
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
      {/* ヘッダ */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          受注一覧
        </Typography>

        <Box display="flex" gap={2}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>店舗</InputLabel>
            <Select value={selectedShop} label="店舗" onChange={handleShopChange}>
              <MenuItem value="all">全店舗</MenuItem>
              {shops.map((shop) => (
                <MenuItem key={shop.id} value={shop.id}>
                  {shop.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="contained"
            onClick={() =>
              router.push(`/dashboard/orders/new?_r=${Date.now()}`)
            }
          >
            新規受注
          </Button>
        </Box>
      </Box>

      {/* 検索 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box mb={2}>
          <TextField
            size="small"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applySearch();
            }}
            sx={{ width: 360 }}
          />
        </Box>

        <Box display="flex" gap={3} flexWrap="wrap" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography fontSize={13}>受注日</Typography>

            <TextField
              type="date"
              size="small"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              sx={{ width: 160 }}
            />

            <Typography>〜</Typography>

            <TextField
              type="date"
              size="small"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              sx={{ width: 160 }}
            />
          </Box>

          <Box display="flex" alignItems="center" gap={1}>
            <Typography fontSize={13}>金額</Typography>

            <TextField
              type="number"
              size="small"
              value={amountMin}
              onChange={(e) => setAmountMin(e.target.value)}
              sx={{ width: 120 }}
            />

            <Typography>〜</Typography>

            <TextField
              type="number"
              size="small"
              value={amountMax}
              onChange={(e) => setAmountMax(e.target.value)}
              sx={{ width: 120 }}
            />
          </Box>
        </Box>

        <Box display="flex" justifyContent="flex-end" gap={1}>
          <Button variant="contained" size="small" onClick={applySearch}>
            検索
          </Button>

          <Button
            variant="outlined"
            size="small"
            onClick={async () => {
              setSearchInput("");
              setDateFrom("");
              setDateTo("");
              setAmountMin("");
              setAmountMax("");

              await fetchOrders(selectedShop);
            }}
          >
            クリア
          </Button>
        </Box>
      </Paper>

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
              const productName =
                o.items && o.items.length > 0
                  ? o.items[0].product?.name || o.items[0].name
                  : "-";

              return (
                <TableRow
                  key={o.id}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() =>
                    router.push(`/dashboard/orders/${o.id}?_r=${Date.now()}`)
                  }
                >
                  <TableCell>{new Date(o.order_date).toLocaleDateString("ja-JP")}</TableCell>
                  <TableCell>{o.party_name || "-"}</TableCell>
                  <TableCell>{productName}</TableCell>
                  <TableCell>{o.created_by?.display_name || "-"}</TableCell>
                  <TableCell align="right">{formatPrice(o.grand_total)}</TableCell>

                  <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                    <IconButton onClick={(e) => handleMenuOpen(e, o.id)}>
                      <MoreVertIcon />
                    </IconButton>

                    <Menu
                      anchorEl={menuAnchor[o.id]}
                      open={Boolean(menuAnchor[o.id])}
                      onClose={() => handleMenuClose(o.id)}
                    >
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

                      <MenuItem onClick={() => handleAction("duplicate", o.id)}>
                        <ListItemIcon>
                          <ContentCopyIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="複製" />
                      </MenuItem>

                      <MenuItem
                        onClick={() => handleAction("delete", o.id)}
                        sx={{ color: "error.main" }}
                      >
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
          </TableBody>
        </Table>
      </TableContainer>

      {/* 削除確認Dialog */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
      >
        <DialogTitle>受注削除</DialogTitle>

        <DialogContent>
          <DialogContentText>
            この受注を削除しますか？
          </DialogContentText>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>
            キャンセル
          </Button>

          <Button
            color="error"
            variant="contained"
            onClick={handleDelete}
          >
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default function OrderListPage() {
  return (
    <Suspense fallback={<CircularProgress />}>
      <OrderListPageInner />
    </Suspense>
  );
}