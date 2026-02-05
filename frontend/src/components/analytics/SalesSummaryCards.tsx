"use client";

import { Grid, Paper, Typography } from "@mui/material";

export default function SalesSummaryCards() {
  const cards = [
    { label: "売上合計", value: "¥1,230,000" },
    { label: "受注件数", value: "18 件" },
    { label: "平均単価", value: "¥68,300" },
    { label: "成約率", value: "42 %" },
  ];

  return (
    <Grid container spacing={2} mb={3}>
      {cards.map((c) => (
        <Grid key={c.label} size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {c.label}
            </Typography>
            <Typography variant="h6" fontWeight="bold">
              {c.value}
            </Typography>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}
