"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Box,
  Typography,
  CircularProgress,
  Link,
} from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useEffect, useState } from "react";
import apiClient from "@/lib/apiClient";
import JaDateTimePicker from "@/components/common/JaDateTimePicker";

type Props = {
  scheduleId: number;
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
};

export default function ScheduleEditDialog({
  scheduleId,
  open,
  onClose,
  onChanged,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [description, setDescription] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [staffName, setStaffName] = useState("");
  const [estimateId, setEstimateId] = useState<number | null>(null);
  const [orderId, setOrderId] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setErrors({});
    apiClient
      .get(`/schedules/${scheduleId}/`)
      .then((res) => {
        const s = res.data;
        setTitle(s.title ?? "");
        setStartAt(s.start_at ? s.start_at.slice(0, 16) : "");
        setEndAt(s.end_at ? s.end_at.slice(0, 16) : "");
        setDescription(s.description ?? "");
        setCustomerName(s.customer_name ?? "");
        setStaffName(s.staff_name ?? "");
        setEstimateId(s.estimate ?? null);
        setOrderId(s.order ?? null);
      })
      .finally(() => setLoading(false));
  }, [open, scheduleId]);

  const handleSave = async () => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = "タイトルは必須です";
    if (!startAt) errs.startAt = "開始日時は必須です";
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSaving(true);
    try {
      await apiClient.patch(`/schedules/${scheduleId}/`, {
        title: title.trim(),
        start_at: startAt,
        end_at: endAt || null,
        description: description.trim() || null,
      });
      onChanged();
      onClose();
    } catch {
      setErrors({ _: "保存に失敗しました。" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("このスケジュールを削除しますか？")) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/schedules/${scheduleId}/`);
      onChanged();
      onClose();
    } catch {
      setErrors({ _: "削除に失敗しました。" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>スケジュール編集</DialogTitle>

      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={2} mt={1}>
            {errors._ && (
              <Typography color="error" fontSize={13}>
                {errors._}
              </Typography>
            )}

            {/* 顧客 */}
            {customerName && (
              <Box sx={{ p: 1, background: "#f5f5f5", borderRadius: 1 }}>
                <Typography fontSize={12} color="text.secondary">顧客</Typography>
                <Typography fontWeight="bold">{customerName}</Typography>
              </Box>
            )}

            {/* 担当者 */}
            {staffName && (
              <Box sx={{ p: 1, background: "#f5f5f5", borderRadius: 1 }}>
                <Typography fontSize={12} color="text.secondary">担当者</Typography>
                <Typography fontWeight="bold">{staffName}</Typography>
              </Box>
            )}

            {/* 見積・受注リンク */}
            {(estimateId || orderId) && (
              <Box sx={{ p: 1, background: "#fff8e1", borderRadius: 1 }}>
                <Typography fontSize={12} color="text.secondary" mb={0.5}>
                  関連
                </Typography>
                <Stack direction="row" spacing={2}>
                  {estimateId && (
                    <Link
                      href={`/dashboard/estimates/${estimateId}`}
                      target="_blank"
                      underline="hover"
                      fontSize={14}
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      見積 #{estimateId}
                      <OpenInNewIcon fontSize="inherit" />
                    </Link>
                  )}
                  {orderId && (
                    <Link
                      href={`/dashboard/orders/${orderId}`}
                      target="_blank"
                      underline="hover"
                      fontSize={14}
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      受注 #{orderId}
                      <OpenInNewIcon fontSize="inherit" />
                    </Link>
                  )}
                </Stack>
              </Box>
            )}

            <TextField
              fullWidth
              size="small"
              label="タイトル"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              error={!!errors.title}
              helperText={errors.title}
            />

            <JaDateTimePicker
              label="開始"
              value={startAt || null}
              onChange={(v) => setStartAt(v ?? "")}
              required
              error={!!errors.startAt}
              helperText={errors.startAt}
            />

            <JaDateTimePicker
              label="終了（任意）"
              value={endAt || null}
              onChange={(v) => setEndAt(v ?? "")}
            />

            <TextField
              fullWidth
              size="small"
              multiline
              rows={3}
              label="備考（任意）"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ justifyContent: "space-between", px: 2 }}>
        <Button
          color="error"
          onClick={handleDelete}
          disabled={deleting || loading || saving}
        >
          {deleting ? <CircularProgress size={18} /> : "削除"}
        </Button>
        <Stack direction="row" spacing={1}>
          <Button onClick={onClose} disabled={saving || deleting}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || loading || deleting}
          >
            {saving ? <CircularProgress size={18} /> : "保存"}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
