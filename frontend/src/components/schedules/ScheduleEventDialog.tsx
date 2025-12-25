"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import ScheduleView from "./ScheduleView";
import ScheduleEditForm from "./ScheduleEditForm";

export default function ScheduleEventDialog({
  open,
  schedule,
  mode,
  shops,
  onClose,
  onEdit,
  onUpdate,
  onDelete,
  onChange,
}: any) {
  if (!schedule) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>スケジュール詳細</DialogTitle>

      <DialogContent dividers>
        {mode === "view" ? (
          <ScheduleView schedule={schedule} />
        ) : (
          <ScheduleEditForm
            schedule={schedule}
            shops={shops}
            onChange={onChange}
          />
        )}
      </DialogContent>

      <DialogActions>
        {mode === "view" ? (
          <>
            <Button onClick={onEdit}>編集</Button>
            <Button color="error" onClick={onDelete}>
              削除
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onClose}>キャンセル</Button>
            <Button variant="contained" onClick={onUpdate}>
              更新
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
