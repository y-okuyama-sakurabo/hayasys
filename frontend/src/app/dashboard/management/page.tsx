"use client";

import { useEffect, useState } from "react";
import dayjs from "dayjs";
import {
  Box,
  Paper,
  Typography,
  Select,
  MenuItem,
  Divider,
  FormControl,
  InputLabel,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Menu,
  MenuItem as MuiMenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";

import MoreVertIcon from "@mui/icons-material/MoreVert";
import DescriptionIcon from "@mui/icons-material/Description";
import EditIcon from "@mui/icons-material/Edit";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

const formatPrice = (n: number | string) =>
  new Intl.NumberFormat("ja-JP").format(Number(n || 0));

export default function ManagementPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [shops, setShops] = useState<any[]>([]);

  const [selectedShop, setSelectedShop] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState("");

  const [menuAnchor, setMenuAnchor] = useState<any>({});

  // =========================
  // ユーザー取得（★最重要）
  // =========================
  const fetchUser = async () => {
    const res = await fetch(`${baseUrl}/auth/user/`, {
      credentials: "include",
    });

    const user = await res.json();

    console.log("user", user);

    if (user?.shop_id) {
      const shopId = String(user.shop_id);
      setSelectedShop(shopId);

      fetchSummary(shopId);
    } else {
      setSelectedShop("all");
      fetchSummary("all");
    }
  };

  // =========================
  // 店舗取得
  // =========================
  const fetchShops = async () => {
    const res = await fetch(`${baseUrl}/masters/shops/`, {
      credentials: "include",
    });

    const json = await res.json();
    setShops(Array.isArray(json) ? json : json.results || []);
  };

  // =========================
  // サマリー
  // =========================
  const fetchSummary = async (shop?: string) => {
    let url = `${baseUrl}/management/orders/monthly/`;

    if (shop && shop !== "all") {
      url += `?shop_id=${shop}`;
    }

    const res = await fetch(url, {
      credentials: "include",
    });

    const json = await res.json();
    const safe = Array.isArray(json) ? json : [];

    setSummary(safe);

    if (safe.length > 0) {
      const firstMonth = String(safe[0].month);
      setSelectedMonth(firstMonth);
      fetchRows(firstMonth, shop);
    }
  };

  // =========================
  // 一覧
  // =========================
  const fetchRows = async (month?: string, shop?: string) => {
    let url = `${baseUrl}/management/orders/?`;

    const params: string[] = [];

    if (month) {
      params.push(`month=${month}`);
    }

    if (shop && shop !== "all") {
      params.push(`shop_id=${shop}`);
    }

    url += params.join("&");

    const res = await fetch(url, {
      credentials: "include",
    });

    const json = await res.json();
    setRows(Array.isArray(json) ? json : []);
  };

  // =========================
  // 初回
  // =========================
  useEffect(() => {
    fetchShops();
    fetchUser(); // ←ここが核
  }, []);

  // =========================
  // 店舗変更
  // =========================
  useEffect(() => {
    if (selectedShop) {
      fetchSummary(selectedShop);
    }
  }, [selectedShop]);

  // =========================
  // 月変更
  // =========================
  useEffect(() => {
    if (selectedMonth && selectedShop) {
      fetchRows(selectedMonth, selectedShop);
    }
  }, [selectedMonth, selectedShop]);

  const current = summary.find(
    (x) => String(x.month) === String(selectedMonth)
  );

  const openMenu = (e: any, id: number) => {
    setMenuAnchor((prev: any) => ({
      ...prev,
      [id]: e.currentTarget,
    }));
  };

  const closeMenu = (id: number) => {
    setMenuAnchor((prev: any) => ({
      ...prev,
      [id]: null,
    }));
  };

  return (
    <Box>

      {/* =========================
          フィルター
      ========================= */}
      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>店舗</InputLabel>
          <Select
            value={selectedShop}
            label="店舗"
            onChange={(e) => setSelectedShop(String(e.target.value))}
          >
            <MenuItem value="all">全店舗</MenuItem>
            {shops.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>月</InputLabel>
          <Select
            value={selectedMonth}
            label="月"
            onChange={(e) => setSelectedMonth(String(e.target.value))}
          >
            {summary.map((row) => (
              <MenuItem key={row.month} value={row.month}>
                {dayjs(row.month, "YYYY-MM").format("YYYY年MM月")}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* =========================
          サマリー
      ========================= */}
      {current && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", color: "red" }}>
            <Typography>未入金</Typography>
            <Typography>¥{formatPrice(current.unpaid_amount)}</Typography>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "space-between", color: "green", mt: 1 }}>
            <Typography>入金済</Typography>
            <Typography>¥{formatPrice(current.paid_amount)}</Typography>
          </Box>

          <Divider sx={{ my: 1 }} />

          <Box sx={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
            <Typography>受注金額</Typography>
            <Typography>¥{formatPrice(current.total_amount)}</Typography>
          </Box>
        </Paper>
      )}

      {/* =========================
          テーブル（完全そのまま）
      ========================= */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>受注日</TableCell>
              <TableCell>売上日</TableCell>
              <TableCell>顧客名</TableCell>
              <TableCell>納品</TableCell>
              <TableCell>入金</TableCell>
              <TableCell align="right">金額</TableCell>
              <TableCell align="center">操作</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.order_id}>
                <TableCell>{row.order_date}</TableCell>
                <TableCell>{row.sales_date ?? "-"}</TableCell>
                <TableCell>{row.customer_name}</TableCell>
                <TableCell>{row.delivery_status}</TableCell>
                <TableCell>{row.payment_status}</TableCell>
                <TableCell align="right">
                  {formatPrice(row.paid_total)} / {formatPrice(row.unpaid_total)}
                </TableCell>
                <TableCell align="center">
                  <IconButton onClick={(e) => openMenu(e, row.order_id)}>
                    <MoreVertIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

    </Box>
  );
}