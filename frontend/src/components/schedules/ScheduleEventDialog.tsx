"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Chip,
  Divider,
  Stack,
  Typography,
  CircularProgress,
} from "@mui/material";
import EditIcon   from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ScheduleView     from "./ScheduleView";
import ScheduleEditForm from "./ScheduleEditForm";
import { useState } from "react";

type Shop     = { id: number; name: string };
type Customer = { id: number; name: string };

type Props = {
  open: boolean;
  schedule: any | null;
  mode: "view" | "edit";
  shops: Shop[];
  customers?: Customer[];
  onClose: () => void;
  onEdit: () => void;
  onUpdate: () => Promise<void>;
  onDelete: () => Promise<void>;
  onChange: (s: any) => void;
};

export default function ScheduleEventDialog({
  open,
  schedule,
  mode,
  shops,
  customers = [],
  onClose,
  onEdit,
  onUpdate,
  onDelete,
  onChange,
}: Props) {
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!schedule) return null;

  const handleUpdate = async () => {
    setSaving(true);
    try { await onUpdate(); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await onDelete(); } finally { setDeleting(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      {/* タイトル行 */}
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box flex={1} pr={1}>
            <Typography variant="h6" fontWeight="bold" lineHeight={1.3}>
              {mode === "edit" ? "スケジュール編集" : schedule.title || "スケジュール詳細"}
            </Typography>
          </Box>
          <Chip
            label={mode === "edit" ? "編集中" : "詳細"}
            size="small"
            color={mode === "edit" ? "primary" : "default"}
            variant={mode === "edit" ? "filled" : "outlined"}
          />
        </Stack>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 2.5, pb: 2 }}>
        {mode === "view" ? (
          <ScheduleView schedule={schedule} />
        ) : (
          <ScheduleEditForm
            schedule={schedule}
            shops={shops}
            customers={customers}
            onChange={onChange}
          />
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between" }}>
        {/* 左：削除（viewモードのみ表示） */}
        <Box>
          {mode === "view" && (
            <Button
              color="error"
              startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
              onClick={handleDelete}
              disabled={deleting || saving}
            >
              削除
            </Button>
          )}
        </Box>

        {/* 右：アクションボタン */}
        <Stack direction="row" spacing={1}>
          {mode === "view" ? (
            <>
              <Button onClick={onClose}>閉じる</Button>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={onEdit}
              >
                編集
              </Button>
            </>
          ) : (
            <>
              <Button onClick={onClose} disabled={saving}>
                キャンセル
              </Button>
              <Button
                variant="contained"
                onClick={handleUpdate}
                disabled={saving}
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
              >
                {saving ? "保存中..." : "更新"}
              </Button>
            </>
          )}
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
