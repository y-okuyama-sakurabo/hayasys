"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Box,
  Typography,
  CircularProgress,
  Chip,
  Link,
  Divider,
} from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useEffect, useState } from "react";
import apiClient from "@/lib/apiClient";

type ScheduleDetail = {
  id: number;
  title: string;
  description?: string;
  start_at: string;
  end_at?: string | null;
  customer?: number | null;
  customer_id?: number | null;
  customer_name?: string;
  staff_name?: string;
  shop_name?: string;
  schedule_type?: string;
  estimate?: number | null;
  order?: number | null;
};

type Props = {
  scheduleId: number;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDeleted: () => void;
};

export default function ScheduleDetailDialog({
  scheduleId,
  open,
  onClose,
  onEdit,
  onDeleted,
}: Props) {
  const [schedule, setSchedule] = useState<ScheduleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSchedule(null);
    apiClient
      .get(`/schedules/${scheduleId}/`)
      .then((res) => setSchedule(res.data))
      .finally(() => setLoading(false));
  }, [open, scheduleId]);

  const handleDelete = async () => {
    if (!confirm("このスケジュールを削除しますか？")) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/schedules/${scheduleId}/`);
      onDeleted();
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  const typeLabel = (t?: string) => {
    if (t === "delivery") return <Chip size="small" label="納車" color="primary" />;
    return null;
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>スケジュール詳細</DialogTitle>

      <DialogContent>
        {loading || !schedule ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={2} mt={0.5}>
            {/* タイトル */}
            <Box>
              <Typography fontSize={12} color="text.secondary">タイトル</Typography>
              <Stack direction="row" alignItems="center" spacing={1} mt={0.3}>
                <Typography fontWeight="bold" fontSize={16}>
                  {schedule.title}
                </Typography>
                {typeLabel(schedule.schedule_type)}
              </Stack>
            </Box>

            <Divider />

            {/* 日時 */}
            <Stack direction="row" spacing={4}>
              <Box>
                <Typography fontSize={12} color="text.secondary">開始</Typography>
                <Typography>
                  {new Date(schedule.start_at).toLocaleString("ja-JP")}
                </Typography>
              </Box>
              {schedule.end_at && (
                <Box>
                  <Typography fontSize={12} color="text.secondary">終了</Typography>
                  <Typography>
                    {new Date(schedule.end_at).toLocaleString("ja-JP")}
                  </Typography>
                </Box>
              )}
            </Stack>

            <Divider />

            {/* 顧客・担当・店舗 */}
            <Stack direction="row" spacing={4} flexWrap="wrap">
              {schedule.customer_name && (
                <Box>
                  <Typography fontSize={12} color="text.secondary">顧客</Typography>
                  {schedule.customer_id ? (
                    <Link
                      href={`/dashboard/customers/${schedule.customer_id}`}
                      underline="hover"
                      sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}
                    >
                      {schedule.customer_name}
                      <OpenInNewIcon fontSize="inherit" />
                    </Link>
                  ) : (
                    <Typography>{schedule.customer_name}</Typography>
                  )}
                </Box>
              )}
              {schedule.staff_name && (
                <Box>
                  <Typography fontSize={12} color="text.secondary">担当者</Typography>
                  <Typography>{schedule.staff_name}</Typography>
                </Box>
              )}
              {schedule.shop_name && (
                <Box>
                  <Typography fontSize={12} color="text.secondary">店舗</Typography>
                  <Typography>{schedule.shop_name}</Typography>
                </Box>
              )}
            </Stack>

            {/* 見積・受注リンク */}
            {(schedule.estimate || schedule.order) && (
              <>
                <Divider />
                <Box>
                  <Typography fontSize={12} color="text.secondary" mb={0.5}>関連</Typography>
                  <Stack direction="row" spacing={2}>
                    {schedule.estimate && (
                      <Link
                        href={`/dashboard/estimates/${schedule.estimate}`}
                        target="_blank"
                        underline="hover"
                        fontSize={14}
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                      >
                        見積 #{schedule.estimate}
                        <OpenInNewIcon fontSize="inherit" />
                      </Link>
                    )}
                    {schedule.order && (
                      <Link
                        href={`/dashboard/orders/${schedule.order}`}
                        target="_blank"
                        underline="hover"
                        fontSize={14}
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                      >
                        受注 #{schedule.order}
                        <OpenInNewIcon fontSize="inherit" />
                      </Link>
                    )}
                  </Stack>
                </Box>
              </>
            )}

            {/* 備考 */}
            {schedule.description && (
              <>
                <Divider />
                <Box>
                  <Typography fontSize={12} color="text.secondary">備考</Typography>
                  <Typography
                    sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                  >
                    {schedule.description}
                  </Typography>
                </Box>
              </>
            )}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ justifyContent: "space-between", px: 2 }}>
        <Button
          color="error"
          onClick={handleDelete}
          disabled={deleting || loading}
        >
          {deleting ? <CircularProgress size={18} /> : "削除"}
        </Button>
        <Stack direction="row" spacing={1}>
          <Button onClick={onClose} disabled={deleting}>
            閉じる
          </Button>
          <Button
            variant="contained"
            onClick={() => { onClose(); onEdit(); }}
            disabled={deleting || loading}
          >
            編集
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
