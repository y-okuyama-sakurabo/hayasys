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
} from "@mui/material";
import apiClient from "@/lib/apiClient";
import dayjs from "dayjs";

import BasicInfoForm from "../estimate/BasicInfoForm";
import VehicleStep from "../estimate/VehicleStep";
import OtherStep from "../estimate/OtherStep";
import EstimatePaymentForm from "../estimate/EstimatePaymentForm";

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
};

const initialState: OrderState = {
  meta: { mode: "create" },
  basic: {
    order_no: "",
    shop: null,
    customer_id: null,
    new_customer: null,
    created_by_id: null,
    vehicle_mode: "none",
    order_date: dayjs().format("YYYY-MM-DD"),
    payment_method: "現金",
  },
  vehicle: null,
  items: [],
};

function reducer(state: OrderState, action: any): OrderState {
  switch (action.type) {
    case "INIT_FROM_API":
      return { ...state, ...action.payload };

    case "SET_BASIC":
      return { ...state, basic: { ...state.basic, ...action.payload } };

    case "SET_VEHICLE":
      return { ...state, vehicle: action.payload };

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
      return {
        ...state,
        items: state.items.filter((_, i) => i !== action.index),
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

  const searchParams = useSearchParams();
  const fromEstimate = searchParams.get("from_estimate");
  const copyFrom = searchParams.get("copy_from"); // ★追加

  const visibleSteps = useMemo(() => {
    if (state.basic.vehicle_mode === "none") {
      return BASE_STEPS.filter((s) => s.key !== "vehicle");
    }
    return BASE_STEPS;
  }, [state.basic.vehicle_mode]);

  const currentStep: StepKey = visibleSteps[stepIndex]?.key as StepKey;

  useEffect(() => {
    if (stepIndex >= visibleSteps.length) {
      setStepIndex(visibleSteps.length - 1);
    }
  }, [visibleSteps, stepIndex]);

  /* ===============================
     create初期化
  =============================== */

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (mode !== "create") return;
    if (initialized) return;

    setInitialized(true);

    const init = async () => {
      const user = (await apiClient.get("/auth/user/")).data;

      dispatch({
        type: "SET_BASIC",
        payload: {
          shop: user.shop_id ?? null,
          created_by_id: user.id,
        },
      });

      // =====================
      // 見積から
      // =====================
      if (fromEstimate) {
        const res = await apiClient.post(
          "/orders/prepare-from-estimate/",
          { estimate_id: Number(fromEstimate) }
        );

        const data = res.data;

        dispatch({
          type: "INIT_FROM_API",
          payload: {
            basic: {
              shop: data.shop ?? user.shop_id ?? null,
              customer_id: data.customer_id ?? null,
              new_customer: data.new_customer ?? null,
              created_by_id: user.id,
              vehicle_mode: data.vehicle_mode ?? "none",
              order_date: dayjs().format("YYYY-MM-DD"),
              payment_method:
                data.payments?.[0]?.payment_method ?? "現金",
            },
            items: data.items ?? [],
            vehicle: data.target_vehicle ?? null,
          },
        });
      }
    };

    init();
  }, [mode, fromEstimate, initialized]);

  /* ===============================
     複製
  =============================== */

  useEffect(() => {
    if (mode !== "create") return;
    if (!copyFrom) return;

    const fetchCopy = async () => {
      try {
        const res = await apiClient.get(`/orders/${copyFrom}/`);
        const order = res.data;

        const rawVehicle =
          order.vehicles?.find((v: any) => !v.is_trade_in) ?? null;

        // 🔥 ここが超重要（vehicle item取得）
        const vehicleItem =
          order.items?.find((i: any) => i.item_type === "vehicle") ||
          order.items?.[0] ||
          null;

        const vehicle = rawVehicle
          ? {
              ...rawVehicle,

              // 🔥 manufacturer対応
              manufacturer:
                typeof rawVehicle.manufacturer === "object"
                  ? rawVehicle.manufacturer?.id
                  : rawVehicle.manufacturer ?? null,

              // 🔥 category対応（item優先）
              category_id:
                vehicleItem?.category?.id ??
                rawVehicle.category ??
                null,

              // 🔥 価格ここ！！
              unit_price: Number(vehicleItem?.unit_price ?? 0),

              // 🔥 color対応
              color:
                typeof rawVehicle.color === "object"
                  ? rawVehicle.color?.id
                  : rawVehicle.color ?? null,
            }
          : null;

        dispatch({
          type: "INIT_FROM_API",
          payload: {
            basic: {
              shop: order.shop?.id ?? null,

              customer_id: order.customer?.id ?? null,

              new_customer: order.customer
                ? {
                    ...order.customer,
                    customer_class:
                      order.customer.customer_class?.id ?? null,
                    gender: order.customer.gender?.id ?? null,
                    region: order.customer.region?.id ?? null,
                  }
                : null,

              created_by_id: order.created_by?.id ?? null,
              vehicle_mode: order.vehicle_mode ?? "none",
              order_date: order.order_date,
              payment_method:
                order.payments?.[0]?.payment_method ?? "現金",
            },

            items: order.items ?? [],
            vehicle,
          },
        });
      } catch (e) {
        console.error(e);
        alert("複製失敗");
      }
    };

    fetchCopy();
  }, [mode, copyFrom]);

  /* ===============================
     edit初期化
  =============================== */

  useEffect(() => {
    if (mode !== "edit" || !orderId) return;

    const fetchOrder = async () => {
      setLoading(true);

      try {
        const res = await apiClient.get(`/orders/${orderId}/`);
        const order = res.data;

        const vehicle =
          order.vehicles?.find((v: any) => !v.is_trade_in) ?? null;

        const vehicleItem =
          order.items?.find((i: any) => i.item_type === "vehicle") ??
          null;

        dispatch({
          type: "INIT_FROM_API",
          payload: {
            meta: { id: order.id, mode: "edit" },

            basic: {
              shop: order.shop?.id ?? null,
              customer_id: order.customer?.id ?? null,

              new_customer: order.customer
                ? {
                    ...order.customer,
                    customer_class:
                      order.customer.customer_class?.id ?? null,
                    gender: order.customer.gender?.id ?? null,
                    region: order.customer.region?.id ?? null,
                  }
                : null,

              created_by_id: order.created_by?.id ?? null,
              vehicle_mode: order.vehicle_mode ?? "none",
              order_date:
                order.order_date ?? dayjs().format("YYYY-MM-DD"),
              payment_method:
                order.payments?.[0]?.payment_method ?? "現金",
            },

            items: order.items ?? [],

            vehicle: vehicle
              ? {
                  ...vehicle,
                  manufacturer: vehicle.manufacturer?.id ?? null,
                  category_id: vehicleItem?.category?.id ?? null,
                  unit_price: Number(vehicleItem?.unit_price ?? 0),
                }
              : null,
          },
        });
      } catch (e) {
        console.error(e);
        alert("受注データ取得失敗");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [mode, orderId]);

  /* ===============================
     保存
  =============================== */

  const handleFinish = async () => {
    try {
      setLoading(true);

      let items = [...state.items];

      if (state.vehicle && state.basic.vehicle_mode === "sale") {
        items = items.filter((i) => i.item_type !== "vehicle");

        items.unshift({
          item_type: "vehicle",
          name: state.vehicle.vehicle_name || "車両",
          quantity: 1,
          unit_price: state.vehicle.unit_price ?? 0,
          category_id: state.vehicle.category_id ?? null,
          manufacturer: state.vehicle.manufacturer ?? null,
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
        items,
        target_vehicle: state.vehicle,
        payments: [
          {
            payment_method: state.basic.payment_method,
          },
        ],
      };

      let res;

      if (mode === "create") {
        res = await apiClient.post("/orders/", payload);
      } else {
        res = await apiClient.patch(`/orders/${orderId}/`, payload);
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
            dispatch={dispatch}
            partyId={state.basic.customer_id}
            vehicleMode={state.basic.vehicle_mode}
          />
        )}

        {currentStep === "items" && (
          <OtherStep items={state.items} dispatch={dispatch} />
        )}

        {currentStep === "payment" && (
          <EstimatePaymentForm basic={state.basic} dispatch={dispatch} />
        )}
      </Paper>

      <Divider sx={{ my: 3 }} />

      <Box display="flex" justifyContent="space-between">
        <Button
          disabled={stepIndex === 0}
          onClick={() => setStepIndex((s) => s - 1)}
        >
          前へ
        </Button>

        <Button variant="contained" onClick={handleFinish}>
          完了
        </Button>
      </Box>
    </Box>
  );
}