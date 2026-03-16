"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Grid,
  Paper,
  MenuItem,
  Divider,
} from "@mui/material";

import EstimateCategorySelector from "@/components/estimate/EstimateCategorySelector";
import apiClient from "@/lib/apiClient";

type Props = {
  vehicle: any | null;
  dispatch: React.Dispatch<any>;
  partyId: number | null;
  vehicleMode: "sale" | "maintenance" | "none";
};

export default function VehicleStep({
  vehicle,
  dispatch,
  partyId,
  vehicleMode,
}: Props) {

  const currentVehicle = vehicle ?? {
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
    source_customer_vehicle: null,
  };

  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [colors, setColors] = useState<any[]>([]);
  const [customerVehicles, setCustomerVehicles] = useState<any[]>([]);

  /* ===============================
     🔥 maintenance のときだけ所有車両取得
  =============================== */
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

  /* ===============================
     🔥 sale に切り替わったら source クリア
  =============================== */
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

  /* ===============================
     メーカー取得
  =============================== */
  useEffect(() => {
    if (!currentVehicle.category_id) {
      setManufacturers([]);
      return;
    }

    apiClient
      .get(`/masters/manufacturers/?category=${currentVehicle.category_id}`)
      .then((res) => setManufacturers(res.data || []))
      .catch(() => setManufacturers([]));
  }, [currentVehicle.category_id]);

  /* ===============================
     カラー取得
  =============================== */
  useEffect(() => {
    apiClient
      .get(`/masters/colors/`)
      .then((res) => setColors(res.data || []))
      .catch(() => setColors([]));
  }, []);

  const updateVehicle = (field: string, value: any) => {
    dispatch({
      type: "SET_VEHICLE",
      payload: {
        ...currentVehicle,
        [field]: value,
      },
    });
  };

  /* ===============================
     所有車両選択
  =============================== */
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
        source_customer_vehicle: owned.id,
        vehicle_name: v?.vehicle_name ?? "",
        manufacturer: v?.manufacturer ?? null,
        category_id: v?.category?.id ?? null,
        unit_price: 0,
      },
    });
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" fontWeight="bold" mb={3}>
        車両情報
      </Typography>

      {/* 🔥 maintenance時のみ表示 */}
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
            onChange={(e) =>
              updateVehicle("vehicle_name", e.target.value)
            }
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            select
            label="区分"
            fullWidth
            value={currentVehicle.new_car_type}
            onChange={(e) =>
              updateVehicle("new_car_type", e.target.value)
            }
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
            onChange={(e) =>
              updateVehicle("model_year", e.target.value)
            }
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
            onChange={(e) =>
              updateVehicle("model_code", e.target.value)
            }
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            label="エンジン形式"
            fullWidth
            value={currentVehicle.engine_type}
            onChange={(e) =>
              updateVehicle("engine_type", e.target.value)
            }
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            label="車台番号"
            fullWidth
            value={currentVehicle.chassis_no}
            onChange={(e) =>
              updateVehicle("chassis_no", e.target.value)
            }
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
            onChange={(e) =>
              updateVehicle("color_name", e.target.value)
            }
          />
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <TextField
            label="カラーコード"
            fullWidth
            value={currentVehicle.color_code}
            onChange={(e) =>
              updateVehicle("color_code", e.target.value)
            }
          />
        </Grid>

        {/* 🔥 sale時のみ価格表示 */}
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

      </Grid>
    </Paper>
  );
}