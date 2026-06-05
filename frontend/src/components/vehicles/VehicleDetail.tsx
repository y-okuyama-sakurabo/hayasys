"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card, CardContent, Typography, Table, TableBody, TableRow, TableCell,
  Box, CircularProgress, Button, TextField, Stack, FormControl, InputLabel,
  Select, MenuItem, Alert, Chip,
} from "@mui/material";
import EditIcon          from "@mui/icons-material/Edit";
import WarningAmberIcon  from "@mui/icons-material/WarningAmber";
import ErrorOutlineIcon  from "@mui/icons-material/ErrorOutline";
import DirectionsBikeIcon from "@mui/icons-material/DirectionsBike";
import { SelectChangeEvent } from "@mui/material/Select";

import apiClient from "@/lib/apiClient";
import VehicleCategorySelect from "@/components/vehicles/VehicleCategorySelect";
import JaDatePicker from "@/components/common/JaDatePicker";

// ─────────────────────────────────────────────
// 型
// ─────────────────────────────────────────────
type Props = { customerId: number; vehicleId: number };
type IdName = { id: number; name: string };
type EditSection = "vehicle" | "registration" | "insurance" | "warranty" | null;

const toArray = (res: any) =>
  Array.isArray(res?.data) ? res.data : res?.data?.results ?? res?.data ?? [];

const NEW_CAR_TYPE_LABELS: Record<string, string> = {
  new: "新車", used: "中古車", rental_up: "レンタルアップ", consignment: "委託販売",
};
const INS_TYPE_LABELS: Record<string, string> = {
  mandatory: "自賠責", optional: "任意保険",
};

const blankToNull = (v: any) => {
  if (v == null) return null;
  const t = String(v).trim();
  return t === "" ? null : t;
};

// ─────────────────────────────────────────────
// 期限アラートチップ
// ─────────────────────────────────────────────
function ExpiryChip({ date, label }: { date?: string | null; label: string }) {
  if (!date) return null;
  const diff = Math.floor(
    (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (diff < 0)
    return (
      <Chip
        size="small"
        label={`${label}切れ`}
        color="error"
        icon={<ErrorOutlineIcon />}
        sx={{ ml: 1, fontSize: "0.7rem" }}
      />
    );
  if (diff <= 30)
    return (
      <Chip
        size="small"
        label={`${label}まで${diff}日`}
        color="warning"
        icon={<WarningAmberIcon />}
        sx={{ ml: 1, fontSize: "0.7rem" }}
      />
    );
  return null;
}

// ─────────────────────────────────────────────
// セクションCardラッパー
// ─────────────────────────────────────────────
function SectionCard({
  title,
  editing,
  saving,
  canSave = true,
  onEdit,
  onSave,
  onCancel,
  children,
}: {
  title: string;
  editing: boolean;
  saving?: boolean;
  canSave?: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      {/* ヘッダー */}
      <Box
        sx={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider",
          bgcolor: "grey.50",
        }}
      >
        <Typography variant="subtitle1" fontWeight="bold">{title}</Typography>
        {!editing ? (
          <Button size="small" startIcon={<EditIcon />} onClick={onEdit}>編集</Button>
        ) : (
          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={onCancel} disabled={saving}>キャンセル</Button>
            <Button
              size="small" variant="contained"
              onClick={onSave} disabled={saving || !canSave}
            >
              {saving ? <CircularProgress size={16} /> : "保存"}
            </Button>
          </Stack>
        )}
      </Box>

      <CardContent sx={{ p: 0 }}>{children}</CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────
// 表示行 / 編集行
// ─────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <TableRow>
      <TableCell
        sx={{ width: 140, color: "text.secondary", fontSize: "0.8rem",
              borderBottom: "1px solid", borderColor: "divider", py: 1, px: 2 }}
      >
        {label}
      </TableCell>
      <TableCell
        sx={{ borderBottom: "1px solid", borderColor: "divider", py: 1, px: 2,
              color: value ? "text.primary" : "text.disabled" }}
      >
        {value ?? "-"}
      </TableCell>
    </TableRow>
  );
}

function EditRow({ label, field }: { label: string; field: React.ReactNode }) {
  return (
    <TableRow>
      <TableCell
        sx={{ width: 140, color: "text.secondary", fontSize: "0.8rem",
              borderBottom: "1px solid", borderColor: "divider",
              py: 1, px: 2, verticalAlign: "middle" }}
      >
        {label}
      </TableCell>
      <TableCell sx={{ borderBottom: "1px solid", borderColor: "divider", py: 1, px: 2 }}>
        {field}
      </TableCell>
    </TableRow>
  );
}

// ─────────────────────────────────────────────
// メイン
// ─────────────────────────────────────────────
export default function VehicleDetail({ customerId, vehicleId }: Props) {
  const [loading, setLoading]       = useState(true);
  const [loadingMasters, setLoadingMasters] = useState(false);
  const [savingSection, setSavingSection]   = useState<EditSection>(null);
  const [editSection, setEditSection]       = useState<EditSection>(null);
  const [error, setError]           = useState<string | null>(null);

  const [data, setData]             = useState<any>(null);
  const [vehiclePk, setVehiclePk]   = useState<number | null>(null);

  // マスタ
  const [manufacturers, setManufacturers] = useState<IdName[]>([]);
  const [colors, setColors]               = useState<IdName[]>([]);

  // フォーム
  const [formVehicle, setFormVehicle] = useState<any>({
    vehicle_name: "", displacement: "", model_year: "", new_car_type: "",
    manufacturer: null, category: null, color: null,
    model_code: "", chassis_no: "", color_name: "", color_code: "", engine_type: "",
    owned_from: "", owned_to: "",
  });

  const [formRegistration, setFormRegistration] = useState<any>({
    id: null, registration_area: "", registration_no: "", certification_no: "",
    inspection_expiration: "", first_registration_date: "",
    security_registration: "", effective_from: "", effective_to: "",
  });

  const [formInsurance, setFormInsurance] = useState<any>({
    id: null, type: "", company: "", start_date: "", end_date: "", policy_no: "",
  });

  const [formWarranty, setFormWarranty] = useState<any>({
    id: null, start_date: "", end_date: "", plan_name: "", note: "",
  });

  // ─── データ取得 ───────────────────────────
  const fetchDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/customers/${customerId}/vehicles/${vehicleId}/`);
      const cv  = res.data;
      setData(cv);

      const v   = cv?.vehicle ?? null;
      const vpk = v?.id ?? null;
      setVehiclePk(vpk);

      const r0 = v?.registrations?.[0] ?? null;
      const i0 = v?.insurances?.[0]    ?? null;
      const w0 = v?.warranties?.[0]    ?? null;

      setFormVehicle({
        vehicle_name: v?.vehicle_name ?? "",
        displacement: v?.displacement ?? "",
        model_year:   v?.model_year   ?? "",
        new_car_type: v?.new_car_type ?? "",
        manufacturer: v?.manufacturer_id ?? null,
        category:     v?.category_id     ?? null,
        color:        v?.color_id        ?? null,
        model_code:   v?.model_code  ?? "",
        chassis_no:   v?.chassis_no  ?? "",
        color_name:   v?.color_name  ?? "",
        color_code:   v?.color_code  ?? "",
        engine_type:  v?.engine_type ?? "",
        owned_from:   cv?.owned_from ?? "",
        owned_to:     cv?.owned_to   ?? "",
      });

      setFormRegistration({
        id: r0?.id ?? null,
        registration_area:       r0?.registration_area       ?? "",
        registration_no:         r0?.registration_no         ?? "",
        certification_no:        r0?.certification_no        ?? "",
        inspection_expiration:   r0?.inspection_expiration   ?? "",
        first_registration_date: r0?.first_registration_date ?? "",
        security_registration:   r0?.security_registration   ?? "",
        effective_from:          r0?.effective_from          ?? "",
        effective_to:            r0?.effective_to            ?? "",
      });

      setFormInsurance({
        id: i0?.id ?? null,
        type: i0?.type ?? "", company: i0?.company ?? "",
        start_date: i0?.start_date ?? "", end_date: i0?.end_date ?? "",
        policy_no: i0?.policy_no ?? "",
      });

      setFormWarranty({
        id: w0?.id ?? null,
        start_date: w0?.start_date ?? "", end_date: w0?.end_date ?? "",
        plan_name:  w0?.plan_name  ?? "", note: w0?.note ?? "",
      });
    } catch (e: any) {
      setError(e?.response?.data ? JSON.stringify(e.response.data) : "車両取得に失敗しました");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const loadMasters = async () => {
    if (manufacturers.length > 0) return; // キャッシュ済み
    setLoadingMasters(true);
    try {
      const [mRes, colRes] = await Promise.all([
        apiClient.get("/masters/manufacturers/"),
        apiClient.get("/masters/colors/"),
      ]);
      setManufacturers(toArray(mRes));
      setColors(toArray(colRes));
    } finally {
      setLoadingMasters(false);
    }
  };

  useEffect(() => { fetchDetail(); }, [customerId, vehicleId]);

  const startEdit = async (section: EditSection) => {
    await loadMasters();
    setEditSection(section);
  };

  const cancelEdit = async () => {
    setEditSection(null);
    await fetchDetail();
  };

  // ─── セクション別保存 ───────────────────────
  const saveVehicle = async () => {
    if (!vehiclePk) return;
    setSavingSection("vehicle");
    setError(null);
    try {
      await apiClient.patch(`/customers/${customerId}/vehicles/${vehicleId}/`, {
        owned_from: blankToNull(formVehicle.owned_from),
        owned_to:   blankToNull(formVehicle.owned_to),
      });
      await apiClient.patch(`/vehicles/${vehiclePk}/update/`, {
        vehicle_name:    blankToNull(formVehicle.vehicle_name),
        displacement:    formVehicle.displacement === "" ? null : Number(formVehicle.displacement),
        model_year:      blankToNull(formVehicle.model_year),
        new_car_type:    blankToNull(formVehicle.new_car_type),
        manufacturer_id: formVehicle.manufacturer === "" ? null : formVehicle.manufacturer,
        category_id:     formVehicle.category     === "" ? null : formVehicle.category,
        color_id:        formVehicle.color        === "" ? null : formVehicle.color,
        model_code:      blankToNull(formVehicle.model_code),
        chassis_no:      blankToNull(formVehicle.chassis_no),
        color_name:      blankToNull(formVehicle.color_name),
        color_code:      blankToNull(formVehicle.color_code),
        engine_type:     blankToNull(formVehicle.engine_type),
      });
      await fetchDetail();
      setEditSection(null);
    } catch (e: any) {
      setError(e?.response?.data ? JSON.stringify(e.response.data) : "保存に失敗しました");
    } finally {
      setSavingSection(null);
    }
  };

  const saveRegistration = async () => {
    if (!vehiclePk) return;
    setSavingSection("registration");
    setError(null);
    try {
      const payload = {
        registration_area:       blankToNull(formRegistration.registration_area),
        registration_no:         blankToNull(formRegistration.registration_no),
        certification_no:        blankToNull(formRegistration.certification_no),
        inspection_expiration:   blankToNull(formRegistration.inspection_expiration),
        first_registration_date: blankToNull(formRegistration.first_registration_date),
        security_registration:   blankToNull(formRegistration.security_registration),
        effective_from:          blankToNull(formRegistration.effective_from),
        effective_to:            blankToNull(formRegistration.effective_to),
      };
      if (formRegistration.id) {
        await apiClient.patch(`/vehicles/${vehiclePk}/registrations/${formRegistration.id}/`, payload);
      } else {
        const created = await apiClient.post(`/vehicles/${vehiclePk}/registrations/`, payload);
        setFormRegistration((p: any) => ({ ...p, id: created?.data?.id ?? null }));
      }
      await fetchDetail();
      setEditSection(null);
    } catch (e: any) {
      setError(e?.response?.data ? JSON.stringify(e.response.data) : "保存に失敗しました");
    } finally {
      setSavingSection(null);
    }
  };

  const saveInsurance = async () => {
    if (!vehiclePk) return;
    setSavingSection("insurance");
    setError(null);
    try {
      const payload = {
        type:       blankToNull(formInsurance.type),
        company:    blankToNull(formInsurance.company),
        start_date: blankToNull(formInsurance.start_date),
        end_date:   blankToNull(formInsurance.end_date),
        policy_no:  blankToNull(formInsurance.policy_no),
      };
      if (formInsurance.id) {
        await apiClient.patch(`/vehicles/${vehiclePk}/insurances/${formInsurance.id}/`, payload);
      } else {
        const created = await apiClient.post(`/vehicles/${vehiclePk}/insurances/`, payload);
        setFormInsurance((p: any) => ({ ...p, id: created?.data?.id ?? null }));
      }
      await fetchDetail();
      setEditSection(null);
    } catch (e: any) {
      setError(e?.response?.data ? JSON.stringify(e.response.data) : "保存に失敗しました");
    } finally {
      setSavingSection(null);
    }
  };

  const saveWarranty = async () => {
    if (!vehiclePk) return;
    setSavingSection("warranty");
    setError(null);
    try {
      const payload = {
        start_date: blankToNull(formWarranty.start_date),
        end_date:   blankToNull(formWarranty.end_date),
        plan_name:  blankToNull(formWarranty.plan_name),
        note:       blankToNull(formWarranty.note),
      };
      if (formWarranty.id) {
        await apiClient.patch(`/vehicles/${vehiclePk}/warranties/${formWarranty.id}/`, payload);
      } else {
        const created = await apiClient.post(`/vehicles/${vehiclePk}/warranties/`, payload);
        setFormWarranty((p: any) => ({ ...p, id: created?.data?.id ?? null }));
      }
      await fetchDetail();
      setEditSection(null);
    } catch (e: any) {
      setError(e?.response?.data ? JSON.stringify(e.response.data) : "保存に失敗しました");
    } finally {
      setSavingSection(null);
    }
  };

  const canSaveVehicle = useMemo(
    () => String(formVehicle?.vehicle_name ?? "").trim() !== "",
    [formVehicle?.vehicle_name]
  );

  // ─── ローディング ─────────────────────────
  if (loading) return (
    <Box display="flex" justifyContent="center" mt={10}><CircularProgress /></Box>
  );
  if (!data) return <Typography>データがありません</Typography>;

  const v  = data.vehicle;
  const r0 = v?.registrations?.[0];
  const i0 = v?.insurances?.[0];
  const w0 = v?.warranties?.[0];

  const isEditing = (s: EditSection) => editSection === s;
  const isSaving  = (s: EditSection) => savingSection === s;

  return (
    <Box>
      {/* ── ページヘッダー ── */}
      <Box
        sx={{
          display: "flex", alignItems: "center", gap: 1.5,
          mb: 3, p: 2.5, bgcolor: "primary.main", borderRadius: 2, color: "#fff",
        }}
      >
        <DirectionsBikeIcon sx={{ fontSize: 36 }} />
        <Box>
          <Typography variant="h6" fontWeight="bold" lineHeight={1.2}>
            {v?.vehicle_name || "（車種未設定）"}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.85 }}>
            {[
              v?.manufacturer_name,
              v?.model_year ? `${v.model_year}年式` : null,
              NEW_CAR_TYPE_LABELS[v?.new_car_type] ?? null,
              v?.category_name,
            ].filter(Boolean).join("　／　") || ""}
          </Typography>
        </Box>

        {/* 期限アラートチップ */}
        <Box sx={{ ml: "auto", display: "flex", gap: 1, flexWrap: "wrap" }}>
          <ExpiryChip date={r0?.inspection_expiration} label="車検" />
          <ExpiryChip date={i0?.end_date} label="保険" />
          <ExpiryChip date={w0?.end_date} label="保証" />
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>
      )}

      {/* ── 上段：車両基本情報 ／ 登録情報 ── */}
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mb: 2 }}>

        {/* 車両基本情報 */}
        <SectionCard
          title="車両基本情報"
          editing={isEditing("vehicle")}
          saving={isSaving("vehicle")}
          canSave={canSaveVehicle}
          onEdit={() => startEdit("vehicle")}
          onSave={saveVehicle}
          onCancel={cancelEdit}
        >
          {loadingMasters && isEditing("vehicle") ? (
            <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
          ) : (
            <Table size="small">
              <TableBody>
                {!isEditing("vehicle") ? (
                  <>
                    <InfoRow label="車種"        value={v?.vehicle_name} />
                    <InfoRow label="排気量"      value={v?.displacement != null ? `${v.displacement} cc` : undefined} />
                    <InfoRow label="年式"        value={v?.model_year} />
                    <InfoRow label="新車 / 中古" value={NEW_CAR_TYPE_LABELS[v?.new_car_type] ?? v?.new_car_type} />
                    <InfoRow label="メーカー"    value={v?.manufacturer_name} />
                    <InfoRow label="カテゴリ"    value={v?.category_name} />
                    <InfoRow label="カラー"      value={v?.color_label} />
                    <InfoRow label="カラー名称"  value={v?.color_name} />
                    <InfoRow label="カラーコード" value={v?.color_code} />
                    <InfoRow label="エンジン形式" value={v?.engine_type} />
                    <InfoRow label="車台番号"    value={v?.chassis_no} />
                    <InfoRow label="型式"        value={v?.model_code} />
                    <InfoRow label="購入日"      value={data?.owned_from} />
                    <InfoRow label="手放し日"    value={data?.owned_to} />
                  </>
                ) : (
                  <>
                    <EditRow label="車種" field={
                      <TextField size="small" fullWidth
                        value={formVehicle.vehicle_name ?? ""}
                        onChange={e => setFormVehicle((p: any) => ({ ...p, vehicle_name: e.target.value }))} />
                    } />
                    <EditRow label="排気量 (cc)" field={
                      <TextField size="small" fullWidth type="number"
                        value={formVehicle.displacement ?? ""}
                        onChange={e => setFormVehicle((p: any) => ({ ...p, displacement: e.target.value }))} />
                    } />
                    <EditRow label="年式" field={
                      <TextField size="small" fullWidth
                        value={formVehicle.model_year ?? ""}
                        onChange={e => setFormVehicle((p: any) => ({ ...p, model_year: e.target.value }))} />
                    } />
                    <EditRow label="新車 / 中古区分" field={
                      <FormControl size="small" fullWidth>
                        <Select value={formVehicle.new_car_type ?? ""}
                          onChange={e => setFormVehicle((p: any) => ({ ...p, new_car_type: e.target.value }))}>
                          <MenuItem value="">未選択</MenuItem>
                          <MenuItem value="new">新車</MenuItem>
                          <MenuItem value="used">中古車</MenuItem>
                          <MenuItem value="rental_up">レンタルアップ</MenuItem>
                          <MenuItem value="consignment">委託販売</MenuItem>
                        </Select>
                      </FormControl>
                    } />
                    <EditRow label="メーカー" field={
                      <FormControl size="small" fullWidth>
                        <Select value={formVehicle.manufacturer != null ? String(formVehicle.manufacturer) : ""}
                          onChange={e => setFormVehicle((p: any) => ({
                            ...p, manufacturer: e.target.value === "" ? null : Number(e.target.value),
                          }))}>
                          <MenuItem value="">未選択</MenuItem>
                          {manufacturers.map(m => <MenuItem key={m.id} value={String(m.id)}>{m.name}</MenuItem>)}
                        </Select>
                      </FormControl>
                    } />
                    <EditRow label="カテゴリ" field={
                      <VehicleCategorySelect
                        value={formVehicle.category ?? null}
                        onChange={id => setFormVehicle((p: any) => ({ ...p, category: id }))} />
                    } />
                    <EditRow label="カラー" field={
                      <FormControl size="small" fullWidth>
                        <Select value={formVehicle.color != null ? String(formVehicle.color) : ""}
                          onChange={e => setFormVehicle((p: any) => ({
                            ...p, color: e.target.value === "" ? null : Number(e.target.value),
                          }))}>
                          <MenuItem value="">未選択</MenuItem>
                          {colors.map(c => <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>)}
                        </Select>
                      </FormControl>
                    } />
                    <EditRow label="カラー名称" field={
                      <TextField size="small" fullWidth
                        value={formVehicle.color_name ?? ""}
                        onChange={e => setFormVehicle((p: any) => ({ ...p, color_name: e.target.value }))} />
                    } />
                    <EditRow label="カラーコード" field={
                      <TextField size="small" fullWidth
                        value={formVehicle.color_code ?? ""}
                        onChange={e => setFormVehicle((p: any) => ({ ...p, color_code: e.target.value }))} />
                    } />
                    <EditRow label="エンジン形式" field={
                      <TextField size="small" fullWidth
                        value={formVehicle.engine_type ?? ""}
                        onChange={e => setFormVehicle((p: any) => ({ ...p, engine_type: e.target.value }))} />
                    } />
                    <EditRow label="車台番号" field={
                      <TextField size="small" fullWidth
                        value={formVehicle.chassis_no ?? ""}
                        onChange={e => setFormVehicle((p: any) => ({ ...p, chassis_no: e.target.value }))} />
                    } />
                    <EditRow label="型式" field={
                      <TextField size="small" fullWidth
                        value={formVehicle.model_code ?? ""}
                        onChange={e => setFormVehicle((p: any) => ({ ...p, model_code: e.target.value }))} />
                    } />
                    <EditRow label="購入日" field={
                      <JaDatePicker label="購入日"
                        value={formVehicle.owned_from || null}
                        onChange={v => setFormVehicle((p: any) => ({ ...p, owned_from: v ?? "" }))} />
                    } />
                    <EditRow label="手放し日" field={
                      <JaDatePicker label="手放し日"
                        value={formVehicle.owned_to || null}
                        onChange={v => setFormVehicle((p: any) => ({ ...p, owned_to: v ?? "" }))} />
                    } />
                  </>
                )}
              </TableBody>
            </Table>
          )}
        </SectionCard>

        {/* 登録情報 */}
        <SectionCard
          title="登録情報"
          editing={isEditing("registration")}
          saving={isSaving("registration")}
          onEdit={() => startEdit("registration")}
          onSave={saveRegistration}
          onCancel={cancelEdit}
        >
          <Table size="small">
            <TableBody>
              {!isEditing("registration") ? (
                <>
                  <InfoRow label="登録地域"    value={r0?.registration_area} />
                  <InfoRow label="ナンバー"    value={r0?.registration_no} />
                  <InfoRow label="認証番号"    value={r0?.certification_no} />
                  <InfoRow label="車検期限" value={
                    r0?.inspection_expiration
                      ? <Box component="span" sx={{ display: "flex", alignItems: "center" }}>
                          {r0.inspection_expiration}
                          <ExpiryChip date={r0.inspection_expiration} label="車検" />
                        </Box>
                      : undefined
                  } />
                  <InfoRow label="初年度登録"  value={r0?.first_registration_date} />
                  <InfoRow label="セキュリティ登録" value={r0?.security_registration} />
                  <InfoRow label="有効開始"    value={r0?.effective_from} />
                  <InfoRow label="有効終了"    value={r0?.effective_to} />
                </>
              ) : (
                <>
                  <EditRow label="登録地域" field={
                    <TextField size="small" fullWidth value={formRegistration.registration_area ?? ""}
                      onChange={e => setFormRegistration((p: any) => ({ ...p, registration_area: e.target.value }))} />
                  } />
                  <EditRow label="ナンバー" field={
                    <TextField size="small" fullWidth value={formRegistration.registration_no ?? ""}
                      onChange={e => setFormRegistration((p: any) => ({ ...p, registration_no: e.target.value }))} />
                  } />
                  <EditRow label="認証番号" field={
                    <TextField size="small" fullWidth value={formRegistration.certification_no ?? ""}
                      onChange={e => setFormRegistration((p: any) => ({ ...p, certification_no: e.target.value }))} />
                  } />
                  <EditRow label="車検期限" field={
                    <JaDatePicker label="車検期限"
                      value={formRegistration.inspection_expiration || null}
                      onChange={v => setFormRegistration((p: any) => ({ ...p, inspection_expiration: v ?? "" }))} />
                  } />
                  <EditRow label="初年度登録" field={
                    <JaDatePicker label="初年度登録"
                      value={formRegistration.first_registration_date || null}
                      onChange={v => setFormRegistration((p: any) => ({ ...p, first_registration_date: v ?? "" }))} />
                  } />
                  <EditRow label="セキュリティ登録" field={
                    <TextField size="small" fullWidth value={formRegistration.security_registration ?? ""}
                      onChange={e => setFormRegistration((p: any) => ({ ...p, security_registration: e.target.value }))} />
                  } />
                  <EditRow label="有効開始" field={
                    <JaDatePicker label="有効開始"
                      value={formRegistration.effective_from || null}
                      onChange={v => setFormRegistration((p: any) => ({ ...p, effective_from: v ?? "" }))} />
                  } />
                  <EditRow label="有効終了" field={
                    <JaDatePicker label="有効終了"
                      value={formRegistration.effective_to || null}
                      onChange={v => setFormRegistration((p: any) => ({ ...p, effective_to: v ?? "" }))} />
                  } />
                </>
              )}
            </TableBody>
          </Table>
        </SectionCard>
      </Box>

      {/* ── 下段：保険情報 ／ 保証情報 ── */}
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>

        {/* 保険情報 */}
        <SectionCard
          title="保険情報"
          editing={isEditing("insurance")}
          saving={isSaving("insurance")}
          onEdit={() => startEdit("insurance")}
          onSave={saveInsurance}
          onCancel={cancelEdit}
        >
          <Table size="small">
            <TableBody>
              {!isEditing("insurance") ? (
                <>
                  <InfoRow label="種別"   value={INS_TYPE_LABELS[i0?.type ?? ""] ?? i0?.type} />
                  <InfoRow label="保険会社" value={i0?.company} />
                  <InfoRow label="開始日" value={i0?.start_date} />
                  <InfoRow label="終了日" value={
                    i0?.end_date
                      ? <Box component="span" sx={{ display: "flex", alignItems: "center" }}>
                          {i0.end_date}
                          <ExpiryChip date={i0.end_date} label="保険" />
                        </Box>
                      : undefined
                  } />
                  <InfoRow label="証券番号" value={i0?.policy_no} />
                </>
              ) : (
                <>
                  <EditRow label="保険種別" field={
                    <FormControl size="small" fullWidth>
                      <Select value={formInsurance.type ?? ""}
                        onChange={e => setFormInsurance((p: any) => ({ ...p, type: e.target.value }))}>
                        <MenuItem value="">未選択</MenuItem>
                        <MenuItem value="mandatory">自賠責</MenuItem>
                        <MenuItem value="optional">任意</MenuItem>
                      </Select>
                    </FormControl>
                  } />
                  <EditRow label="保険会社" field={
                    <TextField size="small" fullWidth value={formInsurance.company ?? ""}
                      onChange={e => setFormInsurance((p: any) => ({ ...p, company: e.target.value }))} />
                  } />
                  <EditRow label="開始日" field={
                    <JaDatePicker label="開始日"
                      value={formInsurance.start_date || null}
                      onChange={v => setFormInsurance((p: any) => ({ ...p, start_date: v ?? "" }))} />
                  } />
                  <EditRow label="終了日" field={
                    <JaDatePicker label="終了日"
                      value={formInsurance.end_date || null}
                      onChange={v => setFormInsurance((p: any) => ({ ...p, end_date: v ?? "" }))} />
                  } />
                  <EditRow label="証券番号" field={
                    <TextField size="small" fullWidth value={formInsurance.policy_no ?? ""}
                      onChange={e => setFormInsurance((p: any) => ({ ...p, policy_no: e.target.value }))} />
                  } />
                </>
              )}
            </TableBody>
          </Table>
        </SectionCard>

        {/* 保証情報 */}
        <SectionCard
          title="保証情報"
          editing={isEditing("warranty")}
          saving={isSaving("warranty")}
          onEdit={() => startEdit("warranty")}
          onSave={saveWarranty}
          onCancel={cancelEdit}
        >
          <Table size="small">
            <TableBody>
              {!isEditing("warranty") ? (
                <>
                  <InfoRow label="開始日"   value={w0?.start_date} />
                  <InfoRow label="終了日"   value={
                    w0?.end_date
                      ? <Box component="span" sx={{ display: "flex", alignItems: "center" }}>
                          {w0.end_date}
                          <ExpiryChip date={w0.end_date} label="保証" />
                        </Box>
                      : undefined
                  } />
                  <InfoRow label="プラン名" value={w0?.plan_name} />
                  <InfoRow label="メモ"     value={w0?.note} />
                </>
              ) : (
                <>
                  <EditRow label="開始日" field={
                    <JaDatePicker label="開始日"
                      value={formWarranty.start_date || null}
                      onChange={v => setFormWarranty((p: any) => ({ ...p, start_date: v ?? "" }))} />
                  } />
                  <EditRow label="終了日" field={
                    <JaDatePicker label="終了日"
                      value={formWarranty.end_date || null}
                      onChange={v => setFormWarranty((p: any) => ({ ...p, end_date: v ?? "" }))} />
                  } />
                  <EditRow label="プラン名" field={
                    <TextField size="small" fullWidth value={formWarranty.plan_name ?? ""}
                      onChange={e => setFormWarranty((p: any) => ({ ...p, plan_name: e.target.value }))} />
                  } />
                  <EditRow label="メモ" field={
                    <TextField size="small" fullWidth multiline rows={3}
                      value={formWarranty.note ?? ""}
                      onChange={e => setFormWarranty((p: any) => ({ ...p, note: e.target.value }))} />
                  } />
                </>
              )}
            </TableBody>
          </Table>
        </SectionCard>
      </Box>
    </Box>
  );
}
