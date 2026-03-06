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
} from "@mui/material";
import apiClient from "@/lib/apiClient";
import dayjs from "dayjs";

import BasicInfoForm from "../estimate/BasicInfoForm";
import VehicleStep from "../estimate/VehicleStep";
import OtherStep from "../estimate/OtherStep";
import ExpenseStep from "../estimate/ExpenseStep";
import InsuranceStep from "../estimate/InsuranceStep";
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
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateCandidates, setDuplicateCandidates] = useState<any[]>([]);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    meta: { mode },
  });

  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const searchParams = useSearchParams();
  const fromEstimate = searchParams.get("from_estimate");

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
     create 初期化
  =============================== */
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (mode !== "create") return;
    if (initialized) return;   // 🔥 追加

    setInitialized(true);

    const init = async () => {
      try {
        const user = (await apiClient.get("/auth/user/")).data;

        dispatch({
          type: "SET_BASIC",
          payload: {
            shop: user.shop_id ?? null,
          },
        });

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
                vehicle_mode: data.vehicle_mode ?? "none",
                order_date: dayjs().format("YYYY-MM-DD"),
                payment_method:
                  data.payments?.[0]?.payment_method ?? "現金",
                ...data.payments?.[0],
              },
              items: data.items ?? [],
              vehicle: data.target_vehicle ?? null,
            },
          });
        }
      } catch (e) {
        console.error("初期化失敗", e);
      }
    };

    init();
  }, [mode, fromEstimate, initialized]);

  /* ===============================
     編集ロード
  =============================== */
  useEffect(() => {
    if (mode !== "edit" || !orderId) return;

    const fetchData = async () => {
      setLoading(true);

      try {
        const res = await apiClient.get(`/orders/${orderId}/`);
        const order = res.data;

        const vehicle = order.order_vehicles?.find(
          (v: any) => !v.is_trade_in
        );

        const vehicleItem = order.items?.find(
          (i: any) => i.item_type === "vehicle"
        );

        dispatch({
          type: "INIT_FROM_API",
          payload: {
            meta: { id: order.id, mode: "edit" },
            basic: {
              order_no: order.order_no,
              shop: order.shop?.id ?? null,
              customer_id: order.customer?.id ?? null,
              vehicle_mode: order.vehicle_mode ?? "none",
              order_date:
                order.order_date ?? dayjs().format("YYYY-MM-DD"),
            },
            items: order.items ?? [],
            vehicle: vehicle
              ? {
                  ...vehicle,
                  category_id: vehicleItem?.category?.id ?? null,
                  unit_price: vehicleItem?.unit_price ?? 0,
                }
              : null,
          },
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [mode, orderId]);

  /* ===============================
     保存
  =============================== */
  const handleFinish = async () => {
    // 🔥 新規顧客で、まだチェックしていない場合だけチェック
    if (
      !state.basic.customer_id &&
      state.basic.new_customer &&
      !pendingSubmit
    ) {
      const res = await apiClient.post(
        "/customers/similar/",
        state.basic.new_customer
      );

      if (res.data.has_similar) {
        setDuplicateCandidates(res.data.candidates);
        setDuplicateDialogOpen(true);
        return; // ← 保存止める
      }
    }
    try {
      setLoading(true);

      const buildItemPayload = (item: any) => ({
        item_type: item.item_type,
        category_id:
          item.category_id ??
          item.category?.id ??
          null,
        name: item.name ?? "",
        quantity: Number(item.quantity ?? 1),
        unit_price: Number(item.unit_price ?? 0),
        discount: Number(item.discount ?? 0),
        tax_type: item.tax_type ?? "taxable",
        sale_type: item.sale_type ?? null,
        staff: item.staff ?? null,
      });

      const customerPayload = state.basic.customer_id
        ? { customer_id: state.basic.customer_id }
        : { new_customer: state.basic.new_customer };

      const buildVehiclePayload = (v: any) => ({
        vehicle_name: v.vehicle_name ?? null,
        displacement: v.displacement ?? null,
        model_year: v.model_year ?? null,
        new_car_type: v.new_car_type ?? null,
        manufacturer: v.manufacturer ?? null,
        color_name: v.color_name ?? null,
        color_code: v.color_code ?? null,
        model_code: v.model_code ?? null,
        chassis_no: v.chassis_no ?? null,
        engine_type: v.engine_type ?? null,
        unit_price: Number(v.unit_price ?? 0),
        category_id:
          v.category_id ??
          v.category?.id ??
          null,
      });

      const payload = {
        shop: state.basic.shop
          ? Number(state.basic.shop)
          : null,
        order_date: state.basic.order_date,
        vehicle_mode: state.basic.vehicle_mode,
        ...customerPayload,
        items: state.items
          .filter((item) => item.item_type !== "vehicle")
          .map(buildItemPayload),
        target_vehicle:
          state.basic.vehicle_mode !== "none" &&
          state.vehicle
            ? buildVehiclePayload(state.vehicle)
            : null,
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
        res = await apiClient.put(
          `/orders/${orderId}/`,
          payload
        );
      }

      window.location.href = `/dashboard/orders/${res.data.id}`;
    } catch (e) {
      console.error(e);
      alert("保存に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <Box display="flex" justifyContent="center" mt={10}>
        <CircularProgress />
      </Box>
    );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight="bold" mb={3}>
        {mode === "create" ? "受注作成" : "受注編集"}
      </Typography>

      <Stepper activeStep={stepIndex} alternativeLabel sx={{ mb: 4 }}>
        {visibleSteps.map((s, idx) => (
          <Step key={s.key}>
            <StepLabel
              onClick={() => setStepIndex(idx)}
              sx={{ cursor: "pointer" }}
            >
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

        {currentStep === "expenses" && (
          <ExpenseStep items={state.items} dispatch={dispatch} />
        )}

        {currentStep === "insurance" && (
          <InsuranceStep items={state.items} dispatch={dispatch} />
        )}

        {currentStep === "payment" && (
          <EstimatePaymentForm
            basic={state.basic}
            dispatch={dispatch}
          />
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

        {stepIndex < visibleSteps.length - 1 ? (
          <Button
            variant="contained"
            onClick={() => setStepIndex((s) => s + 1)}
          >
            次へ
          </Button>
        ) : (
          <Button variant="contained" onClick={handleFinish}>
            完了
          </Button>
        )}
      </Box>
      <Dialog
        open={duplicateDialogOpen}
        onClose={() => setDuplicateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>類似する顧客が見つかりました</DialogTitle>
        <DialogContent>
          {duplicateCandidates.map((c) => (
            <Paper
              key={c.id}
              sx={{ p: 2, mb: 2, border: "1px solid #ddd" }}
            >
              <Typography fontWeight="bold">
                {c.name}
              </Typography>
              <Typography variant="body2">
                電話: {c.phone}
              </Typography>
              <Typography variant="body2">
                メール: {c.email}
              </Typography>
              <Typography variant="body2">
                スコア: {c.score}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                一致理由: {c.reasons.join(", ")}
              </Typography>

              <Box mt={1}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    dispatch({
                      type: "SET_BASIC",
                      payload: {
                        customer_id: c.id,
                        new_customer: null,
                      },
                    });
                    setDuplicateDialogOpen(false);
                    setPendingSubmit(true);
                    handleFinish(); // 🔥 再実行
                  }}
                >
                  この顧客を使用する
                </Button>
              </Box>
            </Paper>
          ))}

          <Divider sx={{ my: 2 }} />

          <Button
            variant="contained"
            color="warning"
            onClick={() => {
              setDuplicateDialogOpen(false);
              setPendingSubmit(true);
              handleFinish(); // 🔥 強制作成
            }}
          >
            それでも新規作成する
          </Button>
        </DialogContent>
      </Dialog>
    </Box>
    
  );
}