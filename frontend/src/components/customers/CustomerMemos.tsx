"use client";

import { useEffect, useState } from "react";
import {
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
} from "@mui/material";
import apiClient from "@/lib/apiClient";

type Memo = {
  id: number;
  body: string;
  created_at: string;
};

type Props = {
  customerId: number;
};

export default function CustomerMemos({ customerId }: Props) {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  // ============================
  // メモ一覧取得
  // ============================
  const fetchMemos = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/customers/${customerId}/memos/`);
      const data = res.data;
      setMemos(data.results || data || []);
    } catch (e) {
      console.error(e);
      setError("メモの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemos();
  }, [customerId]);

  // ============================
  // メモ追加
  // ============================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!body.trim()) {
      setError("メモ内容を入力してください。");
      return;
    }

    try {
      await apiClient.post(`/customers/${customerId}/memos/`, {
        body,
      });
      setBody("");
      fetchMemos();
    } catch (e: any) {
      console.error(e);
      setError("メモの登録に失敗しました");
    }
  };

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" mb={2}>
        顧客メモ
      </Typography>

      {/* === メモ追加 === */}
      <Box component="form" onSubmit={handleSubmit} mb={2}>
        <TextField
          fullWidth
          multiline
          rows={3}
          placeholder="メモを入力してください"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />

        {error && (
          <Typography color="error" variant="body2" mt={1}>
            {error}
          </Typography>
        )}

        <Box mt={1} textAlign="right">
          <Button type="submit" variant="contained">
            追加
          </Button>
        </Box>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* === メモ一覧 === */}
      {loading ? (
        <Typography color="text.secondary">ロード中...</Typography>
      ) : memos.length === 0 ? (
        <Typography color="text.secondary">メモはありません</Typography>
      ) : (
        <List disablePadding>
          {memos.map((m) => (
            <ListItem key={m.id} disableGutters divider>
              <ListItemText
                primary={m.body}
                secondary={new Date(m.created_at).toLocaleString("ja-JP")}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );
}
