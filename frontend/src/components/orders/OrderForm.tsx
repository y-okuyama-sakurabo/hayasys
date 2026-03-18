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
  const copyFrom = searchParams.get("copy_from");

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

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (mode !== "create" || initialized) return;
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
          <OtherStep
            items={state.items}
            dispatch={dispatch}
            itemType="accessory"
          />
        )}

        {currentStep === "expenses" && (
          <ExpenseStep
            items={state.items}
            dispatch={dispatch}
            itemType="fee"
          />
        )}

        {currentStep === "insurance" && (
          <InsuranceStep
            items={state.items}
            dispatch={dispatch}
            itemType="insurance"
          />
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