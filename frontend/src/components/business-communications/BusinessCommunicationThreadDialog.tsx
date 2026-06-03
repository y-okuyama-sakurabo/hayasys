"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  Divider,
  Chip,
  CircularProgress,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ReplayIcon from "@mui/icons-material/Replay";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
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

export default function BusinessCommunicationThreadDialog({
  thread,
  open,
  onClose,
  onChanged,
}: Props) {
  const [messages, setMessages] = useState<Message[]>(thread.messages ?? []);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // タイトル編集
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(thread.title);
  const [titleSaving, setTitleSaving] = useState(false);

  const fetchMessages = async () => {
    try {
      const res = await apiClient.get(
        `/communication-threads/${thread.id}/messages/`
      );
      const data = Array.isArray(res.data) ? res.data : res.data.results ?? [];
      setMessages(data);
    } catch {
      // ignore
    }
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

  const firstMessage = messages[0];

  const sendReply = async () => {
    if (!content.trim()) return;
    setSending(true);
    try {
      const form = new FormData();
      form.append("content", content);
      form.append("sender_type", "staff");

      if (firstMessage?.receiver_shop?.id) {
        form.append("receiver_shop", String(firstMessage.receiver_shop.id));
      } else if (firstMessage?.sender_shop?.id) {
        form.append("receiver_shop", String(firstMessage.sender_shop.id));
      }

      if (firstMessage?.receiver_staff?.id) {
        form.append("receiver_staff", String(firstMessage.receiver_staff.id));
      } else if (firstMessage?.sender_staff?.id) {
        form.append("receiver_staff", String(firstMessage.sender_staff.id));
      }

      await apiClient.post(
        `/communication-threads/${thread.id}/messages/`,
        form
      );
      setContent("");
      await fetchMessages();
    } finally {
      setSending(false);
    }
  };

  const toggleStatus = async () => {
    setStatusLoading(true);
    try {
      const next = thread.status === "pending" ? "done" : "pending";
      await apiClient.patch(`/communication-threads/${thread.id}/status/`, {
        status: next,
      });
      onChanged();
      onClose();
    } finally {
      setStatusLoading(false);
    }
  };

  const saveTitle = async () => {
    if (!titleValue.trim() || titleValue === thread.title) {
      setEditingTitle(false);
      setTitleValue(thread.title);
      return;
    }
    setTitleSaving(true);
    try {
      await apiClient.patch(`/communication-threads/${thread.id}/`, {
        title: titleValue.trim(),
      });
      onChanged();
      setEditingTitle(false);
    } catch {
      setTitleValue(thread.title);
      setEditingTitle(false);
    } finally {
      setTitleSaving(false);
    }
  };

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

  const senderName = (m: Message) =>
    m.sender_staff?.full_name ||
    m.sender_shop?.name ||
    "不明";

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="flex-start" spacing={1}>
          <Box flex={1} minWidth={0}>
            {editingTitle ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  size="small"
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveTitle();
                    if (e.key === "Escape") {
                      setEditingTitle(false);
                      setTitleValue(thread.title);
                    }
                  }}
                  autoFocus
                  fullWidth
                />
                <Button
                  size="small"
                  variant="contained"
                  onClick={saveTitle}
                  disabled={titleSaving}
                  sx={{ whiteSpace: "nowrap" }}
                >
                  {titleSaving ? <CircularProgress size={16} /> : "保存"}
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    setEditingTitle(false);
                    setTitleValue(thread.title);
                  }}
                >
                  戻す
                </Button>
              </Stack>
            ) : (
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography fontWeight="bold" noWrap>
                  {titleValue}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => setEditingTitle(true)}
                  sx={{ flexShrink: 0 }}
                >
                  <EditIcon fontSize="inherit" />
                </IconButton>
              </Stack>
            )}
            <Typography fontSize={12} color="text.secondary">
              {thread.sender_name} → {thread.receiver_name}
              {thread.customer && (
                <span style={{ marginLeft: 8 }}>
                  顧客：{thread.customer.name}
                </span>
              )}
            </Typography>
          </Box>
          <Chip
            size="small"
            label={thread.status === "pending" ? "未対応" : "対応済み"}
            color={thread.status === "pending" ? "warning" : "success"}
            sx={{ flexShrink: 0 }}
          />
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 0 }}>
        <Box
          sx={{
            height: 400,
            overflowY: "auto",
            p: 2,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {messages.map((m) => (
            <Box key={m.id}>
              <Typography fontSize={11} color="text.secondary" mb={0.5}>
                {senderName(m)} ·{" "}
                {new Date(m.created_at).toLocaleString("ja-JP")}
              </Typography>
              <Box
                sx={{
                  background: "#f0f4ff",
                  borderRadius: 2,
                  px: 2,
                  py: 1,
                  display: "inline-block",
                  maxWidth: "85%",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                <Typography fontSize={14}>{m.content}</Typography>
              </Box>
              {m.attachments && m.attachments.length > 0 && (
                <Stack direction="row" spacing={1} mt={0.5} flexWrap="wrap">
                  {m.attachments.map((a) => (
                    <Box
                      key={a.id}
                      component="img"
                      src={a.file}
                      sx={{
                        width: 80,
                        height: 80,
                        objectFit: "cover",
                        borderRadius: 1,
                        cursor: "pointer",
                      }}
                      onClick={() => window.open(a.file, "_blank")}
                    />
                  ))}
                </Stack>
              )}
            </Box>
          ))}
          <div ref={bottomRef} />
        </Box>

        <Divider />

        <Box sx={{ p: 2 }}>
          <Stack direction="row" spacing={1}>
            <TextField
              fullWidth
              size="small"
              multiline
              maxRows={4}
              placeholder="返信を入力..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  sendReply();
                }
              }}
            />
            <Button
              variant="contained"
              onClick={sendReply}
              disabled={sending || !content.trim()}
              sx={{ whiteSpace: "nowrap" }}
            >
              {sending ? <CircularProgress size={20} /> : "送信"}
            </Button>
          </Stack>
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 2, py: 1, justifyContent: "space-between" }}>
        <Button
          color="error"
          startIcon={<DeleteIcon />}
          onClick={handleDelete}
          disabled={deleting || statusLoading}
          size="small"
        >
          {deleting ? <CircularProgress size={16} /> : "削除"}
        </Button>

        <Button
          variant={thread.status === "pending" ? "contained" : "outlined"}
          color={thread.status === "pending" ? "success" : "inherit"}
          startIcon={
            thread.status === "pending" ? (
              <CheckCircleOutlineIcon />
            ) : (
              <ReplayIcon />
            )
          }
          onClick={toggleStatus}
          disabled={statusLoading || deleting}
          size="small"
        >
          {statusLoading ? (
            <CircularProgress size={16} />
          ) : thread.status === "pending" ? (
            "対応済みにする"
          ) : (
            "未対応に戻す"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
