"use client";

import { useEffect, useState } from "react";
import {
  Paper, Typography, Box, TextField, Button, Stack, Divider,
  IconButton, Tooltip, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Alert,
} from "@mui/material";
import EditIcon        from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import NoteAddIcon     from "@mui/icons-material/NoteAdd";
import apiClient from "@/lib/apiClient";

type Memo = { id: number; body: string; created_at: string };

export default function CustomerMemos({ customerId }: { customerId: number }) {
  const [memos,       setMemos]       = useState<Memo[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [body,        setBody]        = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const [editingId,   setEditingId]   = useState<number | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [savingId,    setSavingId]    = useState<number | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Memo | null>(null);
  const [deleting,     setDeleting]     = useState(false);

  const fetchMemos = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/customers/${customerId}/memos/`);
      setMemos(res.data.results ?? res.data ?? []);
    } catch {
      setError("メモの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemos();
    setEditingId(null);
    setEditingBody("");
  }, [customerId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) { setError("メモ内容を入力してください"); return; }
    setError(null);
    setSubmitting(true);
    try {
      await apiClient.post(`/customers/${customerId}/memos/`, { body });
      setBody("");
      fetchMemos();
    } catch {
      setError("メモの登録に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const saveEdit = async () => {
    if (editingId == null || !editingBody.trim()) return;
    setSavingId(editingId);
    setError(null);
    try {
      await apiClient.patch(`/customers/${customerId}/memos/${editingId}/`, { body: editingBody });
      setEditingId(null);
      setEditingBody("");
      fetchMemos();
    } catch {
      setError("メモの更新に失敗しました");
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/customers/${customerId}/memos/${deleteTarget.id}/`);
      if (editingId === deleteTarget.id) { setEditingId(null); setEditingBody(""); }
      setDeleteTarget(null);
      fetchMemos();
    } catch {
      setError("メモの削除に失敗しました");
    } finally {
      setDeleting(false);
    }
  };

  const fmt = (s: string) =>
    new Date(s).toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
        <NoteAddIcon fontSize="small" color="action" />
        <Typography variant="subtitle1" fontWeight="bold">顧客メモ</Typography>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* 追加フォーム */}
      <Box component="form" onSubmit={handleAdd}>
        <TextField
          fullWidth multiline rows={2}
          size="small"
          placeholder="新しいメモを入力…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <Box mt={1} display="flex" justifyContent="flex-end">
          <Button
            type="submit"
            variant="contained"
            size="small"
            disabled={submitting || !body.trim()}
            startIcon={submitting ? <CircularProgress size={13} color="inherit" /> : undefined}
          >
            {submitting ? "追加中..." : "メモを追加"}
          </Button>
        </Box>
      </Box>

      {memos.length > 0 && <Divider sx={{ my: 2 }} />}

      {/* メモ一覧 */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={3}>
          <CircularProgress size={24} />
        </Box>
      ) : memos.length === 0 ? (
        <Typography variant="body2" color="text.disabled" sx={{ py: 1 }}>
          メモはありません
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {memos.map((m) => {
            const isEditing = editingId === m.id;
            const isSaving  = savingId  === m.id;

            return (
              <Box
                key={m.id}
                sx={{
                  p: 1.5, borderRadius: 1,
                  border: "1px solid",
                  borderColor: isEditing ? "primary.main" : "divider",
                  bgcolor: isEditing ? "primary.50" : "background.paper",
                  transition: "border-color 0.15s",
                }}
              >
                {isEditing ? (
                  <>
                    <TextField
                      fullWidth multiline rows={3} size="small"
                      value={editingBody}
                      onChange={(e) => setEditingBody(e.target.value)}
                      autoFocus
                    />
                    <Stack direction="row" justifyContent="flex-end" spacing={1} mt={1}>
                      <Button size="small" onClick={() => { setEditingId(null); setEditingBody(""); }} disabled={isSaving}>
                        キャンセル
                      </Button>
                      <Button
                        size="small" variant="contained"
                        onClick={saveEdit}
                        disabled={isSaving || !editingBody.trim()}
                        startIcon={isSaving ? <CircularProgress size={13} color="inherit" /> : undefined}
                      >
                        {isSaving ? "保存中..." : "保存"}
                      </Button>
                    </Stack>
                  </>
                ) : (
                  <Stack direction="row" alignItems="flex-start" spacing={1}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {m.body}
                      </Typography>
                      <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: "block" }}>
                        {fmt(m.created_at)}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.5} flexShrink={0}>
                      <Tooltip title="編集">
                        <IconButton size="small" onClick={() => { setEditingId(m.id); setEditingBody(m.body); }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="削除">
                        <IconButton size="small" color="error" onClick={() => setDeleteTarget(m)}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                )}
              </Box>
            );
          })}
        </Stack>
      )}

      {/* 削除確認ダイアログ */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>メモの削除</DialogTitle>
        <DialogContent>
          <DialogContentText>このメモを削除しますか？この操作は取り消せません。</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>キャンセル</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={deleting}>
            {deleting ? "削除中..." : "削除する"}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
