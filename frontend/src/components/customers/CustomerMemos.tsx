"use client";

import { useEffect, useRef, useState } from "react";
import {
  Paper, Typography, Box, TextField, IconButton, Tooltip,
  CircularProgress, Stack, Alert, Card, CardContent,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button,
} from "@mui/material";
import SendIcon        from "@mui/icons-material/Send";
import EditIcon        from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CheckIcon       from "@mui/icons-material/Check";
import CloseIcon       from "@mui/icons-material/Close";
import NoteAddIcon     from "@mui/icons-material/NoteAdd";
import StickyNote2Icon from "@mui/icons-material/StickyNote2";
import apiClient from "@/lib/apiClient";

type Memo = { id: number; body: string; created_at: string };

const fmtDate = (s: string) => {
  const d = new Date(s);
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" })
    + " " + d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
};

export default function CustomerMemos({ customerId }: { customerId: number }) {
  const [memos,       setMemos]       = useState<Memo[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [body,        setBody]        = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const [editingId,   setEditingId]   = useState<number | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [savingId,    setSavingId]    = useState<number | null>(null);
  const [hoverId,     setHoverId]     = useState<number | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Memo | null>(null);
  const [deleting,     setDeleting]     = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  const handleAdd = async () => {
    if (!body.trim() || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await apiClient.post(`/customers/${customerId}/memos/`, { body: body.trim() });
      setBody("");
      await fetchMemos();
      inputRef.current?.focus();
    } catch {
      setError("メモの登録に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleAdd();
    }
  };

  const saveEdit = async () => {
    if (editingId == null || !editingBody.trim()) return;
    setSavingId(editingId);
    setError(null);
    try {
      await apiClient.patch(`/customers/${customerId}/memos/${editingId}/`, { body: editingBody.trim() });
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

  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
      {/* タイトル */}
      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
        <NoteAddIcon fontSize="small" color="action" />
        <Typography variant="subtitle1" fontWeight="bold">顧客メモ</Typography>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* ── 入力エリア ── */}
      <Box
        sx={{
          border: "1px solid", borderColor: "divider", borderRadius: 2,
          p: 1.5, mb: 3, bgcolor: "grey.50",
          "&:focus-within": { borderColor: "primary.main", bgcolor: "#fff" },
          transition: "all 0.15s",
        }}
      >
        <TextField
          inputRef={inputRef}
          fullWidth multiline minRows={2} maxRows={6}
          placeholder="メモを入力… (Ctrl+Enter で追加)"
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          variant="standard"
          InputProps={{ disableUnderline: true }}
        />
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1 }}>
          <Typography variant="caption" color="text.disabled">Ctrl + Enter で追加</Typography>
          <Tooltip title="追加 (Ctrl+Enter)">
            <span>
              <IconButton
                size="small" color="primary"
                onClick={handleAdd}
                disabled={!body.trim() || submitting}
                sx={{
                  bgcolor: "primary.main", color: "#fff",
                  "&:hover": { bgcolor: "primary.dark" },
                  "&.Mui-disabled": { bgcolor: "grey.300", color: "grey.500" },
                  width: 32, height: 32,
                }}
              >
                {submitting ? <CircularProgress size={16} color="inherit" /> : <SendIcon fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* ── 一覧 ── */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress size={28} />
        </Box>
      ) : memos.length === 0 ? (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 6, color: "text.disabled", gap: 1 }}>
          <StickyNote2Icon sx={{ fontSize: 40, opacity: 0.4 }} />
          <Typography variant="body2">メモがありません</Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {memos.map(m => {
            const isEditing = editingId === m.id;
            const isSaving  = savingId  === m.id;

            return (
              <Card
                key={m.id}
                variant="outlined"
                onMouseEnter={() => setHoverId(m.id)}
                onMouseLeave={() => setHoverId(null)}
                sx={{
                  borderColor: isEditing ? "primary.main" : "divider",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                  boxShadow: hoverId === m.id && !isEditing ? "0 1px 6px rgba(0,0,0,0.08)" : "none",
                }}
              >
                <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
                  {isEditing ? (
                    <>
                      <TextField
                        fullWidth multiline minRows={2} size="small"
                        value={editingBody}
                        onChange={e => setEditingBody(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveEdit(); }
                          if (e.key === "Escape") { setEditingId(null); setEditingBody(""); }
                        }}
                        autoFocus
                      />
                      <Stack direction="row" justifyContent="flex-end" spacing={1} mt={1}>
                        <Tooltip title="キャンセル (Esc)">
                          <IconButton size="small" onClick={() => { setEditingId(null); setEditingBody(""); }} disabled={isSaving}>
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="保存 (Ctrl+Enter)">
                          <IconButton size="small" color="primary" onClick={saveEdit} disabled={isSaving || !editingBody.trim()}>
                            {isSaving ? <CircularProgress size={16} /> : <CheckIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </>
                  ) : (
                    <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.7, wordBreak: "break-all" }}>
                          {m.body}
                        </Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: "block" }}>
                          {fmtDate(m.created_at)}
                        </Typography>
                      </Box>
                      <Stack
                        direction="row" spacing={0.5}
                        sx={{ opacity: hoverId === m.id ? 1 : 0, transition: "opacity 0.15s", flexShrink: 0 }}
                      >
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
                    </Box>
                  )}
                </CardContent>
              </Card>
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
