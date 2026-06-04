"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, TextField, Button, Stack, Divider,
  Chip, CircularProgress, IconButton, Tooltip,
} from "@mui/material";
import CloseIcon              from "@mui/icons-material/Close";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ReplayIcon             from "@mui/icons-material/Replay";
import EditIcon               from "@mui/icons-material/Edit";
import DeleteIcon             from "@mui/icons-material/Delete";
import SendIcon               from "@mui/icons-material/Send";
import CheckIcon              from "@mui/icons-material/Check";
import apiClient from "@/lib/apiClient";

type Message = {
  id: number;
  content: string;
  created_at: string;
  sender_staff?: { id: number; full_name?: string; login_id?: string };
  sender_shop?: { id: number; name: string };
  receiver_staff?: { id: number; full_name?: string };
  receiver_shop?: { id: number; name: string };
  attachments?: { id: number; file: string }[];
};

type Thread = {
  id: number;
  title: string;
  status: "pending" | "done";
  customer?: { id: number; name: string } | null;
  sender_name?: string;
  receiver_name?: string;
  messages?: Message[];
};

type Props = {
  thread: Thread;
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
};

const fmtTime = (s: string) =>
  new Date(s).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });

const fmtDate = (s: string) => {
  const d = new Date(s);
  const today = new Date();
  const isToday =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth()    === today.getMonth()    &&
    d.getDate()     === today.getDate();
  if (isToday) return fmtTime(s);
  return d.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" }) + " " + fmtTime(s);
};

export default function BusinessCommunicationThreadDialog({ thread, open, onClose, onChanged }: Props) {
  const [messages,      setMessages]      = useState<Message[]>(thread.messages ?? []);
  const [content,       setContent]       = useState("");
  const [sending,       setSending]       = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [deleting,      setDeleting]      = useState(false);

  // タイトル編集
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue,   setTitleValue]   = useState(thread.title);
  const [titleSaving,  setTitleSaving]  = useState(false);

  // ログインユーザーのスタッフID（チャットの左右判定）
  const [meStaffId, setMeStaffId] = useState<number | null>(null);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);

  // 現在ユーザー取得
  useEffect(() => {
    apiClient.get("/auth/user/").then(r => {
      const d = r.data;
      const id = d?.staff_id ?? d?.staff?.id ?? d?.id ?? null;
      setMeStaffId(id);
    }).catch(() => {});
  }, []);

  const fetchMessages = async () => {
    try {
      const res = await apiClient.get(`/communication-threads/${thread.id}/messages/`);
      const data = Array.isArray(res.data) ? res.data : res.data.results ?? [];
      setMessages(data);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (open) {
      setMessages(thread.messages ?? []);
      setTitleValue(thread.title);
      setEditingTitle(false);
      fetchMessages();
    }
  }, [open, thread.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isMe = (m: Message) =>
    meStaffId !== null && m.sender_staff?.id === meStaffId;

  const senderName = (m: Message) =>
    m.sender_staff?.full_name || m.sender_shop?.name || "不明";

  const firstMessage = messages[0];

  // ── 返信送信 ──────────────────────────────
  const sendReply = async () => {
    if (!content.trim() || sending) return;
    setSending(true);
    try {
      const form = new FormData();
      form.append("content", content);
      form.append("sender_type", "staff");
      if (firstMessage?.receiver_shop?.id)
        form.append("receiver_shop",  String(firstMessage.receiver_shop.id));
      else if (firstMessage?.sender_shop?.id)
        form.append("receiver_shop",  String(firstMessage.sender_shop.id));
      if (firstMessage?.receiver_staff?.id)
        form.append("receiver_staff", String(firstMessage.receiver_staff.id));
      else if (firstMessage?.sender_staff?.id)
        form.append("receiver_staff", String(firstMessage.sender_staff.id));

      await apiClient.post(`/communication-threads/${thread.id}/messages/`, form);
      setContent("");
      await fetchMessages();
      inputRef.current?.focus();
    } finally {
      setSending(false);
    }
  };

  // ── ステータス切替 ────────────────────────
  const toggleStatus = async () => {
    setStatusLoading(true);
    try {
      const next = thread.status === "pending" ? "done" : "pending";
      await apiClient.patch(`/communication-threads/${thread.id}/status/`, { status: next });
      onChanged();
      onClose();
    } finally {
      setStatusLoading(false);
    }
  };

  // ── タイトル保存 ──────────────────────────
  const saveTitle = async () => {
    if (!titleValue.trim() || titleValue === thread.title) {
      setEditingTitle(false);
      setTitleValue(thread.title);
      return;
    }
    setTitleSaving(true);
    try {
      await apiClient.patch(`/communication-threads/${thread.id}/`, { title: titleValue.trim() });
      onChanged();
      setEditingTitle(false);
    } catch {
      setTitleValue(thread.title);
      setEditingTitle(false);
    } finally {
      setTitleSaving(false);
    }
  };

  // ── 削除 ──────────────────────────────────
  const handleDelete = async () => {
    if (!confirm("このスレッドを削除しますか？\nメッセージもすべて削除されます。")) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/communication-threads/${thread.id}/`);
      onChanged();
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      {/* ── タイトルバー ── */}
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="flex-start" spacing={1}>
          <Box flex={1} minWidth={0}>
            {editingTitle ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  size="small" fullWidth autoFocus
                  value={titleValue}
                  onChange={e => setTitleValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter")  saveTitle();
                    if (e.key === "Escape") { setEditingTitle(false); setTitleValue(thread.title); }
                  }}
                />
                <Tooltip title="保存">
                  <IconButton size="small" color="primary" onClick={saveTitle} disabled={titleSaving}>
                    {titleSaving ? <CircularProgress size={16} /> : <CheckIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="キャンセル">
                  <IconButton size="small" onClick={() => { setEditingTitle(false); setTitleValue(thread.title); }}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            ) : (
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography fontWeight="bold" noWrap>{titleValue}</Typography>
                <Tooltip title="タイトルを編集">
                  <IconButton size="small" onClick={() => setEditingTitle(true)} sx={{ flexShrink: 0 }}>
                    <EditIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              </Stack>
            )}
            <Typography fontSize={12} color="text.secondary">
              {thread.sender_name} → {thread.receiver_name}
              {thread.customer && (
                <Box component="span" sx={{ ml: 1, color: "primary.main" }}>
                  顧客：{thread.customer.name}
                </Box>
              )}
            </Typography>
          </Box>

          <Chip
            size="small"
            label={thread.status === "pending" ? "未対応" : "対応済み"}
            color={thread.status === "pending" ? "warning" : "success"}
            sx={{ flexShrink: 0 }}
          />
          <IconButton size="small" onClick={onClose} sx={{ flexShrink: 0 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <Divider />

      {/* ── メッセージエリア ── */}
      <DialogContent sx={{ p: 0 }}>
        <Box
          sx={{
            height: 420,
            overflowY: "auto",
            p: 2,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            bgcolor: "grey.50",
          }}
        >
          {messages.length === 0 && (
            <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Typography color="text.disabled" fontSize={13}>メッセージがありません</Typography>
            </Box>
          )}

          {messages.map(m => {
            const mine = isMe(m);
            return (
              <Box
                key={m.id}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: mine ? "flex-end" : "flex-start",
                }}
              >
                {/* 送信者名 */}
                <Typography fontSize={11} color="text.secondary" sx={{ mb: 0.5, px: 0.5 }}>
                  {senderName(m)}
                </Typography>

                {/* バブル */}
                <Box
                  sx={{
                    maxWidth: "80%",
                    bgcolor: mine ? "primary.main" : "#fff",
                    color: mine ? "#fff" : "text.primary",
                    borderRadius: mine
                      ? "16px 16px 4px 16px"
                      : "16px 16px 16px 4px",
                    px: 2, py: 1,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    border: mine ? "none" : "1px solid",
                    borderColor: "divider",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  <Typography fontSize={14} lineHeight={1.6}>{m.content}</Typography>
                </Box>

                {/* 添付画像 */}
                {m.attachments && m.attachments.length > 0 && (
                  <Stack direction="row" spacing={0.5} mt={0.5} flexWrap="wrap"
                    sx={{ justifyContent: mine ? "flex-end" : "flex-start" }}>
                    {m.attachments.map(a => (
                      <Box
                        key={a.id}
                        component="img"
                        src={a.file}
                        sx={{
                          width: 80, height: 80, objectFit: "cover",
                          borderRadius: 1, cursor: "pointer",
                          border: "1px solid", borderColor: "divider",
                        }}
                        onClick={() => window.open(a.file, "_blank")}
                      />
                    ))}
                  </Stack>
                )}

                {/* タイムスタンプ */}
                <Typography fontSize={10} color="text.disabled" sx={{ mt: 0.5, px: 0.5 }}>
                  {fmtDate(m.created_at)}
                </Typography>
              </Box>
            );
          })}
          <div ref={bottomRef} />
        </Box>

        <Divider />

        {/* ── 返信入力欄（チャット風） ── */}
        <Box
          sx={{
            m: 2,
            border: "1px solid", borderColor: "divider", borderRadius: 2,
            bgcolor: "grey.50",
            "&:focus-within": { borderColor: "primary.main", bgcolor: "#fff" },
            transition: "all 0.15s",
          }}
        >
          <TextField
            inputRef={inputRef}
            fullWidth multiline minRows={1} maxRows={4}
            placeholder="返信を入力… (Ctrl+Enter で送信)"
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                sendReply();
              }
            }}
            variant="standard"
            InputProps={{ disableUnderline: true, sx: { px: 1.5, pt: 1.5 } }}
          />
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 1.5, pb: 1 }}>
            <Typography variant="caption" color="text.disabled">
              Ctrl + Enter で送信
            </Typography>
            <Tooltip title="送信 (Ctrl+Enter)">
              <span>
                <IconButton
                  size="small"
                  onClick={sendReply}
                  disabled={!content.trim() || sending}
                  sx={{
                    bgcolor: "primary.main", color: "#fff",
                    "&:hover": { bgcolor: "primary.dark" },
                    "&.Mui-disabled": { bgcolor: "grey.300", color: "grey.500" },
                    width: 32, height: 32,
                  }}
                >
                  {sending ? <CircularProgress size={16} color="inherit" /> : <SendIcon fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>
      </DialogContent>

      <Divider />

      {/* ── フッターアクション ── */}
      <DialogActions sx={{ px: 2, py: 1, justifyContent: "space-between" }}>
        <Button
          color="error" size="small"
          startIcon={<DeleteIcon />}
          onClick={handleDelete}
          disabled={deleting || statusLoading}
        >
          {deleting ? <CircularProgress size={16} /> : "削除"}
        </Button>

        <Button
          size="small"
          variant={thread.status === "pending" ? "contained" : "outlined"}
          color={thread.status === "pending" ? "success" : "inherit"}
          startIcon={thread.status === "pending" ? <CheckCircleOutlineIcon /> : <ReplayIcon />}
          onClick={toggleStatus}
          disabled={statusLoading || deleting}
        >
          {statusLoading ? (
            <CircularProgress size={16} />
          ) : thread.status === "pending" ? "対応済みにする" : "未対応に戻す"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
