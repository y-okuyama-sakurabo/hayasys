"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Box, Typography, Paper, IconButton, Tooltip, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, CircularProgress, Alert,
  Collapse, Chip, Stack, Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import FolderIcon from "@mui/icons-material/Folder";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/apiClient";

// ─────────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────────
type CategoryNode = {
  id: number;
  name: string;
  parent_id: number | null;
  category_type: string | null;
  tax_type: string | null;
  sort_order: number;
  children: CategoryNode[];
};

type UsageInfo = {
  estimate_items: number;
  order_items: number;
  products: number;
  children_count: number;
};

type FormData = {
  name: string;
  parent_id: number | null;
  category_type: string;
  tax_type: string;
  sort_order: number;
};

const CATEGORY_TYPES = [
  { value: "vehicle",             label: "車両" },
  { value: "other",               label: "その他" },
  { value: "taxable_expense",     label: "課税費用" },
  { value: "non_taxable_expense", label: "非課税費用" },
];

const TAX_TYPES = [
  { value: "taxable",     label: "課税" },
  { value: "non_taxable", label: "非課税" },
];

const TYPE_COLORS: Record<string, string> = {
  vehicle:             "#1976d2",
  other:               "#5d4037",
  taxable_expense:     "#e65100",
  non_taxable_expense: "#6a1b9a",
};

const emptyForm = (): FormData => ({
  name: "", parent_id: null, category_type: "", tax_type: "", sort_order: 0,
});

// ─────────────────────────────────────────────
// ローカルツリー操作ヘルパー
// ─────────────────────────────────────────────
function insertNode(tree: CategoryNode[], parentId: number | null, node: CategoryNode): CategoryNode[] {
  if (parentId === null) return [...tree, { ...node, children: [] }];
  return tree.map(n =>
    n.id === parentId
      ? { ...n, children: [...n.children, { ...node, children: [] }] }
      : { ...n, children: insertNode(n.children, parentId, node) }
  );
}

function updateNodeInTree(tree: CategoryNode[], updated: CategoryNode): CategoryNode[] {
  return tree.map(n =>
    n.id === updated.id
      ? { ...updated, children: n.children }
      : { ...n, children: updateNodeInTree(n.children, updated) }
  );
}

function removeNodeFromTree(tree: CategoryNode[], nodeId: number): CategoryNode[] {
  return tree
    .filter(n => n.id !== nodeId)
    .map(n => ({ ...n, children: removeNodeFromTree(n.children, nodeId) }));
}

// ─────────────────────────────────────────────
// TreeNode — React.memo で不要な再レンダリングを防ぐ
// ─────────────────────────────────────────────
type NodeProps = {
  node: CategoryNode;
  depth: number;
  onAdd: (parentId: number, parentType: string | null) => void;
  onEdit: (node: CategoryNode) => void;
  onDelete: (node: CategoryNode) => void;
};

const TreeNode = React.memo(function TreeNode({ node, depth, onAdd, onEdit, onDelete }: NodeProps) {
  const [open, setOpen] = useState(depth === 0);
  const hasChildren = node.children.length > 0;

  return (
    <Box>
      <Box
        display="flex" alignItems="center"
        sx={{
          pl: depth * 2.5 + 1, pr: 1, py: 0.5, borderRadius: 1,
          "&:hover": { bgcolor: "action.hover" },
          "&:hover .node-actions": { opacity: 1 },
        }}
      >
        <IconButton
          size="small" onClick={() => setOpen(o => !o)}
          sx={{ mr: 0.5, visibility: hasChildren ? "visible" : "hidden" }}
        >
          {open ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
        </IconButton>

        {open && hasChildren
          ? <FolderOpenIcon fontSize="small" sx={{ mr: 1, color: "warning.main", flexShrink: 0 }} />
          : <FolderIcon fontSize="small" sx={{ mr: 1, color: hasChildren ? "warning.main" : "action.disabled", flexShrink: 0 }} />
        }

        <Typography variant="body2" sx={{ flexGrow: 1, fontWeight: depth === 0 ? 600 : 400 }}>
          {node.name}
        </Typography>

        {depth === 0 && node.category_type && (
          <Chip
            label={CATEGORY_TYPES.find(t => t.value === node.category_type)?.label ?? node.category_type}
            size="small"
            sx={{
              mr: 1, height: 20, fontSize: 11,
              bgcolor: (TYPE_COLORS[node.category_type] ?? "#888") + "20",
              color: TYPE_COLORS[node.category_type] ?? "#888",
              border: `1px solid ${(TYPE_COLORS[node.category_type] ?? "#888")}40`,
            }}
          />
        )}

        {node.tax_type && (
          <Chip
            label={node.tax_type === "taxable" ? "課税" : "非課税"}
            size="small"
            color={node.tax_type === "taxable" ? "default" : "warning"}
            variant="outlined"
            sx={{ mr: 1, height: 20, fontSize: 11 }}
          />
        )}

        <Stack direction="row" spacing={0.25} className="node-actions" sx={{ opacity: 0, transition: "opacity 0.15s" }}>
          <Tooltip title="子カテゴリを追加">
            <IconButton size="small" color="primary" onClick={() => onAdd(node.id, node.category_type)}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="編集">
            <IconButton size="small" onClick={() => onEdit(node)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="削除（ゴミ箱へ）">
            <IconButton size="small" color="error" onClick={() => onDelete(node)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      <Collapse in={open} unmountOnExit={false}>
        {node.children.map(child => (
          <TreeNode key={child.id} node={child} depth={depth + 1} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </Collapse>
    </Box>
  );
});

// ─────────────────────────────────────────────
// CategoryFormDialog — フォーム state をここに閉じ込める
// ─────────────────────────────────────────────
type FormDialogProps = {
  open: boolean;
  editTarget: CategoryNode | null;
  initialParentId: number | null;
  parentType: string | null;
  onClose: () => void;
  onCreated: (node: CategoryNode) => void;
  onUpdated: (node: CategoryNode) => void;
};

function CategoryFormDialog({ open, editTarget, initialParentId, parentType, onClose, onCreated, onUpdated }: FormDialogProps) {
  const [form, setForm] = useState<FormData>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ダイアログが開くたびにフォームを初期化
  const prevOpen = useRef(false);
  if (open && !prevOpen.current) {
    if (editTarget) {
      form.name          = editTarget.name;
      form.parent_id     = editTarget.parent_id;
      form.category_type = editTarget.category_type ?? "";
      form.tax_type      = editTarget.tax_type ?? "";
      form.sort_order    = editTarget.sort_order;
    } else {
      Object.assign(form, emptyForm(), { parent_id: initialParentId });
    }
  }
  prevOpen.current = open;

  const handleSave = async () => {
    setFormError(null);
    if (!form.name.trim()) { setFormError("カテゴリ名を入力してください"); return; }

    const payload: Record<string, any> = {
      name: form.name.trim(),
      parent: form.parent_id,
      tax_type: form.tax_type || null,
      sort_order: form.sort_order,
    };
    if (!form.parent_id) {
      if (!form.category_type) { setFormError("カテゴリ種別を選択してください"); return; }
      payload.category_type = form.category_type;
    } else {
      payload.category_type = null;
    }

    try {
      setSaving(true);
      if (editTarget) {
        const res = await apiClient.patch(`/categories/${editTarget.id}/`, payload);
        onUpdated(res.data);
      } else {
        const res = await apiClient.post("/categories/create/", payload);
        onCreated(res.data);
      }
      onClose();
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.name)        setFormError(data.name[0] ?? "エラーが発生しました");
      else if (data?.parent) setFormError(data.parent[0] ?? "エラーが発生しました");
      else                   setFormError("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const dialogKey = editTarget ? `edit-${editTarget.id}` : `create-${initialParentId ?? "root"}`;

  return (
    <Dialog key={dialogKey} open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{editTarget ? "カテゴリを編集" : "カテゴリを追加"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} pt={1}>
          {formError && <Alert severity="error" onClose={() => setFormError(null)}>{formError}</Alert>}
          <TextField
            label="カテゴリ名 *" size="small" fullWidth autoFocus
            defaultValue={form.name}
            onChange={e => { form.name = e.target.value; }}
          />
          {!form.parent_id && (
            <TextField
              select label="カテゴリ種別 *" size="small" fullWidth
              defaultValue={form.category_type}
              onChange={e => { form.category_type = e.target.value; }}
              helperText="最上位カテゴリのみ設定できます"
            >
              <MenuItem value="">選択してください</MenuItem>
              {CATEGORY_TYPES.map(t => (
                <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
              ))}
            </TextField>
          )}
          <TextField
            select label="税区分" size="small" fullWidth
            defaultValue={form.tax_type}
            onChange={e => { form.tax_type = e.target.value; }}
            helperText={parentType ? `親カテゴリの種別: ${CATEGORY_TYPES.find(t => t.value === parentType)?.label ?? parentType}` : ""}
          >
            <MenuItem value="">未設定（親から継承）</MenuItem>
            {TAX_TYPES.map(t => (
              <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">キャンセル</Button>
        <Button
          variant="contained" onClick={handleSave} disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {saving ? "保存中..." : "保存"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// CategoryDeleteDialog — 削除 state をここに閉じ込める
// ─────────────────────────────────────────────
type DeleteDialogProps = {
  target: CategoryNode | null;
  onClose: () => void;
  onDeleted: (nodeId: number) => void;
};

function CategoryDeleteDialog({ target, onClose, onDeleted }: DeleteDialogProps) {
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!target) { setUsage(null); return; }
    setLoadingUsage(true);
    apiClient.get(`/categories/${target.id}/usage/`)
      .then(res => setUsage(res.data))
      .catch(() => setUsage(null))
      .finally(() => setLoadingUsage(false));
  }, [target?.id]);

  const handleDelete = async () => {
    if (!target) return;
    try {
      setDeleting(true);
      await apiClient.delete(`/categories/${target.id}/`);
      onDeleted(target.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  const totalUsage = usage ? usage.estimate_items + usage.order_items + usage.products : 0;

  return (
    <Dialog open={!!target} onClose={() => !deleting && onClose()} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <WarningAmberIcon color="warning" />
        カテゴリをゴミ箱へ移動しますか？
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" mb={2}>
          <strong>「{target?.name}」</strong> をゴミ箱へ移動します。
        </Typography>
        {loadingUsage ? (
          <Box display="flex" justifyContent="center" py={2}><CircularProgress size={24} /></Box>
        ) : usage ? (
          <Stack spacing={1}>
            {usage.children_count > 0 && (
              <Alert severity="warning" icon={false}>
                <Typography variant="body2" fontWeight="bold">
                  子カテゴリ {usage.children_count} 件も一緒にゴミ箱へ移動されます
                </Typography>
              </Alert>
            )}
            {totalUsage > 0 && (
              <Alert severity="info" icon={false}>
                <Typography variant="body2" fontWeight="bold" mb={0.5}>このカテゴリは以下で使用されています</Typography>
                {usage.estimate_items > 0 && <Typography variant="body2">• 見積明細: {usage.estimate_items} 件</Typography>}
                {usage.order_items > 0 && <Typography variant="body2">• 受注明細: {usage.order_items} 件</Typography>}
                {usage.products > 0 && <Typography variant="body2">• 商品マスタ: {usage.products} 件</Typography>}
                <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                  ※ 既存データのカテゴリは「未設定」になります
                </Typography>
              </Alert>
            )}
            {totalUsage === 0 && usage.children_count === 0 && (
              <Alert severity="success" icon={false}>
                <Typography variant="body2">どこにも使用されていません。安全にゴミ箱へ移動できます。</Typography>
              </Alert>
            )}
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={deleting}>キャンセル</Button>
        <Button
          variant="contained" color="error" onClick={handleDelete}
          disabled={deleting || loadingUsage}
          startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
        >
          {deleting ? "移動中..." : "ゴミ箱へ移動"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// メインページ — tree state のみ管理
// ─────────────────────────────────────────────
export default function CategoriesPage() {
  const router = useRouter();
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ダイアログの開閉 state のみ（フォーム内容は子コンポーネントで管理）
  const [formDialog, setFormDialog] = useState<{
    open: boolean;
    editTarget: CategoryNode | null;
    parentId: number | null;
    parentType: string | null;
  }>({ open: false, editTarget: null, parentId: null, parentType: null });

  const [deleteTarget, setDeleteTarget] = useState<CategoryNode | null>(null);

  useEffect(() => {
    apiClient.get("/categories/admin-tree/")
      .then(res => setTree(res.data?.results ?? res.data ?? []))
      .catch(() => setError("カテゴリの取得に失敗しました"))
      .finally(() => setLoading(false));
  }, []);

  // useCallback + [] で関数参照を固定 → TreeNode の不要な再レンダリングを防ぐ
  const handleOpenAdd = useCallback((parentId: number | null, pType: string | null) => {
    setFormDialog({ open: true, editTarget: null, parentId, parentType: pType });
  }, []);

  const handleOpenEdit = useCallback((node: CategoryNode) => {
    setFormDialog({ open: true, editTarget: node, parentId: node.parent_id, parentType: null });
  }, []);

  const handleOpenDelete = useCallback((node: CategoryNode) => {
    setDeleteTarget(node);
  }, []);

  const handleCreated = useCallback((node: CategoryNode) => {
    setTree(t => insertNode(t, node.parent_id, node));
  }, []);

  const handleUpdated = useCallback((node: CategoryNode) => {
    setTree(t => updateNodeInTree(t, node));
  }, []);

  const handleDeleted = useCallback((nodeId: number) => {
    setTree(t => removeNodeFromTree(t, nodeId));
  }, []);

  const closeFormDialog = useCallback(() => {
    setFormDialog(d => ({ ...d, open: false }));
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: "auto" }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight="bold">カテゴリ管理</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            見積・受注で使用するカテゴリのツリーを管理します
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined" startIcon={<DeleteSweepIcon />} color="inherit"
            onClick={() => router.push("/dashboard/settings/categories/trash")}
          >
            ゴミ箱
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenAdd(null, null)}>
            ルートカテゴリを追加
          </Button>
        </Stack>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : tree.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: "center" }}>
          <Typography color="text.secondary">カテゴリがありません</Typography>
          <Button variant="outlined" startIcon={<AddIcon />} sx={{ mt: 2 }} onClick={() => handleOpenAdd(null, null)}>
            最初のカテゴリを追加
          </Button>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ p: 1 }}>
          {tree.map((node, i) => (
            <React.Fragment key={node.id}>
              {i > 0 && <Divider sx={{ my: 0.5 }} />}
              <TreeNode
                node={node} depth={0}
                onAdd={handleOpenAdd}
                onEdit={handleOpenEdit}
                onDelete={handleOpenDelete}
              />
            </React.Fragment>
          ))}
        </Paper>
      )}

      {/* ダイアログは別コンポーネント — tree の再レンダリングに影響しない */}
      <CategoryFormDialog
        open={formDialog.open}
        editTarget={formDialog.editTarget}
        initialParentId={formDialog.parentId}
        parentType={formDialog.parentType}
        onClose={closeFormDialog}
        onCreated={handleCreated}
        onUpdated={handleUpdated}
      />

      <CategoryDeleteDialog
        target={deleteTarget}
        onClose={closeDeleteDialog}
        onDeleted={handleDeleted}
      />
    </Box>
  );
}
