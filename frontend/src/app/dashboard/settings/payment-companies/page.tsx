"use client";

import React, { useEffect, useState } from "react";
import {
  Box, Typography, Button, Paper, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Stack, Switch, FormControlLabel, Alert, CircularProgress,
  Chip,
} from "@mui/material";
import AddIcon          from "@mui/icons-material/Add";
import EditIcon         from "@mui/icons-material/Edit";
import DeleteIcon       from "@mui/icons-material/Delete";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import apiClient from "@/lib/apiClient";

// ────────────────────────────────────────
// 定数
// ────────────────────────────────────────
const TABS = [
  { key: "loan", label: "ローン" },
  { key: "card", label: "カード" },
  { key: "qr",   label: "QR決済" },
];

type Company = {
  id: number;
  name: string;
  payment_type: string;
  sort_order: number;
  is_active: boolean;
};

const emptyForm = { name: "", is_active: true };

// ────────────────────────────────────────
// ドラッグ可能な行
// ────────────────────────────────────────
function SortableRow({
  company,
  onEdit,
  onDelete,
}: {
  company: Company;
  onEdit: (c: Company) => void;
  onDelete: (c: Company) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: company.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    background: isDragging ? "#f0f4ff" : undefined,
    zIndex: isDragging ? 1 : undefined,
  };

  return (
    <TableRow ref={setNodeRef} style={style} hover>
      {/* ドラッグハンドル */}
      <TableCell width={44} align="center" sx={{ px: 0.5 }}>
        <IconButton
          size="small"
          {...attributes}
          {...listeners}
          sx={{ cursor: "grab", color: "text.disabled", "&:active": { cursor: "grabbing" } }}
        >
          <DragIndicatorIcon fontSize="small" />
        </IconButton>
      </TableCell>

      {/* 会社名 */}
      <TableCell>
        <Typography fontSize={14}>{company.name}</Typography>
      </TableCell>

      {/* 有効フラグ */}
      <TableCell width={80} align="center">
        <Chip
          label={company.is_active ? "有効" : "無効"}
          size="small"
          color={company.is_active ? "success" : "default"}
          variant="outlined"
        />
      </TableCell>

      {/* 操作 */}
      <TableCell width={100} align="center">
        <IconButton size="small" onClick={() => onEdit(company)}>
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" color="error" onClick={() => onDelete(company)}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </TableCell>
    </TableRow>
  );
}

// ────────────────────────────────────────
// メインページ
// ────────────────────────────────────────
export default function PaymentCompaniesPage() {
  const [tab,         setTab]         = useState(0);
  const [companies,   setCompanies]   = useState<Company[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [dialogOpen,  setDialogOpen]  = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [editTarget,  setEditTarget]  = useState<Company | null>(null);
  const [form,        setForm]        = useState<{ name: string; is_active: boolean }>(emptyForm);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const currentType = TABS[tab].key;

  // DnD センサー
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ── データ取得（is_active=false も含む管理用）──
  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/masters/payment-companies/`);
      const all: Company[] = res.data || [];
      setCompanies(all.filter((c) => c.payment_type === currentType));
    } catch {
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [tab]);

  // ── ドラッグ終了 ──────────────────────────────
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = companies.findIndex((c) => c.id === active.id);
    const newIndex = companies.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(companies, oldIndex, newIndex);

    // 楽観的更新
    setCompanies(reordered);

    // バックエンドに sort_order を一括 PATCH
    await Promise.all(
      reordered.map((c, i) =>
        apiClient.patch(`/masters/payment-companies/${c.id}/`, { sort_order: i })
      )
    );
  };

  // ── 追加ダイアログ ────────────────────────────
  const handleOpenAdd = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setError(null);
    setDialogOpen(true);
  };

  // ── 編集ダイアログ ────────────────────────────
  const handleOpenEdit = (c: Company) => {
    setEditTarget(c);
    setForm({ name: c.name, is_active: c.is_active });
    setError(null);
    setDialogOpen(true);
  };

  // ── 保存 ──────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim()) { setError("会社名を入力してください"); return; }
    setSaving(true);
    try {
      if (editTarget) {
        await apiClient.patch(`/masters/payment-companies/${editTarget.id}/`, {
          name: form.name,
          is_active: form.is_active,
        });
      } else {
        await apiClient.post(`/masters/payment-companies/`, {
          name: form.name,
          payment_type: currentType,
          is_active: form.is_active,
          sort_order: companies.length,
        });
      }
      setDialogOpen(false);
      fetchAll();
    } catch {
      setError("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  // ── 削除 ──────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiClient.delete(`/masters/payment-companies/${deleteTarget.id}/`);
      setDeleteTarget(null);
      fetchAll();
    } catch {
      alert("削除に失敗しました");
    }
  };

  // ────────────────────────────────────────────────
  return (
    <Box sx={{ maxWidth: 800, mx: "auto", py: 4, px: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight="bold">支払会社・サービス管理</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            ローン・カード・QR決済で選択できる会社・サービスを管理します
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd}>
          追加
        </Button>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}>
        {TABS.map((t) => <Tab key={t.key} label={t.label} />)}
      </Tabs>

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      ) : companies.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">登録されていません</Typography>
        </Paper>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "grey.50" }}>
                  <TableCell width={44} />
                  <TableCell>会社・サービス名</TableCell>
                  <TableCell width={80}  align="center">有効</TableCell>
                  <TableCell width={100} align="center">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <SortableContext
                  items={companies.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {companies.map((c) => (
                    <SortableRow
                      key={c.id}
                      company={c}
                      onEdit={handleOpenEdit}
                      onDelete={setDeleteTarget}
                    />
                  ))}
                </SortableContext>
              </TableBody>
            </Table>
          </TableContainer>
        </DndContext>
      )}

      {/* 追加・編集ダイアログ */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editTarget ? "編集" : "追加"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} pt={1}>
            {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
            <TextField
              label="会社・サービス名 *"
              size="small"
              fullWidth
              autoFocus
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                />
              }
              label="有効"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">キャンセル</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={18} color="inherit" /> : "保存"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>削除の確認</DialogTitle>
        <DialogContent>
          <Typography>「{deleteTarget?.name}」を削除してもよいですか？</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} color="inherit">キャンセル</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>削除</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
