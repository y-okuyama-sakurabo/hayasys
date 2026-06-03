"use client";

import { Box, Typography } from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ScheduleCalendar from "@/components/schedules/ScheduleCalendar";

export default function SchedulePage() {
  return (
    <Box>
      {/* ページヘッダー */}
      <Box display="flex" alignItems="center" gap={1} mb={2.5}>
        <Typography variant="h5" fontWeight="bold">
          スケジュール
        </Typography>
      </Box>

      <ScheduleCalendar />
    </Box>
  );
}
