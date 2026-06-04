"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box, Typography, TextField, IconButton, Stack,
  CircularProgress, Tooltip, Card, CardContent,
} from "@mui/material";
import SendIcon        from "@mui/icons-material/Send";
import EditIcon        from "@mui/icons-material/Edit";
import DeleteIcon      from "@mui/icons-material/Delete";
import CheckIcon       from "@mui/icons-material/Check";
import CloseIcon       from "@mui/icons-material/Close";
import StickyNote2Icon from "@mui/icons-material/StickyNote2";
import apiClient from "@/lib/apiClient";

type Memo = { id: number; body: string; created_at: string };
type Props = { vehicleId: number };

const fmtDate = (s: string) => {
  const d = new Date(s);
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" })
    + " " + d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
};

export default function VehicleMemos({ vehicleId }: Props) {
  const [memos,       setMemos]       = useState<Memo[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [body,        setBody]        = useState("");
  const [editingId,   setEditingId]   = useState<number | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [hoverId,     setHoverId]     = useState<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const fetchMemos = async () => {
    try {
      const res = await apiClient.get(`/vehicles/${vehicleId}/memos/`);
      setMemos(res.data.results || res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMemos(); }, [vehicleId]);

  const handleSubmit = async () => {
    if (!body.trim() || submitting) return;
    setSubmitting(true);
    try {
      await apiClient.post(`/vehicles/${vehicleId}/memos/`, { body: body.trim() });
      setBody("");
      await fetchMemos();
      inputRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const saveEdit = async () => {
    if (!editingId || !editingBody.trim()) return;
    await apiClient.patch(`/vehicles/${vehicleId}/memos/${editingId}/`, { body: editingBody.trim() });
    setEditingId(null);
    fetchMemos();
  };

  const deleteMemo = async (memoId: number) => {
    if (!confirm("このメモを削除しますか？")) return;
    await apiClient.delete(`/vehicles/${vehicleId}/memos/${memoId}/`);
    setMemos(prev => prev.filter(m => m.id !== memoId));
  };

  return (
    <Box>
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
          placeholder={"メモを入力… (Ctrl+Enter で追加)"}
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          variant="standard"
          InputProps={{ disableUnderline: true }}
          sx={{ fontSize: "0.9rem" }}
        />
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1 }}>
          <Typography variant="caption" color="text.disabled">
            Ctrl + Enter で追加
          </Typography>
          <Tooltip title="追加 (Ctrl+Enter)">
            <span>
              <IconButton
                size="small" color="primary"
                onClick={handleSubmit}
                disabled={!body.trim() || submitting}
                sx={{ bgcolor: "primary.main", color: "#fff",
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
        <Box
          sx={{
            display: "flex", flexDirection: "column", alignItems: "center",
            py: 6, color: "text.disabled", gap: 1,
          }}
        >
          <StickyNote2Icon sx={{ fontSize: 40, opacity: 0.4 }} />
          <Typography variant="body2">メモがありません</Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {memos.map(m => (
            <Card
              key={m.id}
              variant="outlined"
              onMouseEnter={() => setHoverId(m.id)}
              onMouseLeave={() => setHoverId(null)}
              sx={{
                borderColor: editingId === m.id ? "primary.main" : "divider",
                transition: "border-color 0.15s, box-shadow 0.15s",
                boxShadow: hoverId === m.id && editingId !== m.id ? "0 1px 6px rgba(0,0,0,0.08)" : "none",
              }}
            >
              <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
                {editingId === m.id ? (
                  /* 編集モード */
                  <>
                    <TextField
                      fullWidth multiline minRows={2}
                      size="small"
                      value={editingBody}
                      onChange={e => setEditingBody(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveEdit(); }
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                    />
                    <Stack direction="row" justifyContent="flex-end" spacing={1} mt={1}>
                      <Tooltip title="キャンセル (Esc)">
                        <IconButton size="small" onClick={() => setEditingId(null)}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="保存 (Ctrl+Enter)">
                        <IconButton size="small" color="primary" onClick={saveEdit}
                          disabled={!editingBody.trim()}>
                          <CheckIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </>
                ) : (
                  /* 表示モード */
                  <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        variant="body2"
                        sx={{ whiteSpace: "pre-wrap", lineHeight: 1.7, wordBreak: "break-all" }}
                      >
                        {m.body}
                      </Typography>
                      <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: "block" }}>
                        {fmtDate(m.created_at)}
                      </Typography>
                    </Box>

                    {/* アクションボタン（ホバー時に表示） */}
                    <Stack
                      direction="row"
                      spacing={0.5}
                      sx={{
                        opacity: hoverId === m.id ? 1 : 0,
                        transition: "opacity 0.15s",
                        flexShrink: 0,
                      }}
                    >
                      <Tooltip title="編集">
                        <IconButton size="small" onClick={() => { setEditingId(m.id); setEditingBody(m.body); }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="削除">
                        <IconButton size="small" color="error" onClick={() => deleteMemo(m.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}
