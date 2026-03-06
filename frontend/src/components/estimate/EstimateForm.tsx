"use client";

import React, { useEffect, useReducer, useState, useMemo } from "react";
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

import BasicInfoForm from "./BasicInfoForm";
import VehicleStep from "./VehicleStep";
import OtherStep from "./OtherStep";
import ExpenseStep from "./ExpenseStep";
import InsuranceStep from "./InsuranceStep";
import EstimatePaymentForm from "./EstimatePaymentForm";

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
  estimateId?: number;
};

type EstimateState = {
  meta: {
    id?: number;
    mode: "create" | "edit";
  };
  basic: any;
  vehicle: any | null;
  items: any[];
};

const initialState: EstimateState = {
  meta: { mode: "create" },
  basic: {
    estimate_no: "",
    shop: null,
    party_id: null,
    new_party: null,
    payment_method: "現金",
    vehicle_mode: "sale", // 🔥 追加
  },
  vehicle: null,
  items: [],
};

function reducer(state: EstimateState, action: any): EstimateState {
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

export default function EstimateForm({ mode, estimateId }: Props) {
  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    meta: { mode },
  });

  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  /* ===============================
     🔥 vehicle_modeでステップ動的化
  =============================== */
  const visibleSteps = useMemo(() => {
    if (state.basic.vehicle_mode === "none") {
      return BASE_STEPS.filter((s) => s.key !== "vehicle");
    }
    return BASE_STEPS;
  }, [state.basic.vehicle_mode]);

  const currentStep: StepKey = visibleSteps[stepIndex]?.key as StepKey;

  /* ===============================
     vehicle_mode変更時 index調整
  =============================== */
  useEffect(() => {
    if (stepIndex >= visibleSteps.length) {
      setStepIndex(visibleSteps.length - 1);
    }
  }, [visibleSteps, stepIndex]);

  /* ===============================
     🔥 vehicle_modeがnoneならvehicle削除
  =============================== */
  useEffect(() => {
    if (state.basic.vehicle_mode === "none" && state.vehicle) {
      dispatch({ type: "SET_VEHICLE", payload: null });
    }
  }, [state.basic.vehicle_mode]);

  /* ===============================
     create 初期化
  =============================== */
  useEffect(() => {
    if (mode !== "create") return;

    const init = async () => {
      const user = (await apiClient.get("/auth/user/")).data;
      const nextNo = (await apiClient.get("/estimates/next-no/")).data
        .next_estimate_no;

      dispatch({
        type: "SET_BASIC",
        payload: {
          estimate_no: nextNo,
          shop: user.shop_id,
        },
      });
    };

    init();
  }, [mode]);

  /* ===============================
     edit 初期化
  =============================== */
  useEffect(() => {
    if (mode !== "edit" || !estimateId) return;

    const fetchData = async () => {
      setLoading(true);

      const res = await apiClient.get(`/estimates/${estimateId}/`);
      const estimate = res.data;

      const vehicle = estimate.vehicles?.find(
        (v: any) => !v.is_trade_in
      );

      const vehicleItem = estimate.items?.find(
        (i: any) => i.item_type === "vehicle"
      );

      dispatch({
        type: "INIT_FROM_API",
        payload: {
          meta: { id: estimate.id, mode: "edit" },
          basic: {
            estimate_no: estimate.estimate_no,
            shop: estimate.shop?.id ?? null,
            party_id: estimate.party?.source_customer ?? null,
            new_party: estimate.party ?? null,
            payment_method: "現金",
            vehicle_mode: estimate.vehicle_mode ?? "none",
          },
          items: estimate.items ?? [],
          vehicle: vehicle
            ? {
                ...vehicle,
                category_id: vehicleItem?.category?.id ?? null,
                unit_price: vehicleItem?.unit_price ?? 0,
              }
            : null,
        },
      });

      setLoading(false);
    };

    fetchData();
  }, [mode, estimateId]);

  /* ===============================
     🔥 保存処理
  =============================== */
  const handleFinish = async () => {
    try {
      setLoading(true);

      let id = estimateId;

      const paymentsPayload = [
        {
          payment_method: state.basic.payment_method,
          credit_company:
            state.basic.payment_method === "クレジット"
              ? state.basic.credit_company || null
              : null,
          credit_first_payment:
            state.basic.payment_method === "クレジット"
              ? Number(state.basic.credit_first_payment) || null
              : null,
          credit_second_payment:
            state.basic.payment_method === "クレジット"
              ? Number(state.basic.credit_second_payment) || null
              : null,
          credit_bonus_payment:
            state.basic.payment_method === "クレジット"
              ? Number(state.basic.credit_bonus_payment) || null
              : null,
          credit_installments:
            state.basic.payment_method === "クレジット"
              ? Number(state.basic.credit_installments) || null
              : null,
          credit_start_month:
            state.basic.payment_method === "クレジット"
              ? state.basic.credit_start_month || null
              : null,
        },
      ];

      const headerPayload = {
        estimate_no: state.basic.estimate_no,
        shop: state.basic.shop ? Number(state.basic.shop) : null,
        vehicle_mode: state.basic.vehicle_mode,
        new_party: state.basic.new_party ?? null,
        payments: paymentsPayload, 
      };

      if (mode === "create") {
        const res = await apiClient.post("/estimates/", headerPayload);
        id = res.data.id;
      } else {
        await apiClient.put(`/estimates/${estimateId}/`, headerPayload);
      }

      /* ========= 車両 ========= */
      if (state.vehicle && state.basic.vehicle_mode !== "none") {
        const v = state.vehicle;

        const vehiclePayload = {
          ...v,
          category_id: v.category_id ?? v.category?.id ?? null,
          unit_price: Number(v.unit_price ?? 0),
          manufacturer: v.manufacturer ?? null,
          displacement: v.displacement
            ? Number(v.displacement)
            : null,
        };

        await apiClient.patch(`/estimates/${id}/`, {
          vehicles: [vehiclePayload],
        });
      }



      /* ========= 明細 ========= */
      const itemPayload = (item: any) => ({
        item_type: item.item_type,
        category_id: item.category_id ?? item.category?.id ?? null,
        name: item.name ?? "",
        quantity: Number(item.quantity ?? 1),
        unit_price: Number(item.unit_price ?? 0),
        discount: Number(item.discount ?? 0),
        tax_type: item.tax_type ?? "taxable",
        sale_type: item.sale_type ?? null,
        staff: item.staff ?? item.staff_id ?? null,
      });

      for (const item of state.items) {
        // 🔥 vehicle はバックエンドが管理するので除外
        if (item.item_type === "vehicle") continue;

        const payload = itemPayload(item);

        if (!payload.item_type) continue;

        if (mode === "edit" && item.id) {
          await apiClient.patch(`/estimates/${id}/items/${item.id}/`, payload);
        } else {
          await apiClient.post(`/estimates/${id}/items/`, payload);
        }
      }
      alert("保存しました");
      window.location.href = `/dashboard/estimates/${id}`;
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
        {mode === "create" ? "見積作成" : "見積編集"}
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
          <BasicInfoForm basic={state.basic} dispatch={dispatch} />
        )}

        {currentStep === "vehicle" && (
          <VehicleStep
            vehicle={state.vehicle}
            dispatch={dispatch}
            partyId={state.basic.party_id}
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
    </Box>
  );
}