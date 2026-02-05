"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Divider,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import dayjs from "dayjs";
import apiClient from "@/lib/apiClient";

// ==================================================
// 色定義
// ==================================================
const COLORS = ["#1976d2", "#9c27b0", "#ef6c00", "#2e7d32", "#d32f2f"];

// ==================================================
// Page
// ==================================================
export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);

  const [summary, setSummary] = useState<any>(null);
  const [daily, setDaily] = useState<any[]>([]);
  const [byStaff, setByStaff] = useState<any[]>([]);
  const [byCategory, setByCategory] = useState<any[]>([]);
  const [conversion, setConversion] = useState<any>(null);
  const [bySales, setBySales] = useState<any[]>([]);

  // ==================================================
  // 初期ロード
  // ==================================================
  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);

        const from = dayjs().subtract(30, "day").format("YYYY-MM-DD");
        const to = dayjs().format("YYYY-MM-DD");

        const [
          summaryRes,
          dailyRes,
          staffRes,
          categoryRes,
          conversionRes,
          salesRes,
        ] = await Promise.all([
          apiClient.get("/analytics/sales-summary/"),
          apiClient.get("/analytics/sales-daily/", {
            params: { from, to },
          }),
          apiClient.get("/analytics/sales-by-staff/"),
          apiClient.get("/analytics/sales-by-category/"),
          apiClient.get("/analytics/estimate-conversion/"),
          apiClient.get("/analytics/orders-by-creator/"),
        ]);

        setSummary(summaryRes.data);
        setDaily(dailyRes.data.items || []);
        setByStaff(staffRes.data.items || []);
        setByCategory(categoryRes.data.items || []);
        setConversion(conversionRes.data);
        setBySales(salesRes.data.items || []);
      } catch (e) {
        console.error("❌ analytics load error:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={10}>
        <CircularProgress />
      </Box>
    );
  }

  // ==================================================
  // JSX
  // ==================================================
  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" mb={3}>
        分析ダッシュボード
      </Typography>

      {/* ===============================
          サマリーカード
      =============================== */}
      <Grid container spacing={2} mb={4}>
        <Grid size={{ xs: 12, md: 3 }}>
          <SummaryCard title="受注件数" value={summary.order_count} />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <SummaryCard
            title="売上合計"
            value={`¥${Number(summary.grand_total).toLocaleString()}`}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <SummaryCard
            title="税抜売上"
            value={`¥${Number(summary.subtotal).toLocaleString()}`}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <SummaryCard
            title="消費税"
            value={`¥${Number(summary.tax_total).toLocaleString()}`}
          />
        </Grid>
      </Grid>

      {/* ===============================
          日別売上推移
      =============================== */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography fontWeight="bold" mb={2}>
          日別売上推移
        </Typography>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={daily}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="grand_total"
              stroke="#1976d2"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </Paper>

      {/* ===============================
          担当者別・営業担当者別 売上
      =============================== */}
      <Grid container spacing={2} mt={2}>
        {/* 担当者別売上 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: "100%" }}>
            <Typography fontWeight="bold" mb={2}>
              作業担当者別売上
            </Typography>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>順位</TableCell>
                  <TableCell>担当者</TableCell>
                  <TableCell align="right">売上</TableCell>
                  <TableCell align="right">件数</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {[...byStaff]
                  .sort((a, b) => (b.subtotal ?? 0) - (a.subtotal ?? 0))
                  .map((row, index) => (
                    <TableRow key={row.staff_id ?? index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{row.staff_name || "未割当"}</TableCell>
                      <TableCell align="right">
                        ¥{Number(row.subtotal ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell align="right">
                        {row.sales_count}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>

        {/* 営業担当者別売上 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: "100%" }}>
            <Typography fontWeight="bold" mb={2}>
              営業担当者別売上
            </Typography>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>順位</TableCell>
                  <TableCell>営業担当</TableCell>
                  <TableCell align="right">売上</TableCell>
                  <TableCell align="right">受注数</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {[...bySales]
                  .sort((a, b) => (b.total_sales ?? 0) - (a.total_sales ?? 0))
                  .map((row, index) => (
                    <TableRow key={row.staff_id ?? index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{row.staff_name || "未設定"}</TableCell>
                      <TableCell align="right">
                        ¥{Number(row.subtotal ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell align="right">
                        {row.order_count}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
      </Grid>

        {/* カテゴリ別 */}
        {/* <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3 }}>
            <Typography fontWeight="bold" mb={2}>
              カテゴリ別売上
            </Typography>

            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={byCategory}
                  dataKey="subtotal"
                  nameKey="category_name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {byCategory.map((_: any, index: number) => (
                    <Cell
                      key={index}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid> */}


      {/* ===============================
          成約率
      =============================== */}
      {/* <Paper sx={{ p: 3, mt: 4 }}>
        <Typography fontWeight="bold" mb={1}>
          見積 → 受注 成約率
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Typography variant="h6">
          {conversion.conversion_rate}%（
          {conversion.ordered_estimates} / {conversion.total_estimates}）
        </Typography>
      </Paper> */}
    </Box>
  );
}

// ==================================================
// Components
// ==================================================
function SummaryCard({ title, value }: { title: string; value: any }) {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {title}
      </Typography>
      <Typography variant="h6" fontWeight="bold">
        {value}
      </Typography>
    </Paper>
  );
}
