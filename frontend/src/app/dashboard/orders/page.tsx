"use client";

import React, { Suspense, useEffect, useState } from "react";
import {
  Box, Typography, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, CircularProgress,
  IconButton, Menu, MenuItem, ListItemIcon, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  FormControl, Select, InputLabel, TextField, InputAdornment, Stack,
  Divider, Snackbar, Alert,
} from "@mui/material";

import Chip              from "@mui/material/Chip";
import MoreVertIcon      from "@mui/icons-material/MoreVert";
import EditIcon          from "@mui/icons-material/Edit";
import DescriptionIcon   from "@mui/icons-material/Description";
import ContentCopyIcon   from "@mui/icons-material/ContentCopy";
import SearchIcon        from "@mui/icons-material/Search";
import JaDatePicker      from "@/components/common/JaDatePicker";
import ClearIcon         from "@mui/icons-material/Clear";
import CancelIcon        from "@mui/icons-material/Cancel";

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

  const [loading,    setLoading]    = useState(true);
  const [menuAnchor, setMenuAnchor] = useState<Record<number, HTMLElement | null>>({});

  // キャンセル申請
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [snack, setSnack] = useState<{ msg: string; severity: "success" | "error" } | null>(null);

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
      case "cancel_request": {
        const t = orders.find(o => o.id === id);
        if (t) { setCancelTarget(t); setCancelReason(""); }
        break;
      }
    }
  };

  const submitCancelRequest = async () => {
    if (!cancelTarget || !cancelReason.trim()) return;
    setCancelLoading(true);
    try {
      await apiClient.post(`/orders/${cancelTarget.id}/cancel-request/`, { reason: cancelReason.trim() });
      setSnack({ msg: "キャンセル申請を送信しました", severity: "success" });
      setCancelTarget(null);
    } catch (e: any) {
      setSnack({ msg: e?.response?.data?.detail || "申請に失敗しました", severity: "error" });
    } finally {
      setCancelLoading(false);
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
          <Stack direction="row" spacing={1} alignItems="center">
            <JaDatePicker
              label="受注日（開始）"
              value={dateFrom || null}
              onChange={v => setDateFrom(v ?? "")}
              fullWidth={false}
              sx={{ width: 170 }}
            />
            <Typography color="text.secondary">〜</Typography>
            <JaDatePicker
              label="受注日（終了）"
              value={dateTo || null}
              onChange={v => setDateTo(v ?? "")}
              fullWidth={false}
              sx={{ width: 170 }}
            />
          </Stack>

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
                      <MenuItem
                        onClick={() => handleAction("edit", o.id)}
                        disabled={o.status === "cancelled"}
                      >
                        <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
                        <ListItemText>編集</ListItemText>
                      </MenuItem>
                      <MenuItem onClick={() => handleAction("duplicate", o.id)}>
                        <ListItemIcon><ContentCopyIcon fontSize="small" /></ListItemIcon>
                        <ListItemText>複製</ListItemText>
                      </MenuItem>
                      {["ordered", "delivered", "sales_completed"].includes(o.status) && (
                        <MenuItem onClick={() => handleAction("cancel_request", o.id)} sx={{ color: "warning.main" }}>
                          <ListItemIcon><CancelIcon fontSize="small" color="warning" /></ListItemIcon>
                          <ListItemText>キャンセル申請</ListItemText>
                        </MenuItem>
                      )}
                    </Menu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── キャンセル申請ダイアログ ── */}
      <Dialog open={Boolean(cancelTarget)} onClose={() => !cancelLoading && setCancelTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>キャンセル申請</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {cancelTarget?.party_name} の受注についてキャンセルを申請します。理由を入力してください。
          </DialogContentText>
          <TextField
            label="キャンセル理由"
            multiline
            rows={3}
            fullWidth
            value={cancelReason}
            onChange={e => setCancelReason(e.target.value)}
            required
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelTarget(null)} disabled={cancelLoading}>閉じる</Button>
          <Button
            color="warning"
            variant="contained"
            onClick={submitCancelRequest}
            disabled={!cancelReason.trim() || cancelLoading}
          >
            {cancelLoading ? <CircularProgress size={18} /> : "申請する"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── スナックバー ── */}
      <Snackbar
        open={Boolean(snack)}
        autoHideDuration={4000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snack?.severity} onClose={() => setSnack(null)}>{snack?.msg}</Alert>
      </Snackbar>
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
