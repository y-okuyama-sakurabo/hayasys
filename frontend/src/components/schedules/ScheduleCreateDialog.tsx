"use client";

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
} from "@mui/material";

type Customer = {
  id: number;
  name: string;
};

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
  onSave: () => void;
};

export default function ScheduleCreateDialog({
  open,
  schedule,
  customers,
  onClose,
  onChange,
  onSave,
}: Props) {

  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle>スケジュール登録</DialogTitle>

      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
        
        {/* 顧客 */}
        <FormControl fullWidth>
          <InputLabel>顧客</InputLabel>
          <Select
            value={schedule.customer ?? ""}
            label="顧客"
            onChange={(e) => {
              const value = e.target.value as string | number;

              onChange({
                ...schedule,
                customer: value === "" ? null : Number(value),
              });
            }}
          >
            <MenuItem value="">未選択</MenuItem>
            {customers.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* タイトル */}
        <TextField
          label="タイトル"
          value={schedule.title}
          onChange={(e) =>
            onChange({ ...schedule, title: e.target.value })
          }
        />

        {/* 日付 */}
        <TextField
          type="datetime-local"
          label="開始"
          InputLabelProps={{ shrink: true }}
          value={schedule.start_at}
          onChange={(e) =>
            onChange({ ...schedule, start_at: e.target.value })
          }
        />

        <TextField
          type="datetime-local"
          label="終了"
          InputLabelProps={{ shrink: true }}
          value={schedule.end_at || ""}
          onChange={(e) =>
            onChange({ ...schedule, end_at: e.target.value })
          }
        />

        {/* 備考 */}
        <TextField
          label="備考"
          multiline
          rows={3}
          value={schedule.description || ""}
          onChange={(e) =>
            onChange({ ...schedule, description: e.target.value })
          }
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>キャンセル</Button>
        <Button variant="contained" onClick={onSave}>
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}