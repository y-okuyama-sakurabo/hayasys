"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import apiClient from "@/lib/apiClient";

export default function ProductAnalyticsPage() {
  // -----------------------------
  // フィルタ
  // -----------------------------
  const [mode, setMode] = useState<"order" | "estimate">("order");
  const [shopId, setShopId] = useState<number | "all">("all");
  const [staffId, setStaffId] = useState<number | "all">("all");

  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const [shops, setShops] = useState<any[]>([]);
  const [staffs, setStaffs] = useState<any[]>([]);

  // -----------------------------
  // カテゴリ（階層セレクタ）
  // -----------------------------
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryStack, setCategoryStack] = useState<any[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [type, setType] = useState<"category" | "manufacturer" | "color">("category");

  useEffect(() => {
    if (type === "manufacturer") {
      setCategoryStack([]);
      setCategoryId(null);
    }
  }, [type]);

  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [manufacturerId, setManufacturerId] = useState<number | "all">("all");

  // -----------------------------
  // データ
  // -----------------------------
  const [data, setData] = useState<any[]>([]);

  // -----------------------------
  // 初期ロード
  // -----------------------------
  useEffect(() => {
    const fetchInit = async () => {
      const [shopRes, staffRes, categoryRes, manufacturerRes] = await Promise.all([
        apiClient.get("/masters/shops/"),
        apiClient.get("/masters/staffs/"),
        apiClient.get("/categories/tree/"),
        apiClient.get("/masters/manufacturers/"), 
      ]);

      setShops(shopRes.data.results || shopRes.data || []);
      setStaffs(staffRes.data.results || staffRes.data || []);
      setCategories(categoryRes.data.results || categoryRes.data || []);
      setManufacturers(manufacturerRes.data.results || manufacturerRes.data || []);
    };

    fetchInit();

    const today = new Date();
    const first = new Date(today.getFullYear(), today.getMonth(), 1);

    setStart(first.toISOString().slice(0, 10));
    setEnd(today.toISOString().slice(0, 10));
  }, []);

  // -----------------------------
  // データ取得
  // -----------------------------
  const fetchData = async () => {
    const res = await apiClient.get("/analytics/product/", {
      params: {
        mode,
        type,
        start,
        end,
        shop_id: shopId,
        staff_id: staffId,
        category_id: categoryId,
        manufacturer_id: manufacturerId, 
      },
    });

    setData(res.data);
  };

  useEffect(() => {
    if (!start || !end) return;
    fetchData();
  }, [mode, type, start, end, shopId, staffId, categoryId, manufacturerId]);

  // -----------------------------
  // 現在の階層
  // -----------------------------
  const currentLevel =
    categoryStack.length === 0
      ? categories
      : categoryStack[categoryStack.length - 1].children || [];

  // -----------------------------
  // カテゴリ選択
  // -----------------------------
  const handleCategoryChange = (value: number | "") => {
    if (value === "") {
      // ← 戻る
      const newStack = categoryStack.slice(0, -1);
      setCategoryStack(newStack);

      const newId =
        newStack.length > 0
          ? newStack[newStack.length - 1].id
          : null;

      setCategoryId(newId);
      return;
    }

    const selected = currentLevel.find((c: any) => c.id === value);

    if (!selected) return;

    const newStack = [...categoryStack, selected];

    setCategoryStack(newStack);
    setCategoryId(selected.id);
  };

  return (
    <Box>
      {/* =============================
         フィルタ
      ============================== */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" gap={2} flexWrap="wrap">

          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={(_, v) => v && setMode(v)}
          >
            <ToggleButton value="order">受注</ToggleButton>
            <ToggleButton value="estimate">見積</ToggleButton>
          </ToggleButtonGroup>
          <ToggleButtonGroup
            value={type}
            exclusive
            onChange={(_, v) => v && setType(v)}
          >
            <ToggleButton value="category">カテゴリ</ToggleButton>
            <ToggleButton value="manufacturer">メーカー</ToggleButton>
            <ToggleButton value="color">色</ToggleButton>
          </ToggleButtonGroup>

          <FormControl size="small">
            <InputLabel>店舗</InputLabel>
            <Select
              value={shopId}
              label="店舗"
              onChange={(e) => setShopId(e.target.value as any)}
            >
              <MenuItem value="all">全店舗</MenuItem>
              {shops.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {type === "manufacturer" && (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>メーカー</InputLabel>
              <Select
                value={manufacturerId}
                label="メーカー"
                onChange={(e) => setManufacturerId(e.target.value as any)}
              >
                <MenuItem value="all">全メーカー</MenuItem>
                {manufacturers.map((m) => (
                  <MenuItem key={m.id} value={m.id}>
                    {m.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}



          {/* 🔥 カテゴリ（階層） */}
          {type === "category" && (
            <>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>カテゴリ</InputLabel>
                <Select
                  key={categoryStack.length} 
                  value=""
                  label="カテゴリ"
                  onChange={(e) => handleCategoryChange(e.target.value as any)}
                >

                  {currentLevel.map((c: any) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setCategoryStack([]);
                  setCategoryId(null);
                }}
              >
                リセット
              </Button>
            </>
          )}

          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </Box>
      </Paper>

      {/* =============================
         タイトル
      ============================== */}
      <Typography mb={2}>
        {type === "category"
          ? categoryStack.map((c) => c.name).join(" > ") || "全カテゴリ"
          : type === "color"
          ? "色分析"
          : "メーカー分析"}
      </Typography>

      {/* =============================
         ランキング
      ============================== */}
      <Paper sx={{ p: 2 }}>
        {data.map((item, i) => (
          <Box
            key={i}
            sx={{ borderBottom: "1px solid #eee", py: 1 }}
          >
            {/* メーカー */}
            <Box display="flex" justifyContent="space-between">
              <Typography>
                {i + 1}. {type === "color" ? item.color_label : item.name}
              </Typography>

              <Typography textAlign="right">
                ¥{Number(item.total).toLocaleString()}
                <br />
                <span style={{ fontSize: 12, color: "#666" }}>
                  {item.count}件
                </span>
              </Typography>
            </Box>
            {type === "color" && item.categories?.map((c: any, j: number) => (
              <Box
                key={j}
                display="flex"
                justifyContent="space-between"
                sx={{ pl: 2, fontSize: 13, color: "#666" }}
              >
                <Typography>
                  └ {c.name}
                </Typography>
                <Typography textAlign="right">
                  ¥{Number(item.total).toLocaleString()}
                  <br />
                  <span style={{ fontSize: 12, color: "#666" }}>
                    {item.count}件
                  </span>
                </Typography>
              </Box>
            ))}

            {/* 内訳 */}
            {item.paths?.map((p: any, j: number) => (
              <Box
                key={j}
                display="flex"
                justifyContent="space-between"
                sx={{ pl: 2, fontSize: 13, color: "#666" }}
              >
                <Typography>
                  └ {p.path.map((x: any) => x.name).join(" > ")}
                </Typography>
                <Typography textAlign="right">
                  ¥{Number(p.total).toLocaleString()}
                  <br />
                  <span style={{ fontSize: 12, color: "#999" }}>
                    {p.count}件
                  </span>
                </Typography>
              </Box>
            ))}
          </Box>
        ))}
      </Paper>
    </Box>
  );
}