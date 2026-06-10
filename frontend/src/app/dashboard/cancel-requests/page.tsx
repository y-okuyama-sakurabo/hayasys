"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Chip, Button, Stack, Dialog, DialogTitle,
  DialogContent, DialogContentText, DialogActions,
  CircularProgress, Alert, Snackbar,
} from "@mui/material";
import CheckIcon  from "@mui/icons-material/Check";
import CloseIcon  from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import UndoIcon   from "@mui/icons-material/Undo";
import apiClient  from "@/lib/apiClient";
import { useUserRole, isPrivileged } from "@/hooks/useUserRole";

type CancelRequest = {
  id: number;
  order: number;
  order_no: string;
  customer_name: string;
  reason: string;
  status: string;
  status_display: string;
  requested_by_name: string | null;
  reviewed_by_name: string | null;
  created_at: string;
};

type ActionType = "approve" | "reject" | "uncancel" | "delete";

const STATUS_COLOR: Record<string, "warning" | "success" | "error" | "default"> = {
  pending:  "warning",
  approved: "success",
  rejected: "error",
};

function fmtDate(s: string | null) {
  if (!s) return "-";
  return new Date(s).toLocaleString("ja-JP", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function CancelRequestsPage() {
  const router   = useRouter();
  const userRole = useUserRole();

  const [requests,     setRequests]     = useState<CancelRequest[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [actionTarget, setActionTarget] = useState<{ req: CancelRequest; type: ActionType } | null>(null);
  const [submitting,   setSubmitting]   = useState(false);
  const [snack,        setSnack]        = useState<{ msg: string; severity: "success" | "error" } | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // 申請中（pending）と承認済み（approved＝キャンセル済み受注）を取得
      const [pendingRes, approvedRes] = await Promise.all([
        apiClient.get("/cancel-requests/?status=pending"),
        apiClient.get("/cancel-requests/?status=approved"),
      ]);
      const pending  = Array.isArray(pendingRes.data)  ? pendingRes.data  : (pendingRes.data?.results  ?? []);
      const approved = Array.isArray(approvedRes.data) ? approvedRes.data : (approvedRes.data?.results ?? []);
      setRequests([...pending, ...approved]);
    } catch {
      setSnack({ msg: "データの取得に失敗しました", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userRole.role === null && !userRole.isSuperuser) return;
    if (!isPrivileged(userRole)) { router.replace("/dashboard"); return; }
    fetchRequests();
  }, [userRole.role, userRole.isSuperuser]);

  const handleAction = async () => {
    if (!actionTarget) return;
    const { req, type } = actionTarget;
    setSubmitting(true);
    try {
      if (type === "approve") {
        await apiClient.post(`/cancel-requests/${req.id}/approve/`);
        setSnack({ msg: "キャンセル申請を承認しました", severity: "success" });
      } else if (type === "reject") {
        await apiClient.post(`/cancel-requests/${req.id}/reject/`);
        setSnack({ msg: "キャンセル申請を却下しました", severity: "success" });
      } else if (type === "uncancel") {
        await apiClient.post(`/orders/${req.order}/uncancel/`);
        setSnack({ msg: "キャンセルを取消しました（受注確定に戻しました）", severity: "success" });
      } else if (type === "delete") {
        await apiClient.delete(`/orders/${req.order}/force-delete/`);
        setSnack({ msg: "受注を削除しました", severity: "success" });
      }
      setActionTarget(null);
      fetchRequests();
    } catch (e: any) {
      setSnack({ msg: e?.response?.data?.detail || "操作に失敗しました", severity: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  if ((userRole.role === null && !userRole.isSuperuser) || loading) {
    return <Box display="flex" justifyContent="center" mt={10}><CircularProgress /></Box>;
  }

  if (!isPrivileged(userRole)) return null;

  const dialogMeta: Record<ActionType, { title: string; body: string; btnLabel: string; btnColor: "success" | "error" | "warning" }> = {
    approve:  { title: "キャンセル申請を承認", body: "承認すると受注ステータスが「キャンセル」に変更され、所有車両の登録も解除されます。", btnLabel: "承認する", btnColor: "success" },
    reject:   { title: "キャンセル申請を却下", body: "この申請を却下します。",                                                              btnLabel: "却下する", btnColor: "error" },
    uncancel: { title: "キャンセルを取消す",   body: "受注ステータスを「受注確定」に戻します。",                                             btnLabel: "取消す",   btnColor: "warning" },
    delete:   { title: "受注を削除",           body: "この受注を完全に削除します。この操作は取り消せません。",                               btnLabel: "削除する", btnColor: "error" },
  };
  const meta = actionTarget ? dialogMeta[actionTarget.type] : null;

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
        キャンセル申請管理
      </Typography>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead sx={{ bgcolor: "grey.100" }}>
            <TableRow>
              <TableCell>申請日時</TableCell>
              <TableCell>受注番号</TableCell>
              <TableCell>顧客名</TableCell>
              <TableCell>申請者</TableCell>
              <TableCell>キャンセル理由</TableCell>
              <TableCell>状態</TableCell>
              <TableCell align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6, color: "text.secondary" }}>
                  処理待ちのキャンセル申請はありません
                </TableCell>
              </TableRow>
            )}
            {requests.map((req) => (
              <TableRow key={req.id} hover>
                <TableCell sx={{ whiteSpace: "nowrap" }}>{fmtDate(req.created_at)}</TableCell>
                <TableCell>
                  <Button size="small" variant="text"
                    onClick={() => router.push(`/dashboard/management/${req.order}`)}>
                    {req.order_no || `#${req.order}`}
                  </Button>
                </TableCell>
                <TableCell>{req.customer_name || "-"}</TableCell>
                <TableCell>{req.requested_by_name || "-"}</TableCell>
                <TableCell sx={{ maxWidth: 220, wordBreak: "break-word" }}>{req.reason}</TableCell>
                <TableCell>
                  <Chip
                    label={req.status_display}
                    color={STATUS_COLOR[req.status] ?? "default"}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={0.5} justifyContent="center" flexWrap="wrap">
                    {req.status === "pending" && (
                      <>
                        <Button size="small" variant="contained" color="success" startIcon={<CheckIcon />}
                          onClick={() => setActionTarget({ req, type: "approve" })}>
                          承認
                        </Button>
                        <Button size="small" variant="outlined" color="error" startIcon={<CloseIcon />}
                          onClick={() => setActionTarget({ req, type: "reject" })}>
                          却下
                        </Button>
                      </>
                    )}
                    {req.status === "approved" && (
                      <Button size="small" variant="outlined" color="warning" startIcon={<UndoIcon />}
                        onClick={() => setActionTarget({ req, type: "uncancel" })}>
                        キャンセル取消
                      </Button>
                    )}
                    {req.status === "approved" && (
                      <Button size="small" variant="outlined" color="error" startIcon={<DeleteIcon />}
                        onClick={() => setActionTarget({ req, type: "delete" })}>
                        削除
                      </Button>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 確認ダイアログ */}
      <Dialog open={Boolean(actionTarget)} onClose={() => !submitting && setActionTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{meta?.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {actionTarget?.req.customer_name}（{actionTarget?.req.order_no}）
          </DialogContentText>
          <Box sx={{ mt: 1.5, p: 1.5, bgcolor: "grey.50", borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">キャンセル理由</Typography>
            <Typography variant="body2">{actionTarget?.req.reason}</Typography>
          </Box>
          <Alert severity="warning" sx={{ mt: 1.5 }}>{meta?.body}</Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionTarget(null)} disabled={submitting}>閉じる</Button>
          <Button color={meta?.btnColor} variant="contained" onClick={handleAction} disabled={submitting}>
            {submitting ? "処理中..." : meta?.btnLabel}
          </Button>
        </DialogActions>
      </Dialog>

      {/* スナックバー */}
      <Snackbar open={Boolean(snack)} autoHideDuration={4000} onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={snack?.severity} onClose={() => setSnack(null)}>{snack?.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
