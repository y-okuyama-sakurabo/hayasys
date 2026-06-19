"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Box, Paper, Typography, Stack, Chip, Grid, Divider,
  FormControl, InputLabel, Select, MenuItem, TextField, Button,
  ToggleButton, ToggleButtonGroup, Breadcrumbs, Link,
  CircularProgress,
} from "@mui/material";
import SearchIcon         from "@mui/icons-material/Search";
import ChevronRightIcon   from "@mui/icons-material/ChevronRight";
import HomeIcon           from "@mui/icons-material/Home";
import NavigateNextIcon   from "@mui/icons-material/NavigateNext";
import DirectionsCarIcon  from "@mui/icons-material/DirectionsCar";
import CategoryIcon       from "@mui/icons-material/Category";
import TuneIcon           from "@mui/icons-material/Tune";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
  Cell, Tooltip, ResponsiveContainer,
} from "recharts";
import apiClient from "@/lib/apiClient";
import dayjs from "dayjs";
import JaDatePicker from "@/components/common/JaDatePicker";

// ========================
// 定数
// ========================
// 見積・受注ステップと同じ品目種別定義
const SUB_TYPE_OPTIONS = [
  { value: "non_vehicle",     label: "全品目（車両除く）",   item_type: "non_vehicle", tax_type: null },
  { value: "accessory",       label: "その他（用品・作業）", item_type: "accessory",   tax_type: null },
  { value: "taxable_fee",     label: "課税費用",             item_type: "fee",         tax_type: "taxable" },
  { value: "non_taxable_fee", label: "非課税費用",           item_type: "fee",         tax_type: "non_taxable" },
] as const;
type SubTypeValue = typeof SUB_TYPE_OPTIONS[number]["value"];

const CHART_COLORS = [
  "#4caf50", "#2196f3", "#ff9800", "#f44336",
  "#9c27b0", "#00bcd4", "#795548", "#e91e63", "#607d8b",
];
const fmt = (n: number) => "¥" + Math.round(n).toLocaleString("ja-JP");

type CatEntry  = { category_id: number; name: string; total: number; count: number; share?: number };
type PathEntry = { id: number; name: string };

// ========================
// カテゴリナビゲーター
// ========================
function CategoryNavigator({
  categories, path, selectedId, onCatClick, onBreadcrumbClick, loading,
}: {
  categories: CatEntry[];
  path: PathEntry[];
  selectedId: number | null;
  onCatClick: (cat: CatEntry) => void;
  onBreadcrumbClick: (depth: number) => void;
  loading: boolean;
}) {
  const maxVal = categories.filter((c) => c.category_id !== selectedId)[0]?.total
    || categories[0]?.total || 1;

  return (
    <Box>
      {/* パンくず */}
      <Breadcrumbs
        separator={<NavigateNextIcon sx={{ fontSize: 14 }} />}
        sx={{ mb: 1.5 }}
      >
        <Link
          component="button"
          variant="caption"
          underline="hover"
          onClick={() => onBreadcrumbClick(-1)}
          sx={{ display: "flex", alignItems: "center", gap: 0.3, cursor: "pointer" }}
        >
          <HomeIcon sx={{ fontSize: 13 }} />
          ルート
        </Link>
        {path.map((p, i) => (
          <Link
            key={p.id}
            component="button"
            variant="caption"
            underline="hover"
            onClick={() => onBreadcrumbClick(i)}
            sx={{ cursor: "pointer" }}
            color={i === path.length - 1 ? "text.primary" : "inherit"}
          >
            {p.name}
          </Link>
        ))}
      </Breadcrumbs>

      {/* カテゴリリスト */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress size={22} />
        </Box>
      ) : (
        <Box sx={{ maxHeight: 500, overflowY: "auto", pr: 0.5 }}>
          {categories.map((cat) => {
            const isSelected = cat.category_id === selectedId;
            const barW = Math.max((cat.total / maxVal) * 100, 2);
            return (
              <Box
                key={cat.category_id}
                onClick={() => onCatClick(cat)}
                sx={{
                  px: 1.5, py: 1, mb: 0.5,
                  border: "1px solid",
                  borderColor: isSelected ? "primary.main" : "divider",
                  bgcolor: isSelected ? "primary.50" : "transparent",
                  borderRadius: 1.5,
                  cursor: "pointer",
                  "&:hover": {
                    borderColor: "primary.light",
                    bgcolor: isSelected ? "primary.50" : "action.hover",
                  },
                  transition: "all 0.15s",
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography
                    variant="body2"
                    fontWeight={isSelected ? "bold" : 500}
                    color={isSelected ? "primary.main" : "text.primary"}
                    sx={{ flex: 1, mr: 1 }}
                  >
                    {cat.name}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center" flexShrink={0}>
                    <Typography variant="caption" color="text.secondary">
                      {cat.count}件
                    </Typography>
                    <Typography variant="caption" fontWeight="bold" color="text.secondary">
                      {fmt(cat.total)}
                    </Typography>
                    <ChevronRightIcon sx={{ fontSize: 15, color: "text.disabled" }} />
                  </Stack>
                </Stack>
                <Box sx={{ mt: 0.5, height: 3, bgcolor: "grey.100", borderRadius: 1 }}>
                  <Box sx={{
                    height: "100%",
                    width: `${barW}%`,
                    bgcolor: isSelected ? "primary.main" : "primary.light",
                    borderRadius: 1,
                    opacity: 0.5,
                  }} />
                </Box>
              </Box>
            );
          })}

          {categories.length === 0 && !loading && path.length > 0 && (
            <Box sx={{ py: 3, textAlign: "center" }}>
              <Typography variant="caption" color="text.secondary">
                これ以上サブカテゴリはありません（末端カテゴリ）
              </Typography>
            </Box>
          )}
          {categories.length === 0 && !loading && path.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
              データがありません
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}

// ========================
// 横棒グラフ（共通）
// ========================
function HBar({
  data, dataKey, nameKey = "name", unit = "¥", top = 10,
}: {
  data: any[];
  dataKey: string;
  nameKey?: string;
  unit?: string;
  top?: number;
}) {
  const sliced = data.slice(0, top);
  if (!sliced.length) return (
    <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
      データがありません
    </Typography>
  );
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, sliced.length * 34)}>
      <BarChart layout="vertical" data={sliced} margin={{ left: 8, right: 52 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 10 }}
          tickFormatter={(v) => unit === "¥" ? `${(v / 10000).toFixed(0)}万` : `${v}`}
        />
        <YAxis type="category" dataKey={nameKey} width={100} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v: any) => unit === "¥" ? fmt(Number(v)) : `${v}台`} />
        <Bar dataKey={dataKey} name={unit === "¥" ? "売上" : "台数"} radius={[0, 4, 4, 0]}>
          {sliced.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
          <LabelList
            dataKey={unit === "¥" ? "count" : dataKey}
            position="right"
            formatter={(v: any) => unit === "¥" ? `${v}件` : `${v}台`}
            style={{ fontSize: 10, fill: "#666" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ========================
// 分析パネル
// ========================
function AnalysisPanel({
  summary, mfrData, colorData, isVehicle, loading,
}: {
  summary: CatEntry | null;
  mfrData: any[];
  colorData: any[];
  isVehicle: boolean;
  loading: boolean;
}) {
  if (!summary && !loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight={320}
        sx={{ color: "text.disabled" }}
      >
        <TuneIcon sx={{ fontSize: 48, mb: 1 }} />
        <Typography variant="body2" color="text.secondary">
          左のカテゴリを選択すると分析が表示されます
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={320}>
        <CircularProgress />
      </Box>
    );
  }

  const topMfr   = mfrData.filter((d) => !d.no_manufacturer).slice(0, 10);
  const noMfrRow = mfrData.find((d) => d.no_manufacturer);
  const topColor = colorData.slice(0, 10);

  return (
    <Stack spacing={3}>
      {/* サマリ */}
      <Box sx={{
        p: 2, borderRadius: 1.5,
        bgcolor: "primary.50",
        border: "1px solid", borderColor: "primary.100",
      }}>
        <Typography variant="subtitle2" color="primary.dark" fontWeight="bold" gutterBottom>
          {summary!.name}
        </Typography>
        <Stack direction="row" spacing={4}>
          <Box>
            <Typography variant="caption" color="text.secondary">件数</Typography>
            <Typography variant="h6" fontWeight="bold">{summary!.count}件</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">売上合計</Typography>
            <Typography variant="h6" fontWeight="bold">{fmt(summary!.total)}</Typography>
          </Box>
        </Stack>
      </Box>

      {/* メーカー別 */}
      <Box>
        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5 }}>
          メーカー別売上
        </Typography>
        <HBar data={topMfr} dataKey="total" nameKey="name" unit="¥" />
        {noMfrRow && (
          <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: "block" }}>
            ※ メーカー未登録 {noMfrRow.count}件は除外しています
          </Typography>
        )}
        {topMfr.length === 0 && !noMfrRow && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            メーカーデータがありません
          </Typography>
        )}
      </Box>

      {/* 車体色別（車両のみ） */}
      {isVehicle && (
        <>
          <Divider />
          <Box>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5 }}>
              車体色別 台数
            </Typography>
            <HBar data={topColor} dataKey="count" nameKey="color_label" unit="台" />
          </Box>
        </>
      )}
    </Stack>
  );
}

// ========================
// メイン
// ========================
export default function ProductAnalyticsPage() {
  const today = dayjs();

  // ── 共通フィルター ──
  const [mode,    setMode]    = useState<"order" | "estimate">("order");
  const [shopId,  setShopId]  = useState<number | "all">("all");
  const [shops,   setShops]   = useState<any[]>([]);
  const [initLoading, setInitLoading] = useState(true);

  const [periodMode,    setPeriodMode]    = useState<"month" | "range">("month");
  const [selectedMonth, setSelectedMonth] = useState(today.format("YYYY-MM"));
  const [rangeFrom,     setRangeFrom]     = useState(today.startOf("month").format("YYYY-MM-DD"));
  const [rangeTo,       setRangeTo]       = useState(today.format("YYYY-MM-DD"));

  const initStart = dayjs(today.format("YYYY-MM") + "-01").startOf("month").format("YYYY-MM-DD");
  const [appliedStart, setAppliedStart] = useState(initStart);
  const [appliedEnd,   setAppliedEnd]   = useState(today.format("YYYY-MM-DD"));

  useEffect(() => {
    if (periodMode === "month") {
      setAppliedStart(dayjs(selectedMonth + "-01").startOf("month").format("YYYY-MM-DD"));
      setAppliedEnd(dayjs(selectedMonth + "-01").endOf("month").format("YYYY-MM-DD"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodMode, selectedMonth]);

  // ── アイテムタイプタブ ──
  const [itemTypeTab,   setItemTypeTab]   = useState(0); // 0=車両, 1=その他
  const [otherSubType,  setOtherSubType]  = useState<SubTypeValue>("non_vehicle");

  const isVehicle   = itemTypeTab === 0;
  const subCfg      = SUB_TYPE_OPTIONS.find(o => o.value === otherSubType) ?? SUB_TYPE_OPTIONS[0];
  const apiItemType = isVehicle ? "vehicle" : subCfg.item_type;
  const apiTaxType  = isVehicle ? null : subCfg.tax_type;

  // ── カテゴリナビ状態 ──
  const [catPath,    setCatPath]    = useState<PathEntry[]>([]);
  const [navCats,    setNavCats]    = useState<CatEntry[]>([]);
  const [navLoading, setNavLoading] = useState(false);

  // ── 分析状態 ──
  const [selectedCat,    setSelectedCat]    = useState<CatEntry | null>(null);
  const [mfrData,        setMfrData]        = useState<any[]>([]);
  const [colorData,      setColorData]      = useState<any[]>([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const baseParams = { mode, start: appliedStart, end: appliedEnd, shop_id: shopId };

  // ── ナビカテゴリ取得 ──
  const fetchNavCats = useCallback(async (categoryId?: number) => {
    setNavLoading(true);
    try {
      const params: any = { ...baseParams, type: "category", item_type: apiItemType };
      if (apiTaxType) params.tax_type = apiTaxType;
      if (categoryId != null) params.category_id = categoryId;
      const res = await apiClient.get("/analytics/product/", { params });
      setNavCats(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setNavLoading(false);
    }
  }, [mode, appliedStart, appliedEnd, shopId, apiItemType, apiTaxType]); // eslint-disable-line

  // ── 分析データ取得 ──
  const fetchAnalysis = useCallback(async (categoryId: number) => {
    setAnalysisLoading(true);
    try {
      const filterParams = { ...baseParams, filter_category_id: categoryId };
      const mfrParams: any = { ...filterParams, type: "manufacturer", item_type: apiItemType };
      if (apiTaxType) mfrParams.tax_type = apiTaxType;
      const [mfrRes, colorRes] = await Promise.all([
        apiClient.get("/analytics/product/", { params: mfrParams }),
        isVehicle
          ? apiClient.get("/analytics/product/", {
              params: { ...filterParams, type: "color" },
            })
          : Promise.resolve({ data: [] }),
      ]);
      setMfrData(mfrRes.data || []);
      setColorData(isVehicle ? (colorRes as any).data || [] : []);
    } catch (e) {
      console.error(e);
    } finally {
      setAnalysisLoading(false);
    }
  }, [mode, appliedStart, appliedEnd, shopId, apiItemType, apiTaxType, isVehicle]); // eslint-disable-line

  // フィルター変更時にリセット＆再取得（初期ロード完了後のみ）
  useEffect(() => {
    if (initLoading) return;
    setCatPath([]);
    setNavCats([]);
    setSelectedCat(null);
    setMfrData([]);
    setColorData([]);
    fetchNavCats();
  }, [fetchNavCats, initLoading]);

  // タブ変更時もリセット
  useEffect(() => {
    setCatPath([]);
    setNavCats([]);
    setSelectedCat(null);
    setMfrData([]);
    setColorData([]);
  }, [itemTypeTab, otherSubType]);

  // ── カテゴリクリック ──
  const handleCatClick = async (cat: CatEntry) => {
    const params: any = {
      ...baseParams,
      type: "category",
      item_type: apiItemType,
      category_id: cat.category_id,
    };
    if (apiTaxType) params.tax_type = apiTaxType;
    setNavLoading(true);
    try {
      const res     = await apiClient.get("/analytics/product/", { params });
      const children: CatEntry[] = res.data || [];
      // 葉検出：子が自分自身1件だけ → 末端
      const isLeaf = children.length === 1 && children[0].category_id === cat.category_id;

      setCatPath((prev) => [...prev, { id: cat.category_id, name: cat.name }]);
      setNavCats(isLeaf ? [] : children);
    } finally {
      setNavLoading(false);
    }
    setSelectedCat(cat);
    fetchAnalysis(cat.category_id);
  };

  // ── パンくずクリック ──
  const handleBreadcrumbClick = (depth: number) => {
    if (depth < 0) {
      // ルートへ戻る
      setCatPath([]);
      setSelectedCat(null);
      setMfrData([]);
      setColorData([]);
      fetchNavCats();
      return;
    }
    const newPath = catPath.slice(0, depth + 1);
    setCatPath(newPath);
    setSelectedCat(null);
    setMfrData([]);
    setColorData([]);
    fetchNavCats(newPath[newPath.length - 1].id);
  };

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

  const monthOptions = Array.from({ length: 24 }, (_, i) => {
    const m = today.subtract(i, "month");
    return { value: m.format("YYYY-MM"), label: m.format("YYYY年MM月") };
  });

  // ========================
  // UI
  // ========================
  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>商品分析</Typography>

      {/* ── 共通フィルター ── */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <ToggleButtonGroup
              size="small" exclusive
              value={mode}
              onChange={(_, v) => v && setMode(v)}
            >
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

            <ToggleButtonGroup
              size="small" exclusive
              value={periodMode}
              onChange={(_, v) => v && setPeriodMode(v)}
            >
              <ToggleButton value="month">月単位</ToggleButton>
              <ToggleButton value="range">日付範囲</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {periodMode === "month" ? (
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>月選択</InputLabel>
              <Select
                value={selectedMonth}
                label="月選択"
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                {monthOptions.map((m) => (
                  <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <Stack direction="row" spacing={1.5} alignItems="center">
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

      {/* ── メイン：アイテムタイプ × カテゴリドリルダウン ── */}
      <Paper variant="outlined">
        {/* タブ行 */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={2}
          sx={{ px: 2, py: 1.2, borderBottom: 1, borderColor: "divider" }}
        >
          <ToggleButtonGroup
            exclusive size="small"
            value={itemTypeTab}
            onChange={(_, v) => { if (v != null) setItemTypeTab(v); }}
          >
            <ToggleButton value={0} sx={{ gap: 0.5 }}>
              <DirectionsCarIcon sx={{ fontSize: 17 }} />
              車両
            </ToggleButton>
            <ToggleButton value={1} sx={{ gap: 0.5 }}>
              <CategoryIcon sx={{ fontSize: 17 }} />
              その他
            </ToggleButton>
          </ToggleButtonGroup>

          {/* その他サブフィルター */}
          {itemTypeTab === 1 && (
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>品目種別</InputLabel>
              <Select
                value={otherSubType}
                label="品目種別"
                onChange={(e) => setOtherSubType(e.target.value as SubTypeValue)}
              >
                {SUB_TYPE_OPTIONS.map(o => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* 選択中パス表示 */}
          {catPath.length > 0 && (
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Typography variant="caption" color="text.secondary">
                選択中:
              </Typography>
              {catPath.map((p, i) => (
                <span key={p.id}>
                  {i > 0 && (
                    <Typography variant="caption" color="text.disabled" sx={{ mx: 0.3 }}>›</Typography>
                  )}
                  <Chip label={p.name} size="small" variant={i === catPath.length - 1 ? "filled" : "outlined"}
                    color={i === catPath.length - 1 ? "primary" : "default"}
                    sx={{ height: 20, fontSize: 11 }}
                  />
                </span>
              ))}
            </Stack>
          )}
        </Stack>

        {/* コンテンツ */}
        <Box sx={{ p: 2 }}>
          <Grid container spacing={2}>

            {/* 左：カテゴリナビ */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper
                variant="outlined"
                sx={{ p: 2, height: "100%", minHeight: 400, bgcolor: "grey.50" }}
              >
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
                  カテゴリを選ぶ
                </Typography>
                <CategoryNavigator
                  categories={navCats}
                  path={catPath}
                  selectedId={selectedCat?.category_id ?? null}
                  onCatClick={handleCatClick}
                  onBreadcrumbClick={handleBreadcrumbClick}
                  loading={navLoading}
                />
              </Paper>
            </Grid>

            {/* 右：分析パネル */}
            <Grid size={{ xs: 12, md: 8 }}>
              <Paper variant="outlined" sx={{ p: 2.5, minHeight: 400 }}>
                <AnalysisPanel
                  summary={selectedCat}
                  mfrData={mfrData}
                  colorData={colorData}
                  isVehicle={isVehicle}
                  loading={analysisLoading}
                />
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Box>
  );
}
