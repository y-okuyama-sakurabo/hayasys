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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  Select,
  InputLabel,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AddTaskIcon from "@mui/icons-material/AddTask";
import DescriptionIcon from "@mui/icons-material/Description";
import DeleteIcon from "@mui/icons-material/Delete";
import { useRouter, useSearchParams } from "next/navigation";
import apiClient from "@/lib/apiClient";

type Estimate = {
  id: number;
  estimate_no: string;
  party: { name: string } | null;
  staff?: { name: string } | null;
  items?: { product?: { name: string } | null; name: string }[];
  grand_total?: string | number;
  created_at: string;
  created_by?: {
    id: number;
    display_name?: string;
    name?: string;       // ← バックエンドが name 返す場合
    login_id?: string;   // ← login_id 返す場合
    username?: string;   // ← username がある場合
    role?: string;
  } | null;
};

type Shop = {
  id: number;
  name: string;
};

export default function EstimateListPage() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<number | "all">("all");
  const [loading, setLoading] = useState(true);
  const [menuAnchor, setMenuAnchor] = useState<{ [key: number]: HTMLElement | null }>({});
  const [deleteTarget, setDeleteTarget] = useState<Estimate | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // === 初期ロード ===
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        // 🔹 ログインユーザー情報取得
        const meRes = await apiClient.get("/auth/user/");
        // 例：{ id, login_id, shop_id, shop_name, role, ... }
        const staffShopId = meRes.data?.shop_id ?? "all";

        // 🔹 店舗一覧取得
        const shopRes = await apiClient.get("/masters/shops/");
        const shopList = shopRes.data.results || shopRes.data;
        setShops(shopList);

        // 🔹 デフォルト店舗設定
        setSelectedShop(staffShopId);

        // 🔹 見積一覧取得
        await fetchEstimates(staffShopId);
      } catch (err) {
        console.error("初期ロード失敗:", err);
        await fetchEstimates("all");
      } finally {
        setLoading(false);
      }
    };

    fetchInitial();
  }, [searchParams.get("_r")]); // ← URLパラメータ変化で再フェッチ

  // === 見積取得 ===
  const fetchEstimates = async (shopId: number | "all") => {
    try {
      const query = shopId !== "all" ? `?shop_id=${shopId}` : "";
      const res = await apiClient.get(`/estimates/${query}`);
      setEstimates(res.data.results || res.data || []);
    } catch (err) {
      console.error("見積一覧取得失敗:", err);
    }
  };

  // === 店舗変更 ===
  const handleShopChange = async (event: any) => {
    const newShop = event.target.value;
    setSelectedShop(newShop);
    await fetchEstimates(newShop);
  };

  // === メニュー操作 ===
  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>, id: number) => {
    setMenuAnchor((prev) => ({ ...prev, [id]: event.currentTarget }));
  };
  const handleMenuClose = (id: number) => {
    setMenuAnchor((prev) => ({ ...prev, [id]: null }));
  };

  // === アクション ===
  const handleAction = async (action: string, id: number) => {
    handleMenuClose(id);

    switch (action) {
      case "edit":
        router.push(`/dashboard/estimates/${id}/edit?_r=${Date.now()}`);
        break;
      case "detail":
        router.push(`/dashboard/estimates/${id}?_r=${Date.now()}`);
        break;
      case "duplicate":
        router.push(`/dashboard/estimates/new?copy_from=${id}&_r=${Date.now()}`);
        break;
      case "order": {
        router.push(`/dashboard/orders/new?from_estimate=${id}`);
        break;
      }


      case "delete":
        const target = estimates.find((e) => e.id === id);
        if (target) setDeleteTarget(target);
        break;
    }
  };

  // === 削除処理 ===
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiClient.delete(`/estimates/${deleteTarget.id}/`);
      setEstimates((prev) => prev.filter((e) => e.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      alert("削除に失敗しました。");
    }
  };

  // === 金額フォーマット ===
  const formatPrice = (value: any) => {
    if (value == null || isNaN(Number(value))) return "-";
    return `¥${Number(value).toLocaleString()}`;
  };

  if (loading)
    return (
      <Box display="flex" justifyContent="center" mt={10}>
        <CircularProgress />
      </Box>
    );

  return (
    <>
      {/* === ヘッダ === */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Typography variant="h5" fontWeight="bold">
          見積一覧
        </Typography>

        <Box display="flex" alignItems="center" gap={2}>
          {/* 店舗選択 */}
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="shop-select-label">店舗</InputLabel>
            <Select
              labelId="shop-select-label"
              value={selectedShop}
              label="店舗"
              onChange={handleShopChange}
            >
              <MenuItem value="all">全店舗</MenuItem>
              {shops.map((shop) => (
                <MenuItem key={shop.id} value={shop.id}>
                  {shop.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* 新規作成 */}
          <Button
            variant="contained"
            color="primary"
            onClick={() => router.push(`/dashboard/estimates/new?_r=${Date.now()}`)}
          >
            新規作成
          </Button>
        </Box>
      </Box>

      {/* === テーブル === */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: "#f9f9f9" }}>
            <TableRow>
              <TableCell>見積日</TableCell>
              <TableCell>顧客名</TableCell>
              <TableCell>内容</TableCell>
              <TableCell>担当者</TableCell>
              <TableCell align="right">金額</TableCell>
              <TableCell align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {estimates.map((est) => {
              const productName =
                est.items && est.items.length > 0
                  ? est.items[0].product?.name || est.items[0].name
                  : "-";

              return (
                <TableRow
                  key={est.id}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => router.push(`/dashboard/estimates/${est.id}?_r=${Date.now()}`)}
                >
                  <TableCell>{new Date(est.created_at).toLocaleDateString("ja-JP")}</TableCell>
                  <TableCell>{est.party?.name || "（顧客なし）"}</TableCell>
                  <TableCell>{productName}</TableCell>
                  <TableCell>
                    {est.created_by?.display_name || "-"}
                  </TableCell>
                  <TableCell align="right">{formatPrice(est.grand_total)}</TableCell>
                  <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                    <IconButton aria-label="操作メニュー" onClick={(event) => handleMenuOpen(event, est.id)}>
                      <MoreVertIcon />
                    </IconButton>

                    <Menu
                      anchorEl={menuAnchor[est.id]}
                      open={Boolean(menuAnchor[est.id])}
                      onClose={() => handleMenuClose(est.id)}
                    >
                      <MenuItem onClick={() => handleAction("edit", est.id)}>
                        <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
                        <ListItemText primary="編集" />
                      </MenuItem>
                      <MenuItem onClick={() => handleAction("detail", est.id)}>
                        <ListItemIcon><DescriptionIcon fontSize="small" /></ListItemIcon>
                        <ListItemText primary="詳細" />
                      </MenuItem>
                      <MenuItem onClick={() => handleAction("duplicate", est.id)}>
                        <ListItemIcon><ContentCopyIcon fontSize="small" /></ListItemIcon>
                        <ListItemText primary="複製して新規作成" />
                      </MenuItem>
                      <MenuItem onClick={() => handleAction("order", est.id)}>
                        <ListItemIcon><AddTaskIcon fontSize="small" /></ListItemIcon>
                        <ListItemText primary="受注作成" />
                      </MenuItem>
                      <MenuItem onClick={() => handleAction("delete", est.id)}>
                        <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
                        <ListItemText primary="削除" />
                      </MenuItem>
                    </Menu>
                  </TableCell>
                </TableRow>
              );
            })}

            {estimates.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">データがありません</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* === 削除確認 === */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>見積削除の確認</DialogTitle>
        <DialogContent>
          <DialogContentText>
            見積「{deleteTarget?.estimate_no}」を削除しますか？<br />
            この操作は取り消せません。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>キャンセル</Button>
          <Button onClick={handleDelete} color="error" variant="contained">削除する</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
