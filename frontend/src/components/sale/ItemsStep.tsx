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
  InputAdornment,
  Tooltip,
  Alert,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
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
  taxable_fee: {
    title: "課税費用",
    addButtonLabel: "課税費用を追加",
    categoryUrl: "/categories/tree/?type=expense&tax_type=taxable",
    nameLabel: "項目名",
    itemType: "fee",
    taxType: "taxable",
    showLaborCost: false,
    taxable: true,
  },
  non_taxable_fee: {
    title: "非課税費用",
    addButtonLabel: "非課税費用を追加",
    categoryUrl: "/categories/tree/?type=expense&tax_type=non_taxable",
    nameLabel: "項目名",
    itemType: "fee",
    taxType: "non_taxable",
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
  const taxType = item.tax_type ?? item.category?.tax_type ?? "taxable";
  const tax = taxType === "taxable" ? Math.floor(subtotal * 0.1) : 0;
  return { subtotal, tax, total: subtotal + tax };
}

export default function ItemsStep({ type, items, dispatch }: Props) {
  const config = STEP_CONFIG[type];
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

  const filteredItems = useMemo(() => {
    return items
      .map((item, originalIndex) => ({ item, originalIndex }))
      .filter((x) => {
        if (x.item?.item_type !== config.itemType) return false;
        if (config.taxType) return x.item?.tax_type === config.taxType;
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
            if (node.children?.length) flatten(node.children, enrichedNode);
          });
        };
        flatten(data);
        setCategoryMap(map);
      })
      .catch(() => setCategoryMap({}));
  }, [config.categoryUrl]);

  const categoryPathById = (categoryId: number | null) => {
    if (!categoryId || !categoryMap[categoryId]) return null;
    const names: string[] = [];
    let cur = categoryMap[categoryId];
    while (cur) {
      names.unshift(cur.name);
      cur = cur.parent ?? null;
    }
    return names.join(" › ");
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
    dispatch({ type: "UPDATE_ITEM", index, payload: { [field]: value } });
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
      {/* ── ヘッダー ── */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2.5}>
        <Box>
          <Typography variant="h6" fontWeight="bold">
            {config.title}
          </Typography>
          {filteredItems.length > 0 && (
            <Typography variant="caption" color="text.secondary">
              {filteredItems.length} 件
            </Typography>
          )}
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setModalOpen(true)}
          size="small"
        >
          {config.addButtonLabel}
        </Button>
      </Box>

      {/* ── 明細なし ── */}
      {filteredItems.length === 0 && (
        <Box
          sx={{
            py: 5,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
            color: "text.disabled",
            border: "2px dashed",
            borderColor: "divider",
            borderRadius: 2,
            mb: 2,
          }}
        >
          <ShoppingCartOutlinedIcon sx={{ fontSize: 40, opacity: 0.4 }} />
          <Typography variant="body2">まだ明細がありません</Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setModalOpen(true)}
          >
            {config.addButtonLabel}
          </Button>
        </Box>
      )}

      {/* ── 明細リスト ── */}
      <Stack spacing={1.5} mb={2}>
        {filteredItems.map(({ item, originalIndex }, listIdx) => {
          const line = calcLine(item);
          const categoryId = item?.category_id ?? item?.category?.id ?? null;
          const categoryPath = categoryPathById(categoryId);
          const saleTypeOptions = getSaleTypeOptions(item);

          return (
            <Paper
              key={item.id ?? originalIndex}
              variant="outlined"
              sx={{ overflow: "hidden" }}
            >
              {/* カードヘッダー */}
              <Box
                sx={{
                  px: 2,
                  py: 1,
                  bgcolor: "grey.50",
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Typography
                    variant="caption"
                    color="text.disabled"
                    fontWeight="bold"
                  >
                    #{listIdx + 1}
                  </Typography>
                  {categoryPath && (
                    <Chip
                      size="small"
                      label={categoryPath}
                      variant="outlined"
                      sx={{ fontSize: 11, height: 22 }}
                    />
                  )}
                </Stack>

                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box textAlign="right">
                    {config.taxable && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        税込
                      </Typography>
                    )}
                    <Typography variant="body2" fontWeight="bold" color="primary.main">
                      ¥{line.total.toLocaleString()}
                    </Typography>
                  </Box>
                  <Tooltip title="この行を削除">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemove(originalIndex)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>

              {/* カードボディ */}
              <Box sx={{ p: 2 }}>
                {/* 1段目：メイン */}
                <Grid container spacing={1.5} alignItems="center">
                  <Grid size={{ xs: 12, md: saleTypeOptions.length > 0 ? 4 : 6 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label={config.nameLabel}
                      value={item?.name ?? ""}
                      onChange={(e) =>
                        handleChange(originalIndex, "name", e.target.value)
                      }
                    />
                  </Grid>

                  {saleTypeOptions.length > 0 && (
                    <Grid size={{ xs: 6, md: 2 }}>
                      <TextField
                        select
                        fullWidth
                        size="small"
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
                      size="small"
                      type="number"
                      label="数量"
                      value={item?.quantity ?? 1}
                      inputProps={{ min: 1, style: { textAlign: "right" } }}
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
                      select
                      fullWidth
                      size="small"
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
                      <MenuItem value="">-</MenuItem>
                      {units.map((u) => (
                        <MenuItem key={u.id} value={u.id}>
                          {u.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid size={{ xs: 4, md: 3 }}>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label="単価"
                      value={item?.unit_price ?? 0}
                      inputProps={{ style: { textAlign: "right" } }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">¥</InputAdornment>
                        ),
                      }}
                      onChange={(e) =>
                        handleChange(
                          originalIndex,
                          "unit_price",
                          Math.round(Number(e.target.value))
                        )
                      }
                    />
                  </Grid>
                </Grid>

                {/* 2段目：アクセサリー追加フィールド */}
                {type === "accessory" && (
                  <Grid container spacing={1.5} mt={0.5}>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <TextField
                        select
                        fullWidth
                        size="small"
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
                        size="small"
                        type="number"
                        label="工賃"
                        value={item?.labor_cost ?? 0}
                        inputProps={{ style: { textAlign: "right" } }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">¥</InputAdornment>
                          ),
                        }}
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
                        size="small"
                        type="number"
                        label="割引"
                        value={item?.discount ?? 0}
                        inputProps={{ style: { textAlign: "right" } }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">¥</InputAdornment>
                          ),
                        }}
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
                        size="small"
                        label="担当"
                        value={item?.staff_id != null ? String(item.staff_id) : ""}
                        onChange={(e) =>
                          handleChange(
                            originalIndex,
                            "staff_id",
                            e.target.value === "" ? null : Number(e.target.value)
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

                {/* 2段目：費用系（割引・担当） */}
                {type !== "accessory" && (
                  <Grid container spacing={1.5} mt={0.5}>
                    <Grid size={{ xs: 6, md: 2 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="割引"
                        value={item?.discount ?? 0}
                        inputProps={{ style: { textAlign: "right" } }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">¥</InputAdornment>
                          ),
                        }}
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
                        size="small"
                        label="担当"
                        value={item?.staff_id != null ? String(item.staff_id) : ""}
                        onChange={(e) =>
                          handleChange(
                            originalIndex,
                            "staff_id",
                            e.target.value === "" ? null : Number(e.target.value)
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

                    {/* 小計サマリ */}
                    {(item?.discount > 0) && (
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Box
                          sx={{
                            display: "flex",
                            gap: 2,
                            alignItems: "center",
                            pt: 1,
                            fontSize: 12,
                            color: "text.secondary",
                          }}
                        >
                          <span>税抜: ¥{line.subtotal.toLocaleString()}</span>
                          {config.taxable && (
                            <span>消費税: ¥{line.tax.toLocaleString()}</span>
                          )}
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                )}
              </Box>
            </Paper>
          );
        })}
      </Stack>

      {/* ── 合計行 ── */}
      {filteredItems.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <Paper
              variant="outlined"
              sx={{ px: 3, py: 1.5, minWidth: 240, bgcolor: "grey.50" }}
            >
              <Box display="flex" justifyContent="space-between" gap={4} mb={0.5}>
                <Typography variant="body2" color="text.secondary">
                  小計（税抜）
                </Typography>
                <Typography variant="body2">
                  ¥{totals.subtotal.toLocaleString()}
                </Typography>
              </Box>
              {config.taxable && (
                <Box display="flex" justifyContent="space-between" gap={4} mb={0.5}>
                  <Typography variant="body2" color="text.secondary">
                    消費税（10%）
                  </Typography>
                  <Typography variant="body2">
                    ¥{totals.tax.toLocaleString()}
                  </Typography>
                </Box>
              )}
              <Divider sx={{ my: 1 }} />
              <Box display="flex" justifyContent="space-between" gap={4}>
                <Typography variant="body2" fontWeight="bold">
                  {config.taxable ? "合計（税込）" : "合計"}
                </Typography>
                <Typography variant="body2" fontWeight="bold" color="primary.main">
                  ¥{totals.total.toLocaleString()}
                </Typography>
              </Box>
            </Paper>
          </Box>
        </>
      )}

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
