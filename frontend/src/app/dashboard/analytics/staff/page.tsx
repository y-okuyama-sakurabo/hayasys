"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Box, Paper, Typography, Stack, Chip, Grid,
  FormControl, InputLabel, Select, MenuItem, TextField,
  ToggleButton, ToggleButtonGroup, Divider, Button,
  Table, TableHead, TableRow, TableCell, TableBody,
  TableContainer, TablePagination, IconButton,
} from "@mui/material";
import ArrowBackIcon    from "@mui/icons-material/ArrowBack";
import WorkIcon         from "@mui/icons-material/Work";
import SearchIcon       from "@mui/icons-material/Search";
import ExpandMoreIcon   from "@mui/icons-material/ExpandMore";
import ExpandLessIcon   from "@mui/icons-material/ExpandLess";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
  PieChart, Pie, Legend,
} from "recharts";
import apiClient from "@/lib/apiClient";
import dayjs from "dayjs";

// ========================
// 定数
// ========================
const CHART_COLORS = [
  "#4caf50", "#2196f3", "#ff9800", "#f44336",
  "#9c27b0", "#00bcd4", "#795548", "#e91e63",
];
const fmt  = (n: number) => "¥" + Math.round(n).toLocaleString("ja-JP");
const fmtK = (n: number) => n >= 10000 ? `${(n / 10000).toFixed(0)}万` : String(n);

// ========================
// KPIカード
// ========================
function KpiMini({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, textAlign: "center" }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="h6" fontWeight="bold" sx={{ mt: 0.3 }}>{value}</Typography>
      {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
    </Paper>
  );
}

// ========================
// メイン
// ========================
export default function StaffAnalyticsPage() {
  const today = dayjs();

  // ── 共通フィルター ──
  const [mode,        setMode]        = useState<"order" | "estimate">("order");
  const [shopId,      setShopId]      = useState<number | "all">("all");
  const [shops,       setShops]       = useState<any[]>([]);
  const [initLoading, setInitLoading] = useState(true);

  // ── 期間 ──
  const [periodMode,    setPeriodMode]    = useState<"month" | "range">("month");
  const [selectedMonth, setSelectedMonth] = useState(today.format("YYYY-MM"));
  const [rangeFrom,     setRangeFrom]     = useState(today.startOf("month").format("YYYY-MM-DD"));
  const [rangeTo,       setRangeTo]       = useState(today.format("YYYY-MM-DD"));

  const initStart = dayjs(today.format("YYYY-MM") + "-01").startOf("month").format("YYYY-MM-DD");
  const [appliedStart, setAppliedStart] = useState(initStart);
  const [appliedEnd,   setAppliedEnd]   = useState(today.format("YYYY-MM-DD"));

  // 月単位モード：月選択が変わったら即 apply
  useEffect(() => {
    if (periodMode === "month") {
      setAppliedStart(dayjs(selectedMonth + "-01").startOf("month").format("YYYY-MM-DD"));
      setAppliedEnd(dayjs(selectedMonth + "-01").endOf("month").format("YYYY-MM-DD"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodMode, selectedMonth]);

  // ── データ ──
  const [data,          setData]          = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
  const [metric,        setMetric]        = useState<"total" | "count">("total");

  // ── 内訳テーブル ──
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailPage, setDetailPage] = useState(0);
  const DETAIL_ROWS = 20;

  // 初期ロード（自店舗デフォルト）
  useEffect(() => {
    const init = async () => {
      try {
        const [meRes, shopRes] = await Promise.all([
          apiClient.get("/auth/user/"),
          apiClient.get("/masters/shops/"),
        ]);
        const myShopId = meRes.data?.shop_id ?? "all";
        setShopId(myShopId);
        setShops(shopRes.data.results || shopRes.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setInitLoading(false);
      }
    };
    init();
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const res = await apiClient.get("/analytics/product/", {
        params: { mode, type: "staff_work", start: appliedStart, end: appliedEnd, shop_id: shopId },
      });
      const d = res.data || [];
      setData(d);
      if (selectedStaff) {
        const updated = d.find((s: any) => s.name === selectedStaff.name);
        setSelectedStaff(updated ?? null);
      }
    } catch (e) {
      console.error(e);
    }
  }, [mode, appliedStart, appliedEnd, shopId]); // eslint-disable-line

  useEffect(() => {
    if (initLoading) return;
    fetchData();
  }, [fetchData, initLoading]);

  // 月オプション（直近24ヶ月）
  const monthOptions = Array.from({ length: 24 }, (_, i) => {
    const m = today.subtract(i, "month");
    return { value: m.format("YYYY-MM"), label: m.format("YYYY年MM月") };
  });

  // 個人詳細の派生データ
  const avgPrice   = selectedStaff && selectedStaff.count > 0
    ? Math.round(selectedStaff.total / selectedStaff.count) : 0;
  const breadth    = selectedStaff?.category_breadth ?? 0;
  const itemTypes  = selectedStaff?.item_types  ?? [];
  const monthly    = selectedStaff?.monthly     ?? [];
  const categories = selectedStaff?.categories  ?? [];
  const detailItems = selectedStaff?.items       ?? [];

  const barData = [...data].sort((a, b) => b[metric] - a[metric]).slice(0, 15);

  // ========================
  // UI
  // ========================
  return (
    <Box>
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>作業分析</Typography>

      {/* ── フィルター ── */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <ToggleButtonGroup size="small" exclusive value={mode} onChange={(_, v) => v && setMode(v)}>
              <ToggleButton value="order">受注</ToggleButton>
              <ToggleButton value="estimate">見積</ToggleButton>
            </ToggleButtonGroup>

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>店舗</InputLabel>
              <Select value={shopId} label="店舗" onChange={(e) => setShopId(e.target.value as any)}>
                <MenuItem value="all">全店舗</MenuItem>
                {shops.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
              </Select>
            </FormControl>

            <ToggleButtonGroup size="small" exclusive value={periodMode} onChange={(_, v) => v && setPeriodMode(v)}>
              <ToggleButton value="month">月単位</ToggleButton>
              <ToggleButton value="range">日付範囲</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {periodMode === "month" ? (
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>月選択</InputLabel>
              <Select value={selectedMonth} label="月選択" onChange={(e) => setSelectedMonth(e.target.value)}>
                {monthOptions.map((m) => (
                  <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <Stack direction="row" spacing={1.5} alignItems="center">
              <TextField
                label="開始日" type="date" size="small"
                value={rangeFrom}
                onChange={(e) => setRangeFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 155 }}
              />
              <Typography variant="body2" color="text.secondary">〜</Typography>
              <TextField
                label="終了日" type="date" size="small"
                value={rangeTo}
                onChange={(e) => setRangeTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 155 }}
              />
              <Button
                variant="contained" size="small"
                startIcon={<SearchIcon />}
                onClick={() => { setAppliedStart(rangeFrom); setAppliedEnd(rangeTo); }}
              >
                検索
              </Button>
            </Stack>
          )}
        </Stack>
      </Paper>

      {/* ════════════════════════════════
          全担当者比較
      ════════════════════════════════ */}
      {!selectedStaff && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold">全担当者比較</Typography>
            <ToggleButtonGroup size="small" exclusive value={metric} onChange={(_, v) => v && setMetric(v)}>
              <ToggleButton value="total">金額</ToggleButton>
              <ToggleButton value="count">件数</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {data.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
              データがありません
            </Typography>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, barData.length * 44)}>
              <BarChart layout="vertical" data={barData} margin={{ left: 16, right: 80 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => metric === "total" ? fmtK(v) : `${v}件`}
                />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: any) => metric === "total" ? fmt(Number(v)) : `${v} 件`} />
                <Bar
                  dataKey={metric}
                  name={metric === "total" ? "売上金額" : "件数"}
                  cursor="pointer"
                  radius={[0, 4, 4, 0]}
                  onClick={(entry: any) => {
                    setSelectedStaff(data.find((s: any) => s.name === entry.name) ?? null);
                    setDetailOpen(false);
                    setDetailPage(0);
                  }}
                >
                  {barData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                  <LabelList
                    dataKey={metric}
                    position="right"
                    formatter={(v: any) => metric === "total" ? fmt(Number(v)) : `${v}件`}
                    style={{ fontSize: 11, fill: "#444" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {data.length > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
              ※ バーをクリックすると個人詳細を表示します
            </Typography>
          )}
        </Paper>
      )}

      {/* ════════════════════════════════
          個人詳細
      ════════════════════════════════ */}
      {selectedStaff && (
        <Box>
          {/* ヘッダー */}
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <Button
              startIcon={<ArrowBackIcon />}
              size="small"
              variant="outlined"
              onClick={() => { setSelectedStaff(null); setDetailOpen(false); setDetailPage(0); }}
            >
              一覧に戻る
            </Button>
            <WorkIcon color="action" />
            <Typography variant="h6" fontWeight="bold">{selectedStaff.name}</Typography>
          </Stack>

          {/* KPIカード */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <KpiMini label="担当件数" value={`${selectedStaff.count} 件`} />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <KpiMini label="合計金額" value={fmt(selectedStaff.total)} />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <KpiMini label="平均単価" value={fmt(avgPrice)} sub="/ 件" />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <KpiMini
                label="作業種別の幅"
                value={`${breadth} 種`}
                sub={itemTypes.map((t: any) => t.name).join(" / ") || "-"}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            {/* 作業種別ドーナツ */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Paper sx={{ p: 2, height: "100%" }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  作業種別の内訳
                </Typography>
                {itemTypes.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                    データなし
                  </Typography>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={itemTypes}
                        cx="50%" cy="50%"
                        innerRadius={60} outerRadius={95}
                        dataKey="total"
                        nameKey="name"
                        paddingAngle={2}
                      >
                        {itemTypes.map((_: any, i: number) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: any, _: any, props: any) =>
                          [`${fmt(Number(v))} (${props.payload.count}件)`, props.payload.name]
                        }
                      />
                      <Legend iconSize={10} formatter={(value, entry: any) =>
                        `${value} ${entry.payload.count}件`
                      } />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Paper>
            </Grid>

            {/* 月次棒グラフ */}
            <Grid size={{ xs: 12, md: 7 }}>
              <Paper sx={{ p: 2, height: "100%" }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  月次推移
                </Typography>
                {monthly.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                    データなし
                  </Typography>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={monthly} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtK} />
                      <Tooltip formatter={(v: any) => fmt(Number(v))} />
                      <Bar dataKey="total" name="金額" fill="#2e7d32" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="count" position="top" formatter={(v: any) => `${v}件`} style={{ fontSize: 10, fill: "#555" }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Paper>
            </Grid>
          </Grid>

          {/* カテゴリランキング */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              担当カテゴリ一覧
            </Typography>
            <Divider sx={{ mb: 1 }} />
            {categories.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
                カテゴリ情報がありません
              </Typography>
            ) : (
              <Box>
                {categories.map((c: any, i: number) => (
                  <Stack
                    key={i}
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ py: 1, borderBottom: "1px solid #f0f0f0" }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        label={i + 1}
                        size="small"
                        sx={{ bgcolor: CHART_COLORS[i % CHART_COLORS.length], color: "white", minWidth: 28 }}
                      />
                      <Typography variant="body2">{c.name}</Typography>
                    </Stack>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Typography variant="body2" fontWeight="bold">{fmt(c.total)}</Typography>
                      <Typography variant="caption" color="text.secondary">{c.count}件</Typography>
                    </Stack>
                  </Stack>
                ))}
              </Box>
            )}
          </Paper>

          {/* 内訳明細 */}
          <Paper sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ flex: 1, cursor: "pointer" }}
                onClick={() => { setDetailOpen(!detailOpen); setDetailPage(0); }}
              >
                内訳明細 ({detailItems.length}件)
              </Typography>
              <IconButton size="small" onClick={() => { setDetailOpen(!detailOpen); setDetailPage(0); }}>
                {detailOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              </IconButton>
            </Stack>

            {detailOpen && (
              <Box sx={{ mt: 1 }}>
                <Divider sx={{ mb: 1 }} />
                {detailItems.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
                    明細データがありません
                  </Typography>
                ) : (
                  <>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ "& th": { fontWeight: "bold", bgcolor: "#fafafa", fontSize: 12 } }}>
                            <TableCell>日付</TableCell>
                            <TableCell>{mode === "order" ? "受注No" : "見積No"}</TableCell>
                            <TableCell>商品名</TableCell>
                            <TableCell>カテゴリ</TableCell>
                            <TableCell>種別</TableCell>
                            <TableCell align="right">金額</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {detailItems
                            .slice(detailPage * DETAIL_ROWS, (detailPage + 1) * DETAIL_ROWS)
                            .map((it: any, i: number) => (
                              <TableRow key={i} hover sx={{ "& td": { fontSize: 12 } }}>
                                <TableCell sx={{ whiteSpace: "nowrap" }}>{it.date}</TableCell>
                                <TableCell sx={{ whiteSpace: "nowrap", color: "text.secondary" }}>
                                  {it.ref_no || it.ref_id ? `#${it.ref_no || it.ref_id}` : "-"}
                                </TableCell>
                                <TableCell>{it.name || "（名称なし）"}</TableCell>
                                <TableCell sx={{ color: "text.secondary" }}>{it.category || "-"}</TableCell>
                                <TableCell>
                                  <Chip label={it.item_type} size="small" variant="outlined" sx={{ fontSize: 10 }} />
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: "bold", whiteSpace: "nowrap" }}>
                                  {fmt(it.subtotal)}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    {detailItems.length > DETAIL_ROWS && (
                      <TablePagination
                        component="div"
                        count={detailItems.length}
                        page={detailPage}
                        rowsPerPage={DETAIL_ROWS}
                        rowsPerPageOptions={[DETAIL_ROWS]}
                        onPageChange={(_, p) => setDetailPage(p)}
                        labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}件`}
                      />
                    )}
                  </>
                )}
              </Box>
            )}
          </Paper>
        </Box>
      )}
    </Box>
  );
}
