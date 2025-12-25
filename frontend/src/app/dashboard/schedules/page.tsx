"use client";

import { Box, Typography } from "@mui/material";
import ScheduleCalendar from "@/components/schedules/ScheduleCalendar";

export default function SchedulePage() {
  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight="bold" mb={2}>
        スケジュール
      </Typography>

      <ScheduleCalendar />
    </Box>
  );
}
