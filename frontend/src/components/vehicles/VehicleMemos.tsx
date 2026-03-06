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
  vehicleId: number;
};

export default function VehicleMemos({ vehicleId }: Props) {

  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);

  const [body, setBody] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingBody, setEditingBody] = useState("");

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

  useEffect(() => {
    fetchMemos();
  }, [vehicleId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!body.trim()) return;

    await apiClient.post(`/vehicles/${vehicleId}/memos/`, {
      body,
    });

    setBody("");
    fetchMemos();
  };

  const saveEdit = async () => {
    if (!editingId) return;

    await apiClient.patch(`/vehicles/${vehicleId}/memos/${editingId}/`, {
      body: editingBody,
    });

    setEditingId(null);
    fetchMemos();
  };

  const deleteMemo = async (memoId: number) => {
    if (!confirm("削除しますか？")) return;

    await apiClient.delete(`/vehicles/${vehicleId}/memos/${memoId}/`);

    fetchMemos();
  };

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" mb={2}>
        車両メモ
      </Typography>

      <Box component="form" onSubmit={handleSubmit} mb={2}>
        <TextField
          fullWidth
          multiline
          rows={3}
          placeholder="メモを入力"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />

        <Box mt={1} textAlign="right">
          <Button type="submit" variant="contained">
            追加
          </Button>
        </Box>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {loading ? (
        <Typography>ロード中...</Typography>
      ) : (
        <List disablePadding>
          {memos.map((m) => (
            <ListItem key={m.id} divider>
              <Box width="100%">
                {editingId === m.id ? (
                  <>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      value={editingBody}
                      onChange={(e) => setEditingBody(e.target.value)}
                    />

                    <Stack direction="row" justifyContent="flex-end" spacing={1} mt={1}>
                      <Button onClick={() => setEditingId(null)}>キャンセル</Button>
                      <Button variant="contained" onClick={saveEdit}>
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

                    <Stack direction="row" justifyContent="flex-end" spacing={1}>
                      <Button size="small" onClick={() => {
                        setEditingId(m.id);
                        setEditingBody(m.body);
                      }}>
                        編集
                      </Button>

                      <Button
                        size="small"
                        color="error"
                        onClick={() => deleteMemo(m.id)}
                      >
                        削除
                      </Button>
                    </Stack>
                  </>
                )}
              </Box>
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );
}