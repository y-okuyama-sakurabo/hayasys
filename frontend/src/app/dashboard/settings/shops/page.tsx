"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Alert,
  CircularProgress,
  Chip,
  MenuItem,
  Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import apiClient from "@/lib/apiClient";

// ─────────────────────────────────────────────
// 型
// ─────────────────────────────────────────────
type Shop = {
  id: number;
  code: string;
  name: string;
  postal_code: string;
  location: string;
  phone: string;
  fax: string;
  email: string;
  opening_hours: string;
  closing_day: string;
  note: string;
  bank_name: string;
  bank_branch_name: string;
  bank_account_type: string;
  bank_account_no: string;
  bank_account_holder: string;
};

type UsageInfo = {
  users: number;
  estimates: number;
  orders: number;
};

type FormData = {
  code: string;
  name: string;
  postal_code: string;
  location: string;
  phone: string;
  fax: string;
  email: string;
  opening_hours: string;
  closing_day: string;
  note: string;
  bank_name: string;
  bank_branch_name: string;
  bank_account_type: string;
  bank_account_no: string;
  bank_account_holder: string;
};

const emptyForm = (): FormData => ({
  code: "",
  name: "",
  postal_code: "",
  location: "",
  phone: "",
  fax: "",
  email: "",
  opening_hours: "",
  closing_day: "",
  note: "",
  bank_name: "",
  bank_branch_name: "",
  bank_account_type: "",
  bank_account_no: "",
  bank_account_holder: "",
});

// ─────────────────────────────────────────────
// メインページ
// ─────────────────────────────────────────────
export default function ShopsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 追加・編集ダイアログ
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Shop | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // 削除ダイアログ
  const [deleteTarget, setDeleteTarget] = useState<Shop | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── 一覧取得 ─────────────────────────────
  const fetchShops = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/masters/shops/");
      setShops(Array.isArray(res.data) ? res.data : res.data?.results ?? []);
    } catch {
      setError("店舗情報の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchShops(); }, [fetchShops]);

  // ── 追加ダイアログを開く ──────────────────
  const handleOpenAdd = () => {
    setEditTarget(null);
    setForm(emptyForm());
    setFormError(null);
    setDialogOpen(true);
  };

  // ── 編集ダイアログを開く ──────────────────
  const handleOpenEdit = (shop: Shop) => {
    setEditTarget(shop);
    setForm({
      code:               shop.code ?? "",
      name:               shop.name ?? "",
      postal_code:        shop.postal_code ?? "",
      location:           shop.location ?? "",
      phone:              shop.phone ?? "",
      fax:                shop.fax ?? "",
      email:              shop.email ?? "",
      opening_hours:      shop.opening_hours ?? "",
      closing_day:        shop.closing_day ?? "",
      note:               shop.note ?? "",
      bank_name:          shop.bank_name ?? "",
      bank_branch_name:   shop.bank_branch_name ?? "",
      bank_account_type:  shop.bank_account_type ?? "",
      bank_account_no:    shop.bank_account_no ?? "",
      bank_account_holder: shop.bank_account_holder ?? "",
    });
    setFormError(null);
    setDialogOpen(true);
  };

  // ── フォーム変更 ──────────────────────────
  const setField = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  // ── 保存 ─────────────────────────────────
  const handleSave = async () => {
    setFormError(null);
    if (!form.code.trim()) { setFormError("店舗コードを入力してください"); return; }
    if (!form.name.trim()) { setFormError("店舗名を入力してください"); return; }

    try {
      setSaving(true);
      if (editTarget) {
        await apiClient.patch(`/masters/shops/${editTarget.id}/`, form);
      } else {
        await apiClient.post("/masters/shops/", form);
      }
      setDialogOpen(false);
      fetchShops();
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.code)   setFormError(Array.isArray(data.code) ? data.code[0] : data.code);
      else if (data?.name) setFormError(Array.isArray(data.name) ? data.name[0] : data.name);
      else              setFormError("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  // ── 削除ダイアログを開く ──────────────────
  const handleOpenDelete = async (shop: Shop) => {
    setDeleteTarget(shop);
    setUsage(null);
    setLoadingUsage(true);
    try {
      const res = await apiClient.get(`/masters/shops/${shop.id}/usage/`);
      setUsage(res.data);
    } catch {
      setUsage(null);
    } finally {
      setLoadingUsage(false);
    }
  };

  // ── 削除実行 ──────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await apiClient.delete(`/masters/shops/${deleteTarget.id}/`);
      setDeleteTarget(null);
      setUsage(null);
      fetchShops();
    } catch {
      // サーバーエラーでも閉じる
    } finally {
      setDeleting(false);
    }
  };

  const totalUsage = usage ? usage.users + usage.estimates + usage.orders : 0;

  // ─────────────────────────────────────────
  return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: "auto" }}>
      {/* ヘッダー */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight="bold">店舗管理</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            店舗の追加・編集・削除ができます
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd}>
          店舗を追加
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* テーブル */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      ) : shops.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: "center" }}>
          <Typography color="text.secondary">店舗がありません</Typography>
          <Button variant="outlined" startIcon={<AddIcon />} sx={{ mt: 2 }} onClick={handleOpenAdd}>
            最初の店舗を追加
          </Button>
        </Paper>
      ) : (
        <Paper variant="outlined">
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell sx={{ fontWeight: "bold", width: 100 }}>コード</TableCell>
                <TableCell sx={{ fontWeight: "bold", minWidth: 140 }}>店舗名</TableCell>
                <TableCell sx={{ fontWeight: "bold", width: 110 }}>郵便番号</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>所在地</TableCell>
                <TableCell sx={{ fontWeight: "bold", width: 140 }}>電話番号</TableCell>
                <TableCell sx={{ fontWeight: "bold", width: 130 }}>営業時間</TableCell>
                <TableCell sx={{ fontWeight: "bold", width: 110 }}>定休日</TableCell>
                <TableCell sx={{ width: 88 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {shops.map((shop) => (
                <TableRow key={shop.id} hover>
                  <TableCell>
                    <Chip
                      label={shop.code}
                      size="small"
                      variant="outlined"
                      sx={{ fontFamily: "monospace", fontSize: 12 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {shop.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {shop.postal_code ? `〒${shop.postal_code}` : "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {shop.location || "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{shop.phone || "—"}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {shop.opening_hours || "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {shop.closing_day || "—"}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="編集">
                      <IconButton size="small" onClick={() => handleOpenEdit(shop)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="削除">
                      <IconButton size="small" color="error" onClick={() => handleOpenDelete(shop)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* ═══ 追加・編集ダイアログ ═══ */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editTarget ? "店舗を編集" : "店舗を追加"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} pt={1}>
            {formError && (
              <Alert severity="error" onClose={() => setFormError(null)}>{formError}</Alert>
            )}
            <Stack direction="row" spacing={1.5}>
              <TextField
                label="店舗コード *"
                size="small"
                fullWidth
                value={form.code}
                onChange={setField("code")}
                inputProps={{ maxLength: 30 }}
                helperText="英数字・記号（例: SHOP01）"
              />
              <TextField
                label="店舗名 *"
                size="small"
                fullWidth
                autoFocus
                value={form.name}
                onChange={setField("name")}
              />
            </Stack>
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <TextField
                label="郵便番号"
                size="small"
                sx={{ width: 160 }}
                value={form.postal_code}
                onChange={setField("postal_code")}
                placeholder="例: 123-4567"
                inputProps={{ maxLength: 10 }}
              />
              <TextField
                label="所在地"
                size="small"
                fullWidth
                value={form.location}
                onChange={setField("location")}
              />
            </Stack>
            <Stack direction="row" spacing={1.5}>
              <TextField
                label="電話番号"
                size="small"
                fullWidth
                value={form.phone}
                onChange={setField("phone")}
              />
              <TextField
                label="FAX"
                size="small"
                fullWidth
                value={form.fax}
                onChange={setField("fax")}
              />
            </Stack>
            <Stack direction="row" spacing={1.5}>
              <TextField
                label="メールアドレス"
                size="small"
                fullWidth
                type="email"
                value={form.email}
                onChange={setField("email")}
              />
              <TextField
                label="営業時間"
                size="small"
                fullWidth
                value={form.opening_hours}
                onChange={setField("opening_hours")}
                placeholder="例: 10:00〜19:00"
              />
              <TextField
                label="定休日"
                size="small"
                fullWidth
                value={form.closing_day}
                onChange={setField("closing_day")}
                placeholder="例: 水曜日"
              />
            </Stack>
            <TextField
              label="備考"
              size="small"
              fullWidth
              multiline
              rows={3}
              value={form.note}
              onChange={setField("note")}
            />

            <Divider sx={{ pt: 0.5 }}>
              <Typography variant="caption" color="text.secondary">振込先</Typography>
            </Divider>

            <Stack direction="row" spacing={1.5}>
              <TextField
                label="銀行名"
                size="small"
                fullWidth
                value={form.bank_name}
                onChange={setField("bank_name")}
                placeholder="例: ○○銀行"
              />
              <TextField
                label="支店名"
                size="small"
                fullWidth
                value={form.bank_branch_name}
                onChange={setField("bank_branch_name")}
                placeholder="例: △△支店"
              />
            </Stack>
            <Stack direction="row" spacing={1.5}>
              <TextField
                select
                label="口座種別"
                size="small"
                sx={{ width: 140 }}
                value={form.bank_account_type}
                onChange={setField("bank_account_type")}
              >
                <MenuItem value="">—</MenuItem>
                <MenuItem value="普通">普通</MenuItem>
                <MenuItem value="当座">当座</MenuItem>
              </TextField>
              <TextField
                label="口座番号"
                size="small"
                sx={{ width: 160 }}
                value={form.bank_account_no}
                onChange={setField("bank_account_no")}
                placeholder="例: 1234567"
                inputProps={{ maxLength: 20 }}
              />
              <TextField
                label="口座名義"
                size="small"
                fullWidth
                value={form.bank_account_holder}
                onChange={setField("bank_account_holder")}
                placeholder="例: ヤマダ タロウ"
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">キャンセル</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {saving ? "保存中..." : "保存"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══ 削除確認ダイアログ ═══ */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmberIcon color="warning" />
          店舗を削除しますか？
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" mb={2}>
            <strong>「{deleteTarget?.name}」（{deleteTarget?.code}）</strong> を削除します。
          </Typography>

          {loadingUsage ? (
            <Box display="flex" justifyContent="center" py={2}>
              <CircularProgress size={24} />
            </Box>
          ) : usage ? (
            <Stack spacing={1}>
              {totalUsage > 0 ? (
                <Alert severity="warning" icon={false}>
                  <Typography variant="body2" fontWeight="bold" mb={0.5}>
                    この店舗は以下で使用されています
                  </Typography>
                  {usage.users > 0 && (
                    <Typography variant="body2">• スタッフ: {usage.users} 名</Typography>
                  )}
                  {usage.estimates > 0 && (
                    <Typography variant="body2">• 見積: {usage.estimates} 件</Typography>
                  )}
                  {usage.orders > 0 && (
                    <Typography variant="body2">• 受注: {usage.orders} 件</Typography>
                  )}
                  <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                    ※ 削除しても既存データの店舗は「未設定」になります
                  </Typography>
                </Alert>
              ) : (
                <Alert severity="success" icon={false}>
                  <Typography variant="body2">
                    この店舗はどこにも使用されていません。安全に削除できます。
                  </Typography>
                </Alert>
              )}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} color="inherit" disabled={deleting}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleting || loadingUsage}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
          >
            {deleting ? "削除中..." : "削除する"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
