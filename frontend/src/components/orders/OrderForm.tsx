"use client";

import React, { useEffect, useReducer, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  Box,
  Typography,
  Paper,
  Divider,
  Button,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import apiClient from "@/lib/apiClient";
import dayjs from "dayjs";

import BasicInfoForm from "../estimate/BasicInfoForm";
import VehicleStep from "../estimate/VehicleStep";
import OtherStep from "../estimate/OtherStep";
import EstimatePaymentForm from "../estimate/EstimatePaymentForm";
import ExpenseStep from "../estimate/ExpenseStep";
import InsuranceStep from "../estimate/InsuranceStep";

const BASE_STEPS = [
  { key: "basic", label: "基本情報" },
  { key: "vehicle", label: "車両" },
  { key: "items", label: "その他" },
  { key: "expenses", label: "諸費用" },
  { key: "insurance", label: "保険" },
  { key: "payment", label: "支払い" },
] as const;

type StepKey = (typeof BASE_STEPS)[number]["key"];

type Props = {
  mode: "create" | "edit";
  orderId?: number;
};

type OrderState = {
  meta: {
    id?: number;
    mode: "create" | "edit";
  };
  basic: any;
  vehicle: any | null;
  items: any[];
  global_discount: number;

  schedule?: any; 
};

const initialState: OrderState = {
  meta: { mode: "create" },
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
};

function reducer(state: OrderState, action: any): OrderState {
  switch (action.type) {
    case "INIT_FROM_API":
      return {
        ...state,
        ...action.payload,
        schedule: action.payload.schedule
          ? {
              ...state.schedule,
              ...action.payload.schedule,
            }
          : state.schedule,
      };

    case "SET_BASIC":
      return {
        ...state,
        basic: { ...state.basic, ...action.payload },
      };

    case "SET_VEHICLE":
      return {
        ...state,
        vehicle: action.payload,
      };

    case "SET_ITEMS":
      return {
        ...state,
        items: action.payload,
      };

    case "ADD_ITEM":
      return {
        ...state,
        items: [...state.items, action.payload],
      };

    case "UPDATE_ITEM":
      return {
        ...state,
        items: state.items.map((it, i) =>
          i === action.index ? { ...it, ...action.payload } : it
        ),
      };

    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter((_, i) => i !== action.index),
      };
    
    case "SET_GLOBAL_DISCOUNT":
      return {
        ...state,
        global_discount: action.payload,
      };

    case "SET_SCHEDULE":
      return {
        ...state,
        schedule: {
          ...state.schedule,
          ...action.payload,
        },
      };

    default:
      return state;
  }
}

export default function OrderForm({ mode, orderId }: Props) {
  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    meta: { mode },
  });

  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const [similarCandidates, setSimilarCandidates] = useState<any[]>([]);
  const [similarOpen, setSimilarOpen] = useState(false);
  const [pendingOrderPayload, setPendingOrderPayload] = useState<any>(null);

  const searchParams = useSearchParams();
  const fromEstimate = searchParams.get("from_estimate");

  const visibleSteps = useMemo(() => {
    if (state.basic.vehicle_mode === "none") {
      return BASE_STEPS.filter((s) => s.key !== "vehicle");
    }
    return BASE_STEPS;
  }, [state.basic.vehicle_mode]);

  const currentStep: StepKey = visibleSteps[stepIndex]?.key as StepKey;
  const handleNext = () => {
    if (stepIndex < visibleSteps.length - 1) {
      setStepIndex((s) => s + 1);
    }
  };

  const isLastStep = stepIndex === visibleSteps.length - 1;

  useEffect(() => {
    if (stepIndex >= visibleSteps.length) {
      setStepIndex(Math.max(visibleSteps.length - 1, 0));
    }
  }, [visibleSteps, stepIndex]);

  useEffect(() => {
    if (mode !== "create" || initialized) return;
    setInitialized(true);

    const init = async () => {
      try {
        const user = (await apiClient.get("/auth/user/")).data;

        dispatch({
          type: "SET_BASIC",
          payload: {
            shop: user.shop_id ?? null,
            created_by_id: user.id,
            vehicle_mode: "sale",
          },
        });

        if (fromEstimate) {
          const res = await apiClient.post(
            "/orders/prepare-from-estimate/",
            { estimate_id: Number(fromEstimate) }
          );
          const data = res.data;
          const discountItem = data.items?.find(
            (item: any) => item.item_type === "discount"
          );

          dispatch({
            type: "INIT_FROM_API",
            payload: {
              basic: {
                order_no: data.order_no ?? "",
                shop: data.shop ?? user.shop_id ?? null,
                customer_id: data.customer_id ?? null,
                new_customer: data.new_customer ?? null,
                created_by_id: user.id,
                vehicle_mode: data.vehicle_mode ?? "sale",
                order_date: dayjs().format("YYYY-MM-DD"),
                payment_method:
                  data.payments?.[0]?.payment_method ?? "現金",
              },
              items: (data.items ?? []).map((item: any) => ({
                ...item,
                staff_id: item.staff ?? null,

                // 🔥 これ追加
                manufacturer: item.manufacturer ?? null,
                labor_cost: item.labor_cost ?? 0,
              })),
              global_discount: discountItem?.discount ?? 0,
              vehicle: data.target_vehicle
                ? {
                    ...data.target_vehicle,
                    discount: data.target_vehicle.discount ?? 0,
                  }
                : null,
              schedule: data.schedule,
            },
          });
        }
      } catch (e) {
        console.error(e);
        alert("初期データ取得に失敗しました");
      }
    };

    init();
  }, [mode, fromEstimate, initialized]);

    // =============================
  // 🔥 edit初期化（←ここに追加）
  // =============================
  useEffect(() => {
    if (mode !== "edit" || !orderId) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        const res = await apiClient.get(`/orders/${orderId}/`);
        const order = res.data;

        const discountItem = order.items?.find(
          (item: any) => item.item_type === "discount"
        );

        dispatch({
          type: "INIT_FROM_API",
          payload: {
            meta: { id: order.id, mode: "edit" },

            basic: {
              order_no: order.order_no,
              shop: order.shop?.id ?? null,
              customer_id: order.customer?.id ?? null,
              new_customer: order.customer
                ? {
                    ...order.customer,
                    customer_class:
                      typeof order.customer.customer_class === "object"
                        ? order.customer.customer_class.id
                        : order.customer.customer_class ?? null,

                    region:
                      typeof order.customer.region === "object"
                        ? order.customer.region.id
                        : order.customer.region ?? null,

                    gender:
                      typeof order.customer.gender === "object"
                        ? order.customer.gender.id
                        : order.customer.gender ?? null,
                  }
                : null,
              created_by_id: order.created_by?.id ?? null,
              vehicle_mode: order.vehicle_mode ?? "none",
              order_date: order.order_date,
              payment_method:
                order.payments?.[0]?.payment_method ?? "現金",
            },

            items: (order.items ?? []).map((item: any) => ({
              ...item,
              staff_id: item.staff?.id ?? item.staff_id ?? null,
            })),
            global_discount: discountItem?.discount ?? 0,
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

                category_id: v.category ?? null, // ← numberで来てる
                manufacturer:
                  typeof v.manufacturer === "object"
                    ? v.manufacturer.id
                    : v.manufacturer ?? null,
                vehicle_name: v.vehicle_name ?? "",
                model_year: v.model_year ?? "",
                chassis_no: v.chassis_no ?? "",
                displacement: v.displacement ?? null,
                engine_type: v.engine_type ?? "",
                model_code: v.model_code ?? "",

                color: v.color ?? null,
                color_name: v.color_name ?? "",
                color_code: v.color_code ?? "",

                new_car_type: v.new_car_type ?? "new",

                // 🔥 ここ重要（itemsから取る）
                unit_price:
                  order.items?.find((i: any) => i.item_type === "vehicle")?.unit_price ?? 0,
                discount:
                  order.items?.find((i: any) => i.item_type === "vehicle")?.discount ?? 0,

                source_customer_vehicle: null,
              };
            })(),
          },
        });
      } catch (e) {
        console.error(e);
        alert("受注データ取得失敗");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [mode, orderId]);

  const handleFinish = async () => {
    try {
      setLoading(true);

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
          category_id:
            state.vehicle.category_id ??
            state.vehicle.category?.id ??
            null,
          manufacturer:
            state.vehicle.manufacturer?.id ??
            state.vehicle.manufacturer ??
            null,
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
          tax_type: "taxable",
          category_id: null,
          manufacturer: null,
          staff_id: null,
        });
      }

      const payload = {
        shop: state.basic.shop,
        created_by_id: state.basic.created_by_id,
        order_date: state.basic.order_date,
        vehicle_mode: state.basic.vehicle_mode,
        customer_id: state.basic.customer_id ?? null,
        new_customer: state.basic.customer_id
          ? null
          : state.basic.new_customer ?? null,
        items: items.map((item) => ({
          item_type: item.item_type,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_type: item.tax_type,
          discount: item.discount,
          sale_type: item.sale_type,
          labor_cost: item.labor_cost ?? 0,

          staff:
            typeof item.staff === "object"
              ? item.staff?.id
              : item.staff_id ?? item.staff ?? null,

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
        payments: [
          {
            payment_method: state.basic.payment_method,
          },
        ],
      };

      // 類似チェック
      if (!state.basic.customer_id && state.basic.new_customer) {
        const nc = state.basic.new_customer;

        const similarRes = await apiClient.post("/customers/similar/", {
          name: nc.name,
          kana: nc.kana,
          phone: nc.phone,
          mobile_phone: nc.mobile_phone,
          email: nc.email,
          address: nc.address,
        });

        if (similarRes.data.has_similar) {
          setSimilarCandidates(similarRes.data.candidates);
          setPendingOrderPayload(payload);
          setSimilarOpen(true);
          setLoading(false);
          return;
        }
      }

      let res;

      if (mode === "create") {
        res = await apiClient.post("/orders/", payload);
      } else {
        res = await apiClient.patch(`/orders/${orderId}/`, payload);
      }

      /* =========================
        🔥 ここ追加（スケジュール保存）
      ========================= */
      if (state.schedule?.start_at) {
        const payload = {
          start_at: state.schedule.start_at,
          end_at: state.schedule.end_at,
          delivery_method: state.schedule.delivery_method || "",
          delivery_shop: state.schedule.delivery_shop || null,
          description: state.schedule.description || "",
        };

        if (state.schedule.id) {
          await apiClient.patch(`/schedules/${state.schedule.id}/`, payload);
        } else {
          await apiClient.post("/schedules/", {
            order: res.data.id,
            title: "納車予定日",
            ...payload,
          });
        }
      }     

      window.location.href = `/dashboard/orders/${res.data.id}`;
    } catch (e) {
      console.error(e);
      alert("保存に失敗しました");
    } finally {
      setLoading(false);
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
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight="bold" mb={3}>
        {mode === "create" ? "受注作成" : "受注編集"}
      </Typography>

      <Stepper activeStep={stepIndex} alternativeLabel sx={{ mb: 4 }}>
        {visibleSteps.map((s, idx) => (
          <Step key={s.key}>
            <StepLabel onClick={() => setStepIndex(idx)}>
              {s.label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      <Paper sx={{ p: 3 }}>
        {currentStep === "basic" && (
          <BasicInfoForm
            basic={state.basic}
            dispatch={dispatch}
            type="order"
          />
        )}

        {currentStep === "vehicle" && (
          <VehicleStep
            vehicle={state.vehicle}
            schedule={state.schedule}
            dispatch={dispatch}
            partyId={state.basic.customer_id}
            vehicleMode={state.basic.vehicle_mode}
          />
        )}

        {currentStep === "items" && (
          <OtherStep
            items={state.items}
            dispatch={dispatch}
          />
        )}

        {currentStep === "expenses" && (
          <ExpenseStep
            items={state.items}
            dispatch={dispatch}
          />
        )}

        {currentStep === "insurance" && (
          <InsuranceStep
            items={state.items}
            dispatch={dispatch}
          />
        )}

        {currentStep === "payment" && (
          <EstimatePaymentForm
            basic={state.basic}
            dispatch={dispatch}
          />
        )}
      </Paper>

      <Paper
        sx={{
          p: 2,
          mb: 3,
          background: "#fff",
        }}
      >
        <Typography fontWeight="bold" mb={2}>
          全体調整
        </Typography>

        <input
          type="number"
          value={state.global_discount}
          onChange={(e) =>
            dispatch({
              type: "SET_GLOBAL_DISCOUNT",
              payload: e.target.value === "" ? 0 : Number(e.target.value),
            })
          }
          style={{ width: "100%", padding: 8 }}
        />
      </Paper>

      <Divider sx={{ my: 3 }} />
        <Box display="flex" justifyContent="space-between">
          {/* 前へ */}
          <Button
            disabled={stepIndex === 0}
            onClick={() => setStepIndex((s) => s - 1)}
          >
            前へ
          </Button>

                <Box display="flex" gap={2}>
                  {/* 次へ */}
                  {!isLastStep && (
                    <Button variant="outlined" onClick={handleNext}>
                      次へ
                    </Button>
                  )}

                  {/* 完了（どこからでも押せる） */}
                  <Button variant="contained" onClick={handleFinish}>
                    完了
                  </Button>
                </Box>
              </Box>
              <Dialog open={similarOpen} fullWidth>
          <DialogTitle>既存顧客の可能性があります</DialogTitle>

          <DialogContent>
            <Typography color="error" mb={2}>
              同じ顧客が存在する可能性が高いです
            </Typography>

            <List>
              {similarCandidates.map((c) => (
                <ListItemButton
                  key={c.id}
                  onClick={async () => {
                    if (!pendingOrderPayload) return;

                    const newPayload = {
                      ...pendingOrderPayload,
                      customer_id: c.id,
                      new_customer: null,
                    };

                    let res;

                    if (mode === "create") {
                      res = await apiClient.post("/orders/", newPayload);
                    } else {
                      res = await apiClient.patch(`/orders/${orderId}/`, newPayload);
                    }

                    window.location.href = `/dashboard/orders/${res.data.id}`;
                  }}
                >
                  <ListItemText
                    primary={`${c.name}（スコア:${c.score}）`}
                    secondary={c.reasons.join(" / ")}
                  />
                </ListItemButton>
              ))}
            </List>
          </DialogContent>

          <DialogActions>
            <Button
              color="warning"
              onClick={async () => {
                if (!pendingOrderPayload) return;

                let res;

                if (mode === "create") {
                  res = await apiClient.post("/orders/", pendingOrderPayload);
                } else {
                  res = await apiClient.patch(`/orders/${orderId}/`, pendingOrderPayload);
                }

                window.location.href = `/dashboard/orders/${res.data.id}`;
              }}
            >
              新規で作成する
            </Button>
          </DialogActions>
        </Dialog>
    </Box>
  );
}