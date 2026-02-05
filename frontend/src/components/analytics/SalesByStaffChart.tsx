"use client";

import { Paper, Typography, Box } from "@mui/material";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const data = [
  { staff: "山田", sales: 320000 },
  { staff: "佐藤", sales: 210000 },
  { staff: "鈴木", sales: 180000 },
];

export default function SalesByStaffChart() {
  return (
    <Paper sx={{ p: 2, height: 360 }}>
      <Typography fontWeight="bold" mb={2}>
        担当者別売上
      </Typography>

      <Box sx={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <BarChart data={data}>
            <XAxis dataKey="staff" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="sales" />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
}
