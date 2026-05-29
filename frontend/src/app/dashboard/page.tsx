"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Typography, Paper, Box, Grid, Chip, Button, Stack,
  IconButton, Tooltip, TextField, Divider, TableContainer,
  Table, TableHead, TableRow, TableCell, TableBody,
  CircularProgress, Pagination,
} from "@mui/material";
import AddIcon              from "@mui/icons-material/Add";
import EditIcon             from "@mui/icons-material/Edit";
import MailOutlineIcon      from "@mui/icons-material/MailOutline";
import CalendarTodayIcon    from "@mui/icons-material/CalendarToday";
import ReceiptLongIcon      from "@mui/icons-material/ReceiptLong";
import ClearIcon            from "@mui/icons-material/Clear";
import LocalShippingIcon    from "@mui/icons-material/LocalShipping";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/apiClient";

import BusinessCommunicationCreateDialog  from "@/components/business-communications/BusinessCommunicationCreateDialog";
import BusinessCommunicationThreadDialog  from "@/components/business-communications/BusinessCommunicationThreadDialog";
import ScheduleQuickCreateDialog          from "@/components/schedules/ScheduleQuickCreateDialog";
import ScheduleEditDialog                 from "@/components/schedules/ScheduleEditDialog";
import ScheduleDetailDialog               from "@/components/schedules/ScheduleDetailDialog";

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

const PAGE_SIZE = 10;

export default function DashboardPage() {
  const router = useRouter();

  const [threads,            setThreads]            = useState<Thread[]>([]);
  const [createOpen,         setCreateOpen]         = useState(false);
  const [selectedThread,     setSelectedThread]     = useState<Thread | null>(null);
  const [scheduleCreateOpen, setScheduleCreateOpen] = useState(false);
  const [detailScheduleId,   setDetailScheduleId]   = useState<number | null>(null);
  const [editingScheduleId,  setEditingScheduleId]  = useState<number | null>(null);

  const [data,      setData]      = useState<{ schedules: any[]; estimates: any[]; total: number }>({
    schedules: [], estimates: [], total: 0,
  });
  const [loading,   setLoading]   = useState(true);
  const [page,      setPage]      = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate,   setEndDate]   = useState("");

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

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
    setLoading(true);
    try {
      const res = await apiClient.get("/dashboard/", {
        params: { page, start: startDate || undefined, end: endDate || undefined },
      });
      setData({
        schedules: res.data.schedules ?? [],
        estimates: res.data.estimates ?? [],
        total:     res.data.total     ?? res.data.estimates?.length ?? 0,
      });
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, startDate, endDate]);

  useEffect(() => { fetchThreads(); },   [fetchThreads]);
  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const resetFilter = () => { setStartDate(""); setEndDate(""); setPage(1); };

  return (
    <Box>
      <Grid container spacing={2}>

        {/* ── 業務連絡 ── */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2.5, height: "100%", maxHeight: 420, display: "flex", flexDirection: "column" }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <MailOutlineIcon fontSize="small" color="error" />
                <Typography variant="subtitle1" fontWeight="bold">
                  業務連絡
                </Typography>
                {threads.length > 0 && (
                  <Chip size="small" label={`未対応 ${threads.length}`} color="error" />
                )}
              </Stack>
              <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
                新規
              </Button>
            </Stack>

            <Divider sx={{ mb: 1.5 }} />

            <Box sx={{ flex: 1, overflowY: "auto" }}>
              {threads.length === 0 ? (
                <Typography variant="body2" color="text.disabled" sx={{ py: 2, textAlign: "center" }}>
                  未対応の業務連絡はありません
                </Typography>
              ) : (
                <Stack divider={<Divider />}>
                  {threads.map((t) => (
                    <Box
                      key={t.id}
                      sx={{ py: 1.5, px: 0.5, cursor: "pointer", borderRadius: 1, "&:hover": { bgcolor: "action.hover" } }}
                      onClick={() => setSelectedThread(t)}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                        <Box minWidth={0} flex={1}>
                          <Typography variant="body2" fontWeight="bold" noWrap>{t.title}</Typography>
                          <Typography variant="caption" color="text.secondary" noWrap display="block">
                            {t.sender_name} → {t.receiver_name}
                            {t.customer && `　顧客：${t.customer.name}`}
                          </Typography>
                          {t.messages?.[0]?.content && (
                            <Typography variant="caption" color="text.disabled" noWrap display="block">
                              {t.messages[0].content}
                            </Typography>
                          )}
                        </Box>
                        <Chip size="small" label="未対応" color="warning" sx={{ flexShrink: 0 }} />
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* ── 本日の予定 ── */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2.5, height: "100%", maxHeight: 420, display: "flex", flexDirection: "column" }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <CalendarTodayIcon fontSize="small" color="primary" />
                <Typography variant="subtitle1" fontWeight="bold">
                  本日の予定
                </Typography>
                {data.schedules.length > 0 && (
                  <Chip size="small" label={`${data.schedules.length} 件`} color="primary" variant="outlined" />
                )}
              </Stack>
              <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setScheduleCreateOpen(true)}>
                追加
              </Button>
            </Stack>

            <Divider sx={{ mb: 1.5 }} />

            <Box sx={{ flex: 1, overflowY: "auto" }}>
              {data.schedules.length === 0 ? (
                <Typography variant="body2" color="text.disabled" sx={{ py: 2, textAlign: "center" }}>
                  本日の予定はありません
                </Typography>
              ) : (
                <Stack divider={<Divider />}>
                  {data.schedules.map((s: any) => (
                    <Stack
                      key={s.id}
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      sx={{ py: 1.5, px: 0.5 }}
                    >
                      <Box
                        flex={1}
                        minWidth={0}
                        sx={{ cursor: "pointer", "&:hover": { opacity: 0.75 } }}
                        onClick={() => setDetailScheduleId(s.id)}
                      >
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="body2" fontWeight="bold" sx={{ minWidth: 36 }}>
                            {dayjs(s.start_at).format("HH:mm")}
                          </Typography>
                          {s.type === "delivery" && (
                            <Chip size="small" icon={<LocalShippingIcon />} label="納車" color="primary" />
                          )}
                          <Typography variant="body2" noWrap>{s.title}</Typography>
                        </Stack>
                        <Typography variant="caption" color="text.secondary" sx={{ pl: "44px" }}>
                          {s.customer ?? "社内予定"}
                          {s.staff && ` · ${s.staff}`}
                        </Typography>
                      </Box>
                      <Tooltip title="編集">
                        <IconButton size="small" onClick={() => setEditingScheduleId(s.id)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* ── 未受注見積 ── */}
        <Grid size={12}>
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5} flexWrap="wrap" gap={1}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <ReceiptLongIcon fontSize="small" color="action" />
                <Typography variant="subtitle1" fontWeight="bold">未受注見積</Typography>
                {data.total > 0 && (
                  <Chip size="small" label={`${data.total} 件`} variant="outlined" />
                )}
              </Stack>

              {/* 日付フィルター */}
              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                <TextField
                  type="date"
                  size="small"
                  label="開始日"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                  InputLabelProps={{ shrink: true }}
                  sx={{ width: 160 }}
                />
                <Typography variant="body2" color="text.secondary">〜</Typography>
                <TextField
                  type="date"
                  size="small"
                  label="終了日"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                  InputLabelProps={{ shrink: true }}
                  sx={{ width: 160 }}
                />
                {(startDate || endDate) && (
                  <Tooltip title="フィルターをリセット">
                    <IconButton size="small" onClick={resetFilter}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            </Stack>

            <Divider sx={{ mb: 0 }} />

            {loading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress size={28} />
              </Box>
            ) : data.estimates.length === 0 ? (
              <Typography variant="body2" color="text.disabled" sx={{ py: 3, textAlign: "center" }}>
                未受注の見積はありません
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>見積番号</TableCell>
                      <TableCell>顧客名</TableCell>
                      <TableCell>見積日</TableCell>
                      <TableCell>担当</TableCell>
                      <TableCell align="right">金額</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.estimates.map((e: any) => (
                      <TableRow
                        key={e.id}
                        hover
                        sx={{ cursor: "pointer" }}
                        onClick={() => router.push(`/dashboard/estimates/${e.id}`)}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold" color="primary">
                            {e.estimate_no}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{e.customer ?? "顧客なし"}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {e.date ? new Date(e.date).toLocaleDateString("ja-JP") : "-"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{e.staff ?? "-"}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="bold">
                            ¥{Number(e.total).toLocaleString()}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {totalPages > 1 && (
              <Box display="flex" justifyContent="center" mt={2}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(_, v) => setPage(v)}
                  size="small"
                  showFirstButton
                  showLastButton
                />
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* ダイアログ類 */}
      <BusinessCommunicationCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { setCreateOpen(false); fetchThreads(); }}
      />

      {detailScheduleId !== null && (
        <ScheduleDetailDialog
          scheduleId={detailScheduleId}
          open={detailScheduleId !== null}
          onClose={() => setDetailScheduleId(null)}
          onEdit={() => setEditingScheduleId(detailScheduleId)}
          onDeleted={() => { setDetailScheduleId(null); fetchDashboard(); }}
        />
      )}

      {editingScheduleId !== null && (
        <ScheduleEditDialog
          scheduleId={editingScheduleId}
          open={editingScheduleId !== null}
          onClose={() => setEditingScheduleId(null)}
          onChanged={() => { setEditingScheduleId(null); fetchDashboard(); }}
        />
      )}

      <ScheduleQuickCreateDialog
        open={scheduleCreateOpen}
        onClose={() => setScheduleCreateOpen(false)}
        onCreated={() => { setScheduleCreateOpen(false); fetchDashboard(); }}
      />

      {selectedThread && (
        <BusinessCommunicationThreadDialog
          thread={selectedThread}
          open={!!selectedThread}
          onClose={() => setSelectedThread(null)}
          onChanged={() => { setSelectedThread(null); fetchThreads(); }}
        />
      )}
    </Box>
  );
}
