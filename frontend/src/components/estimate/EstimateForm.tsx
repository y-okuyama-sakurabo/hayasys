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
  TextField,
} from "@mui/material";
import apiClient from "@/lib/apiClient";
import { useRouter, useSearchParams } from "next/navigation";
import dayjs from "dayjs";

import BasicInfoForm from "./BasicInfoForm";
import VehicleStep from "./VehicleStep";
import OtherStep from "./OtherStep";
import TaxableExpenseStep from "./TaxableExpenseStep";
import NonTaxableExpenseStep from "./NonTaxableExpenseStep";
import EstimatePaymentForm from "./EstimatePaymentForm";

const BASE_STEPS = [
  { key: "basic", label: "基本情報" },
  { key: "vehicle", label: "車両" },
  { key: "items", label: "その他" },
  { key: "taxable_expense", label: "課税費用" },
  { key: "non_taxable_expense", label: "非課税費用" },
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
  schedule: any;
  insurance: any;
  deletedItemIds: number[];
  global_discount: number;
  memo: string;
};

const initialState: EstimateState = {
  meta: { mode: "create" },
  basic: {
    estimate_no: "",
    shop: null,
    party_id: null,
    new_party: null,
    vehicle_mode: "sale",
    estimate_date: dayjs().format("YYYY-MM-DD"),
    settlements: {
      trade_in: 0,
      cash: 0,
      card: 0,
      credit: 0,
      advance: 0,
    },
    credit_company: "",
    credit_installments: null,
    credit_first_payment: null,
    credit_second_payment: null,
    credit_bonus_payment: null,
    credit_start_month: "",
  },
  vehicle: null,
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
};

function reducer(state: EstimateState, action: any): EstimateState {
  switch (action.type) {
    case "INIT_FROM_API":
      const estimate = action.payload;
      return {
        ...state,
        ...estimate,
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

    case "SET_INSURANCE":
      return {
        ...state,
        insurance: action.payload,
      };

    case "SET_MEMO":  
      return {
        ...state,
        memo: action.payload,
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
          estimate_date: dayjs().format("YYYY-MM-DD"),
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

        const discountItem = estimate.items?.find(
          (i: any) => i.item_type === "discount"
        );

        dispatch({
          type: "INIT_FROM_API",
          payload: {
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
              payment_method: "現金",
            },

            items: estimate.items ?? [],

            global_discount: discountItem?.discount ?? 0,

            memo: estimate.memo || "",

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

      const normalizeFk = (v: any) =>
        typeof v === "object" ? v?.id ?? null : v ?? null;

      const discountItem = estimate.items?.find(
        (i: any) => i.item_type === "discount"
      );

      const settlementsObj = (estimate.settlements || []).reduce(
        (acc: any, s: any) => {
          acc[s.settlement_type] = Number(s.amount);
          return acc;
        },
        {
          trade_in: 0,
          cash: 0,
          card: 0,
          credit: 0,
          advance: 0,
        }
      );

      const payment = estimate.payments?.[0];

      dispatch({
        type: "INIT_FROM_API",
        payload: {
          meta: { id: estimate.id, mode: "edit" },

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
                  vehicle.manufacturer_detail?.id ??
                  vehicle.manufacturer ??
                  null,
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

      const settlementsPayload = Object.entries(
        state.basic.settlements || {}
      )
        .filter(([_, value]) => Number(value) > 0)
        .map(([key, value]) => ({
          settlement_type: key,
          amount: Number(value),
        }));

      const paymentPayload =
        Number(state.basic.settlements?.credit || 0) > 0
          ? {
              credit_company: state.basic.credit_company || "",
              credit_installments: state.basic.credit_installments || null,
              credit_first_payment: state.basic.credit_first_payment || null,
              credit_second_payment: state.basic.credit_second_payment || null,
              credit_bonus_payment: state.basic.credit_bonus_payment || null,
              credit_start_month: state.basic.credit_start_month || "",
            }
          : null;

      const headerPayload = {
        estimate_no: state.basic.estimate_no,
        shop: state.basic.shop,
        created_by_id: state.basic.created_by_id,
        vehicle_mode: state.basic.vehicle_mode,
        estimate_date: state.basic.estimate_date,
        new_party: state.basic.new_party,
        settlements: settlementsPayload,
        memo: state.memo,
        payment: paymentPayload,
        insurance_payload: state.insurance,
      };

      if (mode === "create") {
        const res = await apiClient.post("/estimates/", headerPayload);
        id = res.data.id;
      } else {
        await apiClient.put(`/estimates/${estimateId}/`, headerPayload);
      }

      /* =========================
        🔥 ここ追加（スケジュール保存）
      ========================= */
      if (state.schedule?.start_at) {
        const schedulePayload = {
          start_at: state.schedule.start_at,
          end_at: dayjs(state.schedule.start_at).add(1, "hour").format(),
          delivery_method: state.schedule.delivery_method || "",
          delivery_shop: state.schedule.delivery_shop || null,
          description: state.schedule.description || "",
        };

        if (state.schedule.id) {
          await apiClient.patch(`/schedules/${state.schedule.id}/`, schedulePayload);
        } else {
          await apiClient.post("/schedules/", {
            estimate: id,
            title: "納車予定日",
            ...schedulePayload,
          });
        }
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
        (i) => i.item_type !== "vehicle" && i.item_type !== "discount"
      );

      if (state.vehicle && state.basic.vehicle_mode === "sale") {
        items.unshift({
          item_type: "vehicle",
          name: state.vehicle.vehicle_name || "車両",
          quantity: 1,
          unit_price: state.vehicle.unit_price ?? 0,
          discount: state.vehicle.discount ?? 0,
          category_id: state.vehicle.category_id ?? null,
          manufacturer: state.vehicle.manufacturer ?? null,
          unit: state.vehicle.unit ?? null,
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
          unit: null,
        });
      }

      for (const item of items) {
        const payload = {
          ...item,
          staff: item.staff_id ?? null,
          category_id: item.category_id ?? item.category?.id ?? null,
          unit: item.unit ?? null,
        };

        if (item.item_type === "vehicle") {
          const existingVehicle = state.items.find(
            (i) => i.item_type === "vehicle" && i.id
          );

          if (existingVehicle?.id) {
            await apiClient.patch(
              `/estimates/${id}/items/${existingVehicle.id}/`,
              payload
            );
          } else {
            await apiClient.post(`/estimates/${id}/items/`, payload);
          }

          continue; // ←これ重要
        }

        // 通常item
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
            schedule={state.schedule}
            insurance={state.insurance}
            dispatch={dispatch}
            partyId={state.basic.party_id}
            vehicleMode={state.basic.vehicle_mode}
          />
        )}

        {currentStep === "items" && (
          <OtherStep items={state.items} dispatch={dispatch} />
        )}

        {currentStep === "taxable_expense" && (
          <TaxableExpenseStep items={state.items} dispatch={dispatch} />
        )}

        {currentStep === "non_taxable_expense" && (
          <NonTaxableExpenseStep items={state.items} dispatch={dispatch} />
        )}

        {currentStep === "payment" && (
          <EstimatePaymentForm
            basic={state.basic}
            items={state.items}
            global_discount={state.global_discount}
            dispatch={dispatch}
          />
        )}
      </Paper>

      <Divider sx={{ my: 3 }} />

      <Paper
        sx={{
          p: 2,
          mb: 3,
          background: "#fff",
        }}
      >
        <Typography fontWeight="bold" mb={2}>
          全体値引き
        </Typography>

        <TextField
          label="金額"
          type="number"
          fullWidth
          value={state.global_discount}
          onChange={(e) =>
            dispatch({
              type: "SET_GLOBAL_DISCOUNT",
              payload: e.target.value === "" ? 0 : Number(e.target.value),
            })
          }
        />
      </Paper>

      <Paper
        sx={{
          p: 2,
          mb: 3,
          background: "#fff",
        }}
      >
        <Typography fontWeight="bold" mb={2}>
          メモ
        </Typography>

        <TextField
          multiline
          rows={4}
          fullWidth
          value={state.memo || ""}
          onChange={(e) =>
            dispatch({
              type: "SET_MEMO",
              payload: e.target.value,
            })
          }
        />
      </Paper>

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