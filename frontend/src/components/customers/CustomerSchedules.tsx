"use client";

import React, { useEffect, useState } from "react";
import {
  Box, Typography, Button, Paper, Stack, Chip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem,
  CircularProgress, Divider, Tooltip,
} from "@mui/material";
import EventNoteIcon       from "@mui/icons-material/EventNote";
import AddIcon             from "@mui/icons-material/Add";
import EditIcon            from "@mui/icons-material/Edit";
import DeleteOutlineIcon   from "@mui/icons-material/DeleteOutline";
import CalendarTodayIcon   from "@mui/icons-material/CalendarToday";
import StorefrontIcon      from "@mui/icons-material/Storefront";
import PersonOutlineIcon   from "@mui/icons-material/PersonOutline";
import OpenInNewIcon       from "@mui/icons-material/OpenInNew";
import apiClient from "@/lib/apiClient";
import ScheduleEditDialog from "@/components/schedules/ScheduleEditDialog";

type Shop = { id: number; name: string };

type Schedule = {
  id: number;
  title: string;
  description?: string;
  start_at: string;
  end_at?: string;
  staff_name?: string;
  shop: number | null;
  shop_name?: string | null;
  estimate?: number | null;
  order?: number | null;
};

const initForm = { title: "", start_at: "", end_at: "", description: "" };

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ja-JP", {
    year: "numeric", month: "2-digit", day: "2-digit",
    weekday: "short",
  });
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

export default function CustomerSchedules({ customerId }: { customerId: number }) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [shops, setShops]         = useState<Shop[]>([]);
  const [shopId, setShopId]       = useState<number | "">("");
  const [loading, setLoading]     = useState(true);
  const [addOpen, setAddOpen]     = useState(false);
  const [form, setForm]           = useState(initForm);
  const [saving, setSaving]       = useState(false);
  const [editId, setEditId]       = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [me, shopRes] = await Promise.all([
          apiClient.get("/auth/user/"),
          apiClient.get("/masters/shops/"),
        ]);
        setShopId(me.data.shop_id ?? "");
        setShops(shopRes.data.results || shopRes.data || []);
        await fetchSchedules();
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSchedules = async () => {
    const res = await apiClient.get(`/customers/${customerId}/schedules/`);
    setSchedules(res.data.results || res.data || []);
  };

  const handleAdd = async () => {
    if (!form.title || !form.start_at) return;
    setSaving(true);
    try {
      await apiClient.post(`/customers/${customerId}/schedules/`, {
        ...form,
        end_at: form.end_at || null,
        shop: shopId === "" ? null : shopId,
      });
      setForm(initForm);
      setAddOpen(false);
      await fetchSchedules();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("このスケジュールを削除しますか？")) return;
    await apiClient.delete(`/schedules/${id}/`);
    await fetchSchedules();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={6}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Box>
      {/* ヘッダー */}
      <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" alignItems="center" spacing={1}>
            <EventNoteIcon fontSize="small" color="action" />
            <Typography variant="subtitle1" fontWeight="bold">スケジュール</Typography>
            {schedules.length > 0 && (
              <Chip label={schedules.length} size="small" sx={{ height: 20, fontSize: 11 }} />
            )}
          </Stack>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setAddOpen(true)}
          >
            スケジュールを追加
          </Button>
        </Stack>
      </Paper>

      {/* スケジュール一覧 */}
      {schedules.length === 0 ? (
        <Paper variant="outlined" sx={{ py: 6, textAlign: "center" }}>
          <EventNoteIcon sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
          <Typography variant="body2" color="text.disabled">
            スケジュールはありません
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {schedules.map((s) => (
            <Paper key={s.id} variant="outlined" sx={{ overflow: "hidden" }}>
              {/* カードヘッダー */}
              <Box
                sx={{
                  px: 2, py: 1,
                  bgcolor: "grey.50",
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                  <CalendarTodayIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                  <Typography variant="body2" fontWeight="bold">
                    {fmtDate(s.start_at)} {fmtTime(s.start_at)}
                  </Typography>
                  {s.end_at && (
                    <Typography variant="caption" color="text.secondary">
                      〜 {fmtTime(s.end_at)}
                    </Typography>
                  )}
                  {/* 見積・受注リンク */}
                  {s.estimate && (
                    <Chip
                      size="small"
                      label="見積"
                      color="primary"
                      variant="outlined"
                      icon={<OpenInNewIcon style={{ fontSize: 11 }} />}
                      component="a"
                      href={`/dashboard/estimates/${s.estimate}`}
                      target="_blank"
                      clickable
                      sx={{ fontSize: 11, height: 20 }}
                    />
                  )}
                  {s.order && (
                    <Chip
                      size="small"
                      label="受注"
                      color="success"
                      variant="outlined"
                      icon={<OpenInNewIcon style={{ fontSize: 11 }} />}
                      component="a"
                      href={`/dashboard/orders/${s.order}`}
                      target="_blank"
                      clickable
                      sx={{ fontSize: 11, height: 20 }}
                    />
                  )}
                </Stack>

                {/* 操作ボタン */}
                <Stack direction="row" spacing={0.5}>
                  <Tooltip title="編集">
                    <IconButton size="small" onClick={() => setEditId(s.id)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="削除">
                    <IconButton size="small" color="error" onClick={() => handleDelete(s.id)}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>

              {/* カードボディ */}
              <Box sx={{ px: 2, py: 1.5 }}>
                <Typography variant="body2" fontWeight="bold" mb={0.5}>
                  {s.title}
                </Typography>

                <Stack direction="row" spacing={2} flexWrap="wrap">
                  {(s.shop_name || s.shop) && (
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <StorefrontIcon sx={{ fontSize: 13, color: "text.secondary" }} />
                      <Typography variant="caption" color="text.secondary">
                        {s.shop_name ?? shops.find((x) => x.id === s.shop)?.name ?? ""}
                      </Typography>
                    </Stack>
                  )}
                  {s.staff_name && (
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <PersonOutlineIcon sx={{ fontSize: 13, color: "text.secondary" }} />
                      <Typography variant="caption" color="text.secondary">
                        {s.staff_name}
                      </Typography>
                    </Stack>
                  )}
                </Stack>

                {s.description && (
                  <>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
                      {s.description}
                    </Typography>
                  </>
                )}
              </Box>
            </Paper>
          ))}
        </Stack>
      )}

      {/* 追加ダイアログ */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ pb: 1 }}>スケジュールを追加</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="タイトル"
              size="small"
              fullWidth
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                type="datetime-local"
                size="small"
                label="開始日時"
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
                value={form.start_at}
                onChange={(e) => setForm({ ...form, start_at: e.target.value })}
              />
              <TextField
                type="datetime-local"
                size="small"
                label="終了日時"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={form.end_at}
                onChange={(e) => setForm({ ...form, end_at: e.target.value })}
              />
            </Stack>
            <FormControl size="small" fullWidth>
              <InputLabel>店舗</InputLabel>
              <Select
                label="店舗"
                value={shopId}
                onChange={(e) => setShopId(e.target.value as number)}
              >
                <MenuItem value="">未選択</MenuItem>
                {shops.map((s) => (
                  <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="内容・メモ"
              size="small"
              multiline
              rows={3}
              fullWidth
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddOpen(false)} disabled={saving}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            onClick={handleAdd}
            disabled={saving || !form.title || !form.start_at}
          >
            {saving ? "保存中..." : "追加"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 編集ダイアログ */}
      {editId !== null && (
        <ScheduleEditDialog
          scheduleId={editId}
          open
          onClose={() => setEditId(null)}
          onChanged={() => {
            setEditId(null);
            fetchSchedules();
          }}
        />
      )}
    </Box>
  );
}
