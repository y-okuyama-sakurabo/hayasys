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
  IconButton,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import apiClient from "@/lib/apiClient";

export default function StaffAnalyticsPage() {
  const [mode, setMode] = useState<"order" | "estimate">("order");
  const [shopId, setShopId] = useState<number | "all">("all");
  const [staffId, setStaffId] = useState<number | "all">("all");

  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const [shops, setShops] = useState<any[]>([]);
  const [staffs, setStaffs] = useState<any[]>([]);

  const [data, setData] = useState<any[]>([]);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // -----------------------------
  // 初期ロード
  // -----------------------------
  useEffect(() => {
    const fetchInit = async () => {
      const [shopRes, staffRes] = await Promise.all([
        apiClient.get("/masters/shops/"),
        apiClient.get("/masters/staffs/"),
      ]);

      setShops(shopRes.data.results || shopRes.data || []);
      setStaffs(staffRes.data.results || staffRes.data || []);
    };

    fetchInit();

    const today = new Date();
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const formatDate = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    };

    setStart(formatDate(first));
    setEnd(formatDate(last));
  }, []);

  // -----------------------------
  // データ取得
  // -----------------------------
  const fetchData = async () => {
    const res = await apiClient.get("/analytics/product/", {
      params: {
        mode,
        type: "staff_work",
        start,
        end,
        shop_id: shopId,
        staff_id: staffId,
      },
    });

    setData(res.data);
  };

  useEffect(() => {
    if (!start || !end) return;
    fetchData();
  }, [mode, start, end, shopId, staffId]);

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

          <FormControl size="small">
            <InputLabel>担当</InputLabel>
            <Select
              value={staffId}
              label="担当"
              onChange={(e) => setStaffId(e.target.value as any)}
            >
              <MenuItem value="all">全担当</MenuItem>
              {staffs.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.display_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </Box>
      </Paper>

      {/* =============================
         ランキング
      ============================== */}
      <Paper sx={{ p: 2 }}>
        {data.map((item, i) => (
          <Box key={i} sx={{ borderBottom: "1px solid #eee", py: 1 }}>
            
            {/* 親 */}
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography fontWeight="bold">
                {i + 1}. {item.name}
              </Typography>

              <Box display="flex" alignItems="center" gap={2}>
                <Typography textAlign="right">
                  ¥{Number(item.total).toLocaleString()}
                  <br />
                  <span style={{ fontSize: 12, color: "#666" }}>
                    {item.count}件
                  </span>
                </Typography>

                {/* ▼ボタン */}
                <IconButton
                  size="small"
                  onClick={() =>
                    setOpenIndex(openIndex === i ? null : i)
                  }
                >
                  {openIndex === i ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>
            </Box>

            {/* 子（開いたときだけ） */}
            {openIndex === i &&
              item.categories?.map((c: any, j: number) => (
                <Box
                  key={j}
                  display="flex"
                  justifyContent="space-between"
                  sx={{ pl: 4, fontSize: 13, color: "#666" }}
                >
                  <Typography>
                    └ {c.name}
                  </Typography>

                  <Typography textAlign="right">
                    ¥{Number(c.total).toLocaleString()}
                    <br />
                    <span style={{ fontSize: 12 }}>
                      {c.count}件
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