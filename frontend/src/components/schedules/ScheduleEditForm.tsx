"use client";

import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Stack,
  Typography,
  Divider,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PersonIcon     from "@mui/icons-material/Person";
import StoreIcon      from "@mui/icons-material/Store";
import NotesIcon      from "@mui/icons-material/Notes";
import JaDateTimePicker from "@/components/common/JaDateTimePicker";

type Shop     = { id: number; name: string };
type Customer = { id: number; name: string };

type Schedule = {
  id: number;
  title: string;
  description?: string;
  start_at: string;
  end_at?: string | null;
  shop?: number | null;
  customer?: number | null;
};

type Props = {
  schedule: Schedule;
  shops: Shop[];
  customers?: Customer[];
  onChange: (s: Schedule) => void;
};


function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <Box sx={{ color: "text.disabled", display: "flex" }}>{icon}</Box>
      <Typography variant="caption" color="text.secondary" fontWeight={600}>
        {label}
      </Typography>
    </Stack>
  );
}

export default function ScheduleEditForm({ schedule, shops, customers = [], onChange }: Props) {
  return (
    <Box>
      <Stack spacing={2.5}>
        {/* タイトル */}
        <TextField
          label="タイトル *"
          fullWidth
          value={schedule.title}
          onChange={(e) => onChange({ ...schedule, title: e.target.value })}
          autoFocus
        />

        <Divider />

        {/* 日時 */}
        <Stack spacing={1}>
          <SectionLabel icon={<AccessTimeIcon fontSize="small" />} label="日時" />
          <Stack direction="row" spacing={2}>
            <JaDateTimePicker
              label="開始"
              value={schedule.start_at || null}
              onChange={(v) => onChange({ ...schedule, start_at: v ?? "" })}
              required
            />
            <JaDateTimePicker
              label="終了（任意）"
              value={schedule.end_at || null}
              onChange={(v) => onChange({ ...schedule, end_at: v })}
            />
          </Stack>
        </Stack>

        <Divider />

        {/* 顧客 */}
        {customers.length > 0 && (
          <Stack spacing={1}>
            <SectionLabel icon={<PersonIcon fontSize="small" />} label="顧客" />
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
        )}

        {/* 店舗 */}
        <Stack spacing={1}>
          <SectionLabel icon={<StoreIcon fontSize="small" />} label="店舗" />
          <FormControl fullWidth>
            <InputLabel>店舗</InputLabel>
            <Select
              label="店舗"
              value={schedule.shop ?? ""}
              onChange={(e) => onChange({ ...schedule, shop: e.target.value as number })}
            >
              <MenuItem value=""><em>未選択</em></MenuItem>
              {shops.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        <Divider />

        {/* 備考 */}
        <Stack spacing={1}>
          <SectionLabel icon={<NotesIcon fontSize="small" />} label="備考" />
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
    </Box>
  );
}
