"use client";

import { Box, Typography } from "@mui/material";

type Schedule = {
  title: string;
  description?: string;
  start_at: string;
  end_at?: string | null;
  customer_name?: string | null;
  shop_name?: string | null;
  staff_name?: string | null;
};

export default function ScheduleView({
  schedule,
}: {
  schedule: Schedule;
}) {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {schedule.title}
      </Typography>

      <Typography variant="body2" color="text.secondary">
        顧客：{schedule.customer_name || "-"}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        店舗：{schedule.shop_name || "-"}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        担当：{schedule.staff_name || "-"}
      </Typography>

      <Box mt={2}>
        <Typography>
          開始：{new Date(schedule.start_at).toLocaleString("ja-JP")}
        </Typography>
        <Typography>
          終了：
          {schedule.end_at
            ? new Date(schedule.end_at).toLocaleString("ja-JP")
            : "-"}
        </Typography>
      </Box>

      {schedule.description && (
        <Box mt={2}>
          <Typography variant="subtitle2">内容</Typography>
          <Typography>{schedule.description}</Typography>
        </Box>
      )}
    </Box>
  );
}
