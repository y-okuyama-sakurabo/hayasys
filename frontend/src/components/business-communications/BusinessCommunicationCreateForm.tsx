"use client";

import { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Stack,
  MenuItem,
} from "@mui/material";
import apiClient from "@/lib/apiClient";

type ShopTiny = { id: number; name: string };

export default function BusinessCommunicationCreateForm({
  customerId,
}: {
  customerId: number;
}) {
  const [receiverShopId, setReceiverShopId] = useState<number | "">("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [shops, setShops] = useState<ShopTiny[]>([]);

  // 店舗一覧取得（初回）
  useState(() => {
    apiClient.get("/masters/shops/").then((res) => setShops(res.data));
  });

  const handleSubmit = async () => {
    if (!receiverShopId || !title || !content) return;

    await apiClient.post(
      `/customers/${customerId}/business_communications/`,
      {
        receiver_shop: receiverShopId,
        title,
        content,
      }
    );


    setTitle("");
    setContent("");
  };

  return (
    <Box>
      <Stack spacing={2}>
        <TextField
          select
          label="宛先店舗"
          value={receiverShopId}
          onChange={(e) => setReceiverShopId(Number(e.target.value))}
          fullWidth
        >
          {shops.map((shop) => (
            <MenuItem key={shop.id} value={shop.id}>
              {shop.name}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="タイトル"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          fullWidth
        />

        <TextField
          label="内容"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          multiline
          rows={4}
          fullWidth
        />

        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!receiverShopId || !title || !content}
        >
          業務連絡を送信
        </Button>
      </Stack>
    </Box>
  );
}
