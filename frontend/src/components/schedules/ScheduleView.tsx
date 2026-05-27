"use client";

import { Box, Chip, Divider, Stack, Typography } from "@mui/material";
import AccessTimeIcon      from "@mui/icons-material/AccessTime";
import PersonIcon          from "@mui/icons-material/Person";
import StoreIcon           from "@mui/icons-material/Store";
import BadgeIcon           from "@mui/icons-material/Badge";
import NotesIcon           from "@mui/icons-material/Notes";
import CalendarTodayIcon   from "@mui/icons-material/CalendarToday";

type Schedule = {
  title: string;
  description?: string;
  start_at: string;
  end_at?: string | null;
  customer_name?: string | null;
  shop_name?: string | null;
  staff_name?: string | null;
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", {
    year: "numeric", month: "long", day: "numeric",
    weekday: "short", hour: "2-digit", minute: "2-digit",
  });
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      <Box sx={{ color: "text.disabled", mt: 0.1, flexShrink: 0 }}>{icon}</Box>
      <Box>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          {label}
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.2 }}>
          {value || <span style={{ color: "#aaa" }}>—</span>}
        </Typography>
      </Box>
    </Stack>
  );
}

export default function ScheduleView({ schedule }: { schedule: Schedule }) {
  return (
    <Box>
      {/* タイトル */}
      <Stack direction="row" spacing={1} alignItems="center" mb={2}>
        <CalendarTodayIcon color="primary" />
        <Typography variant="h6" fontWeight="bold" lineHeight={1.3}>
          {schedule.title}
        </Typography>
      </Stack>

      {/* 顧客・担当・店舗 */}
      <Stack spacing={1.8} mb={2.5}>
        <InfoRow
          icon={<PersonIcon fontSize="small" />}
          label="顧客"
          value={schedule.customer_name}
        />
        <InfoRow
          icon={<BadgeIcon fontSize="small" />}
          label="担当"
          value={schedule.staff_name}
        />
        <InfoRow
          icon={<StoreIcon fontSize="small" />}
          label="店舗"
          value={schedule.shop_name}
        />
      </Stack>

      <Divider sx={{ my: 2 }} />

      {/* 日時 */}
      <Stack spacing={1.8} mb={2.5}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box sx={{ color: "text.disabled", mt: 0.1, flexShrink: 0 }}>
            <AccessTimeIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              日時
            </Typography>
            <Stack spacing={0.5} mt={0.2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip label="開始" size="small" color="primary" variant="outlined" sx={{ fontSize: 11, height: 20 }} />
                <Typography variant="body2">{formatDateTime(schedule.start_at)}</Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip label="終了" size="small" variant="outlined" sx={{ fontSize: 11, height: 20 }} />
                <Typography variant="body2">
                  {schedule.end_at ? formatDateTime(schedule.end_at) : <span style={{ color: "#aaa" }}>—</span>}
                </Typography>
              </Stack>
            </Stack>
          </Box>
        </Stack>
      </Stack>

      {/* 備考 */}
      {schedule.description && (
        <>
          <Divider sx={{ my: 2 }} />
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Box sx={{ color: "text.disabled", mt: 0.1, flexShrink: 0 }}>
              <NotesIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                備考
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  mt: 0.5,
                  whiteSpace: "pre-wrap",
                  bgcolor: "grey.50",
                  borderRadius: 1,
                  p: 1.5,
                  lineHeight: 1.7,
                }}
              >
                {schedule.description}
              </Typography>
            </Box>
          </Stack>
        </>
      )}
    </Box>
  );
}
