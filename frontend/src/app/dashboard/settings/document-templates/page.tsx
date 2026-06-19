"use client";

import { useEffect, useState } from "react";
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell,
  TableHead, TableRow, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Switch, FormControlLabel,
  Chip, Tooltip, ToggleButton, ToggleButtonGroup, MenuItem,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import TuneIcon from "@mui/icons-material/Tune";
import PreviewIcon from "@mui/icons-material/Visibility";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/apiClient";

type Template = {
  id: number;
  name: string;
  description: string;
  paper_width: number;
  paper_height: number;
  is_active: boolean;
  fields: any[];
};

const PAPER_PRESETS = [
  { label: "A4 縦 (210×297)",  w: 210, h: 297 },
  { label: "A4 横 (297×210)",  w: 297, h: 210 },
  { label: "A3 縦 (297×420)",  w: 297, h: 420 },
  { label: "A3 横 (420×297)",  w: 420, h: 297 },
  { label: "B4 縦 (257×364)",  w: 257, h: 364 },
  { label: "B4 横 (364×257)",  w: 364, h: 257 },
  { label: "B5 縦 (182×257)",  w: 182, h: 257 },
  { label: "B5 横 (257×182)",  w: 257, h: 182 },
  { label: "ハガキ (100×148)", w: 100, h: 148 },
  { label: "カスタム",          w: null, h: null },
] as const;

const EMPTY: Omit<Template, "id" | "fields"> = {
  name: "", description: "",
  paper_width: 210, paper_height: 297,
  is_active: true,
};

export default function DocumentTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState({ ...EMPTY });

  const load = () =>
    apiClient.get("/document-templates/").then((r) => setTemplates(r.data.results ?? r.data));

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ ...EMPTY }); setDialogOpen(true); };
  const openEdit = (t: Template) => {
    setEditing(t);
    setForm({
      name: t.name, description: t.description,
      paper_width: t.paper_width, paper_height: t.paper_height,
      is_active: t.is_active,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (editing) {
      await apiClient.put(`/document-templates/${editing.id}/`, form);
    } else {
      await apiClient.post("/document-templates/", form);
    }
    setDialogOpen(false);
    load();
  };

  const remove = async (id: number) => {
    if (!confirm("このテンプレートを削除しますか？")) return;
    await apiClient.delete(`/document-templates/${id}/`);
    load();
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">書類テンプレート管理</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
          新規テンプレート
        </Button>
      </Box>

      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "grey.50" }}>
              <TableCell>書類名</TableCell>
              <TableCell>用紙サイズ</TableCell>
              <TableCell>フィールド数</TableCell>
              <TableCell>状態</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {templates.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ color: "text.disabled", py: 4 }}>
                  テンプレートがありません
                </TableCell>
              </TableRow>
            )}
            {templates.map((t) => (
              <TableRow key={t.id} hover>
                <TableCell>
                  <Typography fontWeight="bold">{t.name}</Typography>
                  {t.description && (
                    <Typography variant="caption" color="text.secondary">{t.description}</Typography>
                  )}
                </TableCell>
                <TableCell>{t.paper_width} × {t.paper_height} mm</TableCell>
                <TableCell>{t.fields.length} 件</TableCell>
                <TableCell>
                  <Chip
                    label={t.is_active ? "有効" : "無効"}
                    color={t.is_active ? "success" : "default"}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="プレビュー">
                    <IconButton
                      size="small"
                      onClick={() => window.open(`/dashboard/documents/preview?template_id=${t.id}`, "_blank")}
                    >
                      <PreviewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="フィールド編集">
                    <IconButton
                      size="small" color="primary"
                      onClick={() => router.push(`/dashboard/settings/document-templates/${t.id}`)}
                    >
                      <TuneIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="テンプレート編集">
                    <IconButton size="small" onClick={() => openEdit(t)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="削除">
                    <IconButton size="small" color="error" onClick={() => remove(t.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? "テンプレートを編集" : "新規テンプレート"}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="書類名" fullWidth size="small" required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <TextField
              label="備考" fullWidth size="small" multiline rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            {/* 用紙プリセット */}
            {(() => {
              const presetLabel = PAPER_PRESETS.find(
                (p) => p.w === form.paper_width && p.h === form.paper_height
              )?.label ?? "カスタム";
              return (
                <TextField
                  select fullWidth size="small" label="用紙サイズ"
                  value={presetLabel}
                  onChange={(e) => {
                    const preset = PAPER_PRESETS.find((p) => p.label === e.target.value);
                    if (preset?.w) setForm({ ...form, paper_width: preset.w, paper_height: preset.h as number });
                  }}
                >
                  {PAPER_PRESETS.map((p) => (
                    <MenuItem key={p.label} value={p.label}>{p.label}</MenuItem>
                  ))}
                </TextField>
              );
            })()}
            {/* 向き・幅・高さ */}
            <Box display="flex" gap={2} alignItems="center">
              <ToggleButtonGroup
                size="small"
                exclusive
                value={form.paper_width <= form.paper_height ? "portrait" : "landscape"}
                onChange={(_, val) => {
                  if (!val) return;
                  const isLandscape = val === "landscape";
                  const w = Math.max(form.paper_width, form.paper_height);
                  const h = Math.min(form.paper_width, form.paper_height);
                  setForm({ ...form, paper_width: isLandscape ? w : h, paper_height: isLandscape ? h : w });
                }}
              >
                <ToggleButton value="portrait">縦</ToggleButton>
                <ToggleButton value="landscape">横</ToggleButton>
              </ToggleButtonGroup>
              <TextField
                label="用紙幅 (mm)" size="small" type="number" sx={{ flex: 1 }}
                value={form.paper_width}
                onChange={(e) => setForm({ ...form, paper_width: Number(e.target.value) })}
              />
              <TextField
                label="用紙高さ (mm)" size="small" type="number" sx={{ flex: 1 }}
                value={form.paper_height}
                onChange={(e) => setForm({ ...form, paper_height: Number(e.target.value) })}
              />
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
              }
              label="有効"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>キャンセル</Button>
          <Button variant="contained" onClick={save} disabled={!form.name}>保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
