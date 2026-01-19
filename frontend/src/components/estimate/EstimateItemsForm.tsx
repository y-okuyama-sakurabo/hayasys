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
} from "@mui/material";
import { Add, Delete } from "@mui/icons-material";
import ProductSelectModal from "./ProductSelectModal";

export default function EstimateItemsForm({
  items,
  setItems,
  staffs = [],
  setHasBike,
}: any) {
  const [modalOpen, setModalOpen] = useState(false);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);

  // ==========================
  // バイクカテゴリ判定
  // ==========================
  useEffect(() => {
    if (!items || items.length === 0) return;

    const containsBike = items.some((item: any) => {
      const large =
        item.product?.small?.middle?.large ||
        item.product_category?.middle?.large;
      return large?.name === "バイク" || large?.id === 1;
    });

    setHasBike(containsBike);
  }, [items, setHasBike]);

  // ==========================
  // 商品選択
  // ==========================
  const handleProductSelect = (product: any) => {
    if (targetIndex === null) return;

    const updated = [...items];

    updated[targetIndex] = {
      ...updated[targetIndex],
      product,                    // 表示用
      product_id: product.id,     // 🔥 保存用（最重要）
      name: product.name,
      unit_price: Number(product.unit_price) || 0,
      product_category: {
        large: product.small?.middle?.large ?? null,
        middle: product.small?.middle ?? null,
        small: product.small ?? null,
      },
    };

    setItems(updated);
    setModalOpen(false);
  };

  // ==========================
  // 値変更
  // ==========================
  const handleChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  // ==========================
  // 明細追加
  // ==========================
  const handleAddItem = () => {
    setItems([
      ...items,
      {
        product: null,
        product_id: null,   // 🔥 追加
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

  // ==========================
  // 明細削除
  // ==========================
  const handleDeleteItem = (index: number) => {
    setItems(items.filter((_: any, i: number) => i !== index));
  };

  // ==========================
  // 集計
  // ==========================
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

  return (
    <Box mt={6}>
      <Typography variant="subtitle1" fontWeight="bold" mb={2}>
        見積明細
      </Typography>

      {items.map((item: any, index: number) => (
        <Box key={index} mb={2} p={2} border="1px solid #ddd" borderRadius={2}>
          <Grid container spacing={2} alignItems="center">
            {/* 商品名 */}
            <Grid size={{ xs: 12, md: 3 }}>
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

            <Grid size={{ xs: 6, md: 1.2 }}>
              <TextField
                label="小計"
                value={
                  item.quantity * item.unit_price - item.discount
                }
                InputProps={{ readOnly: true }}
                fullWidth
              />
            </Grid>

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

            <Grid size={{ xs: 12, md: 0.6 }}>
              <IconButton color="error" onClick={() => handleDeleteItem(index)}>
                <Delete />
              </IconButton>
            </Grid>
          </Grid>
        </Box>
      ))}

      <Button
        variant="outlined"
        startIcon={<Add />}
        onClick={handleAddItem}
        sx={{ mt: 2 }}
      >
        明細を追加
      </Button>

      <Box mt={4} textAlign="right">
        <Typography>小計：¥{subtotal.toLocaleString()}</Typography>
        <Typography>消費税：¥{tax.toLocaleString()}</Typography>
        <Typography fontWeight="bold">
          合計：¥{total.toLocaleString()}
        </Typography>
      </Box>

      <ProductSelectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={handleProductSelect}
      />
    </Box>
  );
}
