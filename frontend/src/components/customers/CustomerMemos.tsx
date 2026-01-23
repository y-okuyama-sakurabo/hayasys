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
  Stack,
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

  // 編集用
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);

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
    // customer が変わったら編集状態もリセット
    setEditingId(null);
    setEditingBody("");
  }, [customerId]);

  // 追加
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!body.trim()) {
      setError("メモ内容を入力してください。");
      return;
    }

    try {
      await apiClient.post(`/customers/${customerId}/memos/`, { body });
      setBody("");
      fetchMemos();
    } catch (e) {
      console.error(e);
      setError("メモの登録に失敗しました");
    }
  };

  // 編集開始
  const startEdit = (m: Memo) => {
    setError("");
    setEditingId(m.id);
    setEditingBody(m.body);
  };

  // 編集キャンセル
  const cancelEdit = () => {
    setEditingId(null);
    setEditingBody("");
  };

  // 編集保存（PATCH）
  const saveEdit = async () => {
    if (editingId == null) return;

    if (!editingBody.trim()) {
      setError("メモ内容を入力してください。");
      return;
    }

    setSavingId(editingId);
    setError("");
    try {
      await apiClient.patch(`/customers/${customerId}/memos/${editingId}/`, {
        body: editingBody,
      });
      setEditingId(null);
      setEditingBody("");
      fetchMemos();
    } catch (e) {
      console.error(e);
      setError("メモの更新に失敗しました");
    } finally {
      setSavingId(null);
    }
  };

  // 削除
  const deleteMemo = async (memoId: number) => {
    const ok = window.confirm("このメモを削除しますか？");
    if (!ok) return;

    setError("");
    setSavingId(memoId);
    try {
      await apiClient.delete(`/customers/${customerId}/memos/${memoId}/`);
      // 体感速いように先にUIから消してもOK（ここでは再取得）
      if (editingId === memoId) cancelEdit();
      fetchMemos();
    } catch (e) {
      console.error(e);
      setError("メモの削除に失敗しました");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" mb={2}>
        顧客メモ
      </Typography>

      {/* 追加 */}
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

      {/* 一覧 */}
      {loading ? (
        <Typography color="text.secondary">ロード中...</Typography>
      ) : memos.length === 0 ? (
        <Typography color="text.secondary">メモはありません</Typography>
      ) : (
        <List disablePadding>
          {memos.map((m) => {
            const isEditing = editingId === m.id;
            const isSaving = savingId === m.id;

            return (
              <ListItem key={m.id} disableGutters divider sx={{ py: 1 }}>
                <Box sx={{ width: "100%" }}>
                  {isEditing ? (
                    <>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        value={editingBody}
                        onChange={(e) => setEditingBody(e.target.value)}
                      />
                      <Stack direction="row" justifyContent="flex-end" spacing={1} mt={1}>
                        <Button onClick={cancelEdit} disabled={isSaving}>
                          キャンセル
                        </Button>
                        <Button variant="contained" onClick={saveEdit} disabled={isSaving}>
                          保存
                        </Button>
                      </Stack>
                    </>
                  ) : (
                    <>
                      <ListItemText
                        primary={m.body}
                        secondary={new Date(m.created_at).toLocaleString("ja-JP")}
                      />
                      <Stack direction="row" justifyContent="flex-end" spacing={1} mt={1}>
                        <Button size="small" onClick={() => startEdit(m)} disabled={isSaving}>
                          編集
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => deleteMemo(m.id)}
                          disabled={isSaving}
                        >
                          削除
                        </Button>
                      </Stack>
                    </>
                  )}
                </Box>
              </ListItem>
            );
          })}
        </List>
      )}
    </Paper>
  );
}
