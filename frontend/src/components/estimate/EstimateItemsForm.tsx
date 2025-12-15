"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Box,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Button,
  IconButton,
  Paper,
} from "@mui/material";
import { Add, Delete } from "@mui/icons-material";
import ProductSelectModal from "./ProductSelectModal";
import VehicleInfoForm from "./VehicleInfoForm";

export default function EstimateItemsForm({
  items,
  setItems,
  staffs = [],
  estimateId,
  formData,
  setFormData,
  setHasBike, // 👈 親から受け取る
}: any) {
  const [modalOpen, setModalOpen] = useState(false);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);

  // === バイクカテゴリ判定 ===
  useEffect(() => {
    if (!items || items.length === 0) return;

      const containsBike = items.some((item: any) => {
        const largeName =
          item.product?.small?.middle?.large?.name ||
          item.product_category?.middle?.large?.name;
        const largeId =
          item.product?.small?.middle?.large?.id ||
          item.product_category?.middle?.large?.id;
        return largeName === "バイク" || largeId === 1;
      });

    console.log("🧭 バイクカテゴリ判定:", containsBike);
    setHasBike(containsBike); // 👈 親に反映
  }, [items, setHasBike]);

  // === 商品選択処理 ===
  const handleProductSelect = (product: any) => {
    console.log("🔍 選択された商品:", product);
    if (targetIndex === null) return;

    const updated = [...items];
    updated[targetIndex].product = product;
    updated[targetIndex].name = product.name;
    updated[targetIndex].unit_price = Number(product.unit_price) || 0;

    updated[targetIndex].product_category = {
      large: product.small?.middle?.large ?? null,
      middle: product.small?.middle ?? null,
      small: product.small ?? null,
    };

    console.log("✅ 保存されるカテゴリ情報:", updated[targetIndex].product_category);

    setItems(updated);
    setModalOpen(false);
  };

  // === 課税区分 ===
  const taxTypes = [
    { value: "taxable", label: "課税" },
    { value: "non_taxable", label: "非課税" },
  ];

  // === 値変更 ===
  const handleChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  // === 明細追加 ===
  const handleAddItem = () => {
    setItems([
      ...items,
      {
        product: null,
        name: "",
        quantity: 1,
        unit_price: 0,
        discount: 0,
        tax_type: "taxable",
        staff: null,
        subtotal: 0,
      },
    ]);
  };

  // === 明細削除 ===
  const handleDeleteItem = (index: number) => {
    setItems(items.filter((_: any, i: number) => i !== index));
  };

  // === 集計 ===
  const { subtotal, tax, total } = useMemo(() => {
    let subtotal = 0;
    let taxable = 0;
    items.forEach((item: any) => {
      const lineTotal =
        Number(item.quantity ?? 0) * Number(item.unit_price ?? 0) -
        Number(item.discount ?? 0);
      subtotal += lineTotal;
      if (item.tax_type === "taxable") taxable += lineTotal;
    });
    const tax = Math.floor(taxable * 0.1);
    const total = subtotal + tax;
    return { subtotal, tax, total };
  }, [items]);

  return (
    <Box mt={6}>
      <Typography variant="subtitle1" fontWeight="bold" mb={2}>
        見積明細
      </Typography>

      {items.length === 0 && (
        <Typography color="text.secondary" mb={2}>
          明細がありません。下の「明細を追加」ボタンで行を追加してください。
        </Typography>
      )}

      {items.map((item: any, index: number) => (
        <Box key={index} mb={2} p={2} border="1px solid #ddd" borderRadius={2}>
          <Grid container spacing={2} alignItems="center">
            {/* 商品名 */}
            <Grid item xs={12} md={3}>
              <Box
                onClick={() => {
                  setTargetIndex(index);
                  setModalOpen(true);
                }}
                sx={{
                  cursor: "pointer",
                  color: item.name ? "#000" : "#1976d2",
                  textDecoration: item.name ? "none" : "underline",
                  p: 1,
                  border: "1px solid #ccc",
                  borderRadius: 1,
                  backgroundColor: "#fafafa",
                }}
              >
                {item.name || "商品を選択"}
              </Box>
            </Grid>

            {/* 数量 */}
            <Grid item xs={6} md={1.2}>
              <TextField
                label="数量"
                type="number"
                value={item.quantity ?? 1}
                onChange={(e) =>
                  handleChange(index, "quantity", Number(e.target.value))
                }
                fullWidth
              />
            </Grid>

            {/* 単価 */}
            <Grid item xs={6} md={1.2}>
              <TextField
                label="単価"
                type="number"
                value={item.unit_price ?? 0}
                onChange={(e) =>
                  handleChange(index, "unit_price", Number(e.target.value))
                }
                fullWidth
              />
            </Grid>

            {/* 小計 */}
            <Grid item xs={6} md={1.2}>
              <TextField
                label="小計"
                value={
                  Number(item.quantity ?? 0) * Number(item.unit_price ?? 0) -
                  Number(item.discount ?? 0)
                }
                InputProps={{ readOnly: true }}
                fullWidth
              />
            </Grid>

            {/* 値引き */}
            <Grid item xs={6} md={1.2}>
              <TextField
                label="値引き"
                type="number"
                value={item.discount ?? 0}
                onChange={(e) =>
                  handleChange(index, "discount", Number(e.target.value))
                }
                fullWidth
              />
            </Grid>

            {/* 課税区分 */}
            <Grid item xs={6} md={1.2}>
              <TextField
                select
                label="課税区分"
                value={item.tax_type ?? "taxable"}
                onChange={(e) => handleChange(index, "tax_type", e.target.value)}
                fullWidth
              >
                {taxTypes.map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* 担当者 */}
            <Grid item xs={6} md={1.8}>
              <TextField
                select
                label="担当者"
                value={item.staff ?? ""}
                onChange={(e) => handleChange(index, "staff", e.target.value)}
                fullWidth
              >
                {staffs.map((s: any) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* 削除ボタン */}
            <Grid item xs={12} md={0.6}>
              <IconButton color="error" onClick={() => handleDeleteItem(index)}>
                <Delete />
              </IconButton>
            </Grid>
          </Grid>
        </Box>
      ))}

      {/* 明細追加ボタン */}
      <Button
        variant="outlined"
        startIcon={<Add />}
        onClick={handleAddItem}
        sx={{ mt: 2 }}
      >
        明細を追加
      </Button>

      {/* 集計 */}
      <Box mt={4} textAlign="right">
        <Typography variant="body1">小計：¥{subtotal.toLocaleString()}</Typography>
        <Typography variant="body1">消費税（10%）：¥{tax.toLocaleString()}</Typography>
        <Typography
          variant="h6"
          fontWeight="bold"
          sx={{ mt: 1, borderTop: "1px solid #ccc", pt: 1 }}
        >
          合計金額：¥{total.toLocaleString()}
        </Typography>
      </Box>

      {/* 商品選択モーダル */}
      <ProductSelectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={handleProductSelect}
      />
    </Box>
  );
}
