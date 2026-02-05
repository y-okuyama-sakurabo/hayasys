"use client";

import { Paper, Typography, Box } from "@mui/material";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const data = [
  { date: "02/01", sales: 120000 },
  { date: "02/02", sales: 98000 },
  { date: "02/03", sales: 143000 },
  { date: "02/04", sales: 87000 },
];

export default function SalesDailyChart() {
  return (
    <Paper sx={{ p: 2, height: 360 }}>
      <Typography fontWeight="bold" mb={2}>
        日別売上推移
      </Typography>

      <Box sx={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="sales"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
}
