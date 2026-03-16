"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  TextField,
  Button,
  Divider,
} from "@mui/material";

import apiClient from "@/lib/apiClient";

export default function BusinessCommunicationThread({
  thread,
}: {
  thread: any;
}) {
  const [messages, setMessages] = useState<any[]>([]);
  const [content, setContent] = useState("");

  const fetchMessages = async () => {
    const res = await apiClient.get(
      `/communication-threads/${thread.id}/messages/`
    );
    setMessages(res.data);
  };

  useEffect(() => {
    fetchMessages();
  }, [thread.id]);

  const sendMessage = async () => {
    if (!content.trim()) return;

    await apiClient.post(
      `/communication-threads/${thread.id}/messages/`,
      {
        receiver_shop: thread.receiver_shop?.id,
        receiver_staff: thread.receiver_staff?.id,
        content,
      }
    );

    setContent("");
    fetchMessages();
  };

  return (
    <Paper sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box p={2}>
        <Typography fontWeight="bold">{thread.title}</Typography>
      </Box>

      <Divider />

      {/* メッセージ */}
      <Box flex={1} overflow="auto" p={2}>
        <Stack spacing={2}>
          {messages.map((m) => (
            <Paper key={m.id} sx={{ p: 2 }}>
              <Typography fontSize={13} color="text.secondary">
                {m.sender_staff?.full_name ?? m.sender_shop?.name} /{" "}
                {new Date(m.created_at).toLocaleString()}
              </Typography>
              <Typography mt={1}>{m.content}</Typography>
            </Paper>
          ))}
        </Stack>
      </Box>

      <Divider />

      {/* 投稿 */}
      <Box p={2}>
        <Stack direction="row" spacing={2}>
          <TextField
            fullWidth
            size="small"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="メッセージ入力"
          />

          <Button variant="contained" onClick={sendMessage}>
            送信
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
}