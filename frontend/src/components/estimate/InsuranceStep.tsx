"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  TextField,
  IconButton,
  Divider,
  Chip,
  MenuItem,
  Stack,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

import apiClient from "@/lib/apiClient";
import ProductSelectModal from "./ProductSelectModal";

/* ===============================
   税計算（保険は非課税）
================================ */
function calcLine(item: any) {
  const qty = Number(item?.quantity ?? 0);
  const unit = Number(item?.unit_price ?? 0);
  const discount = Number(item?.discount ?? 0);

  const subtotal = Math.max(0, qty * unit - discount);

  return {
    subtotal,
    tax: 0,
    total: subtotal,
  };
}

type Props = {
  items: any[];
  dispatch: React.Dispatch<any>;
};

export default function InsuranceStep({ items, dispatch }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [staffs, setStaffs] = useState<any[]>([]);
  const [categoryMap, setCategoryMap] = useState<Record<number, any>>({});

  /* ===============================
     insuranceのみ抽出
  =============================== */
  const filteredItems = useMemo(() => {
    return items.filter((item) => item?.item_type === "insurance");
  }, [items]);

  /* ===============================
     スタッフ取得
  =============================== */
  useEffect(() => {
    apiClient
      .get("/masters/staffs/")
      .then((res) => setStaffs(res.data?.results || res.data || []))
      .catch(() => setStaffs([]));
  }, []);

  /* ===============================
     カテゴリ辞書
  =============================== */
  useEffect(() => {
    apiClient
      .get("/categories/tree/?type=insurance")
      .then((res) => {
        const data = res.data?.results || res.data || [];
        const map: Record<number, any> = {};

        const flatten = (nodes: any[], parent: any | null = null) => {
          nodes.forEach((node) => {
            const enrichedNode = { ...node, parent };
            map[node.id] = enrichedNode;

            if (node.children?.length) {
              flatten(node.children, enrichedNode);
            }
          });
        };

        flatten(data);
        setCategoryMap(map);
      })
      .catch(() => setCategoryMap({}));
  }, []);

  const categoryPathById = (categoryId: number | null) => {
    if (!categoryId || !categoryMap[categoryId]) return "未分類";

    let names: string[] = [];
    let cur = categoryMap[categoryId];

    while (cur) {
      names.unshift(cur.name);
      cur = cur.parent ?? null;
    }

    return names.join(" / ");
  };

  const totals = useMemo(() => {
    return filteredItems.reduce(
      (acc, item) => {
        const line = calcLine(item);
        acc.subtotal += line.subtotal;
        acc.total += line.total;
        return acc;
      },
      { subtotal: 0, total: 0 }
    );
  }, [filteredItems]);

  const handleRemove = (index: number) => {
    dispatch({ type: "REMOVE_ITEM", index });
  };

  const handleChange = (index: number, field: string, value: any) => {
    dispatch({
      type: "UPDATE_ITEM",
      index,
      payload: { [field]: value },
    });
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" fontWeight="bold" mb={2}>
        保険
      </Typography>

      <Box mb={3}>
        <Button variant="contained" onClick={() => setModalOpen(true)}>
          保険を追加
        </Button>
      </Box>

      <Grid container spacing={2}>
        {filteredItems.length === 0 && (
          <Grid size={{ xs: 12 }}>
            <Typography color="text.secondary">
              まだ保険はありません
            </Typography>
          </Grid>
        )}

        {filteredItems.map((item, index) => {
          const line = calcLine(item);

          const categoryId =
            item?.category_id ?? item?.category?.id ?? null;

          return (
            <Grid size={{ xs: 12 }} key={item.id ?? index}>
              <Paper sx={{ p: 2 }}>
                <Stack direction="row" spacing={1} mb={1}>
                  <Chip
                    size="small"
                    label={categoryPathById(categoryId)}
                    variant="outlined"
                  />
                  <Box sx={{ flex: 1 }} />
                  <IconButton
                    color="error"
                    onClick={() => handleRemove(index)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Stack>

                <Grid container spacing={2} alignItems="center">
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      fullWidth
                      label="商品名"
                      value={item?.name ?? ""}
                      onChange={(e) =>
                        handleChange(index, "name", e.target.value)
                      }
                    />
                  </Grid>

                  <Grid size={{ xs: 6, md: 2 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="単価"
                      value={item?.unit_price ?? 0}
                      onChange={(e) =>
                        handleChange(
                          index,
                          "unit_price",
                          Number(e.target.value)
                        )
                      }
                    />
                  </Grid>

                  <Grid size={{ xs: 6, md: 2 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="割引"
                      value={item?.discount ?? 0}
                      onChange={(e) =>
                        handleChange(
                          index,
                          "discount",
                          Number(e.target.value)
                        )
                      }
                    />
                  </Grid>

                  <Grid size={{ xs: 6, md: 2 }}>
                    <TextField
                      select
                      fullWidth
                      label="担当"
                      value={item?.staff ?? item?.staff_id ?? ""}
                      onChange={(e) =>
                        handleChange(
                          index,
                          "staff",
                          e.target.value === ""
                            ? null
                            : Number(e.target.value)
                        )
                      }
                    >
                      <MenuItem value="">未選択</MenuItem>
                      {staffs.map((s) => (
                        <MenuItem key={s.id} value={s.id}>
                          {s.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid size={{ xs: 12, md: 2 }}>
                    <Box textAlign="right">
                      <Typography variant="body2" color="text.secondary">
                        合計
                      </Typography>
                      <Typography fontWeight="bold">
                        ¥{line.total.toLocaleString()}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      <Divider sx={{ my: 3 }} />

      <Box textAlign="right">
        <Typography>
          小計：¥{totals.subtotal.toLocaleString()}
        </Typography>
        <Typography variant="h6" fontWeight="bold">
          合計：¥{totals.total.toLocaleString()}
        </Typography>
      </Box>

      <ProductSelectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        itemType="insurance"
        onSelect={(newItem) => {
          dispatch({
            type: "ADD_ITEM",
            payload: {
              discount: 0,
              staff: null,
              tax_type: "non_taxable",
              quantity: 1,
              ...newItem,
              item_type: "insurance",
            },
          });
        }}
      />
    </Paper>
  );
}
