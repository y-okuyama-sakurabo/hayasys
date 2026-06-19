"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  IconButton,
  Divider,
  Chip,
  MenuItem,
  Stack,
  InputAdornment,
  Tooltip,
  InputBase,
} from "@mui/material";
import DeleteIcon      from "@mui/icons-material/Delete";
import AddIcon         from "@mui/icons-material/Add";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import apiClient from "@/lib/apiClient";
import ProductSelectModal from "./ProductSelectModal";
import CurrencyField from "./CurrencyField";

// ── dnd-kit ────────────────────────────────────────────────────
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ──────────────────────────────────────────────────────────────
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
    categoryUrl: "/categories/tree/?type=other",
    nameLabel: "商品名",
    itemType: "accessory",
    taxType: "taxable",
    showLaborCost: true,
    taxable: true,
  },
  taxable_fee: {
    title: "課税費用",
    addButtonLabel: "課税費用を追加",
    categoryUrl: "/categories/tree/?type=taxable_expense",
    nameLabel: "項目名",
    itemType: "fee",
    taxType: "taxable",
    showLaborCost: false,
    taxable: true,
  },
  non_taxable_fee: {
    title: "非課税費用",
    addButtonLabel: "非課税費用を追加",
    categoryUrl: "/categories/tree/?type=non_taxable_expense",
    nameLabel: "項目名",
    itemType: "fee",
    taxType: "non_taxable",
    showLaborCost: false,
    taxable: false,
  },
} as const;

function calcLine(item: any) {
  const qty    = Number(item.quantity   ?? 1);
  const unit   = Number(item.unit_price ?? 0);
  const labor  = Number(item.labor_cost ?? 0);
  const disc   = Number(item.discount   ?? 0);
  const taxType = item.tax_type ?? item.category?.tax_type ?? "taxable";
  const total  = Math.max(0, qty * unit + labor - disc);
  if (taxType === "taxable") {
    const subtotal = Math.round(total / 1.1);
    return { subtotal, tax: total - subtotal, total };
  }
  return { subtotal: total, tax: 0, total };
}

// ── ソータブルカード ─────────────────────────────────────────
function SortableItemCard({
  sortId,
  item,
  originalIndex,
  listIdx,
  config,
  type,
  staffs,
  manufacturers,
  units,
  categoryPathById,
  handleChange,
  handleRemove,
  saleTypeOptions,
}: {
  sortId: string;
  item: any;
  originalIndex: number;
  listIdx: number;
  config: (typeof STEP_CONFIG)[keyof typeof STEP_CONFIG];
  type: keyof typeof STEP_CONFIG;
  staffs: any[];
  manufacturers: any[];
  units: any[];
  categoryPathById: (id: number | null) => string | null;
  handleChange: (index: number, field: string, value: any) => void;
  handleRemove: (index: number) => void;
  saleTypeOptions: { value: string; label: string }[];
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortId });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex:  isDragging ? 10  : undefined,
  };

  const line         = calcLine(item);
  const categoryId   = item?.category_id ?? item?.category?.id ?? null;
  const categoryPath = categoryPathById(categoryId);

  // インライン名前編集
  const nameRef      = useRef<HTMLInputElement>(null);
  const [nameActive, setNameActive] = useState(false);
  const displayName  = (item?.name ?? "").trim();

  return (
    <div ref={setNodeRef} style={style}>
      <Paper variant="outlined" sx={{ overflow: "hidden" }}>

        {/* ─── カードヘッダー ─── */}
        <Box
          sx={{
            px: 1.5, py: 0.75,
            bgcolor: "grey.50",
            borderBottom: "1px solid",
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          {/* ドラッグハンドル */}
          <Box
            {...attributes}
            {...listeners}
            sx={{
              cursor: "grab",
              color: "text.disabled",
              display: "flex",
              alignItems: "center",
              flexShrink: 0,
              "&:active": { cursor: "grabbing" },
              touchAction: "none",
            }}
          >
            <DragIndicatorIcon fontSize="small" />
          </Box>

          {/* 番号 */}
          <Typography
            variant="caption"
            color="text.disabled"
            fontWeight="bold"
            sx={{ flexShrink: 0, minWidth: 20 }}
          >
            #{listIdx + 1}
          </Typography>

          {/* 商品名（インライン編集） */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {nameActive ? (
              <InputBase
                inputRef={nameRef}
                value={item?.name ?? ""}
                onChange={(e) => handleChange(originalIndex, "name", e.target.value)}
                onBlur={() => setNameActive(false)}
                onKeyDown={(e) => { if (e.key === "Enter") nameRef.current?.blur(); }}
                fullWidth
                autoFocus
                placeholder={config.nameLabel + "を入力"}
                sx={{
                  fontSize: "0.875rem",
                  fontWeight: "bold",
                  px: 0.5,
                  py: 0.25,
                  borderRadius: 0.5,
                  bgcolor: "background.paper",
                  border: "1px solid",
                  borderColor: "primary.main",
                }}
              />
            ) : (
              <Tooltip title="クリックして編集" placement="top">
                <Box
                  onClick={() => setNameActive(true)}
                  sx={{
                    cursor: "text",
                    display: "flex",
                    alignItems: "center",
                    gap: 0.75,
                    px: 0.5,
                    py: 0.25,
                    borderRadius: 0.5,
                    "&:hover": { bgcolor: "action.hover" },
                    minHeight: 28,
                  }}
                >
                  {displayName ? (
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      noWrap
                      sx={{ maxWidth: { xs: 140, sm: 260, md: 400 } }}
                    >
                      {displayName}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.disabled" fontStyle="italic">
                      {config.nameLabel}（クリックして入力）
                    </Typography>
                  )}
                  {categoryPath && (
                    <Chip
                      size="small"
                      label={categoryPath}
                      variant="outlined"
                      sx={{ fontSize: 11, height: 20, flexShrink: 0 }}
                    />
                  )}
                </Box>
              </Tooltip>
            )}
          </Box>

          {/* 合計金額・削除 */}
          <Stack direction="row" alignItems="center" spacing={0.5} flexShrink={0}>
            <Box textAlign="right" sx={{ minWidth: 72 }}>
              {config.taxable && (
                <Typography variant="caption" color="text.secondary" display="block" lineHeight={1.2}>
                  税込
                </Typography>
              )}
              <Typography variant="body2" fontWeight="bold" color="primary.main">
                ¥{line.total.toLocaleString()}
              </Typography>
            </Box>
            <Tooltip title="この行を削除">
              <IconButton size="small" color="error" onClick={() => handleRemove(originalIndex)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>

        {/* ─── カードボディ：全フィールド1行 ─── */}
        <Box sx={{ p: 1.5 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">

            {/* 区分（narrow・accessoryのみ） */}
            {saleTypeOptions.length > 0 && (
              <Box sx={{ width: 100, flexShrink: 0 }}>
                <TextField
                  select fullWidth size="small" label="区分"
                  value={item?.sale_type || ""}
                  onChange={(e) =>
                    handleChange(originalIndex, "sale_type", e.target.value === "" ? null : e.target.value)
                  }
                >
                  <MenuItem value="">-</MenuItem>
                  {saleTypeOptions.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </TextField>
              </Box>
            )}

            {/* メーカー（accessoryのみ） */}
            {type === "accessory" && (
              <Box sx={{ flex: "1 1 130px", minWidth: 0 }}>
                <TextField
                  select fullWidth size="small" label="メーカー"
                  value={item?.manufacturer ?? ""}
                  onChange={(e) =>
                    handleChange(originalIndex, "manufacturer", e.target.value === "" ? null : Number(e.target.value))
                  }
                >
                  <MenuItem value="">-</MenuItem>
                  {manufacturers.map((m) => (
                    <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
                  ))}
                </TextField>
              </Box>
            )}

            {/* 数量（narrow） */}
            <Box sx={{ width: 64, flexShrink: 0 }}>
              <TextField
                fullWidth size="small" type="text"
                label="数量"
                value={Math.round(Number(item?.quantity ?? 1))}
                inputProps={{ inputMode: "numeric", style: { textAlign: "right" } }}
                onFocus={(e) => requestAnimationFrame(() => e.target.select())}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9]/g, "");
                  const n = v === "" ? 1 : Math.max(1, parseInt(v, 10));
                  handleChange(originalIndex, "quantity", n);
                }}
              />
            </Box>

            {/* 単位（narrow） */}
            <Box sx={{ width: 80, flexShrink: 0 }}>
              <TextField
                select fullWidth size="small" label="単位・処置"
                value={item?.unit ?? ""}
                onChange={(e) =>
                  handleChange(originalIndex, "unit", e.target.value === "" ? null : Number(e.target.value))
                }
              >
                <MenuItem value="">-</MenuItem>
                {units.map((u) => (
                  <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
                ))}
              </TextField>
            </Box>

            {/* 単価（3桁カンマ） */}
            <Box sx={{ flex: "1 1 110px", minWidth: 0 }}>
              <CurrencyField
                label={config.taxable ? "単価（税込）" : "単価"}
                value={item?.unit_price ?? 0}
                onChange={(v) => handleChange(originalIndex, "unit_price", v === "" ? 0 : v)}
              />
            </Box>

            {/* 工賃（accessoryのみ・3桁カンマ） */}
            {type === "accessory" && (
              <Box sx={{ flex: "1 1 110px", minWidth: 0 }}>
                <CurrencyField
                  label="工賃"
                  value={item?.labor_cost ?? 0}
                  onChange={(v) => handleChange(originalIndex, "labor_cost", v === "" ? 0 : v)}
                />
              </Box>
            )}

            {/* 割引（3桁カンマ） */}
            <Box sx={{ flex: "1 1 110px", minWidth: 0 }}>
              <CurrencyField
                label="割引"
                value={item?.discount ?? 0}
                onChange={(v) => handleChange(originalIndex, "discount", v === "" ? 0 : v)}
              />
            </Box>

            {/* 作業担当 */}
            <Box sx={{ flex: "1 1 130px", minWidth: 0 }}>
              <TextField
                select fullWidth size="small" label="作業担当"
                value={item?.staff_id != null ? String(item.staff_id) : ""}
                onChange={(e) =>
                  handleChange(originalIndex, "staff_id", e.target.value === "" ? null : Number(e.target.value))
                }
              >
                <MenuItem value="">-</MenuItem>
                {staffs.map((s) => (
                  <MenuItem key={s.id} value={String(s.id)}>
                    {s.display_name || s.login_id}
                    {s.shop_name && `（${s.shop_name}）`}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </Stack>

          {/* 小計内訳（課税のみ） */}
          {config.taxable && (
            <Box
              sx={{
                mt: 1.5, pt: 1,
                borderTop: "1px dashed",
                borderColor: "divider",
                display: "flex",
                gap: 3,
                fontSize: 12,
                color: "text.secondary",
              }}
            >
              <span>税抜: ¥{line.subtotal.toLocaleString()}</span>
              <span>消費税: ¥{line.tax.toLocaleString()}</span>
            </Box>
          )}
        </Box>
      </Paper>
    </div>
  );
}

// ── メインコンポーネント ─────────────────────────────────────
export default function ItemsStep({ type, items, dispatch }: Props) {
  const config = STEP_CONFIG[type];
  const [modalOpen,     setModalOpen]     = useState(false);
  const [staffs,        setStaffs]        = useState<any[]>([]);
  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [categoryMap,   setCategoryMap]   = useState<Record<number, any>>({});
  const [units,         setUnits]         = useState<any[]>([]);

  useEffect(() => {
    apiClient.get("/masters/units/")
      .then((res) => setUnits(res.data?.results || res.data || []))
      .catch(() => setUnits([]));
  }, []);

  useEffect(() => {
    apiClient.get("/masters/staffs/")
      .then((res) => setStaffs(res.data?.results || res.data || []))
      .catch(() => setStaffs([]));
  }, []);

  useEffect(() => {
    if (type !== "accessory") return;
    apiClient.get("/masters/manufacturers/")
      .then((res) => setManufacturers(res.data || []))
      .catch(() => setManufacturers([]));
  }, [type]);

  useEffect(() => {
    apiClient.get(config.categoryUrl)
      .then((res) => {
        const data = res.data?.results || res.data || [];
        const map: Record<number, any> = {};
        const flatten = (nodes: any[], parent: any | null = null) => {
          nodes.forEach((node) => {
            map[node.id] = { ...node, parent };
            if (node.children?.length) flatten(node.children, { ...node, parent });
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
    while (cur) { names.unshift(cur.name); cur = cur.parent ?? null; }
    return names.join(" › ");
  };

  const filteredItems = useMemo(() => {
    return items
      .map((item, originalIndex) => ({ item, originalIndex }))
      .filter((x) => {
        if (x.item?.item_type !== config.itemType) return false;
        if (config.taxType) return x.item?.tax_type === config.taxType;
        return true;
      });
  }, [items, config.itemType, config.taxType]);

  const totals = useMemo(() => {
    return filteredItems.reduce(
      (acc, { item }) => {
        const line = calcLine(item);
        acc.subtotal += line.subtotal;
        acc.tax      += line.tax;
        acc.total    += line.total;
        return acc;
      },
      { subtotal: 0, tax: 0, total: 0 }
    );
  }, [filteredItems]);

  const handleRemove  = (index: number) => dispatch({ type: "REMOVE_ITEM", index });
  const handleChange  = (index: number, field: string, value: any) =>
    dispatch({ type: "UPDATE_ITEM", index, payload: { [field]: value } });

  // ── DnD ──────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const sortIds = filteredItems.map(({ item, originalIndex }) =>
    `item-${item.id ?? originalIndex}`
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldListIdx = sortIds.indexOf(String(active.id));
    const newListIdx = sortIds.indexOf(String(over.id));
    if (oldListIdx === -1 || newListIdx === -1) return;

    // filteredItems の中での並び替えを全 items に反映
    const oldOrigIdx = filteredItems[oldListIdx].originalIndex;
    const newOrigIdx = filteredItems[newListIdx].originalIndex;
    const reordered  = arrayMove([...items], oldOrigIdx, newOrigIdx);
    dispatch({ type: "REORDER_ITEMS", payload: reordered });
  };

  const VEHICLE_SALE_TYPES = [
    { value: "new",         label: "新車" },
    { value: "used",        label: "中古車" },
    { value: "rental_up",   label: "レンタルアップ" },
    { value: "consignment", label: "委託販売" },
  ];
  const OTHER_SALE_TYPES = [
    { value: "new",          label: "新車" },
    { value: "used",         label: "中古車" },
    { value: "group_store",  label: "グループ専売店購入" },
    { value: "other_store",  label: "他社購入" },
  ];
  const getSaleTypeOptions = (item: any) => {
    if (item.item_type === "vehicle")   return VEHICLE_SALE_TYPES;
    if (item.item_type === "accessory") return OTHER_SALE_TYPES;
    return [];
  };

  return (
    <>
      {/* ── ヘッダー ── */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2.5}>
        <Box>
          <Typography variant="h6" fontWeight="bold">{config.title}</Typography>
          {filteredItems.length > 0 && (
            <Typography variant="caption" color="text.secondary">
              {filteredItems.length} 件
            </Typography>
          )}
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setModalOpen(true)} size="small">
          {config.addButtonLabel}
        </Button>
      </Box>

      {/* ── 明細なし ── */}
      {filteredItems.length === 0 && (
        <Box
          sx={{
            py: 5,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
            color: "text.disabled",
            border: "2px dashed", borderColor: "divider", borderRadius: 2, mb: 2,
          }}
        >
          <ShoppingCartOutlinedIcon sx={{ fontSize: 40, opacity: 0.4 }} />
          <Typography variant="body2">まだ明細がありません</Typography>
          <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setModalOpen(true)}>
            {config.addButtonLabel}
          </Button>
        </Box>
      )}

      {/* ── 明細リスト（DnD） ── */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sortIds} strategy={verticalListSortingStrategy}>
          <Stack spacing={1.5} mb={2}>
            {filteredItems.map(({ item, originalIndex }, listIdx) => (
              <SortableItemCard
                key={item.id ?? originalIndex}
                sortId={sortIds[listIdx]}
                item={item}
                originalIndex={originalIndex}
                listIdx={listIdx}
                config={config}
                type={type}
                staffs={staffs}
                manufacturers={manufacturers}
                units={units}
                categoryPathById={categoryPathById}
                handleChange={handleChange}
                handleRemove={handleRemove}
                saleTypeOptions={getSaleTypeOptions(item)}
              />
            ))}
          </Stack>
        </SortableContext>
      </DndContext>

      {/* ── 合計行 ── */}
      {filteredItems.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Paper variant="outlined" sx={{ px: 3, py: 1.5, minWidth: 240, bgcolor: "grey.50" }}>
              {config.taxable && (
                <>
                  <Box display="flex" justifyContent="space-between" gap={4} mb={0.5}>
                    <Typography variant="body2" color="text.secondary">小計（税抜）</Typography>
                    <Typography variant="body2">¥{totals.subtotal.toLocaleString()}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" gap={4} mb={0.5}>
                    <Typography variant="body2" color="text.secondary">消費税（10%）</Typography>
                    <Typography variant="body2">¥{totals.tax.toLocaleString()}</Typography>
                  </Box>
                </>
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
              discount: 0, labor_cost: 0, staff_id: null, sale_type: null, quantity: 1,
              ...newItem,
              tax_type:  config.taxable ? "taxable" : "non_taxable",
              item_type: config.itemType,
              unit:      newItem.unit ?? null,
            },
          });
        }}
      />
    </>
  );
}
