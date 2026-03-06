"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  RadioGroup,
  FormControlLabel,
  Radio,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import PartySelector from "./PartySelector";
import apiClient from "@/lib/apiClient";

type Props = {
  basic: any;
  dispatch: React.Dispatch<any>;
  type?: "estimate" | "order";   // ✅ 追加
};

export default function BasicInfoForm({
  basic,
  dispatch,
  type = "estimate",             // ✅ デフォルト
}: Props) {
  const [shops, setShops] = useState<any[]>([]);

  /* ===============================
     店舗一覧取得
  =============================== */
  useEffect(() => {
    apiClient
      .get("/masters/shops/")
      .then((res) => setShops(res.data.results || res.data || []))
      .catch((err) => console.error("🏪 店舗取得失敗:", err));
  }, []);

  /* ===============================
     店舗変更
  =============================== */
  const handleShopChange = (value: number) => {
    dispatch({
      type: "SET_BASIC",
      payload: {
        shop: value,
      },
    });
  };

  /* ===============================
     vehicle_mode変更
  =============================== */
  const handleVehicleModeChange = (value: string) => {
    dispatch({
      type: "SET_BASIC",
      payload: {
        vehicle_mode: value,
      },
    });
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>

        {/* 店舗 */}
        <Typography variant="subtitle1" fontWeight="bold" mb={1}>
          店舗情報
        </Typography>

        <FormControl size="small" sx={{ mb: 3, minWidth: 240 }}>
          <InputLabel>店舗を選択</InputLabel>
          <Select
            value={basic.shop || ""}
            label="店舗を選択"
            onChange={(e) =>
              handleShopChange(e.target.value as number)
            }
          >
            {shops.map((shop) => (
              <MenuItem key={shop.id} value={shop.id}>
                {shop.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* 車両モード */}
        <Typography variant="subtitle1" fontWeight="bold" mb={1}>
          {type === "order" ? "受注タイプ" : "見積タイプ"}
        </Typography>

        <FormControl sx={{ mb: 4 }}>
          <RadioGroup
            value={basic.vehicle_mode || "sale"}
            onChange={(e) =>
              handleVehicleModeChange(e.target.value)
            }
          >
            <FormControlLabel
              value="sale"
              control={<Radio />}
              label="車両購入"
            />
            <FormControlLabel
              value="maintenance"
              control={<Radio />}
              label="既存車両"
            />
            <FormControlLabel
              value="none"
              control={<Radio />}
              label="車両なし"
            />
          </RadioGroup>
        </FormControl>

        {/* 顧客 */}
        <Typography variant="subtitle1" fontWeight="bold" mb={1}>
          顧客情報
        </Typography>

        {/* 🔥 ここが重要 */}
        <PartySelector
          basic={basic}
          dispatch={dispatch}
          type={type}    // ✅ ちゃんと渡す
        />

      </Box>
    </LocalizationProvider>
  );
}