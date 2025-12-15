"use client";

import { Typography, Paper, Box } from "@mui/material";

export default function DashboardPage() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        ダッシュボード
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography>ようこそ、Hayasys 管理画面へ！</Typography>
      </Paper>
    </Box>
  );
}
