"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Box,
  TextField,
  Button,
  List,
  ListItemButton,
  ListItemText,
  CircularProgress,
  Stack,
  Checkbox,
  FormControlLabel,
  Paper,
  MenuItem,
  Alert,
  InputAdornment,
  Typography,
  Divider,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import SearchIcon from "@mui/icons-material/Search";
import EditNoteIcon from "@mui/icons-material/EditNote";
import CategoryIcon from "@mui/icons-material/Category";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";

import CategorySelector from "@/components/sale/CategorySelector";
import CurrencyField from "@/components/sale/CurrencyField";
import apiClient from "@/lib/apiClient";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (item: any) => void;
  itemType: "accessory" | "fee" | "insurance";
  taxType?: "taxable" | "non_taxable";
};

export default function ProductSelectModal({
  open,
  onClose,
  onSelect,
  itemType,
  taxType,
}: Props) {
  const [tab, setTab] = useState(0);

  const categoryTypes = useMemo(() => {
    if (itemType === "insurance") return ["insurance"];
    if (itemType === "fee") return ["expense"];
    return ["item", "other"];
  }, [itemType]);

  // ── state ────────────────────────────────────────────
  const [categoryId1, setCategoryId1] = useState<number | null>(null);
  const [categoryId2, setCategoryId2] = useState<number | null>(null);
  const [manualName, setManualName] = useState("");
  const [manualPrice, setManualPrice] = useState<number | "">("");
  const [keyword, setKeyword] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [categoryMap, setCategoryMap] = useState<Record<number, any>>({});
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [saveAsProduct, setSaveAsProduct] = useState(true);
  const [laborCost, setLaborCost] = useState<number | "">("");
  const [manufacturerId, setManufacturerId] = useState<number | null>(null);
  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // ── リセット ─────────────────────────────────────────
  const resetState = () => {
    setTab(0);
    setCategoryId1(null);
    setCategoryId2(null);
    setManualName("");
    setManualPrice("");
    setKeyword("");
    setSearchResults([]);
    setProducts([]);
    setSuggestions([]);
    setSaveAsProduct(true);
    setLaborCost("");
    setManufacturerId(null);
    setError(null);
  };

  useEffect(() => {
    if (open) resetState();
  }, [open]);

  // ── カテゴリ辞書 ──────────────────────────────────────
  useEffect(() => {
    apiClient
      .get(`/categories/tree/?${categoryTypes.map((t) => `type=${t}`).join("&")}`)
      .then((res) => {
        const data = res.data?.results || res.data || [];
        const map: Record<number, any> = {};
        const flatten = (nodes: any[], parent: any | null = null) => {
          nodes.forEach((node) => {
            map[node.id] = { ...node, parent };
            if (node.children?.length) flatten(node.children, { ...node, parent });
          });
        };
        flatten(data);
        setCategoryMap(map);
      });
  }, [categoryTypes]);

  const getLeafName = (categoryId: number | null) =>
    (categoryId && categoryMap[categoryId]?.name) || "";

  const buildPayload = (data: any) => ({
    item_type: itemType,
    quantity: 1,
    tax_type: taxType ?? "taxable",
    ...data,
  });

  // ── カテゴリ → 商品 ───────────────────────────────────
  useEffect(() => {
    if (!categoryId1) { setProducts([]); return; }
    (async () => {
      try {
        setLoadingProducts(true);
        const res = await apiClient.get(`/products/?category=${categoryId1}`);
        setProducts(res.data?.results || res.data || []);
      } finally {
        setLoadingProducts(false);
      }
    })();
  }, [categoryId1]);

  // ── 商品検索 ──────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!keyword.trim()) { setSearchResults([]); return; }
      try {
        setSearching(true);
        const res = await apiClient.get(
          `/products/?search=${keyword}&${categoryTypes.map((t) => `type=${t}`).join("&")}`
        );
        setSearchResults(res.data?.results || res.data || []);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  // ── サジェスト ────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!manualName.trim()) { setSuggestions([]); return; }
      try {
        const res = await apiClient.get(`/products/search/?q=${manualName}`);
        setSuggestions(res.data);
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [manualName]);

  // ── メーカー（accessoryのみ） ──────────────────────────
  useEffect(() => {
    setManufacturers([]);
    setManufacturerId(null);
    if (!categoryId2 || itemType !== "accessory") return;
    apiClient
      .get(`/masters/manufacturers/?category=${categoryId2}`)
      .then((res) => setManufacturers(res.data || []))
      .catch(() => setManufacturers([]));
  }, [categoryId2, itemType]);

  const handleClose = () => { resetState(); onClose(); };

  // ── 手入力追加 ────────────────────────────────────────
  const handleManualAdd = async () => {
    setError(null);
    if (!categoryId2) { setError("カテゴリを選択してください"); return; }
    if (!manualName.trim()) { setError("商品名を入力してください"); return; }
    if (!manualPrice || Number(manualPrice) <= 0) { setError("単価を入力してください"); return; }

    try {
      setAdding(true);
      let productData = null;

      if (saveAsProduct) {
        const res = await apiClient.post("/products/", {
          name: manualName,
          unit_price: manualPrice,
          category_id: categoryId2,
          tax_type: taxType ?? "taxable",
        });
        productData = res.data;
      }

      onSelect(buildPayload({
        category_id: productData?.category?.id ?? categoryId2,
        name: productData?.name ?? manualName,
        unit_price: Number(productData?.unit_price ?? manualPrice),
        tax_type: productData?.tax_type ?? taxType ?? "taxable",
        labor_cost: Number(laborCost || 0),
        manufacturer: manufacturerId,
      }));

      resetState();
      onClose();
    } catch {
      setError("商品登録に失敗しました");
    } finally {
      setAdding(false);
    }
  };

  // ── 商品選択 ──────────────────────────────────────────
  const handleSelectProduct = (product: any) => {
    onSelect(buildPayload({
      category_id: product.category?.id ?? null,
      name: product.name,
      unit_price: Number(product.unit_price ?? 0),
      tax_type: product.tax_type ?? taxType ?? "taxable",
    }));
    resetState();
    onClose();
  };

  const dialogTitle =
    itemType === "fee" ? "費用を追加" :
    itemType === "insurance" ? "保険を追加" : "商品を追加";

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 0 }}>{dialogTitle}</DialogTitle>

      <DialogContent sx={{ pt: 1, pb: 0 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => { setTab(v); setError(null); }}
          sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
        >
          <Tab label="手入力" icon={<EditNoteIcon fontSize="small" />} iconPosition="start" sx={{ minHeight: 40 }} />
          <Tab label="カテゴリから選択" icon={<CategoryIcon fontSize="small" />} iconPosition="start" sx={{ minHeight: 40 }} />
          <Tab label="商品検索" icon={<SearchIcon fontSize="small" />} iconPosition="start" sx={{ minHeight: 40 }} />
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* ═══ 手入力 ═══ */}
        {tab === 0 && (
          <Stack spacing={2} pb={1}>
            <CategorySelector
              value={categoryId2}
              onChange={(id) => setCategoryId2(id)}
              categoryTypes={categoryTypes}
              taxType={taxType}
            />

            <Stack direction="row" spacing={1} alignItems="flex-start">
              <TextField
                label="商品名 *"
                size="small"
                value={manualName}
                onChange={(e) => { setManualName(e.target.value); setSuggestions([]); }}
                sx={{ flex: 1 }}
              />
              <Button
                variant="outlined"
                size="small"
                disabled={!categoryId2}
                onClick={() => setManualName(getLeafName(categoryId2))}
                sx={{ whiteSpace: "nowrap", height: 40, minWidth: 120 }}
              >
                カテゴリ名を転記
              </Button>
            </Stack>

            {suggestions.length > 0 && (
              <Paper variant="outlined">
                <List dense disablePadding>
                  {suggestions.map((s, i) => (
                    <React.Fragment key={s.id}>
                      {i > 0 && <Divider />}
                      <ListItemButton
                        onClick={() => {
                          setManualName(s.name);
                          setManualPrice(Number(s.unit_price));
                          setCategoryId2(s.category?.id ?? null);
                          setSuggestions([]);
                        }}
                      >
                        <ListItemText
                          primary={s.name}
                          secondary={`¥${Number(s.unit_price).toLocaleString()}`}
                        />
                      </ListItemButton>
                    </React.Fragment>
                  ))}
                </List>
              </Paper>
            )}

            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, sm: itemType === "accessory" ? 6 : 12 }}>
                <CurrencyField
                  label="単価（税込） *"
                  value={manualPrice}
                  onChange={(v) => setManualPrice(v)}
                  required
                  onEnter={handleManualAdd}
                />
              </Grid>

              {itemType === "accessory" && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <CurrencyField
                    label="工賃"
                    value={laborCost}
                    onChange={(v) => setLaborCost(v)}
                  />
                </Grid>
              )}
            </Grid>

            {itemType === "accessory" && (
              <TextField
                select
                label="メーカー"
                size="small"
                value={manufacturerId ?? ""}
                onChange={(e) =>
                  setManufacturerId(e.target.value === "" ? null : Number(e.target.value))
                }
                fullWidth
                disabled={!categoryId2 || manufacturers.length === 0}
                helperText={
                  !categoryId2
                    ? "カテゴリを選択するとメーカーを選べます"
                    : manufacturers.length === 0
                    ? "このカテゴリにはメーカーがありません"
                    : ""
                }
              >
                <MenuItem value="">未選択</MenuItem>
                {manufacturers.map((m) => (
                  <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
                ))}
              </TextField>
            )}

            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={saveAsProduct}
                  onChange={(e) => setSaveAsProduct(e.target.checked)}
                />
              }
              label={<Typography variant="body2">商品マスタにも登録する</Typography>}
            />
          </Stack>
        )}

        {/* ═══ カテゴリから選択 ═══ */}
        {tab === 1 && (
          <Box pb={1}>
            <CategorySelector
              value={categoryId1}
              onChange={(id) => setCategoryId1(id)}
              categoryTypes={categoryTypes}
              taxType={taxType}
            />

            {loadingProducts ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress size={24} />
              </Box>
            ) : products.length > 0 ? (
              <Paper variant="outlined" sx={{ mt: 2 }}>
                <List dense disablePadding>
                  {products.map((p, i) => (
                    <React.Fragment key={p.id}>
                      {i > 0 && <Divider />}
                      <ListItemButton onClick={() => handleSelectProduct(p)}>
                        <ListItemText
                          primary={p.name}
                          secondary={`¥${Number(p.unit_price).toLocaleString()}`}
                        />
                      </ListItemButton>
                    </React.Fragment>
                  ))}
                </List>
              </Paper>
            ) : categoryId1 ? (
              <Box py={4} textAlign="center">
                <Typography variant="body2" color="text.secondary">
                  このカテゴリに商品はありません
                </Typography>
              </Box>
            ) : null}
          </Box>
        )}

        {/* ═══ 商品検索 ═══ */}
        {tab === 2 && (
          <Box pb={1}>
            <TextField
              label="商品名で検索"
              size="small"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              fullWidth
              autoFocus
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    {searching
                      ? <CircularProgress size={16} />
                      : <SearchIcon fontSize="small" color="action" />
                    }
                  </InputAdornment>
                ),
              }}
            />

            {searchResults.length > 0 ? (
              <Paper variant="outlined" sx={{ mt: 2 }}>
                <List dense disablePadding>
                  {searchResults.map((p, i) => (
                    <React.Fragment key={p.id}>
                      {i > 0 && <Divider />}
                      <ListItemButton onClick={() => handleSelectProduct(p)}>
                        <ListItemText
                          primary={p.name}
                          secondary={`¥${Number(p.unit_price).toLocaleString()}`}
                        />
                      </ListItemButton>
                    </React.Fragment>
                  ))}
                </List>
              </Paper>
            ) : keyword && !searching ? (
              <Box py={4} textAlign="center">
                <Typography variant="body2" color="text.secondary">
                  「{keyword}」に一致する商品はありません
                </Typography>
              </Box>
            ) : null}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: "divider" }}>
        <Button onClick={handleClose} color="inherit">
          キャンセル
        </Button>
        {tab === 0 && (
          <Button
            variant="contained"
            onClick={handleManualAdd}
            disabled={adding}
            startIcon={
              adding
                ? <CircularProgress size={16} color="inherit" />
                : <AddShoppingCartIcon />
            }
          >
            {adding ? "追加中..." : "明細に追加"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
