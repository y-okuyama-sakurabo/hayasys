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
  type: keyof typeof STEP_CONFIG;
  taxType?: string;
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
    taxType: "taxable",
    showLaborCost: true,
    taxable: true,
  },

  // 👇 課税費用
  taxable_fee: {
    title: "課税費用",
    addButtonLabel: "課税費用を追加",
    categoryUrl: "/categories/tree/?type=expense&tax_type=taxable",
    nameLabel: "項目名",
    itemType: "fee",
    taxType: "taxable", // ←これ追加
    showLaborCost: false,
    taxable: true,
  },

  // 👇 非課税費用
  non_taxable_fee: {
    title: "非課税費用",
    addButtonLabel: "非課税費用を追加",
    categoryUrl: "/categories/tree/?type=expense&tax_type=non_taxable",
    nameLabel: "項目名",
    itemType: "fee",
    taxType: "non_taxable", // ←これ追加
    showLaborCost: false,
    taxable: false,
  },
} as const;





function calcLine(item: any) {
  const qty = Number(item.quantity ?? 1);
  const unit = Number(item.unit_price ?? 0);
  const labor = Number(item.labor_cost ?? 0);
  const discount = Number(item.discount ?? 0);

  const subtotal = Math.max(0, qty * unit + labor - discount);

  const taxType =
    item.tax_type ??
    item.category?.tax_type ??
    "taxable";

  const tax = taxType === "taxable"
    ? Math.floor(subtotal * 0.1)
    : 0;

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
  const [units, setUnits] = useState<any[]>([]);

  useEffect(() => {
    apiClient
      .get("/masters/units/")
      .then((res) => setUnits(res.data?.results || res.data || []))
      .catch(() => setUnits([]));
  }, []);

  /* ===============================
     🔥 indexズレ対策（最重要）
  =============================== */
  const filteredItems = useMemo(() => {
    return items
      .map((item, originalIndex) => ({ item, originalIndex }))
      .filter((x) => {
        // ① item_typeで絞る
        if (x.item?.item_type !== config.itemType) return false;

        // ② tax_typeで絞る（ここが今回の本命）
        if (config.taxType) {
          return x.item?.tax_type === config.taxType;
        }

        return true;
      });
  }, [items, config.itemType, config.taxType]);

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
        const line = calcLine(item);

        acc.subtotal += line.subtotal;
        acc.tax += line.tax;
        acc.total += line.total;
        return acc;
      },
      { subtotal: 0, tax: 0, total: 0 }
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

  const VEHICLE_SALE_TYPES = [
    { value: "new", label: "新車" },
    { value: "used", label: "中古車" },
    { value: "rental_up", label: "レンタルアップ" },
    { value: "consignment", label: "委託販売" },
  ];

  const OTHER_SALE_TYPES = [
    { value: "new", label: "新車" },
    { value: "used", label: "中古車" },
    { value: "group_store", label: "グループ専売店購入" },
    { value: "other_store", label: "他社購入" },
  ];

  function getSaleTypeOptions(item: any) {
    if (item.item_type === "vehicle") return VEHICLE_SALE_TYPES;
    if (item.item_type === "accessory") return OTHER_SALE_TYPES;
    return [];
  }

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
          const line = calcLine(item);
          const categoryId = item?.category_id ?? item?.category?.id ?? null;
          const saleTypeOptions = getSaleTypeOptions(item);

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

                    {saleTypeOptions.length > 0 && (
                      <Grid size={{ xs: 12, md: 2 }}>
                        <TextField
                          select
                          fullWidth
                          label="区分"
                          value={item?.sale_type || ""}
                          onChange={(e) =>
                            handleChange(
                              originalIndex,
                              "sale_type",
                              e.target.value === "" ? null : e.target.value
                            )
                          }
                        >
                          <MenuItem value="">未選択</MenuItem>
                          {saleTypeOptions.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                    )}

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

                    <Grid size={{ xs: 4, md: 1 }}>
                      <TextField
                        select
                        fullWidth
                        label="単位"
                        value={item?.unit ?? ""}
                        onChange={(e) =>
                          handleChange(
                            originalIndex,
                            "unit",
                            e.target.value === "" ? null : Number(e.target.value)
                          )
                        }
                      >
                        <MenuItem value="">未選択</MenuItem>
                        {units.map((u) => (
                          <MenuItem key={u.id} value={u.id}>
                            {u.name}
                          </MenuItem>
                        ))}
                      </TextField>
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
        taxType={config.taxable ? "taxable" : "non_taxable"}
        onSelect={(newItem) => {
          dispatch({
            type: "ADD_ITEM",
            payload: {
              discount: 0,
              labor_cost: 0,
              staff_id: null,
              sale_type: null,
              tax_type: config.taxable ? "taxable" : "non_taxable",
              quantity: 1,
              ...newItem,
              item_type: config.itemType,
              unit: newItem.unit ?? null,
            },
          });
        }}
      />
    </>
  );
}