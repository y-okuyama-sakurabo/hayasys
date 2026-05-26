"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Box, Paper, Typography, Stack, Chip, Grid,
  FormControl, InputLabel, Select, MenuItem, TextField,
  ToggleButton, ToggleButtonGroup, Tab, Tabs, Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
} from "recharts";
import apiClient from "@/lib/apiClient";
import dayjs from "dayjs";

// ========================
// 定数
// ========================
const CHART_COLORS = [
  "#4caf50", "#2196f3", "#ff9800", "#f44336",
  "#9c27b0", "#00bcd4", "#795548", "#e91e63", "#607d8b",
];
const fmt = (n: number) => "¥" + Math.round(n).toLocaleString("ja-JP");

// ========================
// 横棒グラフ + ランキングリスト（共通）
// ========================
function RankedSection({
  data, nameKey = "name", totalKey = "total", countKey = "count",
  onSelect, selectedId, idKey,
}: {
  data: any[];
  nameKey?: string;
  totalKey?: string;
  countKey?: string;
  onSelect?: (item: any) => void;
  selectedId?: number | string | null;
  idKey?: string;
}) {
  const maxTotal = data[0]?.[totalKey] || 1;
  return (
    <Box>
      {data.map((item, i) => {
        const isSelected = idKey && selectedId != null && item[idKey] === selectedId;
        const barWidth = Math.max((item[totalKey] / maxTotal) * 100, 1);
        return (
          <Box
            key={i}
            onClick={() => onSelect?.(item)}
            sx={{
              py: 1.2, px: 1.5,
              borderBottom: "1px solid #f0f0f0",
              cursor: onSelect ? "pointer" : "default",
              bgcolor: isSelected ? "action.selected" : "transparent",
              borderRadius: 1,
              "&:hover": onSelect ? { bgcolor: "action.hover" } : undefined,
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="body2" fontWeight={i < 3 ? "bold" : "normal"}>
                {i + 1}. {item[nameKey] ?? item.color_label ?? "-"}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" fontWeight="bold">{fmt(item[totalKey])}</Typography>
                <Typography variant="caption" color="text.secondary">{item[countKey]}件</Typography>
                {item.share != null && (
                  <Chip label={`${item.share}%`} size="small" variant="outlined" />
                )}
              </Stack>
            </Stack>
            {/* バー */}
            <Box sx={{ height: 4, bgcolor: "grey.100", borderRadius: 2, overflow: "hidden" }}>
              <Box sx={{ height: "100%", width: `${barWidth}%`, bgcolor: CHART_COLORS[i % CHART_COLORS.length], borderRadius: 2, transition: "width 0.4s" }} />
            </Box>
          </Box>
        );
      })}
      {data.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
          データがありません
        </Typography>
      )}
    </Box>
  );
}

// ========================
// メイン
// ========================
export default function ProductAnalyticsPage() {
  const today = dayjs();

  // フィルター
  const [mode,   setMode]   = useState<"order" | "estimate">("order");
  const [shopId, setShopId] = useState<number | "all">("all");
  const [start,  setStart]  = useState(today.startOf("month").format("YYYY-MM-DD"));
  const [end,    setEnd]    = useState(today.format("YYYY-MM-DD"));
  const [shops,  setShops]  = useState<any[]>([]);

  // タブ
  const [tab, setTab] = useState(0); // 0=カテゴリ, 1=メーカー, 2=色

  // カテゴリ選択（メーカー・色タブのフィルターに使う）
  const [selectedCategory, setSelectedCategory] = useState<{ id: number; name: string } | null>(null);

  // データ
  const [catData, setCatData] = useState<any[]>([]);
  const [mfrData, setMfrData] = useState<any[]>([]);
  const [colorData, setColorData] = useState<any[]>([]);

  // 初期ロード
  useEffect(() => {
    apiClient.get("/masters/shops/")
      .then((r) => setShops(r.data.results || r.data || []))
      .catch(console.error);
  }, []);

  // データ取得
  const baseParams = { mode, start, end, shop_id: shopId };

  const fetchCategory = useCallback(async () => {
    const res = await apiClient.get("/analytics/product/", { params: { ...baseParams, type: "category" } });
    setCatData(res.data || []);
  }, [mode, start, end, shopId]);

  const fetchManufacturer = useCallback(async () => {
    const params: any = { ...baseParams, type: "manufacturer" };
    if (selectedCategory) params.filter_category_id = selectedCategory.id;
    const res = await apiClient.get("/analytics/product/", { params });
    setMfrData(res.data || []);
  }, [mode, start, end, shopId, selectedCategory]);

  const fetchColor = useCallback(async () => {
    const res = await apiClient.get("/analytics/product/", { params: { ...baseParams, type: "color" } });
    setColorData(res.data || []);
  }, [mode, start, end, shopId]);

  useEffect(() => { if (start && end) fetchCategory(); },     [fetchCategory]);
  useEffect(() => { if (start && end) fetchManufacturer(); }, [fetchManufacturer]);
  useEffect(() => { if (start && end) fetchColor(); },        [fetchColor]);

  // カテゴリ選択ハンドラ
  const handleSelectCategory = (item: any) => {
    if (selectedCategory?.id === item.category_id) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory({ id: item.category_id, name: item.name });
    }
  };

  // Donut用データ（top9 + その他）
  const donutData = catData.slice(0, 9).map((d) => ({
    name:  d.name,
    value: Number(d.total),
    share: d.share,
  }));
  if (catData.length > 9) {
    const rest = catData.slice(9).reduce((s: number, d: any) => s + Number(d.total), 0);
    donutData.push({ name: "その他", value: rest, share: Number((100 - donutData.reduce((s, d) => s + (d.share ?? 0), 0)).toFixed(1)) });
  }

  // ========================
  // UI
  // ========================
  return (
    <Box>
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>商品分析</Typography>

      {/* ── フィルター ── */}
      <Paper sx={{ p: 2, mb: 2 }}>
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

          <TextField label="開始日" type="date" size="small" value={start}
            onChange={(e) => setStart(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 155 }} />
          <TextField label="終了日" type="date" size="small" value={end}
            onChange={(e) => setEnd(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 155 }} />
        </Stack>
      </Paper>

      {/* ── 選択カテゴリ chip ── */}
      {selectedCategory && (
        <Stack direction="row" sx={{ mb: 2 }}>
          <Chip
            label={`カテゴリ: ${selectedCategory.name}`}
            onDelete={() => setSelectedCategory(null)}
            deleteIcon={<CloseIcon />}
            color="primary"
            variant="outlined"
          />
        </Stack>
      )}

      {/* ── タブ ── */}
      <Paper>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: 1, borderColor: "divider" }}>
          <Tab label="カテゴリ" />
          <Tab label="メーカー" />
          <Tab label="色" />
        </Tabs>

        <Box sx={{ p: 2 }}>

          {/* ======== カテゴリタブ ======== */}
          {tab === 0 && (
            <Grid container spacing={3}>
              {/* 左：ドーナツグラフ */}
              <Grid size={{ xs: 12, md: 5 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>売上構成比</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%" cy="50%"
                      innerRadius={70} outerRadius={110}
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {donutData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => fmt(Number(v))} />
                    <Legend
                      formatter={(value, entry: any) =>
                        `${value} ${entry.payload.share ?? ""}%`
                      }
                      iconSize={10}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Grid>

              {/* 右：ランキングリスト */}
              <Grid size={{ xs: 12, md: 7 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  カテゴリ別ランキング
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    ※ クリックするとメーカー・色タブがそのカテゴリに絞り込まれます
                  </Typography>
                </Typography>
                <RankedSection
                  data={catData}
                  onSelect={handleSelectCategory}
                  selectedId={selectedCategory?.id}
                  idKey="category_id"
                />
              </Grid>
            </Grid>
          )}

          {/* ======== メーカータブ ======== */}
          {tab === 1 && (
            <Grid container spacing={3}>
              {/* 横棒グラフ（top10） */}
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  メーカー別売上
                  {selectedCategory && <Chip label={selectedCategory.name} size="small" sx={{ ml: 1 }} />}
                </Typography>
                <ResponsiveContainer width="100%" height={Math.max(200, mfrData.slice(0, 10).length * 36)}>
                  <BarChart layout="vertical" data={mfrData.slice(0, 10)} margin={{ left: 16, right: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: any) => fmt(Number(v))} />
                    <Bar dataKey="total" name="売上" radius={[0, 4, 4, 0]}>
                      {mfrData.slice(0, 10).map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                      <LabelList dataKey="count" position="right" formatter={(v: any) => `${v}件`} style={{ fontSize: 11, fill: "#666" }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>全メーカー一覧</Typography>
                <RankedSection data={mfrData} />
              </Grid>
            </Grid>
          )}

          {/* ======== 色タブ ======== */}
          {tab === 2 && (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  車体色別（受注台数）
                </Typography>
                <ResponsiveContainer width="100%" height={Math.max(200, colorData.slice(0, 10).length * 36)}>
                  <BarChart layout="vertical" data={colorData.slice(0, 10)} margin={{ left: 16, right: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="color_label" width={100} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: any) => `${v}台`} />
                    <Bar dataKey="count" name="台数" radius={[0, 4, 4, 0]}>
                      {colorData.slice(0, 10).map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                      <LabelList dataKey="count" position="right" formatter={(v: any) => `${v}台`} style={{ fontSize: 11, fill: "#666" }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>全カラー一覧</Typography>
                <RankedSection data={colorData} nameKey="color_label" countKey="count" />
              </Grid>
            </Grid>
          )}

        </Box>
      </Paper>
    </Box>
  );
}
