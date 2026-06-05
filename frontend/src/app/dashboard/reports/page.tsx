"use client";

import { useEffect, useState } from "react";
import {
  Box, Paper, Typography, Stack, Button, Chip,
  FormControl, InputLabel, Select, MenuItem, TextField,
  ToggleButton, ToggleButtonGroup,
  Table, TableHead, TableRow, TableCell, TableBody,
  CircularProgress, Divider, Alert,
} from "@mui/material";
import PrintIcon   from "@mui/icons-material/Print";
import SearchIcon  from "@mui/icons-material/Search";
import apiClient   from "@/lib/apiClient";
import dayjs       from "dayjs";
import JaDatePicker from "@/components/common/JaDatePicker";

// ========================
// 定数
// ========================
const REPORT_TYPES = [
  { value: "ar_list",     label: "売掛金リスト" },
  { value: "credit_list", label: "クレジットリスト" },
] as const;

type ReportType = typeof REPORT_TYPES[number]["value"];

const fmt = (n: number) => "¥" + Math.round(n).toLocaleString("ja-JP");

// ========================
// ヘルパー: 合計行セル
// ========================
function TotalCell({ children }: { children?: React.ReactNode }) {
  return (
    <TableCell sx={{ fontWeight: "bold", bgcolor: "#f0f4ff", borderTop: "2px solid #90caf9" }}>
      {children}
    </TableCell>
  );
}

// ========================
// 売掛金リスト
// ========================
function ArTable({ rows, totals }: { rows: any[]; totals: any }) {
  if (!rows.length) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
        データがありません
      </Typography>
    );
  }
  return (
    <Table size="small" className="print-table">
      <TableHead>
        <TableRow sx={{ "& th": { fontWeight: "bold", bgcolor: "#f5f5f5", fontSize: 12 } }}>
          <TableCell>受注No</TableCell>
          <TableCell>受注日</TableCell>
          <TableCell>納品日</TableCell>
          <TableCell>顧客名</TableCell>
          <TableCell>電話番号</TableCell>
          <TableCell>担当</TableCell>
          <TableCell>店舗</TableCell>
          <TableCell align="right">受注金額</TableCell>
          <TableCell align="right">決済済み</TableCell>
          <TableCell align="right">売掛金</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((r, i) => (
          <TableRow key={i} hover>
            <TableCell sx={{ fontSize: 12, color: "text.secondary" }}>{r.order_no}</TableCell>
            <TableCell sx={{ fontSize: 12 }}>{r.order_date}</TableCell>
            <TableCell sx={{ fontSize: 12 }}>{r.delivery_date || "—"}</TableCell>
            <TableCell sx={{ fontWeight: 500 }}>{r.customer_name}</TableCell>
            <TableCell sx={{ fontSize: 12, color: "text.secondary" }}>{r.phone || "—"}</TableCell>
            <TableCell sx={{ fontSize: 12 }}>{r.staff_name || "—"}</TableCell>
            <TableCell sx={{ fontSize: 12 }}>{r.shop_name}</TableCell>
            <TableCell align="right" sx={{ fontSize: 12 }}>{fmt(r.grand_total)}</TableCell>
            <TableCell align="right" sx={{ fontSize: 12, color: r.paid_amount > 0 ? "success.main" : "text.disabled" }}>
              {fmt(r.paid_amount)}
            </TableCell>
            <TableCell align="right" sx={{ fontSize: 12, fontWeight: r.ar_amount > 0 ? 600 : 400, color: r.ar_amount > 0 ? "error.main" : "text.secondary" }}>
              {fmt(r.ar_amount)}
            </TableCell>
          </TableRow>
        ))}
        <TableRow>
          <TotalCell><Typography variant="caption" fontWeight="bold">合計 {totals.count}件</Typography></TotalCell>
          <TotalCell /><TotalCell /><TotalCell /><TotalCell /><TotalCell /><TotalCell />
          <TotalCell><Typography variant="body2" fontWeight="bold">{fmt(totals.grand_total)}</Typography></TotalCell>
          <TotalCell><Typography variant="body2" fontWeight="bold">{fmt(totals.paid_amount)}</Typography></TotalCell>
          <TotalCell><Typography variant="body2" fontWeight="bold" color="error.main">{fmt(totals.ar_amount)}</Typography></TotalCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

// ========================
// クレジットリスト
// ========================
function CreditTable({ rows, totals }: { rows: any[]; totals: any }) {
  if (!rows.length) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
        データがありません
      </Typography>
    );
  }
  return (
    <Stack spacing={3}>
      {rows.map((company: any) => (
        <Box key={company.credit_company}>
          <Box sx={{ px: 1.5, py: 1, bgcolor: "#e3f2fd", borderRadius: 1, mb: 0.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="subtitle2" fontWeight="bold">{company.credit_company}</Typography>
            <Stack direction="row" spacing={3}>
              <Typography variant="caption" color="text.secondary">{company.count}件</Typography>
              <Typography variant="body2" fontWeight="bold">{fmt(company.total)}</Typography>
            </Stack>
          </Box>
          <Table size="small" className="print-table">
            <TableHead>
              <TableRow sx={{ "& th": { fontWeight: "bold", bgcolor: "#fafafa", fontSize: 11 } }}>
                <TableCell>受注No</TableCell>
                <TableCell>受注日</TableCell>
                <TableCell>顧客名</TableCell>
                <TableCell>店舗</TableCell>
                <TableCell align="right">受注金額</TableCell>
                <TableCell align="right">頭金</TableCell>
                <TableCell align="right">ボーナス</TableCell>
                <TableCell align="right">分割</TableCell>
                <TableCell>開始月</TableCell>
                <TableCell align="right">信販合計</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {company.orders.map((o: any, i: number) => (
                <TableRow key={i} hover>
                  <TableCell sx={{ fontSize: 11, color: "text.secondary" }}>{o.order_no}</TableCell>
                  <TableCell sx={{ fontSize: 11 }}>{o.order_date}</TableCell>
                  <TableCell sx={{ fontWeight: 500, fontSize: 12 }}>{o.customer_name}</TableCell>
                  <TableCell sx={{ fontSize: 11 }}>{o.shop_name}</TableCell>
                  <TableCell align="right" sx={{ fontSize: 11 }}>{fmt(o.grand_total)}</TableCell>
                  <TableCell align="right" sx={{ fontSize: 11 }}>{o.first_payment > 0 ? fmt(o.first_payment) : "—"}</TableCell>
                  <TableCell align="right" sx={{ fontSize: 11 }}>{o.bonus_payment > 0 ? fmt(o.bonus_payment) : "—"}</TableCell>
                  <TableCell align="right" sx={{ fontSize: 11 }}>{o.installments ? `${o.installments}回` : "—"}</TableCell>
                  <TableCell sx={{ fontSize: 11 }}>{o.start_month || "—"}</TableCell>
                  <TableCell align="right" sx={{ fontSize: 12, fontWeight: 600 }}>{fmt(o.credit_total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      ))}
      <Box sx={{ p: 1.5, bgcolor: "#f0f4ff", borderRadius: 1, border: "1px solid #90caf9" }}>
        <Stack direction="row" justifyContent="flex-end" spacing={4}>
          <Typography variant="body2" color="text.secondary">総件数: <strong>{totals.count}件</strong></Typography>
          <Typography variant="body2" color="text.secondary">信販合計: <strong>{fmt(totals.total)}</strong></Typography>
        </Stack>
      </Box>
    </Stack>
  );
}

// ========================
// メイン
// ========================
export default function ReportsPage() {
  const today = dayjs();

  const [reportType, setReportType] = useState<ReportType>("ar_list");

  // ── 店舗・担当フィルター ──
  const [shops,       setShops]       = useState<any[]>([]);
  const [staffList,   setStaffList]   = useState<any[]>([]);
  const [shopId,      setShopId]      = useState<string>("all");
  const [staffId,     setStaffId]     = useState<string>("all");
  const [initLoading, setInitLoading] = useState(true);

  // ── 期間 ──
  const [periodMode,    setPeriodMode]    = useState<"month" | "range">("month");
  const [selectedMonth, setSelectedMonth] = useState(today.format("YYYY-MM"));
  const [rangeFrom,     setRangeFrom]     = useState(today.startOf("month").format("YYYY-MM-DD"));
  const [rangeTo,       setRangeTo]       = useState(today.format("YYYY-MM-DD"));
  const [appliedStart,  setAppliedStart]  = useState(today.startOf("month").format("YYYY-MM-DD"));
  const [appliedEnd,    setAppliedEnd]    = useState(today.format("YYYY-MM-DD"));

  // ── 結果 ──
  const [data,     setData]     = useState<any | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  // ── 初期ロード ──
  useEffect(() => {
    Promise.all([
      apiClient.get("/masters/shops/"),
      apiClient.get("/masters/staffs/"),
      apiClient.get("/auth/user/"),
    ]).then(([shopRes, staffRes, userRes]) => {
      setShops(shopRes.data.results || shopRes.data);
      setStaffList(staffRes.data.results || staffRes.data || []);
      const myShopId = userRes.data?.shop_id;
      setShopId(myShopId ? String(myShopId) : "all");
    }).catch(console.error).finally(() => setInitLoading(false));
  }, []);

  useEffect(() => {
    if (periodMode === "month") {
      setAppliedStart(dayjs(selectedMonth + "-01").startOf("month").format("YYYY-MM-DD"));
      setAppliedEnd(dayjs(selectedMonth + "-01").endOf("month").format("YYYY-MM-DD"));
    }
  }, [periodMode, selectedMonth]);

  const handleSearch = async () => {
    if (initLoading) return;
    setLoading(true);
    setError(null);
    setData(null);
    setSearched(true);

    const start = periodMode === "month" ? appliedStart : rangeFrom;
    const end   = periodMode === "month" ? appliedEnd   : rangeTo;

    try {
      const params: any = { type: reportType, shop_id: shopId, start, end };
      if (reportType === "ar_list" && staffId !== "all") params.staff_id = staffId;
      const res = await apiClient.get("/reports/", { params });
      setData(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const reportLabel = REPORT_TYPES.find((r) => r.value === reportType)?.label ?? "";

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #report-print-area, #report-print-area * { visibility: visible; }
          #report-print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .print-table { font-size: 10px; }
          .no-print { display: none !important; }
        }
      `}</style>

      <Box>
        {/* タイトル */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }} className="no-print">
          <Typography variant="h5" fontWeight="bold">帳票管理</Typography>
          {searched && data && (
            <Button variant="outlined" size="small" startIcon={<PrintIcon />} onClick={() => window.print()}>
              印刷
            </Button>
          )}
        </Stack>

        {/* フィルターパネル */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }} className="no-print">
          <Stack spacing={2}>

            {/* 帳票種別 */}
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>帳票種別</InputLabel>
              <Select
                value={reportType}
                label="帳票種別"
                onChange={(e) => { setReportType(e.target.value as ReportType); setData(null); setSearched(false); }}
              >
                {REPORT_TYPES.map((r) => (
                  <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Divider />

            {/* 期間 + フィルター群 */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-start" flexWrap="wrap">

              <ToggleButtonGroup
                value={periodMode}
                exclusive
                onChange={(_, v) => v && setPeriodMode(v)}
                size="small"
              >
                <ToggleButton value="month">月単位</ToggleButton>
                <ToggleButton value="range">日付範囲</ToggleButton>
              </ToggleButtonGroup>

              {periodMode === "month" ? (
                <TextField
                  type="month" size="small" label="対象月"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 160 }}
                />
              ) : (
                <Stack direction="row" spacing={1} alignItems="center">
                  <JaDatePicker
                    label="開始日"
                    value={rangeFrom || null}
                    onChange={v => setRangeFrom(v ?? "")}
                    fullWidth={false}
                    sx={{ width: 165 }}
                  />
                  <Typography variant="body2" color="text.secondary">〜</Typography>
                  <JaDatePicker
                    label="終了日"
                    value={rangeTo || null}
                    onChange={v => setRangeTo(v ?? "")}
                    fullWidth={false}
                    sx={{ width: 165 }}
                  />
                </Stack>
              )}

              {/* 店舗フィルター */}
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>店舗</InputLabel>
                <Select value={shopId} label="店舗" onChange={(e) => setShopId(e.target.value)}>
                  <MenuItem value="all">全店舗</MenuItem>
                  {shops.map((s) => (
                    <MenuItem key={s.id} value={String(s.id)}>{s.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* 担当フィルター（売掛金リストのみ） */}
              {reportType === "ar_list" && (
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>担当</InputLabel>
                  <Select value={staffId} label="担当" onChange={(e) => setStaffId(e.target.value)}>
                    <MenuItem value="all">全員</MenuItem>
                    {staffList.map((s) => (
                      <MenuItem key={s.id} value={String(s.id)}>{s.display_name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              <Button
                variant="contained" size="small"
                startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <SearchIcon />}
                onClick={handleSearch}
                disabled={loading || initLoading}
                sx={{ minWidth: 100, alignSelf: "center" }}
              >
                {loading ? "取得中..." : "表示"}
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {error && <Alert severity="error" sx={{ mb: 2 }} className="no-print">{error}</Alert>}

        {loading && (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        )}

        {!loading && searched && (
          <Box id="report-print-area">
            <Box sx={{ display: "none" }} className="print-only">
              <style>{`@media print { .print-only { display: block !important; } }`}</style>
              <Typography variant="h6" fontWeight="bold" gutterBottom>{reportLabel}</Typography>
              <Divider sx={{ my: 1 }} />
            </Box>

            {data ? (
              <Paper variant="outlined">
                <Stack
                  direction="row" justifyContent="space-between" alignItems="center"
                  sx={{ px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}
                  className="no-print"
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle1" fontWeight="bold">{reportLabel}</Typography>
                    <Chip label={`${data.totals?.count ?? 0}件`} size="small" color="primary" variant="outlined" />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {periodMode === "month" ? selectedMonth : `${rangeFrom} 〜 ${rangeTo}`}
                    　{shopId === "all" ? "全店舗" : shops.find((s) => String(s.id) === shopId)?.name}
                    {reportType === "ar_list" && staffId !== "all" && (
                      <>　{staffList.find((s) => String(s.id) === staffId)?.display_name}</>
                    )}
                  </Typography>
                </Stack>

                <Box sx={{ overflowX: "auto", p: reportType === "credit_list" ? 2 : 0 }}>
                  {reportType === "ar_list" && (
                    <ArTable rows={data.rows ?? []} totals={data.totals ?? {}} />
                  )}
                  {reportType === "credit_list" && (
                    <CreditTable rows={data.rows ?? []} totals={data.totals ?? {}} />
                  )}
                </Box>
              </Paper>
            ) : (
              <Paper variant="outlined">
                <Typography variant="body2" color="text.secondary" sx={{ py: 6, textAlign: "center" }}>
                  データがありません
                </Typography>
              </Paper>
            )}
          </Box>
        )}

        {!loading && !searched && (
          <Paper variant="outlined">
            <Box display="flex" flexDirection="column" alignItems="center" py={8}>
              <PrintIcon sx={{ fontSize: 48, mb: 1, opacity: 0.2 }} />
              <Typography variant="body2" color="text.secondary">
                帳票種別と期間を選択して「表示」を押してください
              </Typography>
            </Box>
          </Paper>
        )}
      </Box>
    </>
  );
}
