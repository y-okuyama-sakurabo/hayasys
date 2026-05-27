"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Alert,
  CircularProgress,
  Divider,
  Typography,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PersonIcon     from "@mui/icons-material/Person";
import NotesIcon      from "@mui/icons-material/Notes";

type Customer = { id: number; name: string };

type Schedule = {
  id?: number;
  title: string;
  start_at: string;
  end_at?: string | null;
  description?: string;
  customer?: number | null;
  shop?: number | null;
};

type Props = {
  open: boolean;
  schedule: Schedule;
  customers: Customer[];
  onClose: () => void;
  onChange: (s: Schedule) => void;
  onSave: () => Promise<void>;
};

export default function ScheduleCreateDialog({
  open,
  schedule,
  customers,
  onClose,
  onChange,
  onSave,
}: Props) {
  const [saving, setSaving]   = useState(false);
  const [errors, setErrors]   = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!schedule.title.trim())  e.title    = "タイトルは必須です";
    if (!schedule.start_at)      e.start_at = "開始日時は必須です";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave();
    } catch {
      setErrors({ form: "保存に失敗しました。もう一度お試しください。" });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" fontWeight="bold">スケジュール登録</Typography>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 2.5 }}>
        <Stack spacing={2.5}>
          {errors.form && (
            <Alert severity="error">{errors.form}</Alert>
          )}

          {/* タイトル */}
          <TextField
            label="タイトル *"
            fullWidth
            value={schedule.title}
            onChange={(e) => onChange({ ...schedule, title: e.target.value })}
            error={!!errors.title}
            helperText={errors.title}
            autoFocus
          />

          {/* 日時 */}
          <Stack spacing={1}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <AccessTimeIcon fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                日時
              </Typography>
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                type="datetime-local"
                label="開始 *"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={schedule.start_at}
                onChange={(e) => onChange({ ...schedule, start_at: e.target.value })}
                error={!!errors.start_at}
                helperText={errors.start_at}
              />
              <TextField
                type="datetime-local"
                label="終了"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={schedule.end_at || ""}
                onChange={(e) => onChange({ ...schedule, end_at: e.target.value || null })}
              />
            </Stack>
          </Stack>

          {/* 顧客 */}
          <Stack spacing={1}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <PersonIcon fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                顧客
              </Typography>
            </Stack>
            <FormControl fullWidth>
              <InputLabel>顧客（任意）</InputLabel>
              <Select
                value={schedule.customer ?? ""}
                label="顧客（任意）"
                onChange={(e) => {
                  const v = e.target.value as string | number;
                  onChange({ ...schedule, customer: v === "" ? null : Number(v) });
                }}
              >
                <MenuItem value=""><em>未選択</em></MenuItem>
                {customers.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          {/* 備考 */}
          <Stack spacing={1}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <NotesIcon fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                備考
              </Typography>
            </Stack>
            <TextField
              multiline
              rows={3}
              fullWidth
              placeholder="内容・メモを入力..."
              value={schedule.description || ""}
              onChange={(e) => onChange({ ...schedule, description: e.target.value })}
            />
          </Stack>
        </Stack>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={saving}>
          キャンセル
        </Button>
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
  );
}
