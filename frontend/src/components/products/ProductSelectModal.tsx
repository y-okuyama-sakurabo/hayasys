"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Tabs,
  Tab,
  Box,
  TextField,
  Button,
  Autocomplete,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  Typography,
  List,
  ListItemButton,
  ListItemText,
} from "@mui/material";

import apiClient from "@/lib/apiClient";
import EstimateCategorySelector from "@/components/estimate/EstimateCategorySelector";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (item: {
    name: string;
    unit_price: number;
    category: any;
    category_id: number | null;
    tax_type: "taxable" | "non_taxable";
    saveAsProduct: boolean;
  }) => void;
};

export default function ProductSelectModal({
  open,
  onClose,
  onSelect,
}: Props) {
  const [tab, setTab] = useState(0);

  // ==================================================
  // 商品検索（名前検索）
  // ==================================================
  const [keyword, setKeyword] = useState("");
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!keyword) {
      setOptions([]);
      return;
    }

    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get("/products/search/", {
          params: { q: keyword },
        });
        setOptions(res.data.results || res.data || []);
      } catch (e) {
        console.error("商品検索エラー:", e);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchProducts, 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  // ==================================================
  // カテゴリから選択
  // ==================================================
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [categoryProducts, setCategoryProducts] = useState<any[]>([]);
  const [loadingCategoryProducts, setLoadingCategoryProducts] =
    useState(false);

  useEffect(() => {
    if (!selectedCategory?.id) {
      setCategoryProducts([]);
      return;
    }

    const fetchByCategory = async () => {
      setLoadingCategoryProducts(true);
      try {
        const res = await apiClient.get("/products/", {
          params: { category: selectedCategory.id },
        });
        setCategoryProducts(res.data.results || res.data || []);
      } catch (e) {
        console.error("カテゴリ商品取得エラー:", e);
      } finally {
        setLoadingCategoryProducts(false);
      }
    };

    fetchByCategory();
  }, [selectedCategory]);

  // ==================================================
  // 手入力
  // ==================================================
  const [manual, setManual] = useState({
    name: "",
    category: null as any,
    unit_price: "",
    tax_type: "taxable" as "taxable" | "non_taxable",
    saveAsProduct: false,
  });

  const handleManualAdd = () => {
    onSelect({
      name: manual.name,
      unit_price: Number(manual.unit_price),
      category: manual.category,
      category_id: manual.category?.id ?? null,
      tax_type: manual.tax_type,
      saveAsProduct: manual.saveAsProduct,
    });
    onClose();
  };

  // ==================================================
  // JSX
  // ==================================================
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>商品を選択</DialogTitle>

      <DialogContent>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="商品検索" />
          <Tab label="カテゴリから選択" />
          <Tab label="手入力で追加" />
        </Tabs>

        {/* =========================
            商品検索
        ========================= */}
        {tab === 0 && (
          <Autocomplete
            options={options}
            filterOptions={(x) => x} // ← ★これを追加
            getOptionLabel={(o) => o.name || ""}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            loading={loading}
            onInputChange={(_, v) => setKeyword(v)}
            onChange={(_, v) => {
              if (!v) return;

              onSelect({
                name: v.name,
                unit_price: v.unit_price,
                category: v.category,
                category_id: v.category?.id ?? null,
                tax_type: v.tax_type ?? "taxable",
                saveAsProduct: false,
              });
              onClose();
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="商品名で検索"
                fullWidth
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loading && <CircularProgress size={18} />}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
        )}


        {/* =========================
            カテゴリから選択
        ========================= */}
        {tab === 1 && (
          <Box display="flex" flexDirection="column" gap={2}>
            <EstimateCategorySelector
              value={selectedCategory}
              onChange={(cat) => setSelectedCategory(cat)}
            />

            {loadingCategoryProducts && (
              <Box textAlign="center">
                <CircularProgress size={24} />
              </Box>
            )}

            {!loadingCategoryProducts &&
              selectedCategory &&
              categoryProducts.length === 0 && (
                <Typography color="text.secondary">
                  このカテゴリには商品がありません
                </Typography>
              )}

            <List>
              {categoryProducts.map((p) => (
                <ListItemButton
                  key={p.id}
                  onClick={() => {
                    onSelect({
                      name: p.name,
                      unit_price: p.unit_price,
                      category: p.category,
                      category_id: p.category?.id ?? null,
                      tax_type: p.tax_type ?? "taxable",
                      saveAsProduct: false,
                    });
                    onClose();
                  }}
                >
                  <ListItemText
                    primary={p.name}
                    secondary={`¥${Number(p.unit_price).toLocaleString()}`}
                  />
                </ListItemButton>
              ))}
            </List>
          </Box>
        )}

        {/* =========================
            手入力
        ========================= */}
        {tab === 2 && (
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              label="商品名"
              value={manual.name}
              onChange={(e) =>
                setManual({ ...manual, name: e.target.value })
              }
              fullWidth
            />

            <EstimateCategorySelector
              value={manual.category}
              onChange={(c: any) =>
                setManual({ ...manual, category: c })
              }
            />

            <TextField
              label="単価"
              type="number"
              value={manual.unit_price}
              onChange={(e) =>
                setManual({ ...manual, unit_price: e.target.value })
              }
              fullWidth
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={manual.saveAsProduct}
                  onChange={(e) =>
                    setManual({
                      ...manual,
                      saveAsProduct: e.target.checked,
                    })
                  }
                />
              }
              label="今後も使う商品として登録する"
            />

            <Button
              variant="contained"
              disabled={!manual.name || !manual.unit_price}
              onClick={handleManualAdd}
            >
              明細に追加
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
