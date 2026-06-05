"use client";

import React, { useEffect, useReducer, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import apiClient from "@/lib/apiClient";
import dayjs from "dayjs";

import BasicInfoForm from "@/components/sale/BasicInfoForm";
import VehicleStep from "@/components/sale/VehicleStep";
import OtherStep from "@/components/sale/OtherStep";
import ExpenseStep from "@/components/sale/TaxableExpenseStep";
import InsuranceStep from "@/components/sale/NonTaxableExpenseStep";
import PaymentForm from "@/components/sale/PaymentForm";
import MemoSection from "@/components/sale/MemoSection";

// ─── ステータス表示 ───────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  draft:           "下書き",
  ordered:         "受注確定",
  cancelled:       "キャンセル",
  delivered:       "納品済み",
  sales_completed: "売上計上済",
};
const STATUS_COLOR: Record<string, "warning" | "primary" | "error" | "success" | "info"> = {
  draft:           "warning",
  ordered:         "primary",
  cancelled:       "error",
  delivered:       "success",
  sales_completed: "info",
};

// ─── セクション定義 ──────────────────────────────────────────
const ALL_SECTIONS = [
  { key: "basic",      label: "基本情報" },
  { key: "vehicle",    label: "車両情報" },
  { key: "items",      label: "その他費用" },
  { key: "expenses",   label: "課税費用" },
  { key: "insurance",  label: "非課税費用" },
  { key: "payment",    label: "支払い" },
  { key: "memo",       label: "メモ" },
];

// ─── Props ───────────────────────────────────────────────────
type Props = {
  mode: "create" | "edit";
  orderId?: number;
};

// ─── State ───────────────────────────────────────────────────
type OrderState = {
  meta: { id?: number; mode: "create" | "edit" };
  status: string;
  basic: any;
  vehicle: any | null;
  tradeInVehicle: any | null;
  items: any[];
  global_discount: number;
  insurance: any;
  memo: string;
  internal_memo: string;
  schedule?: any;
};

const initialState: OrderState = {
  meta: { mode: "create" },
  status: "draft",
  basic: {
    order_no: "",
    shop: null,
    customer_id: null,
    new_customer: null,
    created_by_id: null,
    vehicle_mode: "sale",
    order_date: dayjs().format("YYYY-MM-DD"),
    payment_method: "現金",
  },
  vehicle: null,
  tradeInVehicle: null,
  items: [],
  schedule: {
    id: null,
    start_at: "",
    end_at: "",
    delivery_method: "",
    delivery_shop: null,
    description: "",
  },
  global_discount: 0,
  insurance: {
    company_name: "",
    bodily_injury: "",
    property_damage: "",
    passenger: "",
    vehicle: "",
    option: "",
  },
  memo: "",
  internal_memo: "",
};

function reducer(state: OrderState, action: any): OrderState {
  switch (action.type) {
    case "INIT_FROM_API":
      return {
        ...state,
        ...action.payload,
        status: action.payload.status ?? "draft",
        schedule: action.payload.schedule
          ? { ...state.schedule, ...action.payload.schedule }
          : state.schedule,
      };
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
    case "REMOVE_ITEM":
      return { ...state, items: state.items.filter((_, i) => i !== action.index) };
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
export default function OrderForm({ mode, orderId }: Props) {
  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    meta: { mode },
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false, message: "", severity: "success",
  });

  // 類似顧客ダイアログ
  const [similarCandidates, setSimilarCandidates] = useState<any[]>([]);
  const [similarOpen, setSimilarOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<any>(null);
  const [pendingAction, setPendingAction] = useState<"draft" | "confirm">("draft");

  const router = useRouter();
  const searchParams = useSearchParams();
  const fromEstimate = searchParams.get("from_estimate");
  const copyFrom     = searchParams.get("copy_from");

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
    if (mode !== "create" || initialized) return;
    setInitialized(true);

    (async () => {
      try {
        const user = (await apiClient.get("/auth/user/")).data;
        dispatch({
          type: "SET_BASIC",
          payload: { shop: user.shop_id ?? null, created_by_id: user.id, vehicle_mode: "sale" },
        });

        if (fromEstimate) {
          const res = await apiClient.post("/orders/prepare-from-estimate/", {
            estimate_id: Number(fromEstimate),
          });
          const data = res.data;
          const settlementsObj = (data.settlements || []).reduce(
            (acc: any, s: any) => { acc[s.settlement_type] = Number(s.amount); return acc; },
            { trade_in: 0, cash: 0, card: 0, loan: 0, qr: 0, coupon: 0, transfer: 0 }
          );
          const discountItem = data.items?.find((item: any) => item.item_type === "discount");

          dispatch({
            type: "INIT_FROM_API",
            payload: {
              status: "draft",
              basic: {
                order_no: data.order_no ?? "",
                shop: data.shop ?? user.shop_id ?? null,
                customer_id: data.customer_id ?? null,
                new_customer: data.new_customer ?? null,
                created_by_id: user.id,
                vehicle_mode: data.vehicle_mode ?? "sale",
                order_date: dayjs().format("YYYY-MM-DD"),
                settlements: settlementsObj,
                credit_company: data.payment?.credit_company || "",
                credit_installments: data.payment?.credit_installments || null,
                credit_first_payment: data.payment?.credit_first_payment || null,
                credit_second_payment: data.payment?.credit_second_payment || null,
                credit_bonus_payment: data.payment?.credit_bonus_payment || null,
                credit_start_month: data.payment?.credit_start_month || "",
                estimate: data.estimate_id ?? null,
              },
              items: (data.items ?? []).map((item: any) => ({
                ...item,
                staff_id: item.staff ?? null,
                manufacturer: item.manufacturer ?? null,
                labor_cost: item.labor_cost ?? 0,
                unit: item.unit?.id ?? item.unit ?? null,
              })),
              global_discount: discountItem?.discount ?? 0,
              insurance: data.insurance || initialState.insurance,
              memo: data.memo || "",
              internal_memo: data.internal_memo || "",
              vehicle: data.target_vehicle
                ? { ...data.target_vehicle, discount: data.target_vehicle.discount ?? 0 }
                : null,
              tradeInVehicle: data.trade_in_vehicle
                ? { ...data.trade_in_vehicle, discount: data.trade_in_vehicle.discount ?? 0 }
                : null,
              schedule: data.schedule,
            },
          });
        }
      } catch (e) {
        console.error(e);
        setSnackbar({ open: true, message: "初期データ取得に失敗しました", severity: "error" });
      }
    })();
  }, [mode, fromEstimate, initialized]);

  /* ── 複製 ── */
  useEffect(() => {
    if (mode !== "create" || !copyFrom) return;
    (async () => {
      try {
        const [userRes, orderRes] = await Promise.all([
          apiClient.get("/auth/user/"),
          apiClient.get(`/orders/${copyFrom}/`),
        ]);
        const user  = userRes.data;
        const order = orderRes.data;

        const discountItem    = order.items?.find((i: any) => i.item_type === "discount");
        const settlementsObj  = (order.settlements || []).reduce(
          (acc: any, s: any) => { acc[s.settlement_type] = Number(s.amount); return acc; },
          { trade_in: 0, cash: 0, card: 0, loan: 0, qr: 0, coupon: 0, transfer: 0 }
        );
        const payment = order.payments?.[0];

        dispatch({
          type: "INIT_FROM_API",
          payload: {
            // 複製なので下書き・番号なし・日付は今日にリセット
            status: "draft",
            meta:   { mode: "create" },
            basic: {
              order_no:     "",
              shop:         order.shop?.id ?? user.shop_id ?? null,
              customer_id:  order.customer?.id ?? null,
              new_customer: order.customer
                ? {
                    ...order.customer,
                    customer_class: order.customer.customer_class?.id ?? null,
                    region:         order.customer.region?.id ?? null,
                    gender:         order.customer.gender?.id ?? null,
                  }
                : null,
              created_by_id: user.id,
              vehicle_mode:  order.vehicle_mode ?? "none",
              order_date:    dayjs().format("YYYY-MM-DD"),
              settlements:   settlementsObj,
              credit_company:      payment?.credit_company      || "",
              credit_installments: payment?.credit_installments || null,
              credit_first_payment:  payment?.credit_first_payment  || null,
              credit_second_payment: payment?.credit_second_payment || null,
              credit_bonus_payment:  payment?.credit_bonus_payment  || null,
              credit_start_month:    payment?.credit_start_month    || "",
            },
            items: (order.items ?? []).map((item: any) => ({
              ...item,
              id:       undefined, // 複製なので ID はリセット
              staff_id: item.staff?.id ?? item.staff_id ?? null,
              unit:     item.unit?.id ?? item.unit ?? null,
            })),
            global_discount: discountItem?.discount ?? 0,
            insurance:       order.insurance || initialState.insurance,
            memo:            order.memo          || "",
            internal_memo:   order.internal_memo || "",
            schedule: order.schedule
              ? {
                  id:              null, // 新規スケジュール
                  start_at:        order.schedule.start_at,
                  end_at:          order.schedule.end_at,
                  delivery_method: order.schedule.delivery_method,
                  delivery_shop:   order.schedule.delivery_shop,
                  description:     order.schedule.description,
                }
              : initialState.schedule,
            vehicle: (() => {
              const v = order.vehicles?.find((x: any) => !x.is_trade_in);
              if (!v) return null;
              return {
                id:           undefined, // 複製
                category_id:  v.category?.id ?? v.category ?? null,
                manufacturer: v.manufacturer?.id ?? null,
                vehicle_name: v.vehicle_name ?? "",
                model_year:   v.model_year   ?? "",
                chassis_no:   v.chassis_no   ?? "",
                displacement: v.displacement ?? null,
                engine_type:  v.engine_type  ?? "",
                model_code:   v.model_code   ?? "",
                color:        v.color?.id ?? v.color ?? null,
                color_name:   v.color_name   ?? "",
                color_code:   v.color_code   ?? "",
                sale_type:    v.sale_type    ?? "",
                unit_price:   order.items?.find((i: any) => i.item_type === "vehicle")?.unit_price ?? 0,
                discount:     order.items?.find((i: any) => i.item_type === "vehicle")?.discount   ?? 0,
                source_customer_vehicle: null,
              };
            })(),
            tradeInVehicle: (() => {
              const v = order.vehicles?.find((x: any) => x.is_trade_in);
              if (!v) return null;
              return {
                id:           undefined, // 複製
                category_id:  v.category?.id ?? v.category ?? null,
                manufacturer: v.manufacturer?.id ?? null,
                vehicle_name: v.vehicle_name ?? "",
                model_year:   v.model_year   ?? "",
                chassis_no:   v.chassis_no   ?? "",
                displacement: v.displacement ?? null,
                engine_type:  v.engine_type  ?? "",
                model_code:   v.model_code   ?? "",
                color:        v.color?.id ?? v.color ?? null,
                color_name:   v.color_name   ?? "",
                color_code:   v.color_code   ?? "",
                sale_type:    v.sale_type    ?? "",
                source_customer_vehicle: v.source_customer_vehicle ?? null,
                registrations: v.registrations ?? [],
                unit_price: 0,
                discount:   0,
              };
            })(),
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
    if (mode !== "edit" || !orderId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await apiClient.get(`/orders/${orderId}/`);
        const order = res.data;
        const discountItem = order.items?.find((item: any) => item.item_type === "discount");
        const settlementsObj = (order.settlements || []).reduce(
          (acc: any, s: any) => { acc[s.settlement_type] = Number(s.amount); return acc; },
          { trade_in: 0, cash: 0, card: 0, loan: 0, qr: 0, coupon: 0, transfer: 0 }
        );
        const payment = order.payments?.[0];

        dispatch({
          type: "INIT_FROM_API",
          payload: {
            meta: { id: order.id, mode: "edit" },
            status: order.status ?? "draft",
            basic: {
              order_no: order.order_no,
              shop: order.shop?.id ?? null,
              customer_id: order.customer?.id ?? null,
              new_customer: order.customer
                ? {
                    ...order.customer,
                    customer_class: order.customer.customer_class?.id ?? null,
                    region:         order.customer.region?.id ?? null,
                    gender:         order.customer.gender?.id ?? null,
                  }
                : null,
              created_by_id: order.created_by?.id ?? null,
              vehicle_mode: order.vehicle_mode ?? "none",
              order_date: order.order_date,
              settlements: settlementsObj,
              credit_company: payment?.credit_company || "",
              credit_installments: payment?.credit_installments || null,
              credit_first_payment: payment?.credit_first_payment || null,
              credit_second_payment: payment?.credit_second_payment || null,
              credit_bonus_payment: payment?.credit_bonus_payment || null,
              credit_start_month: payment?.credit_start_month || "",
            },
            items: (order.items ?? []).map((item: any) => ({
              ...item,
              staff_id: item.staff?.id ?? item.staff_id ?? null,
              unit: item.unit?.id ?? item.unit ?? null,
            })),
            global_discount: discountItem?.discount ?? 0,
            insurance: order.insurance || initialState.insurance,
            memo: order.memo || "",
            internal_memo: order.internal_memo || "",
            schedule: order.schedule
              ? {
                  id: order.schedule.id,
                  start_at: order.schedule.start_at,
                  end_at: order.schedule.end_at,
                  delivery_method: order.schedule.delivery_method,
                  delivery_shop: order.schedule.delivery_shop,
                  description: order.schedule.description,
                }
              : initialState.schedule,
            vehicle: (() => {
              const v = order.vehicles?.find((x: any) => !x.is_trade_in);
              if (!v) return null;
              return {
                id: v.id ?? null,
                category_id: v.category?.id ?? v.category ?? null,
                manufacturer: v.manufacturer?.id ?? null,
                vehicle_name: v.vehicle_name ?? "",
                model_year: v.model_year ?? "",
                chassis_no: v.chassis_no ?? "",
                displacement: v.displacement ?? null,
                engine_type: v.engine_type ?? "",
                model_code: v.model_code ?? "",
                color: v.color?.id ?? v.color ?? null,
                color_name: v.color_name ?? "",
                color_code: v.color_code ?? "",
                sale_type: v.sale_type ?? "",
                unit_price:
                  order.items?.find((i: any) => i.item_type === "vehicle")?.unit_price ?? 0,
                discount:
                  order.items?.find((i: any) => i.item_type === "vehicle")?.discount ?? 0,
                source_customer_vehicle: null,
              };
            })(),
            tradeInVehicle: (() => {
              const v = order.vehicles?.find((x: any) => x.is_trade_in);
              if (!v) return null;
              return {
                id: v.id ?? null,
                category_id: v.category?.id ?? v.category ?? null,
                manufacturer: v.manufacturer?.id ?? null,
                vehicle_name: v.vehicle_name ?? "",
                model_year: v.model_year ?? "",
                chassis_no: v.chassis_no ?? "",
                displacement: v.displacement ?? null,
                engine_type: v.engine_type ?? "",
                model_code: v.model_code ?? "",
                color: v.color?.id ?? v.color ?? null,
                color_name: v.color_name ?? "",
                color_code: v.color_code ?? "",
                sale_type: v.sale_type ?? "",
                source_customer_vehicle: v.source_customer_vehicle ?? null,
                registrations: v.registrations ?? [],
                unit_price: 0,
                discount: 0,
              };
            })(),
          },
        });
      } catch (e) {
        console.error(e);
        setSnackbar({ open: true, message: "受注データ取得に失敗しました", severity: "error" });
      } finally {
        setLoading(false);
      }
    })();
  }, [mode, orderId]);

  /* ── ペイロード構築 ── */
  const buildPayload = () => {
    let items = [...state.items].filter(
      (i) => i.item_type !== "vehicle" && i.item_type !== "discount"
    );

    if (state.vehicle && state.basic.vehicle_mode === "sale") {
      items = items.filter((i) => i.item_type !== "vehicle");
      items.unshift({
        item_type: "vehicle",
        name: state.vehicle.vehicle_name || "車両",
        quantity: 1,
        unit_price: state.vehicle.unit_price ?? 0,
        discount: state.vehicle.discount ?? 0,
        unit: state.vehicle.unit ?? null,
        sale_type: state.vehicle.sale_type ?? null,
        category_id: state.vehicle.category_id ?? state.vehicle.category?.id ?? null,
        manufacturer:
          state.vehicle.manufacturer?.id ?? state.vehicle.manufacturer ?? null,
      });
    }

    if (state.global_discount > 0) {
      items.push({
        item_type: "discount",
        name: "値引き調整",
        quantity: 1,
        unit_price: 0,
        discount: state.global_discount,
        labor_cost: 0,
        unit: null,
        tax_type: "taxable",
        category_id: null,
        manufacturer: null,
        staff_id: null,
      });
    }

    const creditAmount = Number(state.basic.settlements?.loan || 0);
    const settlementsPayload = Object.entries(state.basic.settlements || {})
      .filter(([_, v]) => Number(v) > 0)
      .map(([k, v]) => ({ settlement_type: k, amount: Number(v) }));

    const paymentPayload =
      creditAmount > 0
        ? {
            credit_company: state.basic.credit_company || null,
            credit_installments: state.basic.credit_installments || null,
            credit_first_payment: state.basic.credit_first_payment || null,
            credit_second_payment: state.basic.credit_second_payment || null,
            credit_bonus_payment: state.basic.credit_bonus_payment || null,
            credit_start_month: state.basic.credit_start_month || null,
          }
        : null;

    return {
      shop: state.basic.shop,
      created_by_id: state.basic.created_by_id,
      order_date: state.basic.order_date,
      vehicle_mode: state.basic.vehicle_mode,
      estimate: state.basic.estimate ?? null,
      customer_id: state.basic.customer_id ?? null,
      new_customer: state.basic.customer_id ? null : state.basic.new_customer ?? null,
      items: items.map((item) => ({
        item_type: item.item_type,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_type: item.tax_type,
        discount: item.discount,
        sale_type: item.sale_type,
        labor_cost: item.labor_cost ?? 0,
        unit: item.unit ?? null,
        staff: item.staff_id ?? (typeof item.staff === "number" ? item.staff : null),
        manufacturer:
          typeof item.manufacturer === "object"
            ? item.manufacturer?.id
            : item.manufacturer ?? null,
        category_id: item.category_id ?? item.category?.id ?? null,
      })),
      target_vehicle: state.vehicle
        ? {
            ...state.vehicle,
            manufacturer:
              typeof state.vehicle.manufacturer === "object"
                ? state.vehicle.manufacturer?.id
                : state.vehicle.manufacturer ?? null,
          }
        : null,
      settlements: settlementsPayload,
      insurance_payload: state.insurance,
      payment: paymentPayload,
      memo: state.memo,
      internal_memo: state.internal_memo,
    };
  };

  /* ── 類似顧客チェック ── */
  const checkSimilar = async (payload: any, action: "draft" | "confirm"): Promise<boolean> => {
    if (!state.basic.customer_id && state.basic.new_customer) {
      const nc = state.basic.new_customer;
      const similarRes = await apiClient.post("/customers/similar/", {
        name: nc.name, kana: nc.kana, phone: nc.phone,
        mobile_phone: nc.mobile_phone, email: nc.email, address: nc.address,
      });
      if (similarRes.data.has_similar) {
        setSimilarCandidates(similarRes.data.candidates);
        setPendingPayload(payload);
        setPendingAction(action);
        setSimilarOpen(true);
        return true; // 処理を中断
      }
    }
    return false;
  };

  /* ── 共通保存 ── */
  const saveOrder = async (payload: any): Promise<number> => {
    let res;
    if (mode === "create" && !state.meta.id) {
      res = await apiClient.post("/orders/", payload);
    } else {
      res = await apiClient.patch(`/orders/${orderId ?? state.meta.id}/`, payload);
    }
    const id = res.data.id;

    // スケジュール保存
    if (state.schedule?.start_at) {
      const schedPayload = {
        start_at: state.schedule.start_at,
        end_at: state.schedule.end_at || dayjs(state.schedule.start_at).add(1, "hour").format(),
        delivery_method: state.schedule.delivery_method || "",
        delivery_shop: state.schedule.delivery_shop || null,
        description: state.schedule.description || "",
      };
      if (state.schedule.id) {
        await apiClient.patch(`/schedules/${state.schedule.id}/`, schedPayload);
      } else {
        await apiClient.post("/schedules/", { order: id, title: "納車予定日", ...schedPayload });
      }
    }
    return id;
  };

  /* ── 下書き保存 ── */
  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const payload = buildPayload();
      const interrupted = await checkSimilar(payload, "draft");
      if (interrupted) { setSaving(false); return; }

      const id = await saveOrder(payload);
      setSavedAt(dayjs().format("HH:mm"));
      setSnackbar({ open: true, message: "下書きを保存しました", severity: "success" });

      if (mode === "create" && !state.meta.id) {
        router.replace(`/dashboard/orders/${id}/edit`);
      }
    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: "保存に失敗しました", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  /* ── 受注確定 ── */
  const handleConfirmOrder = async () => {
    setSaving(true);
    try {
      const payload = buildPayload();
      const interrupted = await checkSimilar(payload, "confirm");
      if (interrupted) { setSaving(false); return; }

      const id = await saveOrder(payload);
      if (state.status === "draft") {
        await apiClient.patch(`/orders/${id}/status/`, { status: "ordered" });
      }
      window.location.href = `/dashboard/orders/${id}`;
    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: "保存に失敗しました", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  /* ── 保存のみ (confirmed) ── */
  const handleSaveOnly = async () => {
    setSaving(true);
    try {
      const payload = buildPayload();
      const id = await saveOrder(payload);
      window.location.href = `/dashboard/orders/${id}`;
    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: "保存に失敗しました", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  /* ── 類似顧客選択後の続行 ── */
  const continueWithCustomer = async (customerId: number | null) => {
    if (!pendingPayload) return;
    setSimilarOpen(false);
    setSaving(true);
    try {
      const payload = {
        ...pendingPayload,
        customer_id: customerId,
        new_customer: customerId ? null : pendingPayload.new_customer,
      };
      const id = await saveOrder(payload);
      if (pendingAction === "confirm" && state.status === "draft") {
        await apiClient.patch(`/orders/${id}/status/`, { status: "ordered" });
      }
      window.location.href = `/dashboard/orders/${id}`;
    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: "保存に失敗しました", severity: "error" });
    } finally {
      setSaving(false);
      setPendingPayload(null);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={10}>
        <CircularProgress />
      </Box>
    );
  }

  const isConfirmed = state.status !== "draft";

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
            {mode === "create" ? "受注作成" : "受注編集"}
          </Typography>
          <Chip
            size="small"
            label={STATUS_LABEL[state.status] ?? state.status}
            color={(STATUS_COLOR[state.status] ?? "default") as any}
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
          {!isConfirmed && (
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

          {/* 受注確定：下書きのみ */}
          {!isConfirmed && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<CheckCircleIcon />}
              onClick={handleConfirmOrder}
              disabled={saving}
              size="small"
            >
              受注確定
            </Button>
          )}

          {/* 保存：確定済みのedit */}
          {isConfirmed && (
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
        {/* ── 左ナビ ── */}
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
                  href={`#ord-${s.key}`}
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
          {/* 基本情報 */}
          <Paper id="ord-basic" sx={{ p: 3, mb: 3, borderRadius: 2 }} elevation={1}>
            <SectionHeader>基本情報</SectionHeader>
            <BasicInfoForm basic={state.basic} dispatch={dispatch} type="order" />
          </Paper>

          {/* 車両情報 */}
          {state.basic.vehicle_mode !== "none" && (
            <Paper id="ord-vehicle" sx={{ p: 3, mb: 3, borderRadius: 2 }} elevation={1}>
              <SectionHeader>車両情報</SectionHeader>
              <VehicleStep
                vehicle={state.vehicle}
                tradeInVehicle={state.tradeInVehicle}
                schedule={state.schedule}
                insurance={state.insurance}
                dispatch={dispatch}
                partyId={state.basic.customer_id}
                vehicleMode={state.basic.vehicle_mode}
              />
            </Paper>
          )}

          {/* その他費用 */}
          <Paper id="ord-items" sx={{ p: 3, mb: 3, borderRadius: 2 }} elevation={1}>
            <SectionHeader>その他費用</SectionHeader>
            <OtherStep items={state.items} dispatch={dispatch} />
          </Paper>

          {/* 課税費用 */}
          <Paper id="ord-expenses" sx={{ p: 3, mb: 3, borderRadius: 2 }} elevation={1}>
            <SectionHeader>課税費用</SectionHeader>
            <ExpenseStep items={state.items} dispatch={dispatch} />
          </Paper>

          {/* 非課税費用 */}
          <Paper id="ord-insurance" sx={{ p: 3, mb: 3, borderRadius: 2 }} elevation={1}>
            <SectionHeader>非課税費用</SectionHeader>
            <InsuranceStep items={state.items} dispatch={dispatch} />
          </Paper>

          {/* 支払い */}
          <Paper id="ord-payment" sx={{ p: 3, mb: 3, borderRadius: 2 }} elevation={1}>
            <SectionHeader>支払い</SectionHeader>

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

          {/* メモ */}
          <Paper id="ord-memo" sx={{ p: 3, mb: 3, borderRadius: 2 }} elevation={1}>
            <SectionHeader>メモ</SectionHeader>
            <MemoSection
              docLabel="受注書"
              memo={state.memo || ""}
              internalMemo={state.internal_memo || ""}
              onMemoChange={(v) => dispatch({ type: "SET_MEMO", payload: v })}
              onInternalMemoChange={(v) => dispatch({ type: "SET_INTERNAL_MEMO", payload: v })}
            />
          </Paper>

          {/* 最下部アクション */}
          <Box display="flex" justifyContent="flex-end" gap={2} mb={4}>
            <Button
              variant="outlined"
              startIcon={<SaveIcon />}
              onClick={handleSaveDraft}
              disabled={saving}
            >
              下書き保存
            </Button>
            {!isConfirmed ? (
              <Button
                variant="contained"
                color="primary"
                startIcon={<CheckCircleIcon />}
                onClick={handleConfirmOrder}
                disabled={saving}
              >
                受注確定
              </Button>
            ) : (
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

      {/* ===== 類似顧客ダイアログ ===== */}
      <Dialog open={similarOpen} fullWidth maxWidth="sm">
        <DialogTitle>既存顧客の候補が見つかりました</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" mb={2} variant="body2">
            同じ顧客が登録されている可能性があります。既存の顧客を選択するか、新規で作成してください。
          </Typography>
          <List>
            {similarCandidates.map((c) => (
              <ListItemButton
                key={c.id}
                onClick={() => continueWithCustomer(c.id)}
                sx={{ border: "1px solid #e0e0e0", borderRadius: 1, mb: 1 }}
              >
                <ListItemText
                  primary={c.name}
                  secondary={`${c.phone ?? ""} / ${c.email ?? ""} / ${c.address ?? ""}`}
                />
              </ListItemButton>
            ))}
          </List>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between", px: 3, pb: 2 }}>
          <Button onClick={() => setSimilarOpen(false)}>キャンセル</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={() => continueWithCustomer(null)}
          >
            新規顧客として作成
          </Button>
        </DialogActions>
      </Dialog>

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
