"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Typography,
  TextField,
  Grid,
  Box,
  MenuItem,
  Divider,
  Alert,
  CircularProgress,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  InputLabel,
  FormControl,
  Select,
  InputAdornment,
  Stack,
  Paper,
  RadioGroup,
  FormControlLabel,
  Radio,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CategorySelector from "@/components/sale/CategorySelector";
import JaDatePicker from "@/components/common/JaDatePicker";
import JaMonthPicker from "@/components/common/JaMonthPicker";
import apiClient from "@/lib/apiClient";
import dayjs from "dayjs";
import CurrencyField from "./CurrencyField";

// ── 定数 ─────────────────────────────────────────────────────────
const SALE_TYPE_OPTIONS = [
  { value: "new",         label: "新車" },
  { value: "used",        label: "中古車" },
  { value: "rental_up",   label: "レンタルアップ" },
  { value: "consignment", label: "委託販売" },
];

// ── セクション見出し ──────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Box mb={1.5} mt={1}>
      <Typography
        variant="overline"
        fontSize={10}
        fontWeight="bold"
        color="text.disabled"
        letterSpacing={1.5}
        display="block"
        lineHeight={1.8}
      >
        {children}
      </Typography>
      <Divider />
    </Box>
  );
}

// ── Props ─────────────────────────────────────────────────────────
type Props = {
  vehicle: any | null;
  tradeInVehicle: any | null;
  schedule: any;
  insurance: any;
  dispatch: React.Dispatch<any>;
  partyId: number | null;
  vehicleMode: "sale" | "maintenance" | "none";
};

// ── メインコンポーネント ──────────────────────────────────────────
export default function VehicleStep({
  vehicle,
  tradeInVehicle,
  schedule,
  insurance,
  dispatch,
  partyId,
  vehicleMode,
}: Props) {
  const currentVehicle = vehicle ?? {
    id: null, category_id: null, vehicle_name: "",
    manufacturer: null, model_year: "", chassis_no: "",
    displacement: null, engine_type: "", model_code: "",
    color: null, color_name: "", color_code: "",
    sale_type: "", unit_price: 0, discount: 0,
    source_customer_vehicle: null, registrations: [],
  };

  const currentTradeIn = tradeInVehicle ?? {
    id: null, is_trade_in: true, category_id: null,
    vehicle_name: "", manufacturer: null, model_year: "",
    chassis_no: "", displacement: null, engine_type: "",
    model_code: "", color: null, color_name: "", color_code: "",
    sale_type: "", unit_price: 0, discount: 0,
    source_customer_vehicle: null, registrations: [{}],
  };

  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [colors, setColors]               = useState<any[]>([]);
  const [shops, setShops]                 = useState<any[]>([]);
  const [customerVehicles, setCustomerVehicles]         = useState<any[]>([]);
  const [customerVehiclesLoading, setCustomerVehiclesLoading] = useState(false);
  const [chassisError, setChassisError] = useState("");

  // 整備モード時の入力方式（所有車両 or 直接入力）
  const [maintenanceInputMode, setMaintenanceInputMode] = useState<"owned" | "manual">("owned");
  const modeInitializedRef = useRef(false);

  // 編集時: vehicle が読み込まれたら入力方式を確定する（一度だけ）
  useEffect(() => {
    if (modeInitializedRef.current || !vehicle || vehicleMode !== "maintenance") return;
    modeInitializedRef.current = true;
    if (vehicle.source_customer_vehicle) {
      setMaintenanceInputMode("owned");
    } else if (vehicle.vehicle_name || vehicle.category_id) {
      // 所有車両未選択だが車両情報が入力済み → 直接入力モード
      setMaintenanceInputMode("manual");
    }
  }, [vehicle]);

  const isFirstCategoryLoad = useRef(true);
  const prevCategoryIdRef   = useRef<number | null>(null);

  // ── 顧客所有車両の取得 ───────────────────────────────────────
  useEffect(() => {
    if (vehicleMode !== "maintenance" || !partyId) {
      setCustomerVehicles([]);
      return;
    }
    setCustomerVehiclesLoading(true);
    apiClient
      .get(`/customers/${partyId}/`)
      .then((res) => setCustomerVehicles(res.data?.owned_vehicles ?? []))
      .catch(() => setCustomerVehicles([]))
      .finally(() => setCustomerVehiclesLoading(false));
  }, [partyId, vehicleMode]);

  // ── カテゴリ連動メーカー取得 ─────────────────────────────────
  useEffect(() => {
    const categoryId = currentVehicle.category_id ?? null;
    if (!categoryId) { setManufacturers([]); prevCategoryIdRef.current = null; return; }

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
      dispatch({ type: "SET_VEHICLE", payload: { ...currentVehicle, manufacturer: null } });
    }
  }, [currentVehicle.category_id]);

  // ── カラー・店舗取得 ─────────────────────────────────────────
  useEffect(() => {
    apiClient.get("/masters/colors/").then((res) => setColors(res.data || [])).catch(() => {});
    apiClient.get("/masters/shops/").then((res) => setShops(res.data || [])).catch(() => {});
  }, []);

  // ── 車台番号 重複チェック ────────────────────────────────────
  useEffect(() => {
    const chassisNo = currentVehicle.chassis_no?.trim();
    if (!chassisNo) { setChassisError(""); return; }
    const timer = setTimeout(async () => {
      try {
        let url = `/vehicles/check-duplicate/?chassis_no=${encodeURIComponent(chassisNo)}`;
        if (currentVehicle.id) url += `&exclude_id=${currentVehicle.id}`;
        const res = await apiClient.get(url);
        setChassisError(res.data.exists ? "この車台番号は既に登録されています" : "");
      } catch { setChassisError(""); }
    }, 500);
    return () => clearTimeout(timer);
  }, [currentVehicle.chassis_no, currentVehicle.id]);

  // ── ヘルパー ─────────────────────────────────────────────────
  const updateVehicle   = (field: string, value: any) =>
    dispatch({ type: "SET_VEHICLE",         payload: { ...currentVehicle, [field]: value } });
  const updateTradeIn   = (field: string, value: any) =>
    dispatch({ type: "SET_TRADE_IN_VEHICLE", payload: { ...currentTradeIn, [field]: value } });
  const updateInsurance = (field: string, value: any) =>
    dispatch({ type: "SET_INSURANCE",        payload: { ...insurance, [field]: value } });

  const reg0     = currentVehicle.registrations?.[0] || {};
  const tradeReg0 = currentTradeIn.registrations?.[0] || {};
  const updateReg      = (field: string, value: string | null) =>
    updateVehicle("registrations",  [{ ...reg0,     [field]: value }]);
  const updateTradeReg = (field: string, value: string | null) =>
    updateTradeIn("registrations", [{ ...tradeReg0, [field]: value }]);

  // 納車日時ヘルパー
  const deliveryDateStr = schedule?.start_at
    ? dayjs(schedule.start_at).format("YYYY-MM-DD")
    : null;
  const deliveryTimeStr = schedule?.start_at
    ? dayjs(schedule.start_at).format("HH:mm")
    : "";

  const handleDeliveryDate = (dateStr: string | null) => {
    if (!dateStr) return;
    const time = deliveryTimeStr || "00:00";
    dispatch({ type: "SET_SCHEDULE", payload: { start_at: `${dateStr}T${time}:00` } });
  };
  const handleDeliveryTime = (val: string) => {
    const date = deliveryDateStr ?? dayjs().format("YYYY-MM-DD");
    dispatch({ type: "SET_SCHEDULE", payload: { start_at: `${date}T${val}:00` } });
  };

  // ── 顧客所有車両の選択 ───────────────────────────────────────
  const handleSelectCustomerVehicle = (ownedId: number | null) => {
    if (!ownedId) {
      dispatch({ type: "SET_VEHICLE", payload: { ...currentVehicle, source_customer_vehicle: null } });
      return;
    }
    const owned = customerVehicles.find((v) => v.id === ownedId);
    if (!owned) return;
    const v = owned.vehicle;
    dispatch({
      type: "SET_VEHICLE",
      payload: {
        ...currentVehicle,
        id: v?.id ?? null,
        source_customer_vehicle: owned.id,
        vehicle_name: v?.vehicle_name ?? "",
        manufacturer: v?.manufacturer ?? null,
        category_id:  v?.category?.id ?? null,
        model_year:   v?.model_year ?? "",
        displacement: v?.displacement ?? null,
        engine_type:  v?.engine_type ?? "",
        model_code:   v?.model_code ?? "",
        chassis_no:   v?.chassis_no ?? "",
        color:        v?.color ?? null,
        color_name:   v?.color_name ?? "",
        color_code:   v?.color_code ?? "",
        unit_price: 0,
      },
    });
    prevCategoryIdRef.current  = v?.category?.id ?? null;
    isFirstCategoryLoad.current = false;
  };

  // ─────────────────────────────────────────────────────────────
  // JSX
  // ─────────────────────────────────────────────────────────────
  return (
    <Box>

      {/* ════════════════════════════════════════
           ① 既存車両モード：対象車両の入力方式選択
         ════════════════════════════════════════ */}
      {vehicleMode === "maintenance" && (
        <Paper
          variant="outlined"
          sx={{ mb: 4, p: 2.5, bgcolor: "#f0f7ff", borderColor: "#90caf9" }}
        >
          <Typography fontWeight="bold" mb={1.5} color="primary.main" fontSize={15}>
            対象車両
          </Typography>

          {/* ── 入力方式ラジオ ── */}
          <RadioGroup
            row
            value={maintenanceInputMode}
            onChange={(e) => {
              const mode = e.target.value as "owned" | "manual";
              setMaintenanceInputMode(mode);
              // 直接入力に切り替えたときは所有車両の選択をクリア
              if (mode === "manual") {
                dispatch({
                  type: "SET_VEHICLE",
                  payload: { ...currentVehicle, source_customer_vehicle: null },
                });
              }
            }}
            sx={{ mb: 2 }}
          >
            <FormControlLabel
              value="owned"
              control={<Radio size="small" />}
              label={
                <Typography fontSize={14}>
                  顧客の登録済み車両から選ぶ
                </Typography>
              }
            />
            <FormControlLabel
              value="manual"
              control={<Radio size="small" />}
              label={
                <Typography fontSize={14}>
                  登録されていない車両を入力する
                </Typography>
              }
            />
          </RadioGroup>

          {/* ── 所有車両ピッカー（ownerモード時のみ） ── */}
          {maintenanceInputMode === "owned" && (
            <>
              {!partyId && (
                <Alert severity="info">
                  先に「基本情報」セクションで顧客を選択してください
                </Alert>
              )}

              {partyId && customerVehiclesLoading && (
                <Box display="flex" alignItems="center" gap={1}>
                  <CircularProgress size={20} />
                  <Typography variant="body2" color="text.secondary">所有車両を読み込み中…</Typography>
                </Box>
              )}

              {partyId && !customerVehiclesLoading && customerVehicles.length === 0 && (
                <Alert severity="warning">
                  この顧客に登録された所有車両はありません。「登録されていない車両を入力する」を選択して入力してください。
                </Alert>
              )}

              {partyId && !customerVehiclesLoading && customerVehicles.length > 0 && (
                <>
                  <Typography variant="body2" color="text.secondary" mb={1.5}>
                    車両をクリックすると情報が自動入力されます（任意）
                  </Typography>
                  {currentVehicle.source_customer_vehicle && (
                    <Box mb={1.5}>
                      <Chip
                        label="選択を解除する"
                        size="small"
                        variant="outlined"
                        onClick={() => handleSelectCustomerVehicle(null)}
                        onDelete={() => handleSelectCustomerVehicle(null)}
                      />
                    </Box>
                  )}
                  <Grid container spacing={1.5}>
                    {customerVehicles.map((owned: any) => {
                      const v        = owned.vehicle;
                      const selected = currentVehicle.source_customer_vehicle === owned.id;
                      return (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={owned.id}>
                          <Card
                            sx={{
                              border:  selected ? "2px solid #1976d2" : "1px solid #e0e0e0",
                              bgcolor: selected ? "#e3f2fd" : "white",
                              transition: "all .15s",
                            }}
                          >
                            <CardActionArea onClick={() => handleSelectCustomerVehicle(owned.id)}>
                              <CardContent sx={{ py: 1.5, px: 2 }}>
                                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                  <Box>
                                    <Typography fontWeight="bold" fontSize={14}>
                                      {v?.vehicle_name || "車名未登録"}
                                    </Typography>
                                    {v?.manufacturer_detail?.name && (
                                      <Typography variant="caption" color="text.secondary" display="block">
                                        {v.manufacturer_detail.name}
                                      </Typography>
                                    )}
                                    {v?.model_code && (
                                      <Typography variant="caption" color="text.secondary" display="block">
                                        型式: {v.model_code}
                                      </Typography>
                                    )}
                                    {v?.model_year && (
                                      <Typography variant="caption" color="text.secondary" display="block">
                                        年式: {v.model_year}
                                      </Typography>
                                    )}
                                  </Box>
                                  {selected && <CheckCircleIcon color="primary" fontSize="small" />}
                                </Box>
                              </CardContent>
                            </CardActionArea>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>
                </>
              )}
            </>
          )}

          {/* ── 直接入力モード時のヒント ── */}
          {maintenanceInputMode === "manual" && (
            <Alert severity="info" sx={{ mt: 0.5 }}>
              下の「車両基本情報」欄に対象車両の情報を入力してください。
              受注確定時に顧客の所有車両として自動登録されます。
            </Alert>
          )}
        </Paper>
      )}

      {/* ════════════════════════════════════════
           ② 車両基本情報
         ════════════════════════════════════════ */}
      <SectionLabel>車両基本情報</SectionLabel>

      {/* カテゴリ（単独行） */}
      <Box mb={2}>
        <CategorySelector
          value={currentVehicle.category_id}
          onChange={(id) => updateVehicle("category_id", id)}
          categoryTypes={["vehicle"]}
        />
      </Box>

      {/* 車両名・メーカー・区分 */}
      <Grid container spacing={2} mb={2}>
        <Grid size={{ xs: 12, md: 5 }}>
          <TextField
            fullWidth size="small" label="車両名"
            value={currentVehicle.vehicle_name}
            onChange={(e) => updateVehicle("vehicle_name", e.target.value)}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            select fullWidth size="small" label="メーカー"
            value={currentVehicle.manufacturer ?? ""}
            disabled={!currentVehicle.category_id}
            onChange={(e) =>
              updateVehicle("manufacturer", e.target.value === "" ? null : Number(e.target.value))
            }
          >
            <MenuItem value="">未選択</MenuItem>
            {manufacturers.map((m) => (
              <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <TextField
            select fullWidth size="small" label="区分"
            value={currentVehicle.sale_type || ""}
            onChange={(e) => updateVehicle("sale_type", e.target.value)}
          >
            <MenuItem value="">未選択</MenuItem>
            {SALE_TYPE_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>

      {/* 年式・型式・エンジン・排気量 */}
      <Grid container spacing={2} mb={2}>
        <Grid size={{ xs: 6, md: 3 }}>
          <TextField
            fullWidth size="small" label="年式"
            placeholder="例: 2022"
            value={currentVehicle.model_year}
            onChange={(e) => updateVehicle("model_year", e.target.value)}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <TextField
            fullWidth size="small" label="型式"
            value={currentVehicle.model_code}
            onChange={(e) => updateVehicle("model_code", e.target.value)}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <TextField
            fullWidth size="small" label="原動型"
            value={currentVehicle.engine_type}
            onChange={(e) => updateVehicle("engine_type", e.target.value)}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <TextField
            fullWidth size="small" type="number" label="排気量"
            value={currentVehicle.displacement ?? ""}
            InputProps={{
              endAdornment: <InputAdornment position="end">cc</InputAdornment>,
            }}
            onChange={(e) =>
              updateVehicle("displacement", e.target.value === "" ? null : Number(e.target.value))
            }
          />
        </Grid>
      </Grid>

      {/* 車台番号・カラー */}
      <Grid container spacing={2} mb={1}>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            fullWidth size="small" label="車台番号"
            value={currentVehicle.chassis_no}
            error={!!chassisError}
            helperText={chassisError}
            onChange={(e) => updateVehicle("chassis_no", e.target.value)}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <TextField
            select fullWidth size="small" label="カラー"
            value={
              currentVehicle.color ??
              colors.find((c) => c.name === currentVehicle.color_name)?.id ?? ""
            }
            onChange={(e) =>
              updateVehicle("color", e.target.value === "" ? null : Number(e.target.value))
            }
          >
            <MenuItem value="">未選択</MenuItem>
            {colors.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <TextField
            fullWidth size="small" label="カラー名"
            value={currentVehicle.color_name}
            onChange={(e) => updateVehicle("color_name", e.target.value)}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <TextField
            fullWidth size="small" label="カラーコード"
            placeholder="例: #FFFFFF"
            value={currentVehicle.color_code}
            onChange={(e) => updateVehicle("color_code", e.target.value)}
          />
        </Grid>
      </Grid>

      {/* ════════════════════════════════════════
           ③ 登録情報・任意保険（saleのみ）
         ════════════════════════════════════════ */}
      {vehicleMode === "sale" && (
        <>
          <Divider sx={{ my: 3 }} />
          <SectionLabel>登録情報</SectionLabel>

          {/* 登録地域・ナンバープレート・型認番号 */}
          <Grid container spacing={2} mb={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth size="small" label="登録地域"
                value={reg0.registration_area || ""}
                onChange={(e) => updateReg("registration_area", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth size="small" label="ナンバープレート"
                value={reg0.registration_no || ""}
                onChange={(e) => updateReg("registration_no", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth size="small" label="型認番号"
                value={reg0.certification_no || ""}
                onChange={(e) => updateReg("certification_no", e.target.value)}
              />
            </Grid>
          </Grid>

          {/* 初年度登録・車検満了日 */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={1}>
            <Box flex={1}>
              <JaMonthPicker
                label="初年度登録"
                value={reg0.first_registration_date || null}
                onChange={(v) => updateReg("first_registration_date", v)}
              />
            </Box>
            <Box flex={1}>
              <JaDatePicker
                label="車検満了日"
                value={reg0.inspection_expiration || null}
                onChange={(v) => updateReg("inspection_expiration", v)}
              />
            </Box>
          </Stack>

          <Divider sx={{ my: 3 }} />

          {/* ── 任意保険 ── */}
          <SectionLabel>任意保険</SectionLabel>
          <Grid container spacing={2} mb={1}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth size="small" label="保険会社"
                value={insurance?.company_name || ""}
                onChange={(e) => updateInsurance("company_name", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <TextField
                fullWidth size="small" label="対人賠償"
                value={insurance?.bodily_injury || ""}
                onChange={(e) => updateInsurance("bodily_injury", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <TextField
                fullWidth size="small" label="対物賠償"
                value={insurance?.property_damage || ""}
                onChange={(e) => updateInsurance("property_damage", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <TextField
                fullWidth size="small" label="搭乗者傷害"
                value={insurance?.passenger || ""}
                onChange={(e) => updateInsurance("passenger", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <TextField
                fullWidth size="small" label="車両保険"
                value={insurance?.vehicle || ""}
                onChange={(e) => updateInsurance("vehicle", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth size="small" multiline rows={2} label="オプション・特記事項"
                value={insurance?.option || ""}
                onChange={(e) => updateInsurance("option", e.target.value)}
              />
            </Grid>
          </Grid>
        </>
      )}

      {/* ════════════════════════════════════════
           ④ 車両価格（saleのみ）
         ════════════════════════════════════════ */}
      {vehicleMode === "sale" && (
        <>
          <Divider sx={{ my: 3 }} />
          <SectionLabel>車両価格</SectionLabel>
          <Grid container spacing={2} mb={1}>
            <Grid size={{ xs: 12, sm: 5 }}>
              <CurrencyField
                label="車両本体価格（税込）"
                value={currentVehicle.unit_price || 0}
                onChange={(v) => updateVehicle("unit_price", v === "" ? 0 : v)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <CurrencyField
                label="値引き"
                value={currentVehicle.discount ?? 0}
                onChange={(v) => updateVehicle("discount", v === "" ? 0 : v)}
              />
            </Grid>
            {(currentVehicle.unit_price > 0) && (
              <Grid size={{ xs: 12 }}>
                <Typography variant="body2" color="text.secondary">
                  本体価格（税込・値引後）:{" "}
                  <strong>
                    ¥{(currentVehicle.unit_price - (currentVehicle.discount ?? 0)).toLocaleString()}
                  </strong>
                </Typography>
              </Grid>
            )}
          </Grid>
        </>
      )}

      {/* ════════════════════════════════════════
           ⑤ 納車予定（saleのみ）
         ════════════════════════════════════════ */}
      {vehicleMode === "sale" && (
        <>
          <Divider sx={{ my: 3 }} />
          <SectionLabel>納車予定</SectionLabel>

          {/* 納車日・時刻 を横並び */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={2} alignItems="flex-start">
            <Box sx={{ minWidth: 180, flex: 1, maxWidth: 240 }}>
              <JaDatePicker
                label="納車日"
                value={deliveryDateStr}
                onChange={handleDeliveryDate}
              />
            </Box>
            <TextField
              size="small"
              type="time"
              label="納車時刻"
              value={deliveryTimeStr}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 140 }}
              onChange={(e) => handleDeliveryTime(e.target.value)}
            />
          </Stack>

          {/* 納車方法・店舗 */}
          <Grid container spacing={2} mb={1}>
            <Grid size={{ xs: 12, md: 5 }}>
              <TextField
                fullWidth size="small" label="納車方法"
                placeholder="例: 店頭引渡し、自宅配達 など"
                value={schedule?.delivery_method || ""}
                onChange={(e) =>
                  dispatch({ type: "SET_SCHEDULE", payload: { delivery_method: e.target.value } })
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>納車店舗</InputLabel>
                <Select
                  label="納車店舗"
                  value={schedule?.delivery_shop ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    dispatch({
                      type: "SET_SCHEDULE",
                      payload: { delivery_shop: val === "" ? null : Number(val) },
                    });
                  }}
                >
                  <MenuItem value="">未選択</MenuItem>
                  {shops.map((s) => (
                    <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth size="small" multiline rows={2} label="備考"
                value={schedule?.description || ""}
                onChange={(e) =>
                  dispatch({ type: "SET_SCHEDULE", payload: { description: e.target.value } })
                }
              />
            </Grid>
          </Grid>
        </>
      )}

      {/* ════════════════════════════════════════
           ⑥ 下取り車両（saleのみ）
         ════════════════════════════════════════ */}
      {vehicleMode === "sale" && (
        <>
          <Divider sx={{ my: 3 }} />
          <SectionLabel>下取り車両（任意）</SectionLabel>

          {/* 車両名・メーカー */}
          <Grid container spacing={2} mb={2}>
            <Grid size={{ xs: 12, md: 7 }}>
              <TextField
                fullWidth size="small" label="車両名"
                value={currentTradeIn.vehicle_name}
                onChange={(e) => updateTradeIn("vehicle_name", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <TextField
                select fullWidth size="small" label="メーカー"
                value={currentTradeIn.manufacturer ?? ""}
                onChange={(e) =>
                  updateTradeIn("manufacturer", e.target.value === "" ? null : Number(e.target.value))
                }
              >
                <MenuItem value="">未選択</MenuItem>
                {manufacturers.map((m) => (
                  <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          {/* 区分・年式・型式・車台番号 */}
          <Grid container spacing={2} mb={2}>
            <Grid size={{ xs: 6, md: 3 }}>
              <TextField
                select fullWidth size="small" label="区分"
                value={currentTradeIn.sale_type || ""}
                onChange={(e) => updateTradeIn("sale_type", e.target.value)}
              >
                <MenuItem value="">未選択</MenuItem>
                {SALE_TYPE_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <TextField
                fullWidth size="small" label="年式"
                value={currentTradeIn.model_year}
                onChange={(e) => updateTradeIn("model_year", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <TextField
                fullWidth size="small" label="型式"
                value={currentTradeIn.model_code}
                onChange={(e) => updateTradeIn("model_code", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 4 }}>
              <TextField
                fullWidth size="small" label="車台番号"
                value={currentTradeIn.chassis_no}
                onChange={(e) => updateTradeIn("chassis_no", e.target.value)}
              />
            </Grid>
          </Grid>

          {/* 登録地域・ナンバープレート */}
          <Grid container spacing={2} mb={2}>
            <Grid size={{ xs: 6, md: 4 }}>
              <TextField
                fullWidth size="small" label="登録地域"
                value={tradeReg0.registration_area || ""}
                onChange={(e) => updateTradeReg("registration_area", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 4 }}>
              <TextField
                fullWidth size="small" label="ナンバープレート"
                value={tradeReg0.registration_no || ""}
                onChange={(e) => updateTradeReg("registration_no", e.target.value)}
              />
            </Grid>
          </Grid>

          {/* 車検満了日 */}
          <Box sx={{ maxWidth: 240 }}>
            <JaDatePicker
              label="車検満了日"
              value={tradeReg0.inspection_expiration || null}
              onChange={(v) => updateTradeReg("inspection_expiration", v)}
            />
          </Box>
        </>
      )}
    </Box>
  );
}
