// src/components/orders/OrderVehicleInfoForm.tsx
"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Divider,
  CircularProgress,
} from "@mui/material";
import apiClient from "@/lib/apiClient";

/**
 * OrderVehicleInfoForm（受注版）
 * - /orders/new 画面で表示する車両情報フォーム
 * - formData.target / formData.tradeIn に保存する（見積と同形式）
 * - バックエンド送信は /orders/new の submit ボタン時にまとめて実施
 */
export default function OrderVehicleInfoForm({
  formData,
  setFormData,
}: {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
}) {
  const [loading, setLoading] = useState(false);
  const [manufacturers, setManufacturers] = useState<any[]>([]);

  // === メーカー取得 ===
  useEffect(() => {
    const fetchManufacturers = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get("/masters/manufacturers/");
        setManufacturers(res.data.results || res.data);
      } catch (err) {
        console.error("❌ メーカー取得エラー:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchManufacturers();
  }, []);

  // === 共通入力ハンドラ ===
  const handleChange = (
    type: "target" | "tradeIn",
    field: string,
    value: any
  ) => {
    setFormData((prev: any) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value,
      },
    }));
  };

  if (loading) return <CircularProgress />;

  // === 商談車両／下取り車両の共通ブロック ===
  const renderVehicleForm = (
    type: "target" | "tradeIn",
    data: any,
    title: string
  ) => (
    <Box mb={4}>
      <Typography variant="subtitle1" fontWeight="bold" mb={1}>
        {title}
      </Typography>

      <Grid container spacing={2}>
        {/* 車両名 */}
        <Grid size={{ xs: 12, md: 3 }}>
          <TextField
            label="車両名"
            value={data.vehicle_name || ""}
            onChange={(e) => handleChange(type, "vehicle_name", e.target.value)}
            fullWidth
          />
        </Grid>

        {/* 排気量 */}
        <Grid size={{ xs: 6, md: 2 }}>
          <TextField
            label="排気量"
            type="number"
            value={data.displacement || ""}
            onChange={(e) => handleChange(type, "displacement", e.target.value)}
            fullWidth
          />
        </Grid>

        {/* 年式 */}
        <Grid size={{ xs: 6, md: 2 }}>
          <TextField
            label="年式"
            value={data.model_year || ""}
            onChange={(e) => handleChange(type, "model_year", e.target.value)}
            fullWidth
          />
        </Grid>

        {/* 新車/中古 */}
        <Grid size={{ xs: 6, md: 2 }}>
          <TextField
            select
            label="新車/中古"
            value={data.new_car_type || ""}
            onChange={(e) => handleChange(type, "new_car_type", e.target.value)}
            fullWidth
          >
            <MenuItem value="new">新車</MenuItem>
            <MenuItem value="used">中古</MenuItem>
          </TextField>
        </Grid>

        {/* 型式 */}
        <Grid size={{ xs: 6, md: 3 }}>
          <TextField
            label="型式"
            value={data.model_code || ""}
            onChange={(e) => handleChange(type, "model_code", e.target.value)}
            fullWidth
          />
        </Grid>

        {/* メーカー */}
        <Grid size={{ xs: 6, md: 3 }}>
          <TextField
            select
            label="メーカー"
            value={data.manufacturer || ""}
            onChange={(e) => handleChange(type, "manufacturer", e.target.value)}
            fullWidth
          >
            {manufacturers.map((m) => (
              <MenuItem key={m.id} value={m.id}>
                {m.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* 色名 */}
        <Grid size={{ xs: 6, md: 3 }}>
          <TextField
            label="色名"
            value={data.color_name || ""}
            onChange={(e) => handleChange(type, "color_name", e.target.value)}
            fullWidth
          />
        </Grid>

        {/* 色コード */}
        <Grid size={{ xs: 6, md: 3 }}>
          <TextField
            label="カラーコード"
            value={data.color_code || ""}
            onChange={(e) => handleChange(type, "color_code", e.target.value)}
            fullWidth
          />
        </Grid>

        {/* 車台番号 */}
        <Grid size={{ xs: 6, md: 3 }}>
          <TextField
            label="車台番号"
            value={data.chassis_no || ""}
            onChange={(e) => handleChange(type, "chassis_no", e.target.value)}
            fullWidth
          />
        </Grid>

        {/* エンジン型式 */}
        <Grid size={{ xs: 6, md: 3 }}>
          <TextField
            label="エンジン型式"
            value={data.engine_type || ""}
            onChange={(e) => handleChange(type, "engine_type", e.target.value)}
            fullWidth
          />
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <Box mt={4} p={3} border="1px solid #ccc" borderRadius={2}>
      <Typography variant="h6" fontWeight="bold" mb={2}>
        車両情報
      </Typography>

      {renderVehicleForm("target", formData.target || {}, "商談車両")}

      <Divider sx={{ my: 3 }} />

      {renderVehicleForm("tradeIn", formData.tradeIn || {}, "下取り車両")}
    </Box>
  );
}
