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

type ItemType = "accessory" | "fee" | "insurance";

type Props = {
  type: ItemType;
  items: any[];
  dispatch: React.Dispatch<any>;
};

const STEP_CONFIG = {
  accessory: {
    title: "その他（用品・作業など）",
    addButtonLabel: "商品を追加",
    categoryUrl: "/categories/tree/?type=item&type=other",
    nameLabel: "商品名",
    itemType: "accessory",
    showLaborCost: true,
    taxable: true,
  },
  fee: {
    title: "諸費用",
    addButtonLabel: "諸費用を追加",
    categoryUrl: "/categories/tree/?type=expense",
    nameLabel: "項目名",
    itemType: "fee",
    showLaborCost: false,
    taxable: true,
  },
  insurance: {
    title: "保険",
    addButtonLabel: "保険を追加",
    categoryUrl: "/categories/tree/?type=insurance",
    nameLabel: "商品名",
    itemType: "insurance",
    showLaborCost: false,
    taxable: false,
  },
} as const;



function calcLine(item: any, options: { taxable: boolean; showLaborCost: boolean }) {
  const qty = Math.round(Number(item?.quantity ?? 1));
  const unit = Math.round(Number(item?.unit_price ?? 0));
  const labor = options.showLaborCost
    ? Math.round(Number(item?.labor_cost ?? 0))
    : 0;
  const discount = Math.round(Number(item?.discount ?? 0));

  const subtotal = Math.max(0, Math.round(qty * unit + labor - discount));
  const tax = options.taxable ? Math.floor(subtotal * 0.1) : 0;

  return {
    subtotal,
    tax,
    total: subtotal + tax,
  };
}

export default function EstimateItemsStep({ type, items, dispatch }: Props) {
  const config = STEP_CONFIG[type];
  console.log("type:", type);
  console.log("config:", config);
  const [modalOpen, setModalOpen] = useState(false);
  const [staffs, setStaffs] = useState<any[]>([]);
  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [categoryMap, setCategoryMap] = useState<Record<number, any>>({});

  /* ===============================
     🔥 indexズレ対策（最重要）
  =============================== */
  const filteredItems = useMemo(() => {
    return items
      .map((item, originalIndex) => ({ item, originalIndex }))
      .filter((x) => x.item?.item_type === config.itemType);
  }, [items, config.itemType]);

  useEffect(() => {
    apiClient
      .get("/masters/staffs/")
      .then((res) => setStaffs(res.data?.results || res.data || []))
      .catch(() => setStaffs([]));
  }, []);

  useEffect(() => {
    if (type !== "accessory") return;

    apiClient
      .get("/masters/manufacturers/")
      .then((res) => setManufacturers(res.data || []))
      .catch(() => setManufacturers([]));
  }, [type]);

  useEffect(() => {
    apiClient
      .get(config.categoryUrl)
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
  }, [config.categoryUrl]);

  const categoryPathById = (categoryId: number | null) => {
    if (!categoryId || !categoryMap[categoryId]) return "未分類";

    const names: string[] = [];
    let cur = categoryMap[categoryId];

    while (cur) {
      names.unshift(cur.name);
      cur = cur.parent ?? null;
    }

    return names.join(" / ");
  };

  const totals = useMemo(() => {
    return filteredItems.reduce(
      (acc, { item }) => {
        const line = calcLine(item, {
          taxable: config.taxable,
          showLaborCost: config.showLaborCost,
        });
        acc.subtotal += line.subtotal;
        acc.tax += line.tax;
        acc.total += line.total;
        return acc;
      },
      { subtotal: 0, tax: 0, total: 0 }
    );
  }, [filteredItems, config.taxable, config.showLaborCost]);

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
    <>
      <Typography variant="h6" fontWeight="bold" mb={2}>
        {config.title}
      </Typography>

      <Box mb={3}>
        <Button variant="contained" onClick={() => setModalOpen(true)}>
          {config.addButtonLabel}
        </Button>
      </Box>

      <Grid container spacing={2}>
        {filteredItems.length === 0 && (
          <Grid size={{ xs: 12 }}>
            <Typography color="text.secondary">
              まだ明細はありません
            </Typography>
          </Grid>
        )}

        {filteredItems.map(({ item, originalIndex }) => {
          const line = calcLine(item, {
            taxable: config.taxable,
            showLaborCost: config.showLaborCost,
          });

          const categoryId = item?.category_id ?? item?.category?.id ?? null;

          return (
            <Grid size={{ xs: 12 }} key={item.id ?? originalIndex}>
              <Paper sx={{ p: 2 }}>
                <Stack direction="row" spacing={1} mb={1}>
                  <Chip
                    size="small"
                    label={categoryPathById(categoryId)}
                    variant="outlined"
                  />
                </Stack>

                <>
                  {/* ===== 1段目（メイン） ===== */}
                  <Grid container spacing={1} alignItems="center">
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        fullWidth
                        label={config.nameLabel}
                        value={item?.name ?? ""}
                        onChange={(e) =>
                          handleChange(originalIndex, "name", e.target.value)
                        }
                      />
                    </Grid>

                    <Grid size={{ xs: 4, md: 1 }}>
                      <TextField
                        fullWidth
                        type="number"
                        label="数量"
                        value={item?.quantity ?? 1}
                        onChange={(e) =>
                          handleChange(
                            originalIndex,
                            "quantity",
                            Math.round(Number(e.target.value))
                          )
                        }
                      />
                    </Grid>

                    <Grid size={{ xs: 4, md: 2 }}>
                      <TextField
                        fullWidth
                        type="number"
                        label="単価"
                        value={item?.unit_price ?? 0}
                        onChange={(e) =>
                          handleChange(
                            originalIndex,
                            "unit_price",
                            Math.round(Number(e.target.value))
                          )
                        }
                      />
                    </Grid>

                    <Grid size={{ xs: 4, md: 2 }}>
                      <Box textAlign="right">
                        <Typography variant="body2" color="text.secondary">
                          {config.taxable ? "税込" : "合計"}
                        </Typography>
                        <Typography fontWeight="bold">
                          ¥{line.total.toLocaleString()}
                        </Typography>
                      </Box>
                    </Grid>

                    <Grid size={{ xs: 12, md: 1 }}>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemove(originalIndex)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Grid>
                  </Grid>

                  {/* ===== 2段目（アクセサリーのみ） ===== */}
                  {type === "accessory" && (
                    <Grid container spacing={1} mt={1}>
                      <Grid size={{ xs: 6, md: 3 }}>
                        <TextField
                          select
                          fullWidth
                          label="メーカー"
                          value={item?.manufacturer ?? ""}
                          onChange={(e) =>
                            handleChange(
                              originalIndex,
                              "manufacturer",
                              e.target.value === "" ? null : Number(e.target.value)
                            )
                          }
                        >
                          <MenuItem value="">未選択</MenuItem>
                          {manufacturers.map((m) => (
                            <MenuItem key={m.id} value={m.id}>
                              {m.name}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>

                      <Grid size={{ xs: 6, md: 2 }}>
                        <TextField
                          fullWidth
                          type="number"
                          label="工賃"
                          value={item?.labor_cost ?? 0}
                          onChange={(e) =>
                            handleChange(
                              originalIndex,
                              "labor_cost",
                              Math.round(Number(e.target.value))
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
                              originalIndex,
                              "discount",
                              Math.round(Number(e.target.value))
                            )
                          }
                        />
                      </Grid>

                      <Grid size={{ xs: 6, md: 3 }}>
                        <TextField
                          select
                          fullWidth
                          label="担当"
                          value={
                            item?.staff_id != null ? String(item.staff_id) : ""
                          }
                          onChange={(e) =>
                            handleChange(
                              originalIndex,
                              "staff_id",
                              e.target.value === ""
                                ? null
                                : Number(e.target.value)
                            )
                          }
                        >
                          <MenuItem value="">未選択</MenuItem>
                          {staffs.map((s) => (
                            <MenuItem key={s.id} value={String(s.id)}>
                              {s.display_name || s.login_id}
                              {s.shop_name && `（${s.shop_name}）`}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                    </Grid>
                  )}

                  {/* ===== 非アクセサリー用（今まで通り） ===== */}
                  {type !== "accessory" && (
                    <Grid container spacing={1} mt={1}>
                      <Grid size={{ xs: 6, md: 2 }}>
                        <TextField
                          fullWidth
                          type="number"
                          label="割引"
                          value={item?.discount ?? 0}
                          onChange={(e) =>
                            handleChange(
                              originalIndex,
                              "discount",
                              Math.round(Number(e.target.value))
                            )
                          }
                        />
                      </Grid>

                      <Grid size={{ xs: 6, md: 3 }}>
                        <TextField
                          select
                          fullWidth
                          label="担当"
                          value={
                            item?.staff_id != null ? String(item.staff_id) : ""
                          }
                          onChange={(e) =>
                            handleChange(
                              originalIndex,
                              "staff_id",
                              e.target.value === ""
                                ? null
                                : Number(e.target.value)
                            )
                          }
                        >
                          <MenuItem value="">未選択</MenuItem>
                          {staffs.map((s) => (
                            <MenuItem key={s.id} value={String(s.id)}>
                              {s.display_name || s.login_id}
                              {s.shop_name && `（${s.shop_name}）`}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                    </Grid>
                  )}
                </>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      <Divider sx={{ my: 3 }} />

      <Box textAlign="right">
        <Typography>
          小計（税抜）：¥{totals.subtotal.toLocaleString()}
        </Typography>
        {config.taxable && (
          <Typography>
            消費税：¥{totals.tax.toLocaleString()}
          </Typography>
        )}
        <Typography variant="h6" fontWeight="bold">
          合計（税込）：¥{totals.total.toLocaleString()}
        </Typography>
      </Box>

      <ProductSelectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        itemType={config.itemType}
        onSelect={(newItem) => {
          dispatch({
            type: "ADD_ITEM",
            payload: {
              discount: 0,
              labor_cost: 0,
              staff_id: null,
              tax_type: config.taxable ? "taxable" : "non_taxable",
              quantity: 1,
              ...newItem,
              item_type: config.itemType,
            },
          });
        }}
      />
    </>
  );
}