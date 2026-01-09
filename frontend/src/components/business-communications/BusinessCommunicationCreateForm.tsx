"use client";

import { useEffect, useState } from "react";
import { Box, Button, TextField, Stack, MenuItem } from "@mui/material";
import apiClient from "@/lib/apiClient";

type ShopTiny = { id: number; name: string };

export default function BusinessCommunicationCreateForm({
  customerId,
  onCreated,
}: {
  customerId: number;
  onCreated?: () => void | Promise<void>;
}) {
  const [receiverShopId, setReceiverShopId] = useState<number | "">("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [shops, setShops] = useState<ShopTiny[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    apiClient
      .get("/masters/shops/")
      .then((res) => {
        if (!mounted) return;
        setShops(res.data ?? []);
      })
      .catch((e) => {
        console.error("店舗一覧取得失敗", e);
        if (!mounted) return;
        setShops([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async () => {
    if (submitting) return;
    if (!receiverShopId || !title.trim() || !content.trim()) return;

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("receiver_shop", String(receiverShopId));
      fd.append("title", title.trim());
      fd.append("content", content.trim());
      files.forEach((f) => fd.append("files", f)); // ✅ 画像なしでもOK

      await apiClient.post(
        `/customers/${customerId}/business_communications/`,
        fd,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      // ✅ 親で fetchItems() する運用が確実
      if (onCreated) await onCreated();

      // ✅ 入力クリア
      setTitle("");
      setContent("");
      setReceiverShopId("");
      setFiles([]);
    } catch (e) {
      console.error("業務連絡送信失敗", e);
    } finally {
      setSubmitting(false);
    }
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

        {/* ✅ 添付画像（複数OK） */}
        <TextField
          type="file"
          inputProps={{ accept: "image/*", multiple: true }}
          onChange={(e: any) => setFiles(Array.from(e.target.files ?? []))}
          fullWidth
        />

        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={
            !receiverShopId || !title.trim() || !content.trim() || submitting
          }
        >
          {submitting ? "送信中..." : "業務連絡を送信"}
        </Button>
      </Stack>
    </Box>
  );
}
