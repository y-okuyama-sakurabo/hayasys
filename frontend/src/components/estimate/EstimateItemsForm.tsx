"use client";

import React, { useMemo, useEffect, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Button,
  IconButton,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { Add, Delete } from "@mui/icons-material";

import ProductSelectModal from "@/components/products/ProductSelectModal";

export default function EstimateItemsForm({
  items,
  setItems,
  staffs = [],
  setHasBike,
}: any) {
  // =========================
  // state
  // =========================
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // =========================
  // マスタ
  // =========================
  const taxTypes = [
    { value: "taxable", label: "課税" },
    { value: "non_taxable", label: "非課税" },
  ];

  const saleTypes = [
    { value: "new", label: "新車" },
    { value: "used", label: "中古車" },
    { value: "rental_up", label: "レンタルアップ" },
    { value: "consignment", label: "委託販売" },
  ];

  // =========================
  // カテゴリパンくず
  // =========================
  const buildCategoryBreadcrumb = (category: any) => {
    if (!category) return "";
    const names: string[] = [];
    let current = category;

    while (current) {
      names.unshift(current.name);
      current = current.parent ?? null;
    }
    return names.join(" ＞ ");
  };

  // =========================
  // バイク判定
  // =========================
  useEffect(() => {
    if (!items || items.length === 0) {
      setHasBike(false);
      return;
    }

    const containsBike = items.some((item: any) => {
      let current = item.category;
      while (current) {
        if (current.name === "車両") return true;
        current = current.parent ?? null;
      }
      return false;
    });

    setHasBike(containsBike);
  }, [items, setHasBike]);

  // =========================
  // 値変更
  // =========================
  const handleChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setItems(updated);
  };

  // =========================
  // 明細削除
  // =========================
  const handleDeleteItem = (index: number) => {
    setItems(items.filter((_: any, i: number) => i !== index));
  };

  // =========================
  // 明細追加（空行）
  // =========================
  const handleAddItem = () => {
    setItems((prev: any[]) => [
      ...prev,
      {
        name: "",
        category: null,
        category_id: null,
        quantity: 1,
        unit_price: 0,
        discount: 0,
        tax_type: "taxable",
        sale_type: null,
        staff: null,

        // ★ 初期値必須
        saveAsProduct: false,
      },
    ]);
  };

  // =========================
  // 商品モーダル制御
  // =========================
  const openProductModal = (index: number) => {
    setEditingIndex(index);
    setProductModalOpen(true);
  };

  // =========================
  // 集計
  // =========================
  const { subtotal, tax, total } = useMemo(() => {
    let subtotal = 0;
    let taxable = 0;

    items.forEach((item: any) => {
      const line =
        Number(item.quantity ?? 0) * Number(item.unit_price ?? 0) -
        Number(item.discount ?? 0);

      subtotal += line;
      if (item.tax_type === "taxable") taxable += line;
    });

    const tax = Math.floor(taxable * 0.1);
    return { subtotal, tax, total: subtotal + tax };
  }, [items]);

  // =========================
  // JSX
  // =========================
  return (
    <Box mt={6}>
      <Typography variant="subtitle1" fontWeight="bold" mb={2}>
        見積明細
      </Typography>

      {items.length === 0 && (
        <Typography color="text.secondary" mb={2}>
          「明細を追加」ボタンから明細を追加してください。
        </Typography>
      )}

      {/* ===== 明細行 ===== */}
      {items.map((item: any, index: number) => (
        <Box
          key={index}
          mb={2}
          p={2}
          border="1px solid #ddd"
          borderRadius={2}
          sx={{ backgroundColor: item.name ? "#fff" : "#fafafa" }}
        >
          <Grid container spacing={2} alignItems="center">
            {/* 商品 */}
            <Grid size={{ xs: 12, md: 3 }}>
              {!item.name ? (
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{ height: "56px" }}
                  onClick={() => openProductModal(index)}
                >
                  商品を選択
                </Button>
              ) : (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {buildCategoryBreadcrumb(item.category)}
                  </Typography>

                  <Typography fontWeight="bold">
                    {item.name}
                  </Typography>

                  <Button
                    size="small"
                    sx={{ mt: 0.5, p: 0 }}
                    onClick={() => openProductModal(index)}
                  >
                    商品を変更
                  </Button>
                </Box>
              )}
            </Grid>

            {/* 数量 */}
            <Grid size={{ xs: 6, md: 1.2 }}>
              <TextField
                label="数量"
                type="number"
                value={item.quantity}
                onChange={(e) =>
                  handleChange(index, "quantity", Number(e.target.value))
                }
                fullWidth
              />
            </Grid>

            {/* 単価 */}
            <Grid size={{ xs: 6, md: 1.2 }}>
              <TextField
                label="単価"
                type="number"
                value={item.unit_price}
                onChange={(e) =>
                  handleChange(index, "unit_price", Number(e.target.value))
                }
                fullWidth
              />
            </Grid>

            {/* 小計 */}
            <Grid size={{ xs: 6, md: 1.2 }}>
              <TextField
                label="小計"
                value={
                  Number(item.quantity) * Number(item.unit_price) -
                  Number(item.discount)
                }
                InputProps={{ readOnly: true }}
                fullWidth
              />
            </Grid>

            {/* 値引き */}
            <Grid size={{ xs: 6, md: 1.2 }}>
              <TextField
                label="値引き"
                type="number"
                value={item.discount}
                onChange={(e) =>
                  handleChange(index, "discount", Number(e.target.value))
                }
                fullWidth
              />
            </Grid>

            {/* 課税区分 */}
            <Grid size={{ xs: 6, md: 1.2 }}>
              <TextField
                select
                label="課税区分"
                value={item.tax_type}
                onChange={(e) =>
                  handleChange(index, "tax_type", e.target.value)
                }
                fullWidth
              >
                {taxTypes.map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* 販売区分 */}
            <Grid size={{ xs: 6, md: 1.5 }}>
              <TextField
                select
                label="区分"
                value={item.sale_type ?? ""}
                onChange={(e) =>
                  handleChange(index, "sale_type", e.target.value || null)
                }
                fullWidth
              >
                <MenuItem value="">未指定</MenuItem>
                {saleTypes.map((s) => (
                  <MenuItem key={s.value} value={s.value}>
                    {s.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* 担当者 */}
            <Grid size={{ xs: 6, md: 1.8 }}>
              <TextField
                select
                label="担当者"
                value={item.staff ?? ""}
                onChange={(e) =>
                  handleChange(index, "staff", e.target.value)
                }
                fullWidth
              >
                {staffs.map((s: any) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.display_name ?? s.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* 削除 */}
            <Grid size={{ xs: 12, md: 0.6 }} textAlign="center">
              <IconButton
                color="error"
                onClick={() => handleDeleteItem(index)}
              >
                <Delete />
              </IconButton>
            </Grid>
          </Grid>
        </Box>
      ))}

      {/* ===== 明細追加 ===== */}
      <Button
        variant="outlined"
        startIcon={<Add />}
        onClick={handleAddItem}
        sx={{ mt: 2 }}
      >
        明細を追加
      </Button>

      {/* ===== 集計 ===== */}
      <Box mt={4} textAlign="right">
        <Typography>小計：¥{subtotal.toLocaleString()}</Typography>
        <Typography>消費税：¥{tax.toLocaleString()}</Typography>
        <Typography
          variant="h6"
          fontWeight="bold"
          sx={{ mt: 1, borderTop: "1px solid #ccc", pt: 1 }}
        >
          合計：¥{total.toLocaleString()}
        </Typography>
      </Box>

      {/* ===== 商品選択モーダル ===== */}
      <ProductSelectModal
        open={productModalOpen}
        onClose={() => {
          setProductModalOpen(false);
          setEditingIndex(null);
        }}
        onSelect={(selected: any) => {
          if (editingIndex === null) return;

          const updated = [...items];
          updated[editingIndex] = {
            ...updated[editingIndex],
            name: selected.name,
            category: selected.category,
            category_id: selected.category?.id ?? null,
            unit_price: selected.unit_price ?? 0,
            tax_type: selected.tax_type ?? "taxable",

            // ★ ここが最重要
            saveAsProduct: selected.saveAsProduct === true,
          };

          console.log("🟢 selected:", selected);
          console.log("🟢 stored item:", updated[editingIndex]);

          setItems(updated);
          setProductModalOpen(false);
          setEditingIndex(null);
        }}
      />
    </Box>
  );
}
