"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import {
  Box,
  Paper,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableSortLabel,
  TableBody,
  IconButton,
  Menu,
  ListItemIcon,
  ListItemText,
  Chip,
  Stack,
  TextField,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  InputAdornment,
  Divider,
} from "@mui/material";

import MoreVertIcon    from "@mui/icons-material/MoreVert";
import OpenInNewIcon   from "@mui/icons-material/OpenInNew";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SearchIcon      from "@mui/icons-material/Search";
import DownloadIcon    from "@mui/icons-material/Download";
import apiClient from "@/lib/apiClient";

// ========================
// ソート用ユーティリティ
// ========================
type SortKey =
  | "order_date" | "sales_date" | "customer_name"
  | "delivery_status" | "payment_status"
  | "grand_total" | "paid_total" | "unpaid_total";
type SortDir = "asc" | "desc";

const DELIVERY_ORDER: Record<string, number> = {
  pending: 0, not_delivered: 0, partial: 1, completed: 2, delivered: 2,
};
const PAYMENT_ORDER: Record<string, number> = {
  pending: 0, unpaid: 0, partial: 1, paid: 2,
};

function compareRows(a: any, b: any, key: SortKey, dir: SortDir): number {
  let av: any, bv: any;
  if (key === "delivery_status") {
    av = DELIVERY_ORDER[a.delivery_status] ?? 0;
    bv = DELIVERY_ORDER[b.delivery_status] ?? 0;
  } else if (key === "payment_status") {
    av = PAYMENT_ORDER[a.payment_status] ?? 0;
    bv = PAYMENT_ORDER[b.payment_status] ?? 0;
  } else {
    av = a[key] ?? "";
    bv = b[key] ?? "";
  }
  if (av < bv) return dir === "asc" ? -1 : 1;
  if (av > bv) return dir === "asc" ?  1 : -1;
  return 0;
}

// ========================
// ラベル・色マップ
// ========================
const DELIVERY_LABEL: Record<string, string> = {
  pending:   "未納品",
  partial:   "一部納品",
  completed: "納品済",
};
const DELIVERY_COLOR: Record<string, "default" | "warning" | "success"> = {
  pending:   "default",
  partial:   "warning",
  completed: "success",
};

const PAYMENT_LABEL: Record<string, string> = {
  pending: "未入金",
  unpaid:  "未入金",
  partial: "一部入金",
  paid:    "入金済",
};
const PAYMENT_COLOR: Record<string, "error" | "warning" | "success"> = {
  pending: "error",
  unpaid:  "error",
  partial: "warning",
  paid:    "success",
};

const formatPrice = (n: number | string) =>
  "¥" + new Intl.NumberFormat("ja-JP").format(Number(n || 0));

// ========================
// メイン
// ========================
export default function ManagementPage() {
  const router = useRouter();

  // ── データ ──
  const [rows,    setRows]    = useState<any[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [shops,   setShops]   = useState<any[]>([]);

  // ── 期間モード ──
  const [periodMode,     setPeriodMode]     = useState<"month" | "range">("month");
  const [selectedShop,   setSelectedShop]   = useState<string>("");
  const [selectedMonth,  setSelectedMonth]  = useState("");
  const [dateFrom,       setDateFrom]       = useState(dayjs().startOf("month").format("YYYY-MM-DD"));
  const [dateTo,         setDateTo]         = useState(dayjs().format("YYYY-MM-DD"));

  // ── クライアントフィルター ──
  const [customerSearch,      setCustomerSearch]      = useState("");
  const [deliveryFilter,      setDeliveryFilter]      = useState("all");
  const [paymentFilter,       setPaymentFilter]       = useState("all");
  const [salesUnrecordedOnly, setSalesUnrecordedOnly] = useState(false);

  // ── ソート ──
  const [sortKey, setSortKey] = useState<SortKey>("order_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // ── 操作メニュー ──
  const [menuAnchor, setMenuAnchor] = useState<Record<number, HTMLElement | null>>({});

  // ========================
  // データ取得
  // ========================
  const fetchUser = async () => {
    try {
      const res  = await apiClient.get("/auth/user/");
      const user = res.data;
      setSelectedShop(user?.shop_id ? String(user.shop_id) : "all");
    } catch {
      setSelectedShop("all");
    }
  };

  const fetchShops = async () => {
    try {
      const res  = await apiClient.get("/masters/shops/");
      const json = res.data;
      setShops(Array.isArray(json) ? json : json.results ?? []);
    } catch {/* noop */}
  };

  const fetchSummary = async (shop?: string) => {
    try {
      const params: Record<string, string> = {};
      if (shop && shop !== "all") params.shop_id = shop;

      const res  = await apiClient.get("/management/orders/monthly/", { params });
      const safe = Array.isArray(res.data) ? res.data : [];
      setSummary(safe);

      if (safe.length > 0) {
        const first = String(safe[0].month);
        setSelectedMonth(first);
        fetchRowsByMonth(first, shop);
      } else {
        setRows([]);
        setSelectedMonth("");
      }
    } catch {/* noop */}
  };

  const fetchRowsByMonth = async (month?: string, shop?: string) => {
    try {
      const params: Record<string, string> = {};
      if (month) params.month = month;
      if (shop && shop !== "all") params.shop_id = shop;
      const res = await apiClient.get("/management/orders/", { params });
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch {/* noop */}
  };

  const fetchRowsByRange = async () => {
    try {
      const params: Record<string, string> = {
        date_from: dateFrom,
        date_to:   dateTo,
      };
      if (selectedShop && selectedShop !== "all") params.shop_id = selectedShop;
      const res = await apiClient.get("/management/orders/", { params });
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch {/* noop */}
  };

  // ========================
  // 初回・変化時のフェッチ
  // ========================
  useEffect(() => { fetchShops(); fetchUser(); }, []);

  useEffect(() => {
    if (!selectedShop) return;
    if (periodMode === "month") fetchSummary(selectedShop);
    else                       fetchRowsByRange();
  }, [selectedShop]);

  useEffect(() => {
    if (periodMode === "month" && selectedMonth && selectedShop)
      fetchRowsByMonth(selectedMonth, selectedShop);
  }, [selectedMonth]);

  // モード切り替え時にデータをリセット
  const handlePeriodModeChange = (_: any, val: "month" | "range") => {
    if (!val) return;
    setPeriodMode(val);
    setRows([]);
    if (val === "month" && selectedShop) fetchSummary(selectedShop);
  };

  // ========================
  // クライアントフィルター
  // ========================
  const filteredRows = useMemo(() => {
    let r = rows;
    if (customerSearch.trim()) {
      const q = customerSearch.trim();
      r = r.filter((row) => row.customer_name?.includes(q));
    }
    if (deliveryFilter !== "all") {
      r = r.filter((row) => row.delivery_status === deliveryFilter);
    }
    if (paymentFilter !== "all") {
      r = r.filter((row) => row.payment_status === paymentFilter);
    }
    if (salesUnrecordedOnly) {
      r = r.filter((row) => !row.sales_date);
    }
    return r;
  }, [rows, customerSearch, deliveryFilter, paymentFilter, salesUnrecordedOnly]);

  // ソート
  const sortedRows = useMemo(
    () => [...filteredRows].sort((a, b) => compareRows(a, b, sortKey, sortDir)),
    [filteredRows, sortKey, sortDir]
  );

  // フィルター後の集計（表示中の行から算出）
  const computedSummary = useMemo(() => ({
    total_amount:  filteredRows.reduce((s, r) => s + Number(r.grand_total  || 0), 0),
    paid_amount:   filteredRows.reduce((s, r) => s + Number(r.paid_total   || 0), 0),
    unpaid_amount: filteredRows.reduce((s, r) => s + Number(r.unpaid_total || 0), 0),
  }), [filteredRows]);

  // アクティブフィルター数
  const activeFilterCount = [
    customerSearch.trim() !== "",
    deliveryFilter !== "all",
    paymentFilter  !== "all",
    salesUnrecordedOnly,
  ].filter(Boolean).length;

  // ========================
  // ソート操作
  // ========================
  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  // ========================
  // メニュー操作
  // ========================
  const openMenu  = (e: React.MouseEvent<HTMLElement>, id: number) => {
    e.stopPropagation();
    setMenuAnchor((prev) => ({ ...prev, [id]: e.currentTarget }));
  };
  const closeMenu = (id: number) =>
    setMenuAnchor((prev) => ({ ...prev, [id]: null }));

  const goDetail = (orderId: number) =>
    router.push(`/dashboard/management/${orderId}`);

  // ========================
  // CSV出力
  // ========================
  const handleCsvExport = async () => {
    const params = new URLSearchParams();
    if (selectedShop && selectedShop !== "all") params.set("shop_id", selectedShop);
    if (periodMode === "month" && selectedMonth) {
      params.set("month", selectedMonth);
    } else if (periodMode === "range") {
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo)   params.set("date_to",   dateTo);
    }
    const url = `/api/management/orders/csv/?${params.toString()}`;
    const a = document.createElement("a");
    a.href = url;
    a.click();
  };

  // ========================
  // UI
  // ========================
  return (
    <Box>

      {/* ページタイトル */}
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>
        納品入金管理
      </Typography>

      {/* ════════════════════════════════
          期間・店舗フィルターエリア
      ════════════════════════════════ */}
      <Paper sx={{ p: 2, mb: 2 }}>

        {/* 1行目：店舗 ＋ 期間モード切り替え ＋ CSV出力 */}
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" sx={{ mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>店舗</InputLabel>
            <Select
              value={selectedShop}
              label="店舗"
              onChange={(e) => setSelectedShop(String(e.target.value))}
            >
              <MenuItem value="all">全店舗</MenuItem>
              {shops.map((s) => (
                <MenuItem key={s.id} value={String(s.id)}>{s.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <ToggleButtonGroup
            size="small"
            exclusive
            value={periodMode}
            onChange={handlePeriodModeChange}
          >
            <ToggleButton value="month">月選択</ToggleButton>
            <ToggleButton value="range">期間指定</ToggleButton>
          </ToggleButtonGroup>

          {/* 月選択モード */}
          {periodMode === "month" && (
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>月</InputLabel>
              <Select
                value={selectedMonth}
                label="月"
                onChange={(e) => setSelectedMonth(String(e.target.value))}
              >
                {summary.map((row) => (
                  <MenuItem key={row.month} value={row.month}>
                    {dayjs(row.month + "-01").format("YYYY年MM月")}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* 期間指定モード */}
          {periodMode === "range" && (
            <>
              <TextField
                label="開始日"
                type="date"
                size="small"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 160 }}
              />
              <Typography variant="body2" color="text.secondary">〜</Typography>
              <TextField
                label="終了日"
                type="date"
                size="small"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 160 }}
              />
              <Button
                variant="contained"
                size="small"
                startIcon={<SearchIcon />}
                onClick={fetchRowsByRange}
              >
                検索
              </Button>
            </>
          )}

          {/* CSV出力ボタン（右寄せ） */}
          <Box sx={{ ml: "auto" }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={handleCsvExport}
              disabled={!selectedShop}
            >
              CSV出力
            </Button>
          </Box>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        {/* 2行目：絞り込みフィルター */}
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          {/* 顧客名検索 */}
          <TextField
            label="顧客名で検索"
            size="small"
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ width: 200 }}
          />

          {/* 納品ステータス */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>納品</InputLabel>
            <Select
              value={deliveryFilter}
              label="納品"
              onChange={(e) => setDeliveryFilter(e.target.value)}
            >
              <MenuItem value="all">すべて</MenuItem>
              <MenuItem value="pending">未納品</MenuItem>
              <MenuItem value="partial">一部納品</MenuItem>
              <MenuItem value="completed">納品済</MenuItem>
            </Select>
          </FormControl>

          {/* 入金ステータス */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>入金</InputLabel>
            <Select
              value={paymentFilter}
              label="入金"
              onChange={(e) => setPaymentFilter(e.target.value)}
            >
              <MenuItem value="all">すべて</MenuItem>
              <MenuItem value="pending">未入金</MenuItem>
              <MenuItem value="partial">一部入金</MenuItem>
              <MenuItem value="paid">入金済</MenuItem>
            </Select>
          </FormControl>

          {/* 売上未計上フィルター */}
          <Chip
            label="売上未計上のみ"
            clickable
            color={salesUnrecordedOnly ? "warning" : "default"}
            variant={salesUnrecordedOnly ? "filled" : "outlined"}
            onClick={() => setSalesUnrecordedOnly((v) => !v)}
          />

          {/* アクティブフィルター数 & リセット */}
          {activeFilterCount > 0 && (
            <Button
              size="small"
              variant="text"
              color="inherit"
              onClick={() => {
                setCustomerSearch("");
                setDeliveryFilter("all");
                setPaymentFilter("all");
                setSalesUnrecordedOnly(false);
              }}
              sx={{ color: "text.secondary", fontSize: 12 }}
            >
              フィルターをリセット ({activeFilterCount})
            </Button>
          )}
        </Stack>
      </Paper>

      {/* ════════════════════════════════
          サマリーカード（表示中の行から算出）
      ════════════════════════════════ */}
      {(rows.length > 0) && (
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <Paper sx={{ flex: 1, p: 2, textAlign: "center", borderTop: "4px solid #1976d2" }}>
            <Typography variant="caption" color="text.secondary">受注金額</Typography>
            <Typography variant="h6" fontWeight="bold">
              {formatPrice(computedSummary.total_amount)}
            </Typography>
          </Paper>
          <Paper sx={{ flex: 1, p: 2, textAlign: "center", borderTop: "4px solid #2e7d32" }}>
            <Typography variant="caption" color="text.secondary">入金済</Typography>
            <Typography variant="h6" fontWeight="bold" color="success.main">
              {formatPrice(computedSummary.paid_amount)}
            </Typography>
          </Paper>
          <Paper sx={{ flex: 1, p: 2, textAlign: "center", borderTop: "4px solid #d32f2f" }}>
            <Typography variant="caption" color="text.secondary">未入金</Typography>
            <Typography variant="h6" fontWeight="bold" color="error.main">
              {formatPrice(computedSummary.unpaid_amount)}
            </Typography>
          </Paper>
        </Stack>
      )}

      {/* ════════════════════════════════
          件数表示
      ════════════════════════════════ */}
      {rows.length > 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {filteredRows.length === rows.length
            ? `${rows.length} 件`
            : `${filteredRows.length} 件（全 ${rows.length} 件中）`}
        </Typography>
      )}

      {/* データなし */}
      {rows.length === 0 && selectedShop && (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">
            {periodMode === "month" && selectedMonth
              ? `${dayjs(selectedMonth + "-01").format("YYYY年MM月")}の受注はありません`
              : "受注データがありません"}
          </Typography>
        </Paper>
      )}

      {/* フィルター後ゼロ */}
      {rows.length > 0 && filteredRows.length === 0 && (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">
            条件に一致する受注はありません
          </Typography>
        </Paper>
      )}

      {/* ════════════════════════════════
          一覧テーブル
      ════════════════════════════════ */}
      {sortedRows.length > 0 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.100" }}>
                {(
                  [
                    { key: "order_date",     label: "受注日",   align: "left"   },
                    { key: "sales_date",     label: "売上日",   align: "left"   },
                    { key: "customer_name",  label: "顧客名",   align: "left"   },
                    { key: "delivery_status",label: "納品",     align: "center" },
                    { key: "payment_status", label: "入金",     align: "center" },
                    { key: "grand_total",    label: "受注金額", align: "right"  },
                    { key: "paid_total",     label: "入金済",   align: "right"  },
                    { key: "unpaid_total",   label: "残額",     align: "right"  },
                  ] as { key: SortKey; label: string; align: "left" | "center" | "right" }[]
                ).map(({ key, label, align }) => (
                  <TableCell key={key} align={align}>
                    <TableSortLabel
                      active={sortKey === key}
                      direction={sortKey === key ? sortDir : "asc"}
                      onClick={() => handleSort(key)}
                    >
                      {label}
                    </TableSortLabel>
                  </TableCell>
                ))}
                <TableCell align="center" sx={{ width: 56 }}>操作</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {sortedRows.map((row) => (
                <TableRow
                  key={row.order_id}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => goDetail(row.order_id)}
                >
                  <TableCell>{row.order_date ?? "-"}</TableCell>
                  <TableCell>{row.sales_date ?? "-"}</TableCell>
                  <TableCell>{row.customer_name}</TableCell>

                  <TableCell align="center">
                    <Chip
                      label={DELIVERY_LABEL[row.delivery_status] ?? row.delivery_status}
                      color={DELIVERY_COLOR[row.delivery_status] ?? "default"}
                      size="small"
                    />
                  </TableCell>

                  <TableCell align="center">
                    <Chip
                      label={PAYMENT_LABEL[row.payment_status] ?? row.payment_status}
                      color={PAYMENT_COLOR[row.payment_status] ?? "default"}
                      size="small"
                    />
                  </TableCell>

                  <TableCell align="right">{formatPrice(row.grand_total)}</TableCell>
                  <TableCell align="right" sx={{ color: "success.main" }}>
                    {formatPrice(row.paid_total)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ color: row.unpaid_total > 0 ? "error.main" : "text.secondary" }}
                  >
                    {formatPrice(row.unpaid_total)}
                  </TableCell>

                  <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                    <IconButton size="small" onClick={(e) => openMenu(e, row.order_id)}>
                      <MoreVertIcon fontSize="small" />
                    </IconButton>

                    <Menu
                      anchorEl={menuAnchor[row.order_id]}
                      open={Boolean(menuAnchor[row.order_id])}
                      onClose={() => closeMenu(row.order_id)}
                    >
                      <MenuItem
                        onClick={() => { closeMenu(row.order_id); goDetail(row.order_id); }}
                      >
                        <ListItemIcon><OpenInNewIcon fontSize="small" /></ListItemIcon>
                        <ListItemText>納品・入金管理</ListItemText>
                      </MenuItem>
                      <MenuItem
                        onClick={() => {
                          closeMenu(row.order_id);
                          router.push(`/dashboard/orders/${row.order_id}`);
                        }}
                      >
                        <ListItemIcon><ReceiptLongIcon fontSize="small" /></ListItemIcon>
                        <ListItemText>受注詳細を見る</ListItemText>
                      </MenuItem>
                    </Menu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

    </Box>
  );
}
