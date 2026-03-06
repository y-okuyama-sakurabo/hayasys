"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
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
} from "@mui/material";

import EstimateCategorySelector from "@/components/estimate/EstimateCategorySelector";
import apiClient from "@/lib/apiClient";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (item: any) => void;
  itemType: "accessory" | "fee" | "insurance";
};

export default function ProductSelectModal({
  open,
  onClose,
  onSelect,
  itemType,
}: Props) {
  const [tab, setTab] = useState(0);

  /* ===============================
     category type 自動切替
  =============================== */
  const categoryTypes = useMemo(() => {
    if (itemType === "insurance") return ["insurance"];
    if (itemType === "fee") return ["expense"];
    return ["item", "other"];
  }, [itemType]);

  /* ===============================
     カテゴリ辞書（末端名取得用）
  =============================== */
  const [categoryMap, setCategoryMap] = useState<Record<number, any>>({});

  useEffect(() => {
    apiClient
      .get(
        `/categories/tree/?${categoryTypes
          .map((t) => `type=${t}`)
          .join("&")}`
      )
      .then((res) => {
        const data = res.data?.results || res.data || [];
        const map: Record<number, any> = {};

        const flatten = (nodes: any[], parent: any | null = null) => {
          nodes.forEach((node) => {
            const enriched = { ...node, parent };
            map[node.id] = enriched;

            if (node.children?.length) {
              flatten(node.children, enriched);
            }
          });
        };

        flatten(data);
        setCategoryMap(map);
      });
  }, [categoryTypes]);

  const getLeafName = (categoryId: number | null) => {
    if (!categoryId || !categoryMap[categoryId]) return "";
    return categoryMap[categoryId].name;
  };

  /* ===============================
     共通
  =============================== */
  const buildPayload = (data: any) => ({
    item_type: itemType,
    quantity: 1,
    tax_type: "taxable",
    ...data,
  });

  /* ===============================
     ① カテゴリ → 商品選択
  =============================== */
  const [categoryId1, setCategoryId1] = useState<number | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    if (!categoryId1) {
      setProducts([]);
      return;
    }

    const fetchProducts = async () => {
      try {
        setLoadingProducts(true);
        const res = await apiClient.get(
          `/products/?category=${categoryId1}`
        );
        setProducts(res.data?.results || res.data || []);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, [categoryId1]);

  /* ===============================
     ② 手入力
  =============================== */
  const [categoryId2, setCategoryId2] = useState<number | null>(null);
  const [manualName, setManualName] = useState("");
  const [manualPrice, setManualPrice] = useState<number>(0);

  const handleManualAdd = () => {
    if (!categoryId2 || !manualName.trim() || manualPrice <= 0) {
      alert("入力内容を確認してください");
      return;
    }

    onSelect(
      buildPayload({
        category_id: categoryId2,
        name: manualName,
        unit_price: manualPrice,
      })
    );

    onClose();
  };

  /* ===============================
     ③ 商品検索
  =============================== */
  const [keyword, setKeyword] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!keyword.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        setSearching(true);
        const res = await apiClient.get(
          `/products/?search=${keyword}`
        );
        setSearchResults(res.data?.results || res.data || []);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [keyword]);

  const handleSelectProduct = (product: any) => {
    onSelect(
      buildPayload({
        category_id: product.category?.id ?? null,
        name: product.name,
        unit_price: Number(product.unit_price ?? 0),
        tax_type: product.tax_type ?? "taxable",
      })
    );
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>商品を追加</DialogTitle>

      <DialogContent>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="カテゴリから選択" />
          <Tab label="カテゴリ＋手入力" />
          <Tab label="商品検索" />
        </Tabs>

        {/* ① カテゴリ → 商品選択 */}
        {tab === 0 && (
          <Box>
            <EstimateCategorySelector
              value={categoryId1}
              onChange={(id) => setCategoryId1(id)}
              categoryTypes={categoryTypes}
            />

            {loadingProducts ? (
              <CircularProgress size={24} />
            ) : (
              <List>
                {products.map((p) => (
                  <ListItemButton
                    key={p.id}
                    onClick={() => handleSelectProduct(p)}
                  >
                    <ListItemText
                      primary={p.name}
                      secondary={`¥${Number(
                        p.unit_price
                      ).toLocaleString()}`}
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Box>
        )}

        {/* ② 手入力 */}
        {tab === 1 && (
          <Box>
            <EstimateCategorySelector
              value={categoryId2}
              onChange={(id) => setCategoryId2(id)}
              categoryTypes={categoryTypes}
            />

            <Stack spacing={2} mt={2}>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="商品名"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  fullWidth
                />

                <Button
                  variant="outlined"
                  disabled={!categoryId2}
                  onClick={() =>
                    setManualName(getLeafName(categoryId2))
                  }
                >
                  カテゴリ名を入れる
                </Button>
              </Stack>

              <TextField
                label="単価"
                type="number"
                value={manualPrice}
                onChange={(e) =>
                  setManualPrice(Number(e.target.value))
                }
                fullWidth
              />

              <Button variant="contained" onClick={handleManualAdd}>
                明細に追加
              </Button>
            </Stack>
          </Box>
        )}

        {/* ③ 商品検索 */}
        {tab === 2 && (
          <Box>
            <TextField
              label="商品名検索"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              fullWidth
            />

            {searching && <CircularProgress size={24} />}

            <List>
              {searchResults.map((p) => (
                <ListItemButton
                  key={p.id}
                  onClick={() => handleSelectProduct(p)}
                >
                  <ListItemText
                    primary={p.name}
                    secondary={`¥${Number(
                      p.unit_price
                    ).toLocaleString()}`}
                  />
                </ListItemButton>
              ))}
            </List>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
