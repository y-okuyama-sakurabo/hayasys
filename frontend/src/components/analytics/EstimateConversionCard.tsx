"use client";

import { Paper, Typography, Box } from "@mui/material";

export default function EstimateConversionCard() {
  return (
    <Paper sx={{ p: 2, height: 180 }}>
      <Typography fontWeight="bold" mb={1}>
        見積 → 受注 成約率
      </Typography>

      <Box>
        <Typography variant="h4" fontWeight="bold">
          42%
        </Typography>
        <Typography variant="caption" color="text.secondary">
          見積 50 件中 21 件が受注
        </Typography>
      </Box>
    </Paper>
  );
}
