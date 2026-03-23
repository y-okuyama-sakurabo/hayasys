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
import { useRouter, useSearchParams } from "next/navigation";

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
  deletedItemIds: number[];
};

const initialState: EstimateState = {
  meta: { mode: "create" },
  basic: {
    estimate_no: "",
    shop: null,
    party_id: null,
    new_party: null,
    payment_method: "現金",
    vehicle_mode: "sale",
  },
  vehicle: null,
  items: [],
  deletedItemIds: [],
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
  const router = useRouter();
  const searchParams = useSearchParams();
  

  const copyFrom = searchParams.get("copy_from");

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

  /* ===============================
     🔥 create初期化
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
          created_by_id: user.id,
        },
      });
    };

    init();
  }, [mode]);

  /* ===============================
     複製
  =============================== */
  useEffect(() => {
    if (mode !== "create") return;
    if (!copyFrom) return;

    const fetchCopy = async () => {
      try {
        const res = await apiClient.get(`/estimates/${copyFrom}/`);
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
            basic: {
              shop: estimate.shop?.id ?? null,

              // 🔥 顧客（FK正規化）
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
              payment_method: "現金",
            },

            items: estimate.items ?? [],

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
        alert("複製データ取得失敗");
      }
    };

    fetchCopy();
  }, [mode, copyFrom]);

  /* ===============================
     edit初期化
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

            // 🔥 顧客ここ重要
            party_id: estimate.party?.id ?? null,
            new_party: estimate.party
              ? {
                  ...estimate.party,
                  customer_class:
                    estimate.party.customer_class?.id ?? null,
                  region: estimate.party.region?.id ?? null,
                  gender: estimate.party.gender?.id ?? null,
                }
              : null,

            vehicle_mode: estimate.vehicle_mode ?? "none",
            created_by_id: estimate.created_by?.id ?? null,
          },

          items: (estimate.items ?? []).map((item: any) => ({
            ...item,
            staff_id: item.staff?.id ?? item.staff_id ?? null,
          })),

          vehicle: vehicle
            ? {
                ...vehicle,
                manufacturer: vehicle.manufacturer?.id ?? null,
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
     保存
  =============================== */

  const handleFinish = async () => {
    try {
      setLoading(true);

      let id = estimateId;

      const headerPayload = {
        estimate_no: state.basic.estimate_no,
        shop: state.basic.shop,
        created_by_id: state.basic.created_by_id,
        vehicle_mode: state.basic.vehicle_mode,
        new_party: state.basic.new_party,
        payments: [
          {
            payment_method: state.basic.payment_method,
          },
        ],
      };

      if (mode === "create") {
        const res = await apiClient.post("/estimates/", headerPayload);
        id = res.data.id;
      } else {
        await apiClient.put(`/estimates/${estimateId}/`, headerPayload);
      }

      /* =========================
         車両保存
      ========================= */

      if (state.vehicle && state.basic.vehicle_mode !== "none") {
        await apiClient.patch(`/estimates/${id}/`, {
          vehicles_payload: [
            {
              ...state.vehicle,
              category_id:
                state.vehicle.category_id ??
                state.vehicle.category?.id ??
                null,
            },
          ],
        });
      }

      /* =========================
         vehicle → item変換
      ========================= */

      let items = [...state.items].filter(
        (i) => i.item_type !== "vehicle"
      );

      if (state.vehicle && state.basic.vehicle_mode === "sale") {
        items.unshift({
          item_type: "vehicle",
          name: state.vehicle.vehicle_name || "車両",
          quantity: 1,
          unit_price: state.vehicle.unit_price ?? 0,
          category_id: state.vehicle.category_id ?? null,
          manufacturer: state.vehicle.manufacturer ?? null,
        });
      }

      for (const item of items) {
        const payload = {
          ...item,
          staff: item.staff_id ?? null,
          category_id: item.category_id ?? item.category?.id ?? null,
        };

        if (mode === "edit" && item.id) {
          await apiClient.patch(
            `/estimates/${id}/items/${item.id}/`,
            payload
          );
        } else {
          await apiClient.post(`/estimates/${id}/items/`, payload);
        }
      }

      alert("保存しました");
      router.push(`/dashboard/estimates/${id}`);
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
            <StepLabel onClick={() => setStepIndex(idx)}>
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
    </Box>
  );
}