"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  FormControl,
  Select,
  InputLabel,
} from "@mui/material";

import MoreVertIcon from "@mui/icons-material/MoreVert";
import DescriptionIcon from "@mui/icons-material/Description";
import PaidIcon from "@mui/icons-material/Paid";
import EditIcon from "@mui/icons-material/Edit";
import AddTaskIcon from "@mui/icons-material/AddTask";

import { useRouter } from "next/navigation";
import apiClient from "@/lib/apiClient";

type ManagementRow = {
  order_id: number;
  order_no: string;
  order_date: string;
  sales_date: string | null;
  customer_name: string;

  delivery_status: string;
  payment_status: string;

  grand_total: number;
  paid_total: number;
  unpaid_total: number;

  shop_id: number | null;   // ★追加
  shop_name: string | null;
};

type Shop = { id: number; name: string };

export default function ManagementListPage() {
  const router = useRouter();

  const [rows, setRows] = useState<ManagementRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<number | "all">("all");

  const [menuAnchor, setMenuAnchor] = useState<{ [key: number]: HTMLElement | null }>({});

  // --- 画面初期ロード ---
  useEffect(() => {
    const load = async () => {
      try {
        const meRes = await apiClient.get("/auth/user/");
        const myShop = meRes.data?.shop_id ?? "all";

        const shopRes = await apiClient.get("/masters/shops/");
        setShops(shopRes.data.results || shopRes.data);

        setSelectedShop(myShop);

        await fetchList(myShop);
      } catch (e) {
        console.error(e);
        await fetchList("all");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // --- API fetch ---
  const fetchList = async (shopId: number | "all") => {
    const q = shopId !== "all" ? `?shop_id=${shopId}` : "";
    const res = await apiClient.get(`/management/orders/${q}`);
    setRows(res.data);
  };

  const DELIVERY_STATUS_LABEL: Record<string, string> = {
    pending: "未納品",
    partial: "一部納品",
    completed: "納品済",
  };
  const PAYMENT_STATUS_LABEL: Record<string, string> = {
    pending: "未入金",
    partial: "一部入金",
    paid: "入金済",
  };

  // --- shop 選択変更 ---
  const handleShopChange = async (e: any) => {
    const v = e.target.value;
    setSelectedShop(v);
    await fetchList(v);
  };

  const formatPrice = (v: any) =>
    v == null ? "-" : `¥${Number(v).toLocaleString()}`;

  // --- メニュー ---
  const openMenu = (e: any, id: number) =>
    setMenuAnchor((prev) => ({ ...prev, [id]: e.currentTarget }));

  const closeMenu = (id: number) =>
    setMenuAnchor((prev) => ({ ...prev, [id]: null }));

  const handleAction = async (action: string, row: ManagementRow) => {
    closeMenu(row.order_id);

    switch (action) {
      case "detail":
        router.push(`/dashboard/management/${row.order_id}`);
        break;

      case "order":
        router.push(`/dashboard/orders/${row.order_id}`);
        break;

      case "mark-sales": {
        if (!confirm("売上計上してよろしいですか？")) return;
        await apiClient.post(`/orders/${row.order_id}/mark-sales/`);
        alert("売上計上しました");
        await fetchList(selectedShop);
        break;
      }
    }
  };

  if (loading)
    return (
      <Box textAlign="center" mt={10}>
        <CircularProgress />
      </Box>
    );

  return (
    <>
      {/* --- Header --- */}
      <Box display="flex" justifyContent="space-between" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          納品・入金管理
        </Typography>

        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="shop-label">店舗</InputLabel>
          <Select
            labelId="shop-label"
            value={selectedShop}
            label="店舗"
            onChange={handleShopChange}
          >
            <MenuItem value="all">全店舗</MenuItem>
            {shops.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* --- Table --- */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: "#f9f9f9" }}>
            <TableRow>
              <TableCell>受注日</TableCell>
              <TableCell>売上日</TableCell>
              <TableCell>顧客名</TableCell>
              <TableCell>納品</TableCell>
              <TableCell>入金</TableCell>
              <TableCell align="right">金額（入金 / 未入金）</TableCell>
              <TableCell align="center">操作</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.order_id} hover>
                <TableCell>{row.order_date}</TableCell>
                <TableCell>{row.sales_date ?? "-"}</TableCell>
                <TableCell>{row.customer_name}</TableCell>
                <TableCell>
                  {DELIVERY_STATUS_LABEL[row.delivery_status] ?? row.delivery_status}
                </TableCell>
                <TableCell>{PAYMENT_STATUS_LABEL[row.payment_status] ?? row.payment_status}</TableCell>
                <TableCell align="right">
                  {formatPrice(row.paid_total)} / {formatPrice(row.unpaid_total)}
                </TableCell>

                <TableCell align="center">
                  <IconButton onClick={(e) => openMenu(e, row.order_id)}>
                    <MoreVertIcon />
                  </IconButton>

                  <Menu
                    anchorEl={menuAnchor[row.order_id]}
                    open={Boolean(menuAnchor[row.order_id])}
                    onClose={() => closeMenu(row.order_id)}
                  >
                    <MenuItem onClick={() => handleAction("detail", row)}>
                      <ListItemIcon>
                        <DescriptionIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary="管理画面を開く" />
                    </MenuItem>

                    <MenuItem onClick={() => handleAction("order", row)}>
                      <ListItemIcon>
                        <EditIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary="受注詳細へ" />
                    </MenuItem>
                  </Menu>
                </TableCell>
              </TableRow>
            ))}

            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  データがありません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
