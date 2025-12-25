"use client";

import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
} from "@mui/material";

type Shop = {
  id: number;
  name: string;
};

type Schedule = {
  id: number;
  title: string;
  description?: string;
  start_at: string;
  end_at?: string | null;
  shop?: number | null;
};

type Props = {
  schedule: Schedule;
  shops: Shop[];
  onChange: (s: Schedule) => void;
};

export default function ScheduleEditForm({
  schedule,
  shops,
  onChange,
}: Props) {
  return (
    <Box>
      <TextField
        label="タイトル"
        fullWidth
        margin="dense"
        value={schedule.title}
        onChange={(e) =>
          onChange({ ...schedule, title: e.target.value })
        }
      />

      <TextField
        type="datetime-local"
        label="開始"
        fullWidth
        margin="dense"
        InputLabelProps={{ shrink: true }}
        value={schedule.start_at}
        onChange={(e) =>
          onChange({ ...schedule, start_at: e.target.value })
        }
      />

      <TextField
        type="datetime-local"
        label="終了"
        fullWidth
        margin="dense"
        InputLabelProps={{ shrink: true }}
        value={schedule.end_at || ""}
        onChange={(e) =>
          onChange({
            ...schedule,
            end_at: e.target.value || null,
          })
        }
      />

      <FormControl fullWidth margin="dense">
        <InputLabel>店舗</InputLabel>
        <Select
          label="店舗"
          value={schedule.shop ?? ""}
          onChange={(e) =>
            onChange({
              ...schedule,
              shop: e.target.value as number,
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
        rows={3}
        margin="dense"
        value={schedule.description || ""}
        onChange={(e) =>
          onChange({
            ...schedule,
            description: e.target.value,
          })
        }
      />
    </Box>
  );
}
