"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Collapse,
  Chip,
  Stack,
  Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import FolderIcon from "@mui/icons-material/Folder";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
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
  { value: "vehicle",   label: "車両" },
  { value: "item",      label: "商品" },
  { value: "expense",   label: "費用" },
  { value: "insurance", label: "保険" },
  { value: "other",     label: "その他" },
];

const TAX_TYPES = [
  { value: "taxable",     label: "課税" },
  { value: "non_taxable", label: "非課税" },
];

const TYPE_COLORS: Record<string, string> = {
  vehicle:   "#1976d2",
  item:      "#2e7d32",
  expense:   "#e65100",
  insurance: "#6a1b9a",
  other:     "#5d4037",
};

const emptyForm = (): FormData => ({
  name: "",
  parent_id: null,
  category_type: "",
  tax_type: "",
  sort_order: 0,
});

// ─────────────────────────────────────────────
// ツリーノードコンポーネント
// ─────────────────────────────────────────────
type NodeProps = {
  node: CategoryNode;
  depth: number;
  onAdd: (parentId: number, parentType: string | null) => void;
  onEdit: (node: CategoryNode) => void;
  onDelete: (node: CategoryNode) => void;
};

function TreeNode({ node, depth, onAdd, onEdit, onDelete }: NodeProps) {
  const [open, setOpen] = useState(depth === 0);
  const hasChildren = node.children.length > 0;

  return (
    <Box>
      <Box
        display="flex"
        alignItems="center"
        sx={{
          pl: depth * 2.5 + 1,
          pr: 1,
          py: 0.5,
          borderRadius: 1,
          "&:hover": { bgcolor: "action.hover" },
          "&:hover .node-actions": { opacity: 1 },
        }}
      >
        {/* 展開ボタン */}
        <IconButton
          size="small"
          onClick={() => setOpen((o) => !o)}
          sx={{ mr: 0.5, visibility: hasChildren ? "visible" : "hidden" }}
        >
          {open ? (
            <ExpandMoreIcon fontSize="small" />
          ) : (
            <ChevronRightIcon fontSize="small" />
          )}
        </IconButton>

        {/* フォルダアイコン */}
        {open && hasChildren ? (
          <FolderOpenIcon fontSize="small" sx={{ mr: 1, color: "warning.main", flexShrink: 0 }} />
        ) : (
          <FolderIcon fontSize="small" sx={{ mr: 1, color: hasChildren ? "warning.main" : "action.disabled", flexShrink: 0 }} />
        )}

        {/* カテゴリ名 */}
        <Typography variant="body2" sx={{ flexGrow: 1, fontWeight: depth === 0 ? 600 : 400 }}>
          {node.name}
        </Typography>

        {/* ルートのタイプチップ */}
        {depth === 0 && node.category_type && (
          <Chip
            label={CATEGORY_TYPES.find((t) => t.value === node.category_type)?.label ?? node.category_type}
            size="small"
            sx={{
              mr: 1,
              height: 20,
              fontSize: 11,
              bgcolor: TYPE_COLORS[node.category_type] + "20",
              color: TYPE_COLORS[node.category_type],
              border: `1px solid ${TYPE_COLORS[node.category_type]}40`,
            }}
          />
        )}

        {/* 税区分チップ */}
        {node.tax_type && (
          <Chip
            label={node.tax_type === "taxable" ? "課税" : "非課税"}
            size="small"
            color={node.tax_type === "taxable" ? "default" : "warning"}
            variant="outlined"
            sx={{ mr: 1, height: 20, fontSize: 11 }}
          />
        )}

        {/* アクションボタン */}
        <Stack
          direction="row"
          spacing={0.25}
          className="node-actions"
          sx={{ opacity: 0, transition: "opacity 0.15s" }}
        >
          <Tooltip title="子カテゴリを追加">
            <IconButton
              size="small"
              color="primary"
              onClick={() => onAdd(node.id, node.category_type)}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="編集">
            <IconButton size="small" onClick={() => onEdit(node)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="削除">
            <IconButton size="small" color="error" onClick={() => onDelete(node)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* 子ノード */}
      <Collapse in={open}>
        {node.children.map((child) => (
          <TreeNode
            key={child.id}
            node={child}
            depth={depth + 1}
            onAdd={onAdd}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </Collapse>
    </Box>
  );
}

// ─────────────────────────────────────────────
// メインページ
// ─────────────────────────────────────────────
export default function CategoriesPage() {
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 追加・編集ダイアログ
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CategoryNode | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm());
  const [parentType, setParentType] = useState<string | null>(null); // 親のcategory_type
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // 削除ダイアログ
  const [deleteTarget, setDeleteTarget] = useState<CategoryNode | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── ツリー取得 ─────────────────────────────
  const fetchTree = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/categories/admin-tree/");
      setTree(res.data?.results ?? res.data ?? []);
    } catch {
      setError("カテゴリの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTree(); }, [fetchTree]);

  // ── 追加ダイアログを開く ──────────────────
  const handleOpenAdd = (parentId: number | null, pType: string | null) => {
    setEditTarget(null);
    setParentType(pType);
    setForm({ ...emptyForm(), parent_id: parentId });
    setFormError(null);
    setDialogOpen(true);
  };

  // ── 編集ダイアログを開く ──────────────────
  const handleOpenEdit = (node: CategoryNode) => {
    setEditTarget(node);
    setParentType(null);
    setForm({
      name:          node.name,
      parent_id:     node.parent_id,
      category_type: node.category_type ?? "",
      tax_type:      node.tax_type ?? "",
      sort_order:    node.sort_order,
    });
    setFormError(null);
    setDialogOpen(true);
  };

  // ── 保存 ─────────────────────────────────
  const handleSave = async () => {
    setFormError(null);
    if (!form.name.trim()) { setFormError("カテゴリ名を入力してください"); return; }

    const payload: Record<string, any> = {
      name:       form.name.trim(),
      parent:     form.parent_id,
      tax_type:   form.tax_type || null,
      sort_order: form.sort_order,
    };

    // category_type はルートカテゴリのみ（parent_id が null）
    if (!form.parent_id) {
      if (!form.category_type) { setFormError("カテゴリ種別を選択してください"); return; }
      payload.category_type = form.category_type;
    } else {
      payload.category_type = null;
    }

    try {
      setSaving(true);
      if (editTarget) {
        await apiClient.patch(`/categories/${editTarget.id}/`, payload);
      } else {
        await apiClient.post("/categories/create/", payload);
      }
      setDialogOpen(false);
      fetchTree();
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.name)   setFormError(data.name[0] ?? "エラーが発生しました");
      else if (data?.parent) setFormError(data.parent[0] ?? "エラーが発生しました");
      else               setFormError("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  // ── 削除ダイアログを開く ──────────────────
  const handleOpenDelete = async (node: CategoryNode) => {
    setDeleteTarget(node);
    setUsage(null);
    setLoadingUsage(true);
    try {
      const res = await apiClient.get(`/categories/${node.id}/usage/`);
      setUsage(res.data);
    } catch {
      setUsage(null);
    } finally {
      setLoadingUsage(false);
    }
  };

  // ── 削除実行 ──────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await apiClient.delete(`/categories/${deleteTarget.id}/`);
      setDeleteTarget(null);
      setUsage(null);
      fetchTree();
    } catch {
      setDeleting(false);
    }
  };

  const totalUsage = usage
    ? usage.estimate_items + usage.order_items + usage.products
    : 0;

  // ─────────────────────────────────────────
  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: "auto" }}>
      {/* ヘッダー */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            カテゴリ管理
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            見積・受注で使用するカテゴリのツリーを管理します
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenAdd(null, null)}
        >
          ルートカテゴリを追加
        </Button>
      </Box>

      {/* ツリー本体 */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : tree.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: "center" }}>
          <Typography color="text.secondary">カテゴリがありません</Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            sx={{ mt: 2 }}
            onClick={() => handleOpenAdd(null, null)}
          >
            最初のカテゴリを追加
          </Button>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ p: 1 }}>
          {tree.map((node, i) => (
            <React.Fragment key={node.id}>
              {i > 0 && <Divider sx={{ my: 0.5 }} />}
              <TreeNode
                node={node}
                depth={0}
                onAdd={handleOpenAdd}
                onEdit={handleOpenEdit}
                onDelete={handleOpenDelete}
              />
            </React.Fragment>
          ))}
        </Paper>
      )}

      {/* ═══ 追加・編集ダイアログ ═══ */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {editTarget ? "カテゴリを編集" : "カテゴリを追加"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} pt={1}>
            {formError && (
              <Alert severity="error" onClose={() => setFormError(null)}>
                {formError}
              </Alert>
            )}

            <TextField
              label="カテゴリ名 *"
              size="small"
              fullWidth
              autoFocus
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />

            {/* category_type — ルートカテゴリのみ */}
            {!form.parent_id && (
              <TextField
                select
                label="カテゴリ種別 *"
                size="small"
                fullWidth
                value={form.category_type}
                onChange={(e) => setForm((f) => ({ ...f, category_type: e.target.value }))}
                helperText="最上位カテゴリのみ設定できます"
              >
                <MenuItem value="">選択してください</MenuItem>
                {CATEGORY_TYPES.map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </TextField>
            )}

            {/* 税区分 */}
            <TextField
              select
              label="税区分"
              size="small"
              fullWidth
              value={form.tax_type}
              onChange={(e) => setForm((f) => ({ ...f, tax_type: e.target.value }))}
              helperText={parentType ? `親カテゴリの種別: ${CATEGORY_TYPES.find(t => t.value === parentType)?.label ?? parentType}` : ""}
            >
              <MenuItem value="">未設定（親から継承）</MenuItem>
              {TAX_TYPES.map((t) => (
                <MenuItem key={t.value} value={t.value}>
                  {t.label}
                </MenuItem>
              ))}
            </TextField>

          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">
            キャンセル
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {saving ? "保存中..." : "保存"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══ 削除確認ダイアログ ═══ */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmberIcon color="warning" />
          カテゴリを削除しますか？
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" mb={2}>
            <strong>「{deleteTarget?.name}」</strong> を削除します。
          </Typography>

          {loadingUsage ? (
            <Box display="flex" justifyContent="center" py={2}>
              <CircularProgress size={24} />
            </Box>
          ) : usage ? (
            <Stack spacing={1}>
              {usage.children_count > 0 && (
                <Alert severity="error" icon={false}>
                  <Typography variant="body2" fontWeight="bold">
                    子カテゴリ {usage.children_count} 件も一緒に削除されます
                  </Typography>
                </Alert>
              )}

              {totalUsage > 0 ? (
                <Alert severity="warning" icon={false}>
                  <Typography variant="body2" fontWeight="bold" mb={0.5}>
                    このカテゴリは以下で使用されています
                  </Typography>
                  {usage.estimate_items > 0 && (
                    <Typography variant="body2">
                      • 見積明細: {usage.estimate_items} 件
                    </Typography>
                  )}
                  {usage.order_items > 0 && (
                    <Typography variant="body2">
                      • 受注明細: {usage.order_items} 件
                    </Typography>
                  )}
                  {usage.products > 0 && (
                    <Typography variant="body2">
                      • 商品マスタ: {usage.products} 件
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                    ※ 削除しても既存データのカテゴリは「未設定」になります
                  </Typography>
                </Alert>
              ) : (
                usage.children_count === 0 && (
                  <Alert severity="success" icon={false}>
                    <Typography variant="body2">
                      このカテゴリはどこにも使用されていません。安全に削除できます。
                    </Typography>
                  </Alert>
                )
              )}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteTarget(null)}
            color="inherit"
            disabled={deleting}
          >
            キャンセル
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleting || loadingUsage}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
          >
            {deleting ? "削除中..." : "削除する"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
