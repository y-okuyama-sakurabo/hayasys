"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Paper,
  Typography,
  TextField,
  Stack,
  CircularProgress,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Grid,
} from "@mui/material";
import dayjs from "dayjs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import apiClient from "@/lib/apiClient";

type DailyData = {
  date: string;
  estimate: number;
  order: number;
};

export default function SalesDashboard() {
  const today = dayjs();
  const router = useRouter();

  const [start, setStart] = useState(
    today.startOf("month").format("YYYY-MM-DD")
  );
  const [end, setEnd] = useState(today.format("YYYY-MM-DD"));

  const [data, setData] = useState<DailyData[]>([]);
  const [prevData, setPrevData] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(false);

  const [mode, setMode] = useState<"order" | "estimate">("order");

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [list, setList] = useState<any>({ estimates: [], orders: [] });
  const [fullList, setFullList] = useState({
    estimates: [],
    orders: [],
  });
  const fetchFullList = async () => {
    try {
      const res = await apiClient.get("/analytics/sales-list/", {
        params: { start, end, shop_id: shopId, staff_id: staffId }
      });
      setFullList(res.data);
    } catch (e) {
      console.error(e);
    }
  };
  const [shopId, setShopId] = useState<number | "all">("all");
  const [shops, setShops] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [staffId, setStaffId] = useState<number | "all">("all");
  const [staffs, setStaffs] = useState<any[]>([]);

  useEffect(() => {
    apiClient.get("/masters/staffs/")
      .then(res => setStaffs(res.data.results || res.data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    apiClient.get("/auth/user/")
      .then(res => {
        setUser(res.data);
        setShopId(res.data.shop_id); // ←これが重要
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!shopId) return;
    fetchDaily();
    fetchFullList();
  }, [start, end, shopId, staffId]);

  const displayList = selectedDate ? list : fullList;



  useEffect(() => {
    apiClient.get("/masters/shops/")
      .then(res => setShops(res.data.results || res.data))
      .catch(console.error);
  }, []);
  // =========================
  // データ取得
  // =========================
  const fetchDaily = async () => {
    setLoading(true);

    try {
      const res = await apiClient.get("/analytics/sales-daily/", {
        params: { start, end, shop_id: shopId, staff_id: staffId }
      });

      setData(res.data);

      // 前月
      const prevStart = dayjs(start).subtract(1, "month").format("YYYY-MM-DD");
      const prevEnd = dayjs(end).subtract(1, "month").format("YYYY-MM-DD");

      const prevRes = await apiClient.get("/analytics/sales-daily/", {
        params: { start: prevStart, end: prevEnd, shop_id: shopId },
      });

      setPrevData(prevRes.data);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchList = async (date: string) => {
    const res = await apiClient.get("/analytics/sales-list/", {
      params: { start, end, shop_id: shopId, staff_id: staffId }
    });
    setList(res.data);
  };

  const handleClick = (state: any) => {
    if (!state?.activeLabel) return;

    setSelectedDate(state.activeLabel);
    fetchList(state.activeLabel);
  };

  // =========================
  // 計算
  // =========================
  const total = data.reduce((sum, d) => sum + d[mode], 0);

  const prevTotal = prevData.reduce((sum, d) => sum + d[mode], 0);

  const diff = prevTotal
    ? ((total - prevTotal) / prevTotal) * 100
    : 0;

  const count =
    mode === "order"
      ? displayList.orders.length
      : displayList.estimates.length;

  // =========================
  return (
    <Box p={3}>
      <Typography variant="h5" mb={2}>
        売上分析
      </Typography>

      {/* =========================
          フィルタ
      ========================= */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
          <TextField
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />

          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={(_, val) => val && setMode(val)}
          >
            <ToggleButton value="order">受注</ToggleButton>
            <ToggleButton value="estimate">見積</ToggleButton>
          </ToggleButtonGroup>
          <FormControl sx={{ minWidth: 160 }}>
            <InputLabel>店舗</InputLabel>
            <Select
              value={shopId}
              label="店舗"
              onChange={(e) => setShopId(e.target.value)}
            >
              <MenuItem value="all">全店舗</MenuItem>
              {shops.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 160 }}>
            <InputLabel>担当</InputLabel>
            <Select
              value={staffId}
              label="担当"
              onChange={(e) => setStaffId(e.target.value)}
            >
              <MenuItem value="all">全担当</MenuItem>
              {staffs.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.display_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* =========================
          KPIカード
      ========================= */}
      <Grid container spacing={2} mb={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Typography fontSize={13}>合計金額</Typography>
            <Typography variant="h6">
              ¥{total.toLocaleString()}
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Typography fontSize={13}>件数</Typography>
            <Typography variant="h6">
              {count} 件
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Typography fontSize={13}>前月比</Typography>
            <Typography
              variant="h6"
              color={diff >= 0 ? "green" : "red"}
            >
              {diff.toFixed(1)} %
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* =========================
          グラフ
      ========================= */}
      <Paper sx={{ p: 2, mb: 3 }}>
        {loading ? (
          <CircularProgress />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} onClick={handleClick}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />

              <Line
                type="monotone"
                dataKey={mode}
                stroke={mode === "order" ? "#2e7d32" : "#1565c0"}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography mb={2}>
          {selectedDate ? `${selectedDate} の一覧` : "期間内一覧"}
        </Typography>

        <Divider sx={{ mb: 2 }} />

        {/* =========================
            見積テーブル
        ========================= */}
        {mode === "estimate" && (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>見積番号</TableCell>
                <TableCell>見積日</TableCell>
                <TableCell>顧客名</TableCell>
                <TableCell align="right">金額</TableCell>
                <TableCell>担当</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {displayList.estimates.map((e: any) => (
                <TableRow
                  key={e.id}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => router.push(`/dashboard/estimates/${e.id}`)}
                >
                  <TableCell>{e.estimate_no}</TableCell>

                  <TableCell>
                    {e.estimate_date || e.created_at?.slice(0, 10)}
                  </TableCell>

                  <TableCell>{e.party?.name}</TableCell>

                  <TableCell align="right">
                    ¥{Number(e.grand_total).toLocaleString()}
                  </TableCell>

                  <TableCell>
                    {e.created_by?.display_name}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* =========================
            受注テーブル
        ========================= */}
        {mode === "order" && (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>受注番号</TableCell>
                <TableCell>受注日</TableCell>
                <TableCell>顧客名</TableCell>
                <TableCell align="right">金額</TableCell>
                <TableCell>担当</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {displayList.orders.map((o: any) => (
                <TableRow
                  key={o.id}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => router.push(`/dashboard/orders/${o.id}`)}
                >
                  <TableCell>{o.order_no}</TableCell>

                  <TableCell>
                    {o.order_date || o.created_at?.slice(0, 10)}
                  </TableCell>

                  <TableCell>{o.party_name}</TableCell>

                  <TableCell align="right">
                    ¥{Number(o.grand_total).toLocaleString()}
                  </TableCell>

                  <TableCell>
                    {o.created_by?.display_name}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  );
}