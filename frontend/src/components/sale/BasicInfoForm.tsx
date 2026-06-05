"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  ToggleButtonGroup,
  ToggleButton,
  Divider,
  Stack,
} from "@mui/material";
import TwoWheelerIcon from "@mui/icons-material/TwoWheeler";
import BuildIcon from "@mui/icons-material/Build";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import StoreIcon from "@mui/icons-material/Store";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import apiClient from "@/lib/apiClient";
import PartySelector from "./PartySelector";
import JaDatePicker from "@/components/common/JaDatePicker";

const VEHICLE_MODES = [
  {
    value: "sale",
    label: "車両購入",
    icon: <TwoWheelerIcon />,
    description: "新車・中古車の販売",
  },
  {
    value: "maintenance",
    label: "既存車両",
    icon: <BuildIcon />,
    description: "整備・メンテナンス",
  },
  {
    value: "none",
    label: "車両なし",
    icon: <ReceiptLongIcon />,
    description: "用品・作業のみ",
  },
];

// ── Props ────────────────────────────────────────────────────────
type Props = {
  basic: any;
  dispatch: React.Dispatch<any>;
  type?: "estimate" | "order";
};

// ── セクション見出し ──────────────────────────────────────────────
function SectionLabel({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Typography
      variant="subtitle2"
      fontWeight="bold"
      color="text.secondary"
      mb={1.5}
      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
    >
      {icon}
      {children}
    </Typography>
  );
}

// ── メインコンポーネント ──────────────────────────────────────────
export default function BasicInfoForm({
  basic,
  dispatch,
  type = "estimate",
}: Props) {
  const isOrder = type === "order";
  const dateKey = isOrder ? "order_date" : "estimate_date";

  const [shops, setShops]   = useState<any[]>([]);
  const [staffs, setStaffs] = useState<any[]>([]);

  useEffect(() => {
    apiClient
      .get("/masters/shops/")
      .then((res) => setShops(res.data.results || res.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    apiClient
      .get("/masters/staffs/")
      .then((res) => setStaffs(res.data.results || res.data || []))
      .catch(() => {});
  }, []);

  // ── ハンドラ ─────────────────────────────────────────────────────
  const handleVehicleModeChange = (_: any, value: string | null) => {
    if (!value) return;
    dispatch({ type: "SET_BASIC", payload: { vehicle_mode: value } });
  };

  const currentMode = basic.vehicle_mode || "sale";

  return (
    <Box>
      {/* ━━━━━━━━ 店舗・担当者 ━━━━━━━━ */}
      <Box mb={3.5}>
        <SectionLabel icon={<StoreIcon fontSize="small" />}>
          店舗・担当者
        </SectionLabel>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>店舗</InputLabel>
              <Select
                value={basic.shop || ""}
                label="店舗"
                onChange={(e) =>
                  dispatch({
                    type: "SET_BASIC",
                    payload: { shop: e.target.value as number },
                  })
                }
              >
                {shops.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>作成者</InputLabel>
              <Select
                value={basic.created_by_id || ""}
                label="作成者"
                onChange={(e) =>
                  dispatch({
                    type: "SET_BASIC",
                    payload: { created_by_id: e.target.value as number },
                  })
                }
              >
                {staffs.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.display_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      <Divider sx={{ mb: 3.5 }} />

      {/* ━━━━━━━━ 見積/受注タイプ ━━━━━━━━ */}
      <Box mb={3.5}>
        <SectionLabel>
          {isOrder ? "受注タイプ" : "見積タイプ"}
        </SectionLabel>
        <ToggleButtonGroup
          value={currentMode}
          exclusive
          onChange={handleVehicleModeChange}
          sx={{ gap: 1.5, flexWrap: "wrap" }}
        >
          {VEHICLE_MODES.map((mode) => (
            <ToggleButton
              key={mode.value}
              value={mode.value}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 0.5,
                px: 3,
                py: 1.5,
                borderRadius: "10px !important",
                border: "1px solid",
                borderColor: "divider",
                minWidth: 110,
                textTransform: "none",
                "&.Mui-selected": {
                  bgcolor: "primary.main",
                  color: "white",
                  borderColor: "primary.main",
                  "&:hover": { bgcolor: "primary.dark" },
                },
              }}
            >
              {mode.icon}
              <Typography variant="body2" fontWeight="bold" lineHeight={1.3}>
                {mode.label}
              </Typography>
              <Typography
                variant="caption"
                lineHeight={1.2}
                sx={{ opacity: 0.75, display: { xs: "none", sm: "block" } }}
              >
                {mode.description}
              </Typography>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      <Divider sx={{ mb: 3.5 }} />

      {/* ━━━━━━━━ 日付 ━━━━━━━━ */}
      <Box mb={3.5}>
        <SectionLabel icon={<CalendarTodayIcon fontSize="small" />}>
          日付
        </SectionLabel>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <Box flex={1} maxWidth={240}>
            <JaDatePicker
              label={isOrder ? "受注日" : "見積日"}
              value={basic?.[dateKey] || null}
              onChange={v => {
                if (v) dispatch({ type: "SET_BASIC", payload: { [dateKey]: v } });
              }}
              required
            />
          </Box>
          {!isOrder && (
            <Box flex={1} maxWidth={240}>
              <JaDatePicker
                label="有効期限"
                value={basic?.valid_until || null}
                onChange={v => dispatch({ type: "SET_BASIC", payload: { valid_until: v } })}
              />
            </Box>
          )}
        </Stack>
      </Box>

      <Divider sx={{ mb: 3.5 }} />

      {/* ━━━━━━━━ 顧客情報 ━━━━━━━━ */}
      <Box>
        <SectionLabel icon={<PersonOutlineIcon fontSize="small" />}>
          顧客情報
        </SectionLabel>
        <PartySelector basic={basic} dispatch={dispatch} type={type} />
      </Box>
    </Box>
  );
}
