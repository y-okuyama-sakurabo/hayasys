"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import {
  Box, Paper, Typography, TextField, Stack, CircularProgress,
  Grid, FormControl, InputLabel, Select, MenuItem, Button,
  Tab, Tabs, Table, TableBody, TableCell, TableHead, TableRow,
  Chip, Divider, ToggleButton, ToggleButtonGroup, LinearProgress,
} from "@mui/material";
import TrendingUpIcon   from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import RemoveIcon       from "@mui/icons-material/Remove";
import {
  ComposedChart, Line, Bar,
  XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import SearchIcon from "@mui/icons-material/Search";
import apiClient from "@/lib/apiClient";

// ========================
// 型・定数
// ========================
type DailyData = { date: string; estimate: number; order: number; sales: number };
type FullList  = { estimates: any[]; orders: any[]; sales: any[] };
type AggUnit   = "day" | "week" | "month";

const fmt = (n: number) => "¥" + Math.round(n).toLocaleString("ja-JP");
const pct = (curr: number, prev: number): number | null =>
  prev === 0 ? null : ((curr - prev) / prev) * 100;

// ========================
// 集計ユーティリティ
// ========================
function aggregateData(raw: DailyData[], unit: AggUnit): DailyData[] {
  if (unit === "day") return raw;

  const map: Record<string, DailyData> = {};

  for (const d of raw) {
    let key: string;
    if (unit === "month") {
      key = d.date.slice(0, 7); // "YYYY-MM"
    } else {
      // 週：その週の月曜日を key にする
      const dt     = dayjs(d.date);
      const dow    = dt.day(); // 0=日
      const toMon  = dow === 0 ? 6 : dow - 1;
      key = dt.subtract(toMon, "day").format("YYYY-MM-DD");
    }
    if (!map[key]) map[key] = { date: key, estimate: 0, order: 0, sales: 0 };
    map[key].estimate += d.estimate;
    map[key].order    += d.order;
    map[key].sales    += d.sales;
  }

  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
}

function xLabel(val: string, unit: AggUnit): string {
  if (unit === "month") return dayjs(val + "-01").format("M月");
  if (unit === "week")  return dayjs(val).format("M/D〜");
  return dayjs(val).format("M/D");
}

// ========================
// KPIカード
// ========================
function KpiCard({ label, color, total, count, diff }: {
  label: string; color: string; total: number; count: number; diff: number | null;
}) {
  const up = diff !== null && diff >= 0;
  return (
    <Paper sx={{ p: 2.5, borderTop: `4px solid ${color}`, height: "100%" }}>
      <Typography variant="caption" color="text.secondary" fontWeight="bold" letterSpacing={0.8}>
        {label}
      </Typography>
      <Typography variant="h5" fontWeight="bold" sx={{ mt: 0.5, mb: 1 }}>
        {fmt(total)}
      </Typography>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="body2" color="text.secondary">{count} 件</Typography>
        {diff === null ? (
          <Chip size="small" icon={<RemoveIcon />} label="前月データなし" variant="outlined" />
        ) : (
          <Chip
            size="small"
            icon={up ? <TrendingUpIcon /> : <TrendingDownIcon />}
            label={`前月比 ${up ? "+" : ""}${diff.toFixed(1)}%`}
            color={up ? "success" : "error"}
            variant="outlined"
          />
        )}
      </Stack>
    </Paper>
  );
}

// ========================
// 見積→受注 転換率カード
// ========================
function ConversionRateCard({
  orderedEstimateCount,
  estimateCount,
  orderedEstimateTotal,
  estimateTotal,
  directOrderCount,
}: {
  orderedEstimateCount: number;
  estimateCount: number;
  orderedEstimateTotal: number;
  estimateTotal: number;
  directOrderCount: number;
}) {
  // 見積が1件もない場合は非表示
  if (estimateCount === 0) return null;

  // 件数ベース転換率：見積のうち受注済になった割合
  const rateCount  = estimateCount > 0
    ? (orderedEstimateCount / estimateCount * 100)
    : null;

  // 金額ベース転換率：見積金額のうち受注済見積の金額割合
  const rateAmount = estimateTotal > 0
    ? (orderedEstimateTotal / estimateTotal * 100)
    : null;

  const barColor = (r: number): "success" | "warning" | "error" =>
    r >= 70 ? "success" : r >= 50 ? "warning" : "error";

  return (
    <Paper sx={{ p: 2.5, borderTop: "4px solid #6a1b9a" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
        <Typography variant="caption" color="text.secondary" fontWeight="bold" letterSpacing={0.8}>
          見積 → 受注 転換率
        </Typography>
        {/* 直接受注の補足情報 */}
        {directOrderCount > 0 && (
          <Chip
            size="small"
            label={`直接受注 ${directOrderCount}件（見積なし）`}
            variant="outlined"
            sx={{ fontSize: 11 }}
          />
        )}
      </Stack>

      <Grid container spacing={3} sx={{ mt: 0.5 }}>
        {/* 件数ベース */}
        {rateCount !== null && (
          <Grid size={{ xs: 12, sm: 6 }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">件数ベース</Typography>
              <Typography variant="body2" fontWeight="bold">
                {rateCount.toFixed(1)}%
                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                  ({orderedEstimateCount} / {estimateCount}件)
                </Typography>
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={Math.min(rateCount, 100)}
              color={barColor(rateCount)}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Grid>
        )}

        {/* 金額ベース */}
        {rateAmount !== null && (
          <Grid size={{ xs: 12, sm: 6 }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">金額ベース</Typography>
              <Typography variant="body2" fontWeight="bold">
                {rateAmount.toFixed(1)}%
                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                  ({fmt(orderedEstimateTotal)} / {fmt(estimateTotal)})
                </Typography>
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={Math.min(rateAmount, 100)}
              color={barColor(rateAmount)}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Grid>
        )}
      </Grid>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: "block" }}>
        ※ 同期間に作成された見積のうち、受注済みになった割合（直接受注は含まず）
      </Typography>
    </Paper>
  );
}

// ========================
// テーブル（受注・売上共通）
// ========================
function OrderTable({ rows, onRowClick, dateKey, noKey }: {
  rows: any[]; onRowClick: (id: number) => void; dateKey: string; noKey: string;
}) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow sx={{ bgcolor: "grey.50" }}>
          <TableCell>番号</TableCell>
          <TableCell>日付</TableCell>
          <TableCell>顧客名</TableCell>
          <TableCell align="right">金額</TableCell>
          <TableCell>担当</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} align="center" sx={{ color: "text.secondary", py: 3 }}>
              データがありません
            </TableCell>
          </TableRow>
        ) : rows.map((r: any) => (
          <TableRow key={r.id} hover sx={{ cursor: "pointer" }} onClick={() => onRowClick(r.id)}>
            <TableCell>{r[noKey] ?? "-"}</TableCell>
            <TableCell>{r[dateKey] ?? r.created_at?.slice(0, 10) ?? "-"}</TableCell>
            <TableCell>{r.party_name ?? r.party?.name ?? "-"}</TableCell>
            <TableCell align="right">{fmt(Number(r.grand_total))}</TableCell>
            <TableCell>{r.created_by?.display_name ?? "-"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function EstimateTable({ rows, onRowClick }: {
  rows: any[]; onRowClick: (id: number) => void;
}) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow sx={{ bgcolor: "grey.50" }}>
          <TableCell>見積番号</TableCell>
          <TableCell>見積日</TableCell>
          <TableCell>顧客名</TableCell>
          <TableCell align="right">金額</TableCell>
          <TableCell>担当</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} align="center" sx={{ color: "text.secondary", py: 3 }}>
              データがありません
            </TableCell>
          </TableRow>
        ) : rows.map((r: any) => (
          <TableRow key={r.id} hover sx={{ cursor: "pointer" }} onClick={() => onRowClick(r.id)}>
            <TableCell>{r.estimate_no ?? "-"}</TableCell>
            <TableCell>{r.estimate_date ?? r.created_at?.slice(0, 10) ?? "-"}</TableCell>
            <TableCell>{r.party?.name ?? "-"}</TableCell>
            <TableCell align="right">{fmt(Number(r.grand_total))}</TableCell>
            <TableCell>{r.created_by?.display_name ?? "-"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ========================
// メイン
// ========================
export default function SalesAnalyticsPage() {
  const router = useRouter();
  const today  = dayjs();

  // ── 期間モード ──
  const [periodMode,    setPeriodMode]    = useState<"month" | "range">("month");
  const [selectedMonth, setSelectedMonth] = useState(today.format("YYYY-MM"));

  // ── 期間指定モード用 ──
  const [rangeFrom, setRangeFrom] = useState(today.startOf("month").format("YYYY-MM-DD"));
  const [rangeTo,   setRangeTo]   = useState(today.format("YYYY-MM-DD"));

  // ── フィルター ──
  const [shopId,  setShopId]  = useState<number | "all">("all");
  const [staffId, setStaffId] = useState<number | "all">("all");
  const [shops,   setShops]   = useState<any[]>([]);
  const [staffs,  setStaffs]  = useState<any[]>([]);

  // ── 集計単位 ──
  const [aggUnit, setAggUnit] = useState<AggUnit>("day");

  // ── データ ──
  const [data,     setData]     = useState<DailyData[]>([]);
  const [prevData, setPrevData] = useState<DailyData[]>([]);
  const [fullList, setFullList] = useState<FullList>({ estimates: [], orders: [], sales: [] });
  const [loading,  setLoading]  = useState(false);
  const [tab,      setTab]      = useState(0); // 0=受注, 1=見積, 2=売上

  // 月選択モード時の start/end を導出
  const monthStart = dayjs(selectedMonth + "-01").startOf("month").format("YYYY-MM-DD");
  const monthEnd   = dayjs(selectedMonth + "-01").endOf("month").format("YYYY-MM-DD");

  // 実際に使う start/end
  const start = periodMode === "month" ? monthStart : rangeFrom;
  const end   = periodMode === "month" ? monthEnd   : rangeTo;

  // 初期ロード
  useEffect(() => {
    Promise.all([
      apiClient.get("/masters/shops/"),
      apiClient.get("/masters/staffs/"),
      apiClient.get("/auth/user/"),
    ]).then(([shopRes, staffRes, userRes]) => {
      setShops(shopRes.data.results  || shopRes.data  || []);
      setStaffs(staffRes.data.results || staffRes.data || []);
      const u = userRes.data;
      if (u?.shop_id) setShopId(u.shop_id);
    }).catch(console.error);
  }, []);

  // 月選択モード：月 / 店舗 / 担当 が変化したら自動フェッチ
  useEffect(() => {
    if (periodMode === "month") fetchAll(monthStart, monthEnd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, shopId, staffId, periodMode]);

  // モード切り替え
  const handlePeriodModeChange = (_: any, val: "month" | "range") => {
    if (!val) return;
    setPeriodMode(val);
    setData([]);
    setPrevData([]);
    setFullList({ estimates: [], orders: [], sales: [] });
    if (val === "month") fetchAll(monthStart, monthEnd);
  };

  const fetchAll = async (s = start, e = end) => {
    setLoading(true);
    try {
      const params     = { start: s, end: e, shop_id: shopId, staff_id: staffId };
      const prevStart  = dayjs(s).subtract(1, "month").format("YYYY-MM-DD");
      const prevEnd    = dayjs(e).subtract(1, "month").format("YYYY-MM-DD");
      const prevParams = { start: prevStart, end: prevEnd, shop_id: shopId, staff_id: staffId };

      const [dailyRes, prevDailyRes, listRes] = await Promise.all([
        apiClient.get("/analytics/sales-daily/", { params }),
        apiClient.get("/analytics/sales-daily/", { params: prevParams }),
        apiClient.get("/analytics/sales-list/",  { params }),
      ]);

      setData(dailyRes.data);
      setPrevData(prevDailyRes.data);
      setFullList(listRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // 集計
  const chartData = aggregateData(data, aggUnit);

  const orderTotal    = data.reduce((s, d) => s + d.order,    0);
  const estimateTotal = data.reduce((s, d) => s + d.estimate, 0);
  const salesTotal    = data.reduce((s, d) => s + d.sales,    0);

  const prevOrderTotal    = prevData.reduce((s, d) => s + d.order,    0);
  const prevEstimateTotal = prevData.reduce((s, d) => s + d.estimate, 0);
  const prevSalesTotal    = prevData.reduce((s, d) => s + d.sales,    0);

  const orderCount    = fullList.orders.length;
  const estimateCount = fullList.estimates.length;
  const salesCount    = (fullList.sales || []).length;

  // 見積→受注 転換率の分子：同期間の見積のうちステータスが「受注済」のもの
  const orderedEstimates      = (fullList.estimates as any[]).filter((e) => e.status === "ordered");
  const orderedEstimateCount  = orderedEstimates.length;
  const orderedEstimateTotal  = orderedEstimates.reduce((s: number, e: any) => s + Number(e.grand_total || 0), 0);

  // 直接受注数（見積を経由せずに作成された受注の概算）
  const directOrderCount = Math.max(0, orderCount - orderedEstimateCount);

  const aggLabels: Record<AggUnit, string> = { day: "日次", week: "週次", month: "月次" };

  // ========================
  // UI
  // ========================
  return (
    <Box>
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>売上分析</Typography>

      {/* ── フィルター ── */}
      <Paper sx={{ p: 2, mb: 2 }}>
        {/* 1行目：店舗 ＋ 担当 ＋ 期間モード ＋ 期間入力 */}
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          {/* 店舗 */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>店舗</InputLabel>
            <Select value={shopId} label="店舗" onChange={(e) => setShopId(e.target.value as any)}>
              <MenuItem value="all">全店舗</MenuItem>
              {shops.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
            </Select>
          </FormControl>

          {/* 担当 */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>担当</InputLabel>
            <Select value={staffId} label="担当" onChange={(e) => setStaffId(e.target.value as any)}>
              <MenuItem value="all">全担当</MenuItem>
              {staffs.map((s) => <MenuItem key={s.id} value={s.id}>{s.display_name}</MenuItem>)}
            </Select>
          </FormControl>

          <Divider orientation="vertical" flexItem />

          {/* 期間モード切り替え */}
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
                {Array.from({ length: 24 }, (_, i) => {
                  const m = today.subtract(i, "month");
                  return (
                    <MenuItem key={m.format("YYYY-MM")} value={m.format("YYYY-MM")}>
                      {m.format("YYYY年MM月")}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          )}

          {/* 期間指定モード */}
          {periodMode === "range" && (
            <>
              <TextField
                label="開始日" type="date" size="small" value={rangeFrom}
                onChange={(e) => setRangeFrom(e.target.value)}
                InputLabelProps={{ shrink: true }} sx={{ width: 160 }}
              />
              <Typography variant="body2" color="text.secondary">〜</Typography>
              <TextField
                label="終了日" type="date" size="small" value={rangeTo}
                onChange={(e) => setRangeTo(e.target.value)}
                InputLabelProps={{ shrink: true }} sx={{ width: 160 }}
              />
              <Button
                variant="contained"
                size="small"
                startIcon={<SearchIcon />}
                onClick={() => fetchAll(rangeFrom, rangeTo)}
              >
                検索
              </Button>
            </>
          )}
        </Stack>
      </Paper>

      {/* ── KPIカード ── */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <KpiCard label="見積" color="#1565c0" total={estimateTotal}
            count={estimateCount} diff={pct(estimateTotal, prevEstimateTotal)} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <KpiCard label="受注" color="#2e7d32" total={orderTotal}
            count={orderCount} diff={pct(orderTotal, prevOrderTotal)} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <KpiCard label="売上" color="#e65100" total={salesTotal}
            count={salesCount} diff={pct(salesTotal, prevSalesTotal)} />
        </Grid>
      </Grid>

      {/* ── 受注率 ── */}
      <Box sx={{ mb: 2 }}>
        <ConversionRateCard
          orderedEstimateCount={orderedEstimateCount}
          estimateCount={estimateCount}
          orderedEstimateTotal={orderedEstimateTotal}
          estimateTotal={estimateTotal}
          directOrderCount={directOrderCount}
        />
      </Box>

      {/* ── グラフ ── */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Typography variant="subtitle2" color="text.secondary">
            {aggLabels[aggUnit]}推移
          </Typography>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={aggUnit}
            onChange={(_, v) => v && setAggUnit(v)}
          >
            <ToggleButton value="day">日</ToggleButton>
            <ToggleButton value="week">週</ToggleButton>
            <ToggleButton value="month">月</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {loading ? (
          <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => xLabel(v, aggUnit)}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : String(v)}
              />
              <Tooltip
                formatter={(v: any) => fmt(Number(v))}
                labelFormatter={(v) => xLabel(String(v), aggUnit)}
              />
              <Legend
                content={() => (
                  <Stack direction="row" justifyContent="center" spacing={3} sx={{ pt: 1 }}>
                    {([
                      { label: "見積", color: "#1565c0" },
                      { label: "受注", color: "#2e7d32" },
                      { label: "売上", color: "#e65100" },
                    ] as const).map(({ label, color }) => (
                      <Stack key={label} direction="row" spacing={0.5} alignItems="center">
                        <Box
                          sx={{
                            width: 12, height: aggUnit === "day" ? 3 : 12,
                            bgcolor: color,
                            borderRadius: aggUnit === "day" ? 2 : 0.5,
                          }}
                        />
                        <Typography variant="caption" color="text.secondary">{label}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                )}
              />

              {aggUnit === "day" ? (
                <>
                  <Line type="monotone" dataKey="estimate" name="見積" stroke="#1565c0" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="order"    name="受注" stroke="#2e7d32" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="sales"    name="売上" stroke="#e65100" dot={false} strokeWidth={2} />
                </>
              ) : (
                <>
                  <Bar dataKey="estimate" name="見積" fill="#1565c0" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="order"    name="受注" fill="#2e7d32" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="sales"    name="売上" fill="#e65100" radius={[3, 3, 0, 0]} />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Paper>

      {/* ── 詳細テーブル ── */}
      <Paper sx={{ p: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label={`見積 (${estimateCount}件)`} />
          <Tab label={`受注 (${orderCount}件)`} />
          <Tab label={`売上 (${salesCount}件)`} />
        </Tabs>
        <Divider sx={{ mb: 2 }} />

        {tab === 0 && (
          <EstimateTable
            rows={fullList.estimates}
            onRowClick={(id) => router.push(`/dashboard/estimates/${id}`)}
          />
        )}
        {tab === 1 && (
          <OrderTable
            rows={fullList.orders}
            onRowClick={(id) => router.push(`/dashboard/orders/${id}`)}
            dateKey="order_date" noKey="order_no"
          />
        )}
        {tab === 2 && (
          <OrderTable
            rows={fullList.sales || []}
            onRowClick={(id) => router.push(`/dashboard/orders/${id}`)}
            dateKey="sales_date" noKey="order_no"
          />
        )}
      </Paper>
    </Box>
  );
}
