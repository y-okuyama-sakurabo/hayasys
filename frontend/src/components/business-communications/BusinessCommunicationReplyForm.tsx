"use client";

import { Stack, TextField, Button } from "@mui/material";
import { useState } from "react";
import apiClient from "@/lib/apiClient";

export default function BusinessCommunicationReplyForm({
  parentId,
  receiverShop,
  receiverStaff,
  refresh
}: any) {

  const [content, setContent] = useState("");

  const send = async () => {

    if (!content.trim()) return;

    await apiClient.post(
      `/communication-threads/${parentId}/messages/`,
      {
        content,
        receiver_shop: receiverShop,
        receiver_staff: receiverStaff
      }
    );

    setContent("");

    refresh?.();
  };

  return (

    <Stack direction="row" spacing={2} mt={2}>

      <TextField
        fullWidth
        size="small"
        placeholder="返信を書く"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      <Button
        variant="contained"
        onClick={send}
      >
        返信
      </Button>

    </Stack>

  );
}