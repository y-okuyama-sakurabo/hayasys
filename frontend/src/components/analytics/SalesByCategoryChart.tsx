"use client";

import { Paper, Typography, Box } from "@mui/material";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Tooltip,
} from "recharts";

const data = [
  { name: "車両", value: 720000 },
  { name: "用品", value: 380000 },
  { name: "工賃", value: 130000 },
];

export default function SalesByCategoryChart() {
  return (
    <Paper sx={{ p: 2, height: 360 }}>
      <Typography fontWeight="bold" mb={2}>
        カテゴリ別売上
      </Typography>

      <Box sx={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              outerRadius={100}
              label
            />
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
}
