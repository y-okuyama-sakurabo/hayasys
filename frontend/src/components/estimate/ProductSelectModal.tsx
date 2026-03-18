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
     category type
  =============================== */
  const categoryTypes = useMemo(() => {
    if (itemType === "insurance") return ["insurance"];
    if (itemType === "fee") return ["expense"];
    return ["item", "other"];
  }, [itemType]);

  /* ===============================
     state
  =============================== */
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

  /* ===============================
     リセット
  =============================== */
  const resetState = () => {
    setTab(0);
    setCategoryId1(null);
    setCategoryId2(null);
    setManualName("");
    setManualPrice(""); // ←ここ修正
    setKeyword("");
    setSearchResults([]);
    setProducts([]);
  };

  /* ===============================
     open時リセット
  =============================== */
  useEffect(() => {
    if (open) resetState();
  }, [open]);

  /* ===============================
     カテゴリ辞書
  =============================== */
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

  const buildPayload = (data: any) => ({
    item_type: itemType,
    quantity: 1,
    tax_type: "taxable",
    ...data,
  });

  /* ===============================
     カテゴリ → 商品
  =============================== */
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
     商品検索
  =============================== */
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

  /* ===============================
     close
  =============================== */
  const handleClose = () => {
    resetState();
    onClose();
  };

  /* ===============================
     手入力追加
  =============================== */
  const handleManualAdd = () => {
    if (
      !categoryId2 ||
      !manualName.trim() ||
      !manualPrice ||
      manualPrice <= 0
    ) {
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

    resetState();
    onClose();
  };

  /* ===============================
     商品選択
  =============================== */
  const handleSelectProduct = (product: any) => {
    onSelect(
      buildPayload({
        category_id: product.category?.id ?? null,
        name: product.name,
        unit_price: Number(product.unit_price ?? 0),
        tax_type: product.tax_type ?? "taxable",
      })
    );

    resetState();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle>商品を追加</DialogTitle>

      <DialogContent>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="カテゴリ＋手入力" />
          <Tab label="カテゴリから選択" />
          <Tab label="商品検索" />
        </Tabs>

        {/* 手入力 */}
        {tab === 0 && (
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
                placeholder="例: 10000"
                onChange={(e) =>
                  setManualPrice(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleManualAdd();
                }}
                fullWidth
              />

              <Button variant="contained" onClick={handleManualAdd}>
                明細に追加
              </Button>
            </Stack>
          </Box>
        )}

        {/* カテゴリから選択 */}
        {tab === 1 && (
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

        {/* 商品検索 */}
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