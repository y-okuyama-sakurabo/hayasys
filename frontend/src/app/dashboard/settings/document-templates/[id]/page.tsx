"use client";

import { useEffect, useState } from "react";
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell,
  TableHead, TableRow, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Tooltip,
  Chip, Alert,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PrintIcon from "@mui/icons-material/Print";
import PreviewIcon from "@mui/icons-material/Visibility";
import { useParams, useRouter } from "next/navigation";
import apiClient from "@/lib/apiClient";

type SourceKey = { key: string; label: string };
type Field = {
  id: number;
  label: string;
  source_key: string;
  static_value: string;
  input_label: string;
  x: number;
  y: number;
  font_size: number;
  letter_spacing: number;
  order: number;
};
type Template = {
  id: number;
  name: string;
  paper_width: number;
  paper_height: number;
  fields: Field[];
};

const EMPTY_FIELD = {
  label: "", source_key: "input", static_value: "",
  input_label: "", x: 0, y: 0, font_size: 10, letter_spacing: 0, order: 0,
};

export default function DocumentFieldEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [template, setTemplate] = useState<Template | null>(null);
  const [sourceKeys, setSourceKeys] = useState<SourceKey[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<Field | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FIELD });

  const load = () =>
    apiClient.get(`/document-templates/${id}/`).then((r) => setTemplate(r.data));

  useEffect(() => {
    load();
    apiClient.get("/document-source-keys/").then((r) => setSourceKeys(r.data));
  }, [id]);

  const openNew = () => {
    setEditingField(null);
    setForm({ ...EMPTY_FIELD, order: (template?.fields.length ?? 0) + 1 });
    setDialogOpen(true);
  };
  const openEdit = (f: Field) => {
    setEditingField(f);
    setForm({
      label: f.label, source_key: f.source_key, static_value: f.static_value,
      input_label: f.input_label, x: f.x, y: f.y,
      font_size: f.font_size, letter_spacing: f.letter_spacing, order: f.order,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (editingField) {
      await apiClient.put(`/document-fields/${editingField.id}/`, form);
    } else {
      await apiClient.post(`/document-templates/${id}/fields/`, form);
    }
    setDialogOpen(false);
    load();
  };

  const remove = async (fieldId: number) => {
    if (!confirm("このフィールドを削除しますか？")) return;
    await apiClient.delete(`/document-fields/${fieldId}/`);
    load();
  };

  const sourceLabel = (key: string) =>
    sourceKeys.find((s) => s.key === key)?.label ?? key;

  if (!template) return null;

  return (
    <Box p={3}>
      <Box display="flex" alignItems="center" gap={2} mb={1}>
        <IconButton onClick={() => router.back()}><ArrowBackIcon /></IconButton>
        <Typography variant="h5" fontWeight="bold">{template.name}</Typography>
        <Chip label={`${template.paper_width}×${template.paper_height}mm`} size="small" variant="outlined" />
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        X・Y座標は用紙の<strong>左上を原点（0,0）</strong>として、右方向がX、下方向がYです（単位：mm）。
        キャリブレーション印刷で位置を確認しながら調整してください。
      </Alert>

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography fontWeight="bold">フィールド一覧（{template.fields.length} 件）</Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined" startIcon={<PreviewIcon />} size="small"
            onClick={() => window.open(`/dashboard/documents/preview?template_id=${id}`, "_blank")}
          >
            プレビュー
          </Button>
          <Button
            variant="outlined" startIcon={<PrintIcon />} size="small"
            onClick={() => window.open(`/dashboard/documents/calibration?template_id=${id}`, "_blank")}
          >
            キャリブレーション印刷
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={openNew}>
            フィールドを追加
          </Button>
        </Box>
      </Box>

      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "grey.50" }}>
              <TableCell>順</TableCell>
              <TableCell>項目名</TableCell>
              <TableCell>値の取得元</TableCell>
              <TableCell>X (mm)</TableCell>
              <TableCell>Y (mm)</TableCell>
              <TableCell>フォント (pt)</TableCell>
              <TableCell>文字間隔 (mm)</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {template.fields.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ color: "text.disabled", py: 4 }}>
                  フィールドがありません
                </TableCell>
              </TableRow>
            )}
            {template.fields.map((f) => (
              <TableRow key={f.id} hover>
                <TableCell>{f.order}</TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">{f.label}</Typography>
                  {f.source_key === "static" && (
                    <Typography variant="caption" color="text.secondary">「{f.static_value}」</Typography>
                  )}
                  {f.source_key === "input" && f.input_label && (
                    <Typography variant="caption" color="primary.main">入力: {f.input_label}</Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip label={sourceLabel(f.source_key)} size="small" variant="outlined" />
                </TableCell>
                <TableCell>{f.x}</TableCell>
                <TableCell>{f.y}</TableCell>
                <TableCell>{f.font_size}</TableCell>
                <TableCell>{f.letter_spacing > 0 ? f.letter_spacing : "-"}</TableCell>
                <TableCell align="right">
                  <Tooltip title="編集">
                    <IconButton size="small" onClick={() => openEdit(f)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="削除">
                    <IconButton size="small" color="error" onClick={() => remove(f.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* フィールド編集ダイアログ */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingField ? "フィールドを編集" : "フィールドを追加"}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="項目名（管理用）" fullWidth size="small" required
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
            />
            <TextField
              select label="値の取得元" fullWidth size="small"
              value={form.source_key}
              onChange={(e) => setForm({ ...form, source_key: e.target.value })}
            >
              {sourceKeys.map((s) => (
                <MenuItem key={s.key} value={s.key}>{s.label}</MenuItem>
              ))}
            </TextField>
            {form.source_key === "static" && (
              <TextField
                label="固定テキスト" fullWidth size="small"
                value={form.static_value}
                onChange={(e) => setForm({ ...form, static_value: e.target.value })}
              />
            )}
            {form.source_key === "input" && (
              <TextField
                label="手入力ラベル（印刷画面で表示）" fullWidth size="small"
                value={form.input_label}
                onChange={(e) => setForm({ ...form, input_label: e.target.value })}
              />
            )}
            <Box display="flex" gap={2}>
              <TextField
                label="X座標 (mm)" size="small" type="number" sx={{ flex: 1 }}
                value={form.x}
                onChange={(e) => setForm({ ...form, x: Number(e.target.value) })}
                inputProps={{ step: 0.5 }}
              />
              <TextField
                label="Y座標 (mm)" size="small" type="number" sx={{ flex: 1 }}
                value={form.y}
                onChange={(e) => setForm({ ...form, y: Number(e.target.value) })}
                inputProps={{ step: 0.5 }}
              />
            </Box>
            <Box display="flex" gap={2}>
              <TextField
                label="フォントサイズ (pt)" size="small" type="number" sx={{ flex: 1 }}
                value={form.font_size}
                onChange={(e) => setForm({ ...form, font_size: Number(e.target.value) })}
                inputProps={{ step: 0.5 }}
              />
              <TextField
                label="文字間隔 (mm)" size="small" type="number" sx={{ flex: 1 }}
                value={form.letter_spacing}
                onChange={(e) => setForm({ ...form, letter_spacing: Number(e.target.value) })}
                inputProps={{ step: 0.5 }}
                helperText="1文字1マスの欄に使用"
              />
            </Box>
            <TextField
              label="表示順" size="small" type="number"
              value={form.order}
              onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
              sx={{ width: 120 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>キャンセル</Button>
          <Button variant="contained" onClick={save} disabled={!form.label}>保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
