"use client";

import { useEffect, useState } from "react";
import {
  Typography,
  Paper,
  Box,
  Grid,
  Chip,
} from "@mui/material";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/apiClient";

export default function DashboardPage() {
  const router = useRouter();

  const [data, setData] = useState({
    communications: [],
    schedules: [],
    estimates: [],
  });
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchData();
  }, [page, startDate, endDate]);

  const fetchData = async () => {
    const res = await apiClient.get("/dashboard/", {
      params: {
        page,
        start: startDate,
        end: endDate,
      },
    });
    setData(res.data);
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        ダッシュボード
      </Typography>

      <Grid container spacing={3}>
        {/* =========================
            上段：業務連絡
        ========================= */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper
            sx={{
              p: 2,
              height: "100%",
              maxHeight: 400,
              overflow: "auto",
              borderLeft: "4px solid #f44336",
            }}
          >
            <Typography variant="h6" mb={2}>
              業務連絡（{data.communications.length}）
            </Typography>

            {data.communications.map((c: any) => (
              <Box
                key={c.id}
                sx={{
                  py: 1.5,
                  borderBottom: "1px solid #eee",
                  cursor: "pointer",
                }}
                onClick={() => router.push(`/communications/${c.id}`)}
              >
                <Box display="flex" justifyContent="space-between">
                  <Typography fontWeight="bold">
                    {c.customer || "社内"}
                  </Typography>

                  {c.is_pending && (
                    <Chip size="small" label="未対応" color="error" />
                  )}
                </Box>

                <Typography variant="body2" color="text.secondary">
                  {c.last_message}
                </Typography>

                <Typography variant="caption" color="text.secondary">
                  {c.last_message_at
                    ? dayjs(c.last_message_at).format("MM/DD HH:mm")
                    : ""}
                </Typography>
              </Box>
            ))}
          </Paper>
        </Grid>

        {/* =========================
            上段：スケジュール
        ========================= */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper
            sx={{
              p: 2,
              height: "100%",
              maxHeight: 400,
              overflow: "auto",
              borderLeft: "4px solid #2196f3",
            }}
          >
            <Typography variant="h6" mb={2}>
              本日の予定（{data.schedules.length}）
            </Typography>

            {data.schedules.map((s: any) => (
              <Box
                key={s.id}
                sx={{
                  py: 1.5,
                  borderBottom: "1px solid #eee",
                }}
              >
                <Box display="flex" justifyContent="space-between">
                  <Typography fontWeight="bold">
                    {dayjs(s.start_at).format("HH:mm")}
                  </Typography>

                  {s.type === "delivery" && (
                    <Chip size="small" label="納車" color="primary" />
                  )}
                </Box>

                <Typography>{s.title}</Typography>

                <Typography variant="caption" color="text.secondary">
                  {s.customer || "社内予定"}
                </Typography>
              </Box>
            ))}
          </Paper>
        </Grid>

        {/* =========================
            下段：見積（フル幅）
        ========================= */}
        <Grid size={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" mb={2}>
              未受注見積（{data.estimates.length}）
            </Typography>

            <Box display="flex" gap={2} mb={2} alignItems="center">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
              />

              <Typography>〜</Typography>

              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
              />
              <button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setPage(1);
                }}
              >
                リセット
            </button>
            </Box>

            {data.estimates.map((e: any) => (
              <Box
                key={e.id}
                sx={{
                  py: 1.5,
                  borderBottom: "1px solid #eee",
                  cursor: "pointer",
                }}
                onClick={() => router.push(`/estimates/${e.id}`)}
              >
                <Box display="flex" justifyContent="space-between">
                  <Typography fontWeight="bold">
                    {e.estimate_no}
                  </Typography>

                  <Typography fontWeight="bold">
                    ¥{Number(e.total).toLocaleString()}
                  </Typography>
                </Box>

                <Typography variant="body2">
                  {e.customer || "顧客なし"}
                </Typography>

                <Typography variant="caption" color="text.secondary">
                  {e.staff} / {e.date}
                </Typography>
              </Box>
            ))}
            <Box display="flex" justifyContent="center" mt={2} gap={2}>
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                前へ
              </button>

              <Typography>
                {page}
              </Typography>

              <button
                disabled={data.estimates.length < 10}
                onClick={() => setPage((p) => p + 1)}
              >
                次へ
              </button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}