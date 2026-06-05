"use client";

import React, { useEffect, useReducer, useState, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Divider,
  Button,
  CircularProgress,
  TextField,
  Chip,
  Snackbar,
  Alert,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import SendIcon from "@mui/icons-material/Send";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import apiClient from "@/lib/apiClient";
import { useRouter, useSearchParams } from "next/navigation";
import dayjs from "dayjs";

import BasicInfoForm from "@/components/sale/BasicInfoForm";
import VehicleStep from "@/components/sale/VehicleStep";
import OtherStep from "@/components/sale/OtherStep";
import TaxableExpenseStep from "@/components/sale/TaxableExpenseStep";
import NonTaxableExpenseStep from "@/components/sale/NonTaxableExpenseStep";
import PaymentForm from "@/components/sale/PaymentForm";
import MemoSection from "@/components/sale/MemoSection";

// ─── ステータス表示 ───────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  draft: "下書き",
  issued: "提出済み",
  ordered: "受注済み",
};
const STATUS_COLOR: Record<string, "warning" | "info" | "success"> = {
  draft: "warning",
  issued: "info",
  ordered: "success",
};

// ─── セクション定義 ──────────────────────────────────────────
const ALL_SECTIONS = [
  { key: "basic",        label: "基本情報" },
  { key: "vehicle",      label: "車両情報" },
  { key: "items",        label: "その他費用" },
  { key: "taxable",      label: "課税費用" },
  { key: "nontaxable",   label: "非課税費用" },
  { key: "payment",      label: "支払い" },
  { key: "memo",         label: "メモ" },
];

// ─── Props ───────────────────────────────────────────────────
type Props = {
  mode: "create" | "edit";
  estimateId?: number;
};

// ─── State ───────────────────────────────────────────────────
type EstimateState = {
  meta: { id?: number; mode: "create" | "edit" };
  status: string;
  basic: any;
  vehicle: any | null;
  tradeInVehicle: any | null;
  items: any[];
  schedule: any;
  insurance: any;
  deletedItemIds: number[];
  global_discount: number;
  memo: string;
  internal_memo: string;
};

const today = dayjs();

const initialState: EstimateState = {
  meta: { mode: "create" },
  status: "draft",
  basic: {
    estimate_no: "",
    shop: null,
    party_id: null,
    new_party: null,
    vehicle_mode: "sale",
    estimate_date: today.format("YYYY-MM-DD"),
    valid_until: today.add(1, "month").format("YYYY-MM-DD"),
    settlements: { trade_in: 0, cash: 0, card: 0, loan: 0, qr: 0, coupon: 0, transfer: 0 },
    credit_company: "",
    credit_installments: null,
    credit_first_payment: null,
    credit_second_payment: null,
    credit_bonus_payment: null,
    credit_start_month: "",
  },
  vehicle: null,
  tradeInVehicle: null,
  items: [],
  schedule: {
    id: null,
    start_at: "",
    date: "",
    time: "",
    delivery_method: "",
    delivery_shop: null,
    description: "",
  },
  insurance: {
    company_name: "",
    bodily_injury: "",
    property_damage: "",
    passenger: "",
    vehicle: "",
    option: "",
  },
  deletedItemIds: [],
  global_discount: 0,
  memo: "",
  internal_memo: "",
};

function reducer(state: EstimateState, action: any): EstimateState {
  switch (action.type) {
    case "INIT_FROM_API": {
      const estimate = action.payload;
      return {
        ...state,
        ...estimate,
        status: estimate.status ?? "draft",
        schedule: estimate.schedule
          ? {
              id: estimate.schedule.id,
              start_at: estimate.schedule.start_at,
              date: dayjs(estimate.schedule.start_at).format("YYYY-MM-DD"),
              time: dayjs(estimate.schedule.start_at).format("HH:mm"),
              delivery_method: estimate.schedule.delivery_method,
              delivery_shop: estimate.schedule.delivery_shop,
              description: estimate.schedule.description,
            }
          : initialState.schedule,
      };
    }
    case "SET_BASIC":
      return { ...state, basic: { ...state.basic, ...action.payload } };
    case "SET_VEHICLE":
      return { ...state, vehicle: action.payload };
    case "SET_TRADE_IN_VEHICLE":
      return { ...state, tradeInVehicle: action.payload };
    case "SET_ITEMS":
      return { ...state, items: action.payload };
    case "ADD_ITEM":
      return { ...state, items: [...state.items, action.payload] };
    case "UPDATE_ITEM":
      return {
        ...state,
        items: state.items.map((it, i) =>
          i === action.index ? { ...it, ...action.payload } : it
        ),
      };
    case "REMOVE_ITEM": {
      const item = state.items[action.index];
      return {
        ...state,
        items: state.items.filter((_, i) => i !== action.index),
        deletedItemIds: item?.id
          ? [...state.deletedItemIds, item.id]
          : state.deletedItemIds,
      };
    }
    case "REORDER_ITEMS":
      return { ...state, items: action.payload };
    case "SET_GLOBAL_DISCOUNT":
      return { ...state, global_discount: action.payload };
    case "SET_SCHEDULE":
      return { ...state, schedule: { ...state.schedule, ...action.payload } };
    case "SET_INSURANCE":
      return { ...state, insurance: action.payload };
    case "SET_MEMO":
      return { ...state, memo: action.payload };
    case "SET_INTERNAL_MEMO":
      return { ...state, internal_memo: action.payload };
    default:
      return state;
  }
}

// ─── セクションヘッダ ─────────────────────────────────────────
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Typography variant="h6" fontWeight="bold" mb={2} color="primary">
        {children}
      </Typography>
      <Divider sx={{ mb: 3 }} />
    </>
  );
}

// ─── メインコンポーネント ─────────────────────────────────────
export default function EstimateForm({ mode, estimateId }: Props) {
  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    meta: { mode },
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  const router = useRouter();
  const searchParams = useSearchParams();
  const copyFrom = searchParams.get("copy_from");

  // 車両モードに応じてナビ項目をフィルタ
  const navSections = useMemo(() => {
    if (state.basic.vehicle_mode === "none") {
      return ALL_SECTIONS.filter((s) => s.key !== "vehicle");
    }
    return ALL_SECTIONS;
  }, [state.basic.vehicle_mode]);

  /**
   * PaymentForm 用の実効 items
   * - state.items の vehicle アイテムを除外（edit 時の二重計上を防ぐ）
   * - state.vehicle の最新単価を vehicle アイテムとして先頭に追加
   * → 作成中でも車両金額がリアルタイムで請求額に反映される
   */
  const effectiveItems = useMemo(() => {
    const nonVehicle = state.items.filter((i) => i.item_type !== "vehicle");
    if (state.vehicle && state.basic.vehicle_mode === "sale") {
      return [
        {
          item_type: "vehicle",
          quantity: 1,
          unit_price: state.vehicle.unit_price ?? 0,
          discount: state.vehicle.discount ?? 0,
          labor_cost: 0,
          tax_type: "taxable",
        },
        ...nonVehicle,
      ];
    }
    return nonVehicle;
  }, [state.items, state.vehicle, state.basic.vehicle_mode]);

  /* ── create初期化 ── */
  useEffect(() => {
    if (mode !== "create") return;
    (async () => {
      const user = (await apiClient.get("/auth/user/")).data;
      const nextNo = (await apiClient.get("/estimates/next-no/")).data.next_estimate_no;
      dispatch({
        type: "SET_BASIC",
        payload: {
          estimate_no: nextNo,
          shop: user.shop_id,
          created_by_id: user.id,
          estimate_date: dayjs().format("YYYY-MM-DD"),
        },
      });
    })();
  }, [mode]);

  /* ── 複製 ── */
  useEffect(() => {
    if (mode !== "create" || !copyFrom) return;
    (async () => {
      try {
        const res = await apiClient.get(`/estimates/${copyFrom}/`);
        const estimate = res.data;
        const vehicle = estimate.vehicles?.find((v: any) => !v.is_trade_in);
        const vehicleItem = estimate.items?.find((i: any) => i.item_type === "vehicle");
        const discountItem = estimate.items?.find((i: any) => i.item_type === "discount");

        dispatch({
          type: "INIT_FROM_API",
          payload: {
            status: "draft",
            basic: {
              shop: estimate.shop?.id ?? null,
              party_id: estimate.party?.id ?? null,
              new_party: estimate.party
                ? {
                    ...estimate.party,
                    customer_class:
                      typeof estimate.party.customer_class === "object"
                        ? estimate.party.customer_class.id
                        : estimate.party.customer_class ?? null,
                    region:
                      typeof estimate.party.region === "object"
                        ? estimate.party.region.id
                        : estimate.party.region ?? null,
                    gender:
                      typeof estimate.party.gender === "object"
                        ? estimate.party.gender.id
                        : estimate.party.gender ?? null,
                  }
                : null,
              vehicle_mode: estimate.vehicle_mode ?? "none",
              created_by_id: estimate.created_by?.id ?? null,
            },
            items: estimate.items ?? [],
            global_discount: discountItem?.discount ?? 0,
            memo: estimate.memo || "",
            internal_memo: estimate.internal_memo || "",
            schedule: estimate.schedule
              ? {
                  start_at: estimate.schedule.start_at,
                  date: dayjs(estimate.schedule.start_at).format("YYYY-MM-DD"),
                  time: dayjs(estimate.schedule.start_at).format("HH:mm"),
                  delivery_method: estimate.schedule.delivery_method,
                  delivery_shop: estimate.schedule.delivery_shop,
                  description: estimate.schedule.description,
                }
              : initialState.schedule,
            vehicle: vehicle
              ? {
                  ...vehicle,
                  manufacturer:
                    typeof vehicle.manufacturer === "object"
                      ? vehicle.manufacturer.id
                      : vehicle.manufacturer ?? null,
                  category_id: vehicleItem?.category?.id ?? null,
                  unit_price: vehicleItem?.unit_price ?? 0,
                }
              : null,
          },
        });
      } catch (e) {
        console.error(e);
        setSnackbar({ open: true, message: "複製データ取得に失敗しました", severity: "error" });
      }
    })();
  }, [mode, copyFrom]);

  /* ── edit初期化 ── */
  useEffect(() => {
    if (mode !== "edit" || !estimateId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await apiClient.get(`/estimates/${estimateId}/`);
        const estimate = res.data;
        const vehicle = estimate.vehicles?.find((v: any) => !v.is_trade_in);
        const vehicleItem = estimate.items?.find((i: any) => i.item_type === "vehicle");
        const discountItem = estimate.items?.find((i: any) => i.item_type === "discount");
        const normalizeFk = (v: any) => (typeof v === "object" ? v?.id ?? null : v ?? null);

        const settlementsObj = (estimate.settlements || []).reduce(
          (acc: any, s: any) => { acc[s.settlement_type] = Number(s.amount); return acc; },
          { trade_in: 0, cash: 0, card: 0, loan: 0, qr: 0, coupon: 0, transfer: 0 }
        );
        const payment = estimate.payments?.[0];

        dispatch({
          type: "INIT_FROM_API",
          payload: {
            meta: { id: estimate.id, mode: "edit" },
            status: estimate.status ?? "draft",
            basic: {
              estimate_no: estimate.estimate_no,
              shop: estimate.shop?.id ?? null,
              settlements: settlementsObj,
              credit_company: payment?.credit_company || "",
              credit_installments: payment?.credit_installments || null,
              credit_first_payment: payment?.credit_first_payment || null,
              credit_second_payment: payment?.credit_second_payment || null,
              credit_bonus_payment: payment?.credit_bonus_payment || null,
              credit_start_month: payment?.credit_start_month || "",
              party_id: estimate.party?.id ?? null,
              new_party: estimate.party
                ? {
                    ...estimate.party,
                    customer_class: normalizeFk(estimate.party.customer_class),
                    region: normalizeFk(estimate.party.region),
                    gender: normalizeFk(estimate.party.gender),
                  }
                : null,
              vehicle_mode: estimate.vehicle_mode ?? "none",
              created_by_id: estimate.created_by?.id ?? null,
              estimate_date: estimate.estimate_date,
            },
            items: (estimate.items ?? []).map((item: any) => ({
              ...item,
              staff_id: item.staff?.id ?? item.staff_id ?? null,
              unit: item.unit?.id ?? item.unit ?? null,
            })),
            global_discount: discountItem?.discount ?? 0,
            memo: estimate.memo || "",
            internal_memo: estimate.internal_memo || "",
            schedule: estimate.schedule
              ? {
                  id: estimate.schedule.id,
                  start_at: estimate.schedule.start_at,
                  date: dayjs(estimate.schedule.start_at).format("YYYY-MM-DD"),
                  time: dayjs(estimate.schedule.start_at).format("HH:mm"),
                  delivery_method: estimate.schedule.delivery_method,
                  delivery_shop: estimate.schedule.delivery_shop,
                  description: estimate.schedule.description,
                }
              : initialState.schedule,
            vehicle: vehicle
              ? {
                  ...vehicle,
                  manufacturer:
                    vehicle.manufacturer_detail?.id ?? vehicle.manufacturer ?? null,
                  category_id: vehicleItem?.category?.id ?? null,
                  unit_price: vehicleItem?.unit_price ?? 0,
                }
              : null,
          },
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [mode, estimateId]);

  /* ── 共通保存ロジック ── */
  const saveData = async (): Promise<number | null> => {
    const settlementsPayload = Object.entries(state.basic.settlements || {})
      .filter(([_, value]) => Number(value) > 0)
      .map(([key, value]) => ({ settlement_type: key, amount: Number(value) }));

    const paymentPayload =
      Number(state.basic.settlements?.loan || 0) > 0
        ? {
            credit_company: state.basic.credit_company || "",
            credit_installments: state.basic.credit_installments || null,
            credit_first_payment: state.basic.credit_first_payment || null,
            credit_second_payment: state.basic.credit_second_payment || null,
            credit_bonus_payment: state.basic.credit_bonus_payment || null,
            credit_start_month: state.basic.credit_start_month || "",
          }
        : null;

    // 車両ペイロード
    const vehiclesPayload = state.basic.vehicle_mode !== "none"
      ? [
          state.vehicle
            ? {
                ...state.vehicle,
                is_trade_in: false,
                category_id: state.vehicle.category_id ?? state.vehicle.category?.id ?? null,
              }
            : null,
          state.tradeInVehicle
            ? {
                ...state.tradeInVehicle,
                is_trade_in: true,
                category_id: state.tradeInVehicle.category_id ?? state.tradeInVehicle.category?.id ?? null,
              }
            : null,
        ].filter((v): v is NonNullable<typeof v> => {
          if (!v) return false;
          return !!(
            (v as any).category_id ||
            (v as any).vehicle_name ||
            (v as any).chassis_no ||
            (v as any).model_code ||
            (v as any).registrations?.[0]?.registration_no
          );
        })
      : [];

    // 明細ペイロード（id を除外して正規化・削除済みアイテムは自動除外）
    const itemsPayload: any[] = [];

    // 車両アイテム
    if (state.vehicle && state.basic.vehicle_mode === "sale") {
      itemsPayload.push({
        item_type: "vehicle",
        name: state.vehicle.vehicle_name || "車両",
        quantity: 1,
        unit_price: state.vehicle.unit_price ?? 0,
        discount: state.vehicle.discount ?? 0,
        category_id: state.vehicle.category_id ?? null,
        manufacturer: state.vehicle.manufacturer ?? null,
        unit: state.vehicle.unit ?? null,
        sale_type: state.vehicle.sale_type ?? null,
        tax_type: "taxable",
      });
    }

    // 通常アイテム（vehicle・discount以外）を正規化して追加
    state.items
      .filter((i) => i.item_type !== "vehicle" && i.item_type !== "discount")
      .forEach((item) => {
        const { id: _id, ...rest } = item; // IDを除外（バックエンドで再採番）
        itemsPayload.push({
          ...rest,
          staff: item.staff_id ?? null,
          category_id: item.category_id ?? item.category?.id ?? null,
          unit: item.unit ?? null,
        });
      });

    // 全体値引き
    if (state.global_discount > 0) {
      itemsPayload.push({
        item_type: "discount",
        name: "値引き調整",
        quantity: 1,
        unit_price: 0,
        discount: state.global_discount,
        labor_cost: 0,
        tax_type: "taxable",
        category_id: null,
        manufacturer: null,
        staff: null,
        unit: null,
      });
    }

    // ヘッダー・車両・明細・精算・支払いをまとめて1回のAPIコールで送信
    // → バックエンドが atomic に処理するためエラー時に空の見積が残らない
    const fullPayload = {
      estimate_no: state.basic.estimate_no,
      shop: state.basic.shop,
      created_by_id: state.basic.created_by_id,
      vehicle_mode: state.basic.vehicle_mode,
      estimate_date: state.basic.estimate_date,
      new_party: state.basic.new_party,
      settlements: settlementsPayload,
      memo: state.memo,
      internal_memo: state.internal_memo,
      payment: paymentPayload,
      insurance_payload: state.insurance,
      vehicles_payload: vehiclesPayload,
      items: itemsPayload,
    };

    let id = estimateId ?? state.meta.id;

    if (!id) {
      const res = await apiClient.post("/estimates/", fullPayload);
      id = res.data.id;
    } else {
      await apiClient.put(`/estimates/${id}/`, fullPayload);
    }

    return id!;
  };

  /* ── 下書き保存 ── */
  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const id = await saveData();
      if (!id) return;
      setSavedAt(dayjs().format("HH:mm"));
      setSnackbar({ open: true, message: "下書きを保存しました", severity: "success" });
      if (mode === "create") {
        // 新規作成後はeditモードにリダイレクト（重複作成防止）
        router.replace(`/dashboard/estimates/${id}/edit`);
      }
    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: "保存に失敗しました", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  /* ── 見積提出 ── */
  const handleSubmitEstimate = async () => {
    setSaving(true);
    try {
      const id = await saveData();
      if (!id) return;
      if (state.status === "draft") {
        await apiClient.patch(`/estimates/${id}/status/`, { status: "issued" });
      }
      router.push(`/dashboard/estimates/${id}`);
    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: "提出に失敗しました", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  /* ── 保存のみ（issued/orderedのedit） ── */
  const handleSaveOnly = async () => {
    setSaving(true);
    try {
      const id = await saveData();
      if (!id) return;
      router.push(`/dashboard/estimates/${id}`);
    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: "保存に失敗しました", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={10}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* ===== 固定ヘッダ ===== */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 200,
          bgcolor: "white",
          borderBottom: "2px solid #e0e0e0",
          px: 3,
          py: 1.5,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            size="small"
            startIcon={<ArrowBackIcon />}
            onClick={() => router.back()}
            sx={{ color: "text.secondary" }}
          >
            戻る
          </Button>
          <Typography variant="h6" fontWeight="bold">
            {mode === "create" ? "見積作成" : "見積編集"}
          </Typography>
          <Chip
            size="small"
            label={STATUS_LABEL[state.status] ?? state.status}
            color={STATUS_COLOR[state.status] ?? "default"}
            sx={{ fontWeight: "bold" }}
          />
          {savedAt && (
            <Typography variant="caption" color="text.secondary">
              {savedAt} 保存済み
            </Typography>
          )}
        </Box>

        <Box display="flex" gap={1.5} alignItems="center">
          {/* 下書き保存：下書き状態のみ */}
          {state.status === "draft" && (
            <Button
              variant="outlined"
              startIcon={<SaveIcon />}
              onClick={handleSaveDraft}
              disabled={saving}
              size="small"
            >
              下書き保存
            </Button>
          )}

          {/* 見積提出：下書きのみ */}
          {state.status === "draft" && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<SendIcon />}
              onClick={handleSubmitEstimate}
              disabled={saving}
              size="small"
            >
              見積提出
            </Button>
          )}

          {/* 保存：提出済み・受注済みのedit */}
          {state.status !== "draft" && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              onClick={handleSaveOnly}
              disabled={saving}
              size="small"
            >
              保存
            </Button>
          )}
        </Box>
      </Box>

      {/* ===== メインレイアウト ===== */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "200px 1fr" },
          gap: 3,
          p: 3,
          maxWidth: 1400,
          mx: "auto",
        }}
      >
        {/* ── 左ナビ (desktop) ── */}
        <Box sx={{ display: { xs: "none", md: "block" } }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              position: "sticky",
              top: 72,
              border: "1px solid #e0e0e0",
              borderRadius: 2,
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight="bold"
              display="block"
              mb={1.5}
            >
              セクション
            </Typography>
            {navSections.map((s) => (
              <Box key={s.key}>
                <Box
                  component="a"
                  href={`#est-${s.key}`}
                  sx={{
                    display: "block",
                    py: 0.75,
                    px: 1.5,
                    borderRadius: 1,
                    fontSize: 14,
                    color: "text.primary",
                    textDecoration: "none",
                    "&:hover": { bgcolor: "#e8f4fd", color: "primary.main" },
                  }}
                >
                  {s.label}
                </Box>
              </Box>
            ))}
          </Paper>
        </Box>

        {/* ── コンテンツ ── */}
        <Box>
          {/* セクション: 基本情報 */}
          <Paper id="est-basic" sx={{ p: 3, mb: 3, borderRadius: 2 }} elevation={1}>
            <SectionHeader>基本情報</SectionHeader>
            <BasicInfoForm basic={state.basic} dispatch={dispatch} />
          </Paper>

          {/* セクション: 車両情報 */}
          {state.basic.vehicle_mode !== "none" && (
            <Paper id="est-vehicle" sx={{ p: 3, mb: 3, borderRadius: 2 }} elevation={1}>
              <SectionHeader>車両情報</SectionHeader>
              <VehicleStep
                vehicle={state.vehicle}
                tradeInVehicle={state.tradeInVehicle}
                schedule={state.schedule}
                insurance={state.insurance}
                dispatch={dispatch}
                partyId={state.basic.party_id}
                vehicleMode={state.basic.vehicle_mode}
              />
            </Paper>
          )}

          {/* セクション: その他費用 */}
          <Paper id="est-items" sx={{ p: 3, mb: 3, borderRadius: 2 }} elevation={1}>
            <SectionHeader>その他費用</SectionHeader>
            <OtherStep items={state.items} dispatch={dispatch} />
          </Paper>

          {/* セクション: 課税費用 */}
          <Paper id="est-taxable" sx={{ p: 3, mb: 3, borderRadius: 2 }} elevation={1}>
            <SectionHeader>課税費用</SectionHeader>
            <TaxableExpenseStep items={state.items} dispatch={dispatch} />
          </Paper>

          {/* セクション: 非課税費用 */}
          <Paper id="est-nontaxable" sx={{ p: 3, mb: 3, borderRadius: 2 }} elevation={1}>
            <SectionHeader>非課税費用</SectionHeader>
            <NonTaxableExpenseStep items={state.items} dispatch={dispatch} />
          </Paper>

          {/* セクション: 支払い */}
          <Paper id="est-payment" sx={{ p: 3, mb: 3, borderRadius: 2 }} elevation={1}>
            <SectionHeader>支払い</SectionHeader>

            {/* 全体値引き */}
            <Box mb={3}>
              <Typography fontWeight="bold" mb={1} fontSize={14} color="text.secondary">
                全体値引き（円）
              </Typography>
              <TextField
                type="number"
                size="small"
                value={state.global_discount}
                inputProps={{ step: 1, min: 0, style: { textAlign: "right" } }}
                onChange={(e) =>
                  dispatch({
                    type: "SET_GLOBAL_DISCOUNT",
                    payload: e.target.value === "" ? 0 : Math.round(Number(e.target.value)),
                  })
                }
                sx={{ width: 200 }}
              />
            </Box>

            <Divider sx={{ mb: 3 }} />
            <PaymentForm
              basic={state.basic}
              items={effectiveItems}
              global_discount={state.global_discount}
              dispatch={dispatch}
            />
          </Paper>

          {/* セクション: メモ */}
          <Paper id="est-memo" sx={{ p: 3, mb: 3, borderRadius: 2 }} elevation={1}>
            <SectionHeader>メモ</SectionHeader>
            <MemoSection
              docLabel="見積書"
              memo={state.memo || ""}
              internalMemo={state.internal_memo || ""}
              onMemoChange={(v) => dispatch({ type: "SET_MEMO", payload: v })}
              onInternalMemoChange={(v) => dispatch({ type: "SET_INTERNAL_MEMO", payload: v })}
            />
          </Paper>

          {/* 最下部アクションボタン */}
          <Box display="flex" justifyContent="flex-end" gap={2} mb={4}>
            {state.status === "draft" && (
              <Button
                variant="outlined"
                startIcon={<SaveIcon />}
                onClick={handleSaveDraft}
                disabled={saving}
              >
                下書き保存
              </Button>
            )}
            {state.status === "draft" && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<SendIcon />}
                onClick={handleSubmitEstimate}
                disabled={saving}
              >
                見積提出
              </Button>
            )}
            {state.status !== "draft" && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                onClick={handleSaveOnly}
                disabled={saving}
              >
                保存
              </Button>
            )}
          </Box>
        </Box>
      </Box>

      {/* スナックバー */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((p) => ({ ...p, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
