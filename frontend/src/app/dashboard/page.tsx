"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Typography,
  Paper,
  Box,
  Grid,
  Chip,
  Button,
  Stack,
  IconButton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/apiClient";

import BusinessCommunicationCreateDialog from "@/components/business-communications/BusinessCommunicationCreateDialog";
import BusinessCommunicationThreadDialog from "@/components/business-communications/BusinessCommunicationThreadDialog";
import ScheduleQuickCreateDialog from "@/components/schedules/ScheduleQuickCreateDialog";
import ScheduleEditDialog from "@/components/schedules/ScheduleEditDialog";
import ScheduleDetailDialog from "@/components/schedules/ScheduleDetailDialog";

type Thread = {
  id: number;
  title: string;
  status: "pending" | "done";
  customer?: { id: number; name: string } | null;
  sender_name?: string;
  receiver_name?: string;
  updated_at?: string;
  messages?: any[];
};

export default function DashboardPage() {
  const router = useRouter();

  // 業務連絡
  const [threads, setThreads] = useState<Thread[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [scheduleCreateOpen, setScheduleCreateOpen] = useState(false);
  const [detailScheduleId, setDetailScheduleId] = useState<number | null>(null);
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null);

  // ダッシュボード（スケジュール・見積）
  const [data, setData] = useState<{
    schedules: any[];
    estimates: any[];
  }>({ schedules: [], estimates: [] });
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchThreads = useCallback(async () => {
    try {
      const res = await apiClient.get("/communication-threads/?status=pending");
      const raw = Array.isArray(res.data) ? res.data : res.data.results ?? [];
      setThreads(raw);
    } catch {
      setThreads([]);
    }
  }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await apiClient.get("/dashboard/", {
        params: { page, start: startDate, end: endDate },
      });
      setData({
        schedules: res.data.schedules ?? [],
        estimates: res.data.estimates ?? [],
      });
    } catch {
      // ignore
    }
  }, [page, startDate, endDate]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return (
    <Box>
      <Grid container spacing={3}>
        {/* ========================= 業務連絡 ========================= */}
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
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6">
                業務連絡（未対応 {threads.length}）
              </Typography>
              <Button
                size="small"
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateOpen(true)}
              >
                新規
              </Button>
            </Stack>

            {threads.length === 0 && (
              <Typography color="text.secondary" fontSize={13}>
                未対応の業務連絡はありません
              </Typography>
            )}

            {threads.map((t) => (
              <Box
                key={t.id}
                sx={{
                  py: 1.5,
                  borderBottom: "1px solid #eee",
                  cursor: "pointer",
                  "&:hover": { bgcolor: "action.hover" },
                }}
                onClick={() => setSelectedThread(t)}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box minWidth={0} flex={1}>
                    <Typography fontWeight="bold" noWrap>
                      {t.title}
                    </Typography>
                    <Typography fontSize={12} color="text.secondary" noWrap>
                      {t.sender_name} → {t.receiver_name}
                      {t.customer && `　顧客：${t.customer.name}`}
                    </Typography>
                    {t.messages?.[0]?.content && (
                      <Typography fontSize={12} color="text.secondary" noWrap>
                        {t.messages[0].content}
                      </Typography>
                    )}
                  </Box>
                  <Chip size="small" label="未対応" color="warning" sx={{ ml: 1, flexShrink: 0 }} />
                </Stack>
              </Box>
            ))}
          </Paper>
        </Grid>

        {/* ========================= スケジュール ========================= */}
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
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6">
                本日の予定（{data.schedules.length}）
              </Typography>
              <Button
                size="small"
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setScheduleCreateOpen(true)}
              >
                追加
              </Button>
            </Stack>

            {data.schedules.length === 0 && (
              <Typography color="text.secondary" fontSize={13}>
                本日の予定はありません
              </Typography>
            )}

            {data.schedules.map((s: any) => (
              <Box
                key={s.id}
                sx={{ py: 1, borderBottom: "1px solid #eee" }}
              >
                <Stack direction="row" alignItems="flex-start">
                  <Box
                    flex={1}
                    minWidth={0}
                    sx={{ cursor: "pointer", "&:hover": { opacity: 0.75 } }}
                    onClick={() => setDetailScheduleId(s.id)}
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography fontWeight="bold" fontSize={13}>
                        {dayjs(s.start_at).format("HH:mm")}
                      </Typography>
                      {s.type === "delivery" && (
                        <Chip size="small" label="納車" color="primary" />
                      )}
                    </Stack>
                    <Typography noWrap>{s.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {s.customer || "社内予定"}
                      {s.staff && ` · ${s.staff}`}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => setEditingScheduleId(s.id)}
                    sx={{ flexShrink: 0, mt: 0.5 }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Box>
            ))}
          </Paper>
        </Grid>

        {/* ========================= 未受注見積 ========================= */}
        <Grid size={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" mb={2}>
              未受注見積（{data.estimates.length}）
            </Typography>

            <Box display="flex" gap={2} mb={2} alignItems="center">
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              />
              <Typography>〜</Typography>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              />
              <button onClick={() => { setStartDate(""); setEndDate(""); setPage(1); }}>
                リセット
              </button>
            </Box>

            {data.estimates.map((e: any) => (
              <Box
                key={e.id}
                sx={{ py: 1.5, borderBottom: "1px solid #eee", cursor: "pointer" }}
                onClick={() => router.push(`/dashboard/estimates/${e.id}`)}
              >
                <Box display="flex" justifyContent="space-between">
                  <Typography fontWeight="bold">{e.estimate_no}</Typography>
                  <Typography fontWeight="bold">
                    ¥{Number(e.total).toLocaleString()}
                  </Typography>
                </Box>
                <Typography variant="body2">{e.customer || "顧客なし"}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {e.staff} / {e.date}
                </Typography>
              </Box>
            ))}

            <Box display="flex" justifyContent="center" mt={2} gap={2}>
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                前へ
              </button>
              <Typography>{page}</Typography>
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

      {/* 新規作成ダイアログ */}
      <BusinessCommunicationCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          fetchThreads();
        }}
      />

      {/* スケジュール詳細ダイアログ */}
      {detailScheduleId !== null && (
        <ScheduleDetailDialog
          scheduleId={detailScheduleId}
          open={detailScheduleId !== null}
          onClose={() => setDetailScheduleId(null)}
          onEdit={() => setEditingScheduleId(detailScheduleId)}
          onDeleted={() => {
            setDetailScheduleId(null);
            fetchDashboard();
          }}
        />
      )}

      {/* スケジュール編集・削除ダイアログ */}
      {editingScheduleId !== null && (
        <ScheduleEditDialog
          scheduleId={editingScheduleId}
          open={editingScheduleId !== null}
          onClose={() => setEditingScheduleId(null)}
          onChanged={() => {
            setEditingScheduleId(null);
            fetchDashboard();
          }}
        />
      )}

      {/* スケジュール追加ダイアログ */}
      <ScheduleQuickCreateDialog
        open={scheduleCreateOpen}
        onClose={() => setScheduleCreateOpen(false)}
        onCreated={() => {
          setScheduleCreateOpen(false);
          fetchDashboard();
        }}
      />

      {/* スレッド詳細ダイアログ */}
      {selectedThread && (
        <BusinessCommunicationThreadDialog
          thread={selectedThread}
          open={!!selectedThread}
          onClose={() => setSelectedThread(null)}
          onChanged={() => {
            setSelectedThread(null);
            fetchThreads();
          }}
        />
      )}
    </Box>
  );
}
