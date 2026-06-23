"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, FormControl, IconButton,
  InputAdornment, InputLabel, MenuItem, Paper, Select, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, TextField,
  ToggleButton, ToggleButtonGroup, Tooltip, Typography, Alert,
} from "@mui/material";
import AddIcon            from "@mui/icons-material/Add";
import EditIcon           from "@mui/icons-material/Edit";
import DeleteIcon         from "@mui/icons-material/Delete";
import DeleteForeverIcon  from "@mui/icons-material/DeleteForever";
import RestoreIcon        from "@mui/icons-material/Restore";
import SearchIcon         from "@mui/icons-material/Search";
import InventoryIcon      from "@mui/icons-material/Inventory2";
import apiClient from "@/lib/apiClient";

// ─── 型 ───────────────────────────────────────────
type Category = { id: number; name: string; parent: Category | null };
type Manufacturer = { id: number; name: string };
type Product = {
  id: number;
  name: string;
  unit_price: string;
  tax_type: "taxable" | "non_taxable";
  is_active: boolean;
  category: Category | null;
  category_id: number | null;
  manufacturer: number | null;
  manufacturer_detail: Manufacturer | null;
};

// ─── 定数 ──────────────────────────────────────────
const CATEGORY_TYPES = [
  { value: "",                  label: "すべて" },
  { value: "vehicle",           label: "車両" },
  { value: "other",             label: "その他" },
  { value: "taxable_expense",   label: "課税費用" },
  { value: "non_taxable_expense", label: "非課税費用" },
];

const TAX_LABELS: Record<string, string> = {
  taxable:     "課税",
  non_taxable: "非課税",
};

function categoryPath(cat: Category | null): string {
  if (!cat) return "—";
  const parts: string[] = [];
  let c: Category | null = cat;
  while (c) { parts.unshift(c.name); c = c.parent; }
  return parts.join(" › ");
}

// ─── フォームダイアログ ────────────────────────────
type FormData = {
  name: string;
  category_id: number | null;
  manufacturer: number | null;
  unit_price: string;
  tax_type: "taxable" | "non_taxable";
  is_active: boolean;
};

function emptyForm(): FormData {
  return { name: "", category_id: null, manufacturer: null, unit_price: "0", tax_type: "taxable", is_active: true };
}

function ProductFormDialog({
  open, target, onClose, onSaved,
}: {
  open: boolean;
  target: Product | null;
  onClose: () => void;
  onSaved: (p: Product) => void;
}) {
  const [form, setForm] = useState<FormData>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(target
      ? {
          name: target.name,
          category_id: target.category?.id ?? null,
          manufacturer: target.manufacturer ?? null,
          unit_price: target.unit_price,
          tax_type: target.tax_type,
          is_active: target.is_active,
        }
      : emptyForm()
    );
  }, [open, target]);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      apiClient.get("/categories/tree/"),
      apiClient.get("/masters/manufacturers/"),
    ]).then(([catRes, mfrRes]) => {
      const flattenCats = (nodes: any[], parent: any = null): Category[] =>
        nodes.flatMap(n => [
          { id: n.id, name: n.name, parent },
          ...flattenCats(n.children ?? [], { id: n.id, name: n.name, parent }),
        ]);
      setCategories(flattenCats(catRes.data?.results ?? catRes.data ?? []));
      setManufacturers(mfrRes.data?.results ?? mfrRes.data ?? []);
    });
  }, [open]);

  const set = (k: keyof FormData) => (e: any) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.name.trim()) { setError("商品名を入力してください"); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        category_id: form.category_id,
        manufacturer: form.manufacturer,
        unit_price: form.unit_price,
        tax_type: form.tax_type,
        is_active: form.is_active,
      };
      const res = target
        ? await apiClient.patch(`/products/${target.id}/`, payload)
        : await apiClient.post("/products/", payload);
      onSaved(res.data);
      onClose();
    } catch (e: any) {
      const d = e?.response?.data;
      setError(d?.name?.[0] ?? d?.detail ?? "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog key={target ? `edit-${target.id}` : "create"} open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{target ? "商品を編集" : "商品を追加"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} pt={1}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField label="商品名 *" size="small" fullWidth value={form.name} onChange={set("name")} autoFocus />

          <FormControl size="small" fullWidth>
            <InputLabel>カテゴリ</InputLabel>
            <Select value={form.category_id ?? ""} label="カテゴリ" onChange={e => setForm(p => ({ ...p, category_id: e.target.value as number || null }))}>
              <MenuItem value="">未設定</MenuItem>
              {categories.map(c => (
                <MenuItem key={c.id} value={c.id}>
                  <Typography variant="body2">{categoryPath(c)}</Typography>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel>メーカー</InputLabel>
            <Select value={form.manufacturer ?? ""} label="メーカー" onChange={e => setForm(p => ({ ...p, manufacturer: e.target.value as number || null }))}>
              <MenuItem value="">未設定</MenuItem>
              {manufacturers.map(m => (
                <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="単価（税込）"
            size="small"
            fullWidth
            type="number"
            value={form.unit_price}
            onChange={set("unit_price")}
            InputProps={{ startAdornment: <InputAdornment position="start">¥</InputAdornment> }}
          />

          <FormControl size="small" fullWidth>
            <InputLabel>税区分</InputLabel>
            <Select value={form.tax_type} label="税区分" onChange={set("tax_type")}>
              <MenuItem value="taxable">課税</MenuItem>
              <MenuItem value="non_taxable">非課税</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel>状態</InputLabel>
            <Select value={form.is_active ? "true" : "false"} label="状態"
              onChange={e => setForm(p => ({ ...p, is_active: e.target.value === "true" }))}>
              <MenuItem value="true">有効</MenuItem>
              <MenuItem value="false">無効</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">キャンセル</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}>
          {saving ? "保存中..." : "保存"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── 削除確認ダイアログ ────────────────────────────
// 無効化ダイアログ（有効→無効）
function DeactivateDialog({ target, onClose, onUpdated }: {
  target: Product | null;
  onClose: () => void;
  onUpdated: (p: Product) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (!target) setError(null); }, [target]);

  const handle = async () => {
    if (!target?.id) return;
    setSaving(true); setError(null);
    try {
      const res = await apiClient.patch(`/products/${target.id}/`, { is_active: false });
      onUpdated(res.data);
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "無効化に失敗しました");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={!!target} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>商品を無効にしますか？</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: error ? 1.5 : 0 }}>
          <strong>「{target?.name}」</strong> を無効にします。見積・受注の選択候補から外れます。
        </Alert>
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">キャンセル</Button>
        <Button variant="contained" color="warning" onClick={handle} disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}>
          {saving ? "処理中..." : "無効にする"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// 復元ダイアログ（無効→有効）
function RestoreDialog({ target, onClose, onUpdated }: {
  target: Product | null;
  onClose: () => void;
  onUpdated: (p: Product) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (!target) setError(null); }, [target]);

  const handle = async () => {
    if (!target?.id) return;
    setSaving(true); setError(null);
    try {
      const res = await apiClient.patch(`/products/${target.id}/`, { is_active: true });
      onUpdated(res.data);
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "復元に失敗しました");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={!!target} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>商品を復元しますか？</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: error ? 1.5 : 0 }}>
          <strong>「{target?.name}」</strong> を有効に戻します。
        </Alert>
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">キャンセル</Button>
        <Button variant="contained" color="primary" onClick={handle} disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <RestoreIcon />}>
          {saving ? "処理中..." : "復元する"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// 完全削除ダイアログ
function HardDeleteDialog({ target, onClose, onDeleted }: {
  target: Product | null;
  onClose: () => void;
  onDeleted: (id: number) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (!target) setError(null); }, [target]);

  const handle = async () => {
    if (!target?.id) return;
    setDeleting(true); setError(null);
    try {
      await apiClient.delete(`/products/${target.id}/`);
      onDeleted(target.id);
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "削除に失敗しました");
    } finally { setDeleting(false); }
  };

  return (
    <Dialog open={!!target} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>完全削除しますか？</DialogTitle>
      <DialogContent>
        <Alert severity="error" sx={{ mb: error ? 1.5 : 0 }}>
          <strong>「{target?.name}」</strong> を完全削除します。この操作は取り消せません。
        </Alert>
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">キャンセル</Button>
        <Button variant="contained" color="error" onClick={handle} disabled={deleting}
          startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteForeverIcon />}>
          {deleting ? "削除中..." : "完全削除"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── メインページ ──────────────────────────────────
export default function ProductsPage() {
  const [products, setProducts]         = useState<Product[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [searchInput, setSearchInput]   = useState("");
  const [categoryType, setCategoryType] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">("true");
  const [formOpen, setFormOpen]               = useState(false);
  const [editTarget, setEditTarget]           = useState<Product | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Product | null>(null);
  const [restoreTarget, setRestoreTarget]     = useState<Product | null>(null);
  const [hardDeleteTarget, setHardDeleteTarget] = useState<Product | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search)       params.search        = search;
      if (categoryType) params.category_type = categoryType;
      if (activeFilter !== "all") params.is_active = activeFilter;
      const res = await apiClient.get("/products/admin/", { params });
      setProducts(res.data?.results ?? res.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [search, categoryType, activeFilter]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleSearchChange = (v: string) => {
    setSearchInput(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(v), 400);
  };

  const handleSaved = (p: Product) => {
    setProducts(prev => {
      const idx = prev.findIndex(x => x.id === p.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = p; return next; }
      return [p, ...prev];
    });
  };

  const handleUpdated = (p: Product) => {
    setProducts(prev => {
      const idx = prev.findIndex(x => x.id === p.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = p; return next; }
      return prev;
    });
  };

  const handleHardDeleted = (id: number) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* ヘッダー */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Stack direction="row" alignItems="center" gap={1.5}>
          <InventoryIcon color="primary" />
          <Box>
            <Typography variant="h5" fontWeight="bold">商品管理</Typography>
            <Typography variant="body2" color="text.secondary">商品マスタの管理</Typography>
          </Box>
        </Stack>
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={() => { setEditTarget(null); setFormOpen(true); }}>
          商品を追加
        </Button>
      </Stack>

      {/* フィルター */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
          <TextField
            size="small"
            placeholder="商品名で検索"
            value={searchInput}
            onChange={e => handleSearchChange(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            sx={{ minWidth: 220 }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>カテゴリ種別</InputLabel>
            <Select value={categoryType} label="カテゴリ種別" onChange={e => setCategoryType(e.target.value)}>
              {CATEGORY_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
            </Select>
          </FormControl>
          <ToggleButtonGroup
            exclusive size="small"
            value={activeFilter}
            onChange={(_, v) => { if (v) setActiveFilter(v); }}
          >
            <ToggleButton value="true">有効のみ</ToggleButton>
            <ToggleButton value="all">すべて</ToggleButton>
            <ToggleButton value="false">無効のみ</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Paper>

      {/* テーブル */}
      <Paper variant="outlined">
        {loading ? (
          <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
        ) : products.length === 0 ? (
          <Box textAlign="center" py={8}>
            <Typography color="text.secondary">商品が見つかりません</Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell sx={{ fontWeight: "bold" }}>商品名</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>カテゴリ</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>メーカー</TableCell>
                <TableCell sx={{ fontWeight: "bold", width: 110 }} align="right">単価（税込）</TableCell>
                <TableCell sx={{ fontWeight: "bold", width: 80 }} align="center">税区分</TableCell>
                <TableCell sx={{ fontWeight: "bold", width: 70 }} align="center">状態</TableCell>
                <TableCell sx={{ width: 80 }} align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map(p => (
                <TableRow key={p.id} hover sx={{ opacity: p.is_active ? 1 : 0.5 }}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>{p.name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {categoryPath(p.category)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {p.manufacturer_detail?.name ?? "—"}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      ¥{Number(p.unit_price).toLocaleString("ja-JP")}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={TAX_LABELS[p.tax_type] ?? p.tax_type}
                      size="small"
                      variant="outlined"
                      color={p.tax_type === "taxable" ? "default" : "warning"}
                      sx={{ height: 20, fontSize: 11 }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={p.is_active ? "有効" : "無効"}
                      size="small"
                      color={p.is_active ? "success" : "default"}
                      variant={p.is_active ? "filled" : "outlined"}
                      sx={{ height: 20, fontSize: 11 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="編集">
                      <IconButton size="small" onClick={() => { setEditTarget(p); setFormOpen(true); }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {p.is_active ? (
                      <Tooltip title="無効にする">
                        <IconButton size="small" color="warning" onClick={() => setDeactivateTarget(p)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <>
                        <Tooltip title="復元">
                          <IconButton size="small" color="primary" onClick={() => setRestoreTarget(p)}>
                            <RestoreIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="完全削除">
                          <IconButton size="small" color="error" onClick={() => setHardDeleteTarget(p)}>
                            <DeleteForeverIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <ProductFormDialog
        open={formOpen}
        target={editTarget}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />
      <DeactivateDialog
        target={deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onUpdated={handleUpdated}
      />
      <RestoreDialog
        target={restoreTarget}
        onClose={() => setRestoreTarget(null)}
        onUpdated={handleUpdated}
      />
      <HardDeleteDialog
        target={hardDeleteTarget}
        onClose={() => setHardDeleteTarget(null)}
        onDeleted={handleHardDeleted}
      />
    </Box>
  );
}
