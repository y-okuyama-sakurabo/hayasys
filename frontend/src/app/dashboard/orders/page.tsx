"use client";

import React, { Suspense, useEffect, useState } from "react";
import {
  Box, Typography, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, CircularProgress,
  IconButton, Menu, MenuItem, ListItemIcon, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  FormControl, Select, InputLabel, TextField, InputAdornment, Stack,
  Divider,
} from "@mui/material";

import Chip          from "@mui/material/Chip";
import MoreVertIcon  from "@mui/icons-material/MoreVert";
import EditIcon      from "@mui/icons-material/Edit";
import DescriptionIcon   from "@mui/icons-material/Description";
import DeleteIcon    from "@mui/icons-material/Delete";
import ContentCopyIcon   from "@mui/icons-material/ContentCopy";
import SearchIcon    from "@mui/icons-material/Search";
import ClearIcon     from "@mui/icons-material/Clear";

import { useRouter, useSearchParams } from "next/navigation";
import apiClient from "@/lib/apiClient";

// ========================
// ステータス定義
// ========================
const ORDER_STATUS_LABEL: Record<string, string> = {
  draft:           "下書き",
  ordered:         "受注確定",
  cancelled:       "キャンセル",
  delivered:       "納品済み",
  sales_completed: "売上計上済",
  not_delivered:   "未納品",     // 安全網
};
const ORDER_STATUS_COLOR: Record<string, "default" | "warning" | "primary" | "error" | "success" | "info"> = {
  draft:           "warning",
  ordered:         "primary",
  cancelled:       "error",
  delivered:       "success",
  sales_completed: "info",
  not_delivered:   "default",
};

// ========================
// 型
// ========================
type Order = {
  id: number;
  order_no: string;
  status: string;
  order_date: string | null;
  party_name?: string | null;
  items?: { name: string; product?: { name: string } | null }[];
  grand_total?: number | string;
  created_by?: { display_name?: string } | null;
};
type Shop = { id: number; name: string };

// ========================
// メイン
// ========================
function OrderListPageInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const refreshKey   = searchParams.get("_r");

  const [orders,       setOrders]       = useState<Order[]>([]);
  const [shops,        setShops]        = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<number | "all">("all");

  const [searchInput, setSearchInput] = useState("");
  const [dateFrom,    setDateFrom]    = useState("");
  const [dateTo,      setDateTo]      = useState("");
  const [amountMin,   setAmountMin]   = useState("");
  const [amountMax,   setAmountMax]   = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [loading,      setLoading]      = useState(true);
  const [menuAnchor,   setMenuAnchor]   = useState<Record<number, HTMLElement | null>>({});
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);

  // ========================
  // データ取得
  // ========================
  const fetchOrders = async (shopId: number | "all") => {
    try {
      const params = new URLSearchParams();
      if (shopId !== "all")       params.append("shop_id",    String(shopId));
      if (searchInput)            params.append("search",     searchInput);
      if (dateFrom)               params.append("date_from",  dateFrom);
      if (dateTo)                 params.append("date_to",    dateTo);
      if (amountMin)              params.append("amount_min", amountMin);
      if (amountMax)              params.append("amount_max", amountMax);
      if (statusFilter !== "all") params.append("status",     statusFilter);

      const query = params.toString() ? `?${params.toString()}` : "";
      const res   = await apiClient.get(`/orders/${query}`);
      setOrders(res.data.results || res.data || []);
    } catch (err) {
      console.error("受注一覧取得失敗:", err);
    }
  };

  const applySearch = () => fetchOrders(selectedShop);

  const clearSearch = async () => {
    setSearchInput("");
    setDateFrom("");
    setDateTo("");
    setAmountMin("");
    setAmountMax("");
    setStatusFilter("all");
    // state リセット後すぐ fetch するため直接 params 無しで呼ぶ
    try {
      const params = new URLSearchParams();
      if (selectedShop !== "all") params.append("shop_id", String(selectedShop));
      const query = params.toString() ? `?${params.toString()}` : "";
      const res   = await apiClient.get(`/orders/${query}`);
      setOrders(res.data.results || res.data || []);
    } catch { /* noop */ }
  };

  // ========================
  // 初期ロード
  // ========================
  useEffect(() => {
    const init = async () => {
      try {
        const [meRes, shopRes] = await Promise.all([
          apiClient.get("/auth/user/"),
          apiClient.get("/masters/shops/"),
        ]);
        const shopId = meRes.data?.shop_id ?? "all";
        setShops(shopRes.data.results || shopRes.data || []);
        setSelectedShop(shopId);
        await fetchOrders(shopId);
      } catch {
        await fetchOrders("all");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [refreshKey]);

  // ========================
  // 操作
  // ========================
  const handleShopChange = async (e: any) => {
    const v = e.target.value;
    setSelectedShop(v);
    await fetchOrders(v);
  };

  const openMenu  = (e: React.MouseEvent<HTMLElement>, id: number) => {
    e.stopPropagation();
    setMenuAnchor(prev => ({ ...prev, [id]: e.currentTarget }));
  };
  const closeMenu = (id: number) =>
    setMenuAnchor(prev => ({ ...prev, [id]: null }));

  const handleAction = (action: string, id: number) => {
    closeMenu(id);
    switch (action) {
      case "edit":      router.push(`/dashboard/orders/${id}/edit?_r=${Date.now()}`); break;
      case "detail":    router.push(`/dashboard/orders/${id}?_r=${Date.now()}`);      break;
      case "duplicate": router.push(`/dashboard/orders/new?copy_from=${id}`);         break;
      case "delete": {
        const t = orders.find(o => o.id === id);
        if (t) setDeleteTarget(t);
        break;
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiClient.delete(`/orders/${deleteTarget.id}/`);
      setOrders(prev => prev.filter(o => o.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      alert("削除に失敗しました");
    }
  };

  const fmt = (v: any) => v ? `¥${Math.round(Number(v)).toLocaleString()}` : "-";
  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("ja-JP") : "-";

  // ========================
  // ローディング
  // ========================
  if (loading) return (
    <Box display="flex" justifyContent="center" mt={10}>
      <CircularProgress />
    </Box>
  );

  return (
    <>
      {/* ── ヘッダー ── */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">受注一覧</Typography>
        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>店舗</InputLabel>
            <Select value={selectedShop} label="店舗" onChange={handleShopChange}>
              <MenuItem value="all">全店舗</MenuItem>
              {shops.map(s => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            onClick={() => router.push(`/dashboard/orders/new?_r=${Date.now()}`)}
          >
            新規受注
          </Button>
        </Box>
      </Box>

      {/* ── 検索パネル ── */}
      <Paper sx={{ p: 2.5, mb: 3 }}>
        {/* キーワード行 */}
        <Stack direction="row" spacing={2} alignItems="center" mb={2}>
          <TextField
            size="small"
            placeholder="顧客名・受注番号・商品名で検索"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") applySearch(); }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1, maxWidth: 400 }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>ステータス</InputLabel>
            <Select
              value={statusFilter}
              label="ステータス"
              onChange={e => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">すべて</MenuItem>
              <MenuItem value="draft">下書き</MenuItem>
              <MenuItem value="ordered">受注確定</MenuItem>
              <MenuItem value="sales_completed">売上計上済</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        {/* 詳細フィルター行 */}
        <Stack direction="row" spacing={3} flexWrap="wrap" alignItems="flex-end" mb={2}>
          {/* 受注日 */}
          <Box>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
              受注日
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                type="date"
                size="small"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 150 }}
              />
              <Typography color="text.secondary">〜</Typography>
              <TextField
                type="date"
                size="small"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 150 }}
              />
            </Stack>
          </Box>

          {/* 金額 */}
          <Box>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
              金額
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                type="number"
                size="small"
                placeholder="下限"
                value={amountMin}
                onChange={e => setAmountMin(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">¥</InputAdornment>,
                }}
                sx={{ width: 130 }}
              />
              <Typography color="text.secondary">〜</Typography>
              <TextField
                type="number"
                size="small"
                placeholder="上限"
                value={amountMax}
                onChange={e => setAmountMax(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">¥</InputAdornment>,
                }}
                sx={{ width: 130 }}
              />
            </Stack>
          </Box>
        </Stack>

        {/* ボタン行 */}
        <Box display="flex" justifyContent="flex-end" gap={1}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ClearIcon />}
            onClick={clearSearch}
          >
            クリア
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<SearchIcon />}
            onClick={applySearch}
          >
            検索
          </Button>
        </Box>
      </Paper>

      {/* ── テーブル ── */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead sx={{ bgcolor: "grey.100" }}>
            <TableRow>
              <TableCell>受注日</TableCell>
              <TableCell>ステータス</TableCell>
              <TableCell>顧客名</TableCell>
              <TableCell>内容</TableCell>
              <TableCell>担当者</TableCell>
              <TableCell align="right">金額</TableCell>
              <TableCell align="center" sx={{ width: 56 }}>操作</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  受注データがありません
                </TableCell>
              </TableRow>
            )}
            {orders.map(o => {
              const productName =
                o.items && o.items.length > 0
                  ? o.items[0].product?.name || o.items[0].name
                  : "-";

              return (
                <TableRow
                  key={o.id}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => router.push(`/dashboard/orders/${o.id}?_r=${Date.now()}`)}
                >
                  <TableCell>{fmtDate(o.order_date)}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={ORDER_STATUS_LABEL[o.status] ?? o.status}
                      color={(ORDER_STATUS_COLOR[o.status] ?? "default") as any}
                    />
                  </TableCell>
                  <TableCell>{o.party_name || "-"}</TableCell>
                  <TableCell>{productName}</TableCell>
                  <TableCell>{o.created_by?.display_name || "-"}</TableCell>
                  <TableCell align="right">{fmt(o.grand_total)}</TableCell>

                  <TableCell align="center" onClick={e => e.stopPropagation()}>
                    <IconButton size="small" onClick={e => openMenu(e, o.id)}>
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                    <Menu
                      anchorEl={menuAnchor[o.id]}
                      open={Boolean(menuAnchor[o.id])}
                      onClose={() => closeMenu(o.id)}
                    >
                      <MenuItem onClick={() => handleAction("detail", o.id)}>
                        <ListItemIcon><DescriptionIcon fontSize="small" /></ListItemIcon>
                        <ListItemText>詳細</ListItemText>
                      </MenuItem>
                      <MenuItem onClick={() => handleAction("edit", o.id)}>
                        <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
                        <ListItemText>編集</ListItemText>
                      </MenuItem>
                      <MenuItem onClick={() => handleAction("duplicate", o.id)}>
                        <ListItemIcon><ContentCopyIcon fontSize="small" /></ListItemIcon>
                        <ListItemText>複製</ListItemText>
                      </MenuItem>
                      <MenuItem onClick={() => handleAction("delete", o.id)} sx={{ color: "error.main" }}>
                        <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
                        <ListItemText>削除</ListItemText>
                      </MenuItem>
                    </Menu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── 削除確認 ── */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>受注削除の確認</DialogTitle>
        <DialogContent>
          <DialogContentText>
            この受注を削除しますか？この操作は取り消せません。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>キャンセル</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>削除する</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default function OrderListPage() {
  return (
    <Suspense fallback={<Box display="flex" justifyContent="center" mt={10}><CircularProgress /></Box>}>
      <OrderListPageInner />
    </Suspense>
  );
}
