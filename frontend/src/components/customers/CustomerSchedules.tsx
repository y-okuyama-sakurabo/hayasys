"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import apiClient from "@/lib/apiClient";

type Shop = {
  id: number;
  name: string;
};

type Schedule = {
  id: number;
  title: string;
  description?: string;
  start_at: string;
  end_at?: string;
  staff_name?: string;
  shop: number | null;
  shop_name?: string | null;
};

export default function CustomerSchedules({
  customerId,
}: {
  customerId: number;
}) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopId, setShopId] = useState<number | "">("");
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    title: "",
    start_at: "",
    end_at: "",
    description: "",
  });

  const [editTarget, setEditTarget] = useState<Schedule | null>(null);

  // --- 操作メニュー用 ---
  const [menuAnchor, setMenuAnchor] = useState<{
    [key: number]: HTMLElement | null;
  }>({});

  // -------------------------
  // 初期ロード
  // -------------------------
  useEffect(() => {
    const init = async () => {
      try {
        const me = await apiClient.get("/auth/user/");
        setShopId(me.data.shop_id ?? "");

        const shopRes = await apiClient.get("/masters/shops/");
        setShops(shopRes.data.results || shopRes.data || []);

        await fetchSchedules();
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // -------------------------
  // 一覧取得
  // -------------------------
  const fetchSchedules = async () => {
    const res = await apiClient.get(
      `/customers/${customerId}/schedules/`
    );
    setSchedules(res.data.results || res.data || []);
  };

  // -------------------------
  // 追加
  // -------------------------
  const handleAdd = async () => {
    if (!form.title || !form.start_at) return;

    await apiClient.post(`/customers/${customerId}/schedules/`, {
      ...form,
      end_at: form.end_at || null,
      shop: shopId,
    });

    setForm({ title: "", start_at: "", end_at: "", description: "" });
    await fetchSchedules();
  };

  // -------------------------
  // 更新
  // -------------------------
  const handleUpdate = async () => {
    if (!editTarget) return;

    await apiClient.patch(`/schedules/${editTarget.id}/`, {
      title: editTarget.title,
      start_at: editTarget.start_at,
      end_at: editTarget.end_at || null,
      description: editTarget.description,
      shop: editTarget.shop?.id,
    });

    setEditTarget(null);
    await fetchSchedules();
  };

  // -------------------------
  // 削除
  // -------------------------
  const handleDelete = async (id: number) => {
    if (!confirm("このスケジュールを削除しますか？")) return;
    await apiClient.delete(`/schedules/${id}/`);
    await fetchSchedules();
  };

  // -------------------------
  // メニュー制御
  // -------------------------
  const openMenu = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setMenuAnchor((prev) => ({ ...prev, [id]: e.currentTarget }));
  };

  const closeMenu = (id: number) => {
    setMenuAnchor((prev) => ({ ...prev, [id]: null }));
  };

  return (
    <Box mt={4}>
      <Typography variant="h6" mb={2}>
        スケジュール
      </Typography>

      {/* === 追加フォーム === */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" gap={2} flexWrap="wrap">
          <TextField
            label="タイトル"
            size="small"
            value={form.title}
            onChange={(e) =>
              setForm({ ...form, title: e.target.value })
            }
          />
          <TextField
            type="datetime-local"
            size="small"
            label="開始"
            InputLabelProps={{ shrink: true }}
            value={form.start_at}
            onChange={(e) =>
              setForm({ ...form, start_at: e.target.value })
            }
          />
          <TextField
            type="datetime-local"
            size="small"
            label="終了"
            InputLabelProps={{ shrink: true }}
            value={form.end_at}
            onChange={(e) =>
              setForm({ ...form, end_at: e.target.value })
            }
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>店舗</InputLabel>
            <Select
              label="店舗"
              value={shopId}
              onChange={(e) =>
                setShopId(e.target.value as number)
              }
            >
              {shops.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" onClick={handleAdd}>
            追加
          </Button>
        </Box>
        <TextField
          label="内容"
          size="small"
          multiline
          fullWidth
          sx={{ mt: 2 }}
          value={form.description}
          onChange={(e) =>
            setForm({ ...form, description: e.target.value })
          }
        />
      </Paper>

      {/* === 一覧 === */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>タイトル</TableCell>
              <TableCell>担当</TableCell>
              <TableCell>店舗</TableCell>
              <TableCell>開始</TableCell>
              <TableCell>終了</TableCell>
              <TableCell align="center">操作</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {schedules.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.title}</TableCell>
                <TableCell>{s.staff_name || "-"}</TableCell>
                <TableCell>{s.shop_name || "-"}</TableCell>
                <TableCell>
                  {new Date(s.start_at).toLocaleString("ja-JP")}
                </TableCell>
                <TableCell>
                  {s.end_at
                    ? new Date(s.end_at).toLocaleString("ja-JP")
                    : "-"}
                </TableCell>
                <TableCell align="center">
                  <IconButton onClick={(e) => openMenu(e, s.id)}>
                    <MoreVertIcon />
                  </IconButton>

                  <Menu
                    anchorEl={menuAnchor[s.id]}
                    open={Boolean(menuAnchor[s.id])}
                    onClose={() => closeMenu(s.id)}
                  >
                    <MenuItem
                      onClick={() => {
                        closeMenu(s.id);
                        setEditTarget(s);
                      }}
                    >
                      編集
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        closeMenu(s.id);
                        handleDelete(s.id);
                      }}
                    >
                      削除
                    </MenuItem>
                  </Menu>
                </TableCell>
              </TableRow>
            ))}

            {schedules.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  スケジュールはありません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* === 編集ダイアログ === */}
      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)}>
        <DialogTitle>スケジュール編集</DialogTitle>
        {editTarget && (
          <DialogContent>
            <TextField
              label="タイトル"
              fullWidth
              margin="dense"
              value={editTarget.title}
              onChange={(e) =>
                setEditTarget({
                  ...editTarget,
                  title: e.target.value,
                })
              }
            />
            <TextField
              type="datetime-local"
              label="開始"
              fullWidth
              margin="dense"
              InputLabelProps={{ shrink: true }}
              value={editTarget.start_at}
              onChange={(e) =>
                setEditTarget({
                  ...editTarget,
                  start_at: e.target.value,
                })
              }
            />
            <TextField
              type="datetime-local"
              label="終了"
              fullWidth
              margin="dense"
              InputLabelProps={{ shrink: true }}
              value={editTarget.end_at || ""}
              onChange={(e) =>
                setEditTarget({
                  ...editTarget,
                  end_at: e.target.value,
                })
              }
            />
            <FormControl fullWidth margin="dense">
              <InputLabel>店舗</InputLabel>
              <Select
                label="店舗"
                value={editTarget.shop?.id || ""}
                onChange={(e) =>
                  setEditTarget({
                    ...editTarget,
                    shop: {
                      id: e.target.value as number,
                      name:
                        shops.find(
                          (s) => s.id === e.target.value
                        )?.name || "",
                    },
                  })
                }
              >
                {shops.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="内容"
              fullWidth
              multiline
              margin="dense"
              value={editTarget.description || ""}
              onChange={(e) =>
                setEditTarget({
                  ...editTarget,
                  description: e.target.value,
                })
              }
            />
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={() => setEditTarget(null)}>
            キャンセル
          </Button>
          <Button variant="contained" onClick={handleUpdate}>
            更新
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
