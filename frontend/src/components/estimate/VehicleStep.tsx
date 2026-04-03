"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Typography,
  TextField,
  Grid,
  Paper,
  MenuItem,
  Divider,
  Select,
} from "@mui/material";

import EstimateCategorySelector from "@/components/estimate/EstimateCategorySelector";
import apiClient from "@/lib/apiClient";
import dayjs from "dayjs";

type Props = {
  vehicle: any | null;
  schedule: any;
  dispatch: React.Dispatch<any>;
  partyId: number | null;
  vehicleMode: "sale" | "maintenance" | "none";
};

export default function VehicleStep({
  vehicle,
  schedule,
  dispatch,
  partyId,
  vehicleMode,
}: Props) {
  const currentVehicle = vehicle ?? {
    id: null, // 🔥追加（超重要）
    category_id: null,
    vehicle_name: "",
    manufacturer: null,
    model_year: "",
    chassis_no: "",
    displacement: null,
    engine_type: "",
    model_code: "",
    color: null,
    color_name: "",
    color_code: "",
    new_car_type: "new",
    unit_price: 0,
    discount: 0,
    source_customer_vehicle: null,
  };

  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [colors, setColors] = useState<any[]>([]);
  const [customerVehicles, setCustomerVehicles] = useState<any[]>([]);

  const [chassisError, setChassisError] = useState("");
  const [shops, setShops] = useState<any[]>([]);

  const isFirstCategoryLoad = useRef(true);
  const prevCategoryIdRef = useRef<number | null>(null);

  /* =============================
     顧客車両
  ============================= */
  useEffect(() => {
    if (vehicleMode !== "maintenance" || !partyId) {
      setCustomerVehicles([]);
      return;
    }

    apiClient
      .get(`/customers/${partyId}/`)
      .then((res) => {
        setCustomerVehicles(res.data?.owned_vehicles ?? []);
      })
      .catch(() => setCustomerVehicles([]));
  }, [partyId, vehicleMode]);

  /* =============================
     source_customer_vehicle制御
  ============================= */
  useEffect(() => {
    if (vehicleMode === "sale" && currentVehicle.source_customer_vehicle) {
      dispatch({
        type: "SET_VEHICLE",
        payload: {
          ...currentVehicle,
          source_customer_vehicle: null,
        },
      });
    }
  }, [vehicleMode]);

  /* =============================
     メーカー取得
  ============================= */
  useEffect(() => {
    const categoryId = currentVehicle.category_id ?? null;

    if (!categoryId) {
      setManufacturers([]);
      prevCategoryIdRef.current = null;
      return;
    }

    apiClient
      .get(`/masters/manufacturers/?category=${categoryId}`)
      .then((res) => setManufacturers(res.data || []))
      .catch(() => setManufacturers([]));

    if (isFirstCategoryLoad.current) {
      isFirstCategoryLoad.current = false;
      prevCategoryIdRef.current = categoryId;
      return;
    }

    if (prevCategoryIdRef.current !== categoryId) {
      prevCategoryIdRef.current = categoryId;

      dispatch({
        type: "SET_VEHICLE",
        payload: {
          ...currentVehicle,
          manufacturer: null,
        },
      });
    }
  }, [currentVehicle.category_id]);

  /* =============================
     カラー取得
  ============================= */
  useEffect(() => {
    apiClient
      .get(`/masters/colors/`)
      .then((res) => setColors(res.data || []))
      .catch(() => setColors([]));
  }, []);

  /* =============================
     カラー取得
  ============================= */
  useEffect(() => {
    apiClient
      .get("/masters/shops/")
      .then((res) => setShops(res.data || []))
      .catch(() => setShops([]));
  }, []);

  /* =============================
     🔥 車台番号 重複チェック（修正版）
  ============================= */
  useEffect(() => {
    const chassisNo = currentVehicle.chassis_no?.trim();

    if (!chassisNo) {
      setChassisError("");
      return;
    }

    const timer = setTimeout(async () => {
      try {
        let url = `/vehicles/check-duplicate/?chassis_no=${encodeURIComponent(
          chassisNo
        )}`;

        // 🔥 自分のvehicleは除外
        if (currentVehicle.id) {
          url += `&exclude_id=${currentVehicle.id}`;
        }

        const res = await apiClient.get(url);

        if (res.data.exists) {
          setChassisError("この車台番号は既に登録されています");
        } else {
          setChassisError("");
        }
      } catch (e) {
        console.error(e);
        setChassisError("");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [currentVehicle.chassis_no, currentVehicle.id]);

  /* =============================
     更新
  ============================= */
  const updateVehicle = (field: string, value: any) => {
    dispatch({
      type: "SET_VEHICLE",
      payload: {
        ...currentVehicle,
        [field]: value,
      },
    });
  };

  /* =============================
     顧客車両選択
  ============================= */
  const handleSelectCustomerVehicle = (ownedId: number | null) => {
    if (!ownedId) {
      updateVehicle("source_customer_vehicle", null);
      return;
    }

    const owned = customerVehicles.find((v) => v.id === ownedId);
    if (!owned) return;

    const v = owned.vehicle;

    dispatch({
      type: "SET_VEHICLE",
      payload: {
        ...currentVehicle,
        id: v?.id ?? null, // 🔥ここ超重要
        source_customer_vehicle: owned.id,
        vehicle_name: v?.vehicle_name ?? "",
        manufacturer: v?.manufacturer ?? null,
        category_id: v?.category?.id ?? null,
        model_year: v?.model_year ?? "",
        displacement: v?.displacement ?? null,
        engine_type: v?.engine_type ?? "",
        model_code: v?.model_code ?? "",
        chassis_no: v?.chassis_no ?? "",
        color: v?.color ?? null,
        color_name: v?.color_name ?? "",
        color_code: v?.color_code ?? "",
        unit_price: 0,
      },
    });

    prevCategoryIdRef.current = v?.category?.id ?? null;
    isFirstCategoryLoad.current = false;
  };

  /* =============================
     UI
  ============================= */
  return (
    <>
      <Typography variant="h6" fontWeight="bold" mb={3}>
        車両情報
      </Typography>

      <Grid size={{ xs: 12 }}>
        <Divider sx={{ my: 2 }} />
          <Typography fontWeight="bold">
            基本情報
          </Typography>
      </Grid>

      {vehicleMode === "maintenance" &&
        partyId &&
        customerVehicles.length > 0 && (
          <>
            <Typography variant="subtitle2" mb={1}>
              所有車両から選択（任意）
            </Typography>

            <TextField
              select
              fullWidth
              sx={{ mb: 3 }}
              value={currentVehicle.source_customer_vehicle ?? ""}
              onChange={(e) =>
                handleSelectCustomerVehicle(
                  e.target.value === "" ? null : Number(e.target.value)
                )
              }
            >
              <MenuItem value="">選択しない（手入力）</MenuItem>
              {customerVehicles.map((owned) => (
                <MenuItem key={owned.id} value={owned.id}>
                  {owned.vehicle?.vehicle_name ?? "名称未設定"}
                </MenuItem>
              ))}
            </TextField>

            <Divider sx={{ mb: 3 }} />
          </>
        )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <EstimateCategorySelector
            value={currentVehicle.category_id}
            onChange={(id) => updateVehicle("category_id", id)}
            categoryTypes={["vehicle"]}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            select
            label="メーカー"
            fullWidth
            value={currentVehicle.manufacturer ?? ""}
            onChange={(e) =>
              updateVehicle(
                "manufacturer",
                e.target.value === "" ? null : Number(e.target.value)
              )
            }
          >
            <MenuItem value="">未選択</MenuItem>
            {manufacturers.map((m) => (
              <MenuItem key={m.id} value={m.id}>
                {m.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <TextField
            label="車両名"
            fullWidth
            value={currentVehicle.vehicle_name}
            onChange={(e) => updateVehicle("vehicle_name", e.target.value)}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            select
            label="区分"
            fullWidth
            value={currentVehicle.new_car_type}
            onChange={(e) => updateVehicle("new_car_type", e.target.value)}
          >
            <MenuItem value="new">新車</MenuItem>
            <MenuItem value="used">中古</MenuItem>
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            label="年式"
            fullWidth
            value={currentVehicle.model_year}
            onChange={(e) => updateVehicle("model_year", e.target.value)}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            label="排気量"
            type="number"
            fullWidth
            value={currentVehicle.displacement ?? ""}
            onChange={(e) =>
              updateVehicle(
                "displacement",
                e.target.value === "" ? null : Number(e.target.value)
              )
            }
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            label="型式"
            fullWidth
            value={currentVehicle.model_code}
            onChange={(e) => updateVehicle("model_code", e.target.value)}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            label="エンジン形式"
            fullWidth
            value={currentVehicle.engine_type}
            onChange={(e) => updateVehicle("engine_type", e.target.value)}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            label="車台番号"
            fullWidth
            value={currentVehicle.chassis_no}
            error={!!chassisError}
            helperText={chassisError}
            onChange={(e) => updateVehicle("chassis_no", e.target.value)}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            select
            label="カラー"
            fullWidth
            value={
              currentVehicle.color ??
              colors.find((c) => c.name === currentVehicle.color_name)?.id ??
              ""
            }
            onChange={(e) =>
              updateVehicle(
                "color",
                e.target.value === "" ? null : Number(e.target.value)
              )
            }
          >
            <MenuItem value="">未選択</MenuItem>
            {colors.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <TextField
            label="カラー名"
            fullWidth
            value={currentVehicle.color_name}
            onChange={(e) => updateVehicle("color_name", e.target.value)}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <TextField
            label="カラーコード"
            fullWidth
            value={currentVehicle.color_code}
            onChange={(e) => updateVehicle("color_code", e.target.value)}
          />
        </Grid>
        {vehicleMode === "sale" && (
          <>
            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 2 }} />
              <Typography fontWeight="bold">
                登録情報
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="登録地域"
                fullWidth
                value={currentVehicle.registrations?.[0]?.registration_area || ""}
                onChange={(e) => {
                  const reg = currentVehicle.registrations?.[0] || {};
                  updateVehicle("registrations", [
                    { ...reg, registration_area: e.target.value },
                  ]);
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="ナンバー"
                fullWidth
                value={currentVehicle.registrations?.[0]?.registration_no || ""}
                onChange={(e) => {
                  const reg = currentVehicle.registrations?.[0] || {};
                  updateVehicle("registrations", [
                    { ...reg, registration_no: e.target.value },
                  ]);
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="型認番号"
                fullWidth
                value={currentVehicle.registrations?.[0]?.certification_no || ""}
                onChange={(e) => {
                  const reg = currentVehicle.registrations?.[0] || {};
                  updateVehicle("registrations", [
                    { ...reg, certification_no: e.target.value },
                  ]);
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="初年度登録"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={currentVehicle.registrations?.[0]?.first_registration_date || ""}
                onChange={(e) => {
                  const reg = currentVehicle.registrations?.[0] || {};
                  updateVehicle("registrations", [
                    { ...reg, first_registration_date: e.target.value },
                  ]);
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="車検満了日"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={currentVehicle.registrations?.[0]?.inspection_expiration || ""}
                onChange={(e) => {
                  const reg = currentVehicle.registrations?.[0] || {};
                  updateVehicle("registrations", [
                    { ...reg, inspection_expiration: e.target.value },
                  ]);
                }}
              />
            </Grid>
          </>
        )}
                    <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 2 }} />
              <Typography fontWeight="bold">
                金額
              </Typography>
            </Grid>
        {vehicleMode === "sale" && (
          <Grid size={{ xs: 12 }}>
            <TextField
              label="車両本体価格"
              type="number"
              fullWidth
              value={currentVehicle.unit_price || ""}
              onChange={(e) =>
                updateVehicle(
                  "unit_price",
                  e.target.value === "" ? 0 : Number(e.target.value)
                )
              }
            />
          </Grid>
          
        )}
        {vehicleMode === "sale" && (
          <>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="値引き"
                type="number"
                fullWidth
                value={currentVehicle.discount ?? 0}
                onChange={(e) =>
                  updateVehicle(
                    "discount",
                    e.target.value === "" ? 0 : Number(e.target.value)
                  )
                }
              />
            </Grid>
          </>
        )}
      </Grid>

      <Divider sx={{ my: 3 }} />
        <Typography fontWeight="bold" mb={2}>
          納車予定
        </Typography>

        <TextField
          label="納車日"
          type="date"
          fullWidth
          value={schedule?.start_at ? dayjs(schedule.start_at).format("YYYY-MM-DD") : ""}
          onChange={(e) => {
            const time = schedule?.start_at?.slice(11, 16) || "00:00";

            dispatch({
              type: "SET_SCHEDULE",
              payload: {
                start_at: `${e.target.value}T${time}:00`,
              },
            });
          }}
        />

        <TextField
          label="納車時刻"
          type="time"
          fullWidth
          value={schedule?.start_at ? dayjs(schedule.start_at + "Z").format("HH:mm") : ""}
          onChange={(e) => {
            const date =
              schedule?.start_at?.slice(0, 10) ||
              new Date().toISOString().slice(0, 10);

            dispatch({
              type: "SET_SCHEDULE",
              payload: {
                start_at: `${date}T${e.target.value}:00`,
              },
            });
          }}
        />

        <TextField
          label="納車方法"
          fullWidth
          value={schedule?.delivery_method || ""}
          onChange={(e) =>
            dispatch({
              type: "SET_SCHEDULE",
              payload: { delivery_method: e.target.value },
            })
          }
        />

        <Select
          fullWidth
          displayEmpty
          value={
            schedule?.delivery_shop === null ||
            schedule?.delivery_shop === undefined
              ? ""
              : schedule.delivery_shop
          }
          onChange={(e) => {
            const val = e.target.value;

            dispatch({
              type: "SET_SCHEDULE",
              payload: {
                delivery_shop: val === "" ? null : Number(val),
              },
            });
          }}
        >
          <MenuItem value="">納車店舗を選択</MenuItem>
          {shops.map((shop) => (
            <MenuItem key={shop.id} value={shop.id}>
              {shop.name}
            </MenuItem>
          ))}
        </Select>

        <TextField
          label="備考"
          fullWidth
          multiline
          value={schedule?.description || ""}
          onChange={(e) =>
            dispatch({
              type: "SET_SCHEDULE",
              payload: { description: e.target.value },
            })
          }
        />
    </>
  );
}