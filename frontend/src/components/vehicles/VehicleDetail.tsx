"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Box,
  CircularProgress,
  Divider,
  Button,
  TextField,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from "@mui/material";

import { SelectChangeEvent } from "@mui/material/Select";

import apiClient from "@/lib/apiClient";

type Props = {
  customerId: number;
  vehicleId: number; // ← customer_vehicle_id（重要）
};

type IdName = { id: number; name: string };

const toArray = (res: any) =>
  Array.isArray(res?.data) ? res.data : res?.data?.results ?? res?.data ?? [];

const blankToNull = (v: any) => {
  if (v == null) return null;
  if (typeof v !== "string") return v;
  const t = v.trim();
  return t === "" ? null : t;
};

export default function VehicleDetail({ customerId, vehicleId }: Props) {
  const [loading, setLoading] = useState(true);
  const [loadingMasters, setLoadingMasters] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // ===== fetched detail =====
  const [data, setData] = useState<any>(null); // customer_vehicle detail
  const [vehiclePk, setVehiclePk] = useState<number | null>(null); // Vehicle.id

  // ===== masters =====
  const [manufacturers, setManufacturers] = useState<IdName[]>([]);
  const [categories, setCategories] = useState<IdName[]>([]); // VehicleCategory master
  const [colors, setColors] = useState<IdName[]>([]);

  // ===== forms (省略なし) =====
  const [formOwnership, setFormOwnership] = useState<any>({
    owned_from: "",
    owned_to: "",
  });

  const [formVehicle, setFormVehicle] = useState<any>({
    vehicle_name: "",
    displacement: "",
    model_year: "",
    new_car_type: "",
    manufacturer: null,
    category: null,
    color: null,
    model_code: "",
    chassis_no: "",
    color_name: "",
    color_code: "",
    engine_type: "",
  });

  const [formRegistration, setFormRegistration] = useState<any>({
    id: null,
    registration_area: "",
    registration_no: "",
    certification_no: "",
    inspection_expiration: "",
    first_registration_date: "",
    security_registration: "",
    effective_from: "",
    effective_to: "",
  });

  const [formInsurance, setFormInsurance] = useState<any>({
    id: null,
    type: "",
    company: "",
    start_date: "",
    end_date: "",
    policy_no: "",
  });

  const [formWarranty, setFormWarranty] = useState<any>({
    id: null,
    start_date: "",
    end_date: "",
    plan_name: "",
    note: "",
  });

  const setField =
    (setter: React.Dispatch<React.SetStateAction<any>>, key: string) =>
    (
      e:
        | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
        | SelectChangeEvent
    ) => {
      const value = e.target.value;

      setter((prev: any) => ({
        ...prev,
        [key]: value,
      }));
    };

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);
    try {
    
      const res = await apiClient.get(`/customers/${customerId}/vehicles/${vehicleId}/`);
      const cv = res.data;

      setData(cv);

      const v = cv?.vehicle ?? null;
      const vpk = v?.id ?? null;
      setVehiclePk(vpk);

      // ownership
      setFormOwnership({
        owned_from: cv?.owned_from ?? "",
        owned_to: cv?.owned_to ?? "",
      });

      // vehicle (VehicleWriteSerializer が想定する形に寄せる)
      setFormVehicle({
        vehicle_name: v?.vehicle_name ?? "",
        displacement: v?.displacement ?? "",
        model_year: v?.model_year ?? "",
        new_car_type: v?.new_car_type ?? "",
        manufacturer: v?.manufacturer?.id ?? v?.manufacturer ?? null,
        category: v?.category?.id ?? v?.category ?? null,
        color: v?.color?.id ?? v?.color ?? null,
        model_code: v?.model_code ?? "",
        chassis_no: v?.chassis_no ?? "",
        color_name: v?.color_name ?? "",
        color_code: v?.color_code ?? "",
        engine_type: v?.engine_type ?? "",
      });

      // registration/insurance/warranty は「先頭1件」を編集対象にする（省略なしで全項目）
      const r0 = v?.registrations?.[0] ?? null;
      setFormRegistration({
        id: r0?.id ?? null,
        registration_area: r0?.registration_area ?? "",
        registration_no: r0?.registration_no ?? "",
        certification_no: r0?.certification_no ?? "",
        inspection_expiration: r0?.inspection_expiration ?? "",
        first_registration_date: r0?.first_registration_date ?? "",
        security_registration: r0?.security_registration ?? "",
        effective_from: r0?.effective_from ?? "",
        effective_to: r0?.effective_to ?? "",
      });

      const i0 = v?.insurances?.[0] ?? null;
      setFormInsurance({
        id: i0?.id ?? null,
        type: i0?.type ?? "",
        company: i0?.company ?? "",
        start_date: i0?.start_date ?? "",
        end_date: i0?.end_date ?? "",
        policy_no: i0?.policy_no ?? "",
      });

      const w0 = v?.warranties?.[0] ?? null;
      setFormWarranty({
        id: w0?.id ?? null,
        start_date: w0?.start_date ?? "",
        end_date: w0?.end_date ?? "",
        plan_name: w0?.plan_name ?? "",
        note: w0?.note ?? "",
      });
    } catch (e: any) {
      console.error(e);
      setError(e?.response?.data ? JSON.stringify(e.response.data) : "車両取得に失敗しました");
      setData(null);
      setVehiclePk(null);
    } finally {
      setLoading(false);
    }
  };

  const loadMasters = async () => {
    setLoadingMasters(true);
    setError(null);
    try {
      const [mRes, cRes, colRes] = await Promise.all([
        apiClient.get("/masters/manufacturers/"),
        apiClient.get("/masters/vehiclecategories/"),
        apiClient.get("/masters/colors/"),
      ]);
      setManufacturers(toArray(mRes));
      setCategories(toArray(cRes));
      setColors(toArray(colRes));
    } catch (e: any) {
      console.error(e);
      setError(e?.response?.data ? JSON.stringify(e.response.data) : "マスタ取得に失敗しました");
    } finally {
      setLoadingMasters(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, vehicleId]);

  const startEdit = async () => {
    setEditMode(true);
    await loadMasters();
  };

  const cancelEdit = async () => {
    setEditMode(false);
    await fetchDetail(); // いったん元に戻す
  };

  const rowView = (label: string, value: any) => (
    <TableRow>
      <TableCell sx={{ width: 220, fontWeight: "bold" }}>{label}</TableCell>
      <TableCell>{value ?? "-"}</TableCell>
    </TableRow>
  );

  const rowEdit = (label: string, field: any) => (
    <TableRow>
      <TableCell sx={{ width: 220, fontWeight: "bold", verticalAlign: "top", pt: 2 }}>
        {label}
      </TableCell>
      <TableCell sx={{ py: 1 }}>{field}</TableCell>
    </TableRow>
  );

  const canSave = useMemo(() => {
    // 最低限：車種は欲しい（必要なら厳しくしてOK）
    if (!String(formVehicle?.vehicle_name ?? "").trim()) return false;
    return true;
  }, [formVehicle?.vehicle_name]);

  const save = async () => {
    if (!data) return;
    if (!vehiclePk) {
      alert("Vehicle ID が取得できません（APIレスポンス確認）");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // =========================
      // 1) 所有期間（CustomerVehicle）
      // =========================
      await apiClient.patch(`/customers/${customerId}/vehicles/${vehicleId}/`, {
        owned_from: blankToNull(formOwnership.owned_from),
        owned_to: blankToNull(formOwnership.owned_to),
      });

      // =========================
      // 2) 車両基本情報（Vehicle）
      // =========================
      await apiClient.patch(`/vehicles/${vehiclePk}/update/`, {
        vehicle_name: blankToNull(formVehicle.vehicle_name),
        displacement: formVehicle.displacement === "" ? null : Number(formVehicle.displacement),
        model_year: blankToNull(formVehicle.model_year),
        new_car_type: blankToNull(formVehicle.new_car_type),
        manufacturer_id: formVehicle.manufacturer === "" ? null : formVehicle.manufacturer,
        category_id: formVehicle.category === "" ? null : formVehicle.category,
        color_id: formVehicle.color === "" ? null : formVehicle.color,
        model_code: blankToNull(formVehicle.model_code),
        chassis_no: blankToNull(formVehicle.chassis_no),
        color_name: blankToNull(formVehicle.color_name),
        color_code: blankToNull(formVehicle.color_code),
        engine_type: blankToNull(formVehicle.engine_type),
      });

      // =========================
      // 3) 登録情報（VehicleRegistration）
      //   - id があればPATCH
      //   - 無ければPOSTで作ってから保存
      // =========================
      if (formRegistration?.id) {
        await apiClient.patch(`/vehicles/${vehiclePk}/registrations/${formRegistration.id}/`, {
          registration_area: blankToNull(formRegistration.registration_area),
          registration_no: blankToNull(formRegistration.registration_no),
          certification_no: blankToNull(formRegistration.certification_no),
          inspection_expiration: blankToNull(formRegistration.inspection_expiration),
          first_registration_date: blankToNull(formRegistration.first_registration_date),
          security_registration: blankToNull(formRegistration.security_registration),
          effective_from: blankToNull(formRegistration.effective_from),
          effective_to: blankToNull(formRegistration.effective_to),
        });
      } else {
        // 1件目として作成
        const created = await apiClient.post(`/vehicles/${vehiclePk}/registrations/`, {
          registration_area: blankToNull(formRegistration.registration_area),
          registration_no: blankToNull(formRegistration.registration_no),
          certification_no: blankToNull(formRegistration.certification_no),
          inspection_expiration: blankToNull(formRegistration.inspection_expiration),
          first_registration_date: blankToNull(formRegistration.first_registration_date),
          security_registration: blankToNull(formRegistration.security_registration),
          effective_from: blankToNull(formRegistration.effective_from),
          effective_to: blankToNull(formRegistration.effective_to),
        });
        setFormRegistration((p: any) => ({ ...p, id: created?.data?.id ?? null }));
      }

      // =========================
      // 4) 保険（VehicleInsurance）
      // =========================
      if (formInsurance?.id) {
        await apiClient.patch(`/vehicles/${vehiclePk}/insurances/${formInsurance.id}/`, {
          type: blankToNull(formInsurance.type),
          company: blankToNull(formInsurance.company),
          start_date: blankToNull(formInsurance.start_date),
          end_date: blankToNull(formInsurance.end_date),
          policy_no: blankToNull(formInsurance.policy_no),
        });
      } else {
        const created = await apiClient.post(`/vehicles/${vehiclePk}/insurances/`, {
          type: blankToNull(formInsurance.type),
          company: blankToNull(formInsurance.company),
          start_date: blankToNull(formInsurance.start_date),
          end_date: blankToNull(formInsurance.end_date),
          policy_no: blankToNull(formInsurance.policy_no),
        });
        setFormInsurance((p: any) => ({ ...p, id: created?.data?.id ?? null }));
      }

      // =========================
      // 5) 保証（VehicleWarranty）
      // =========================
      if (formWarranty?.id) {
        await apiClient.patch(`/vehicles/${vehiclePk}/warranties/${formWarranty.id}/`, {
          start_date: blankToNull(formWarranty.start_date),
          end_date: blankToNull(formWarranty.end_date),
          plan_name: blankToNull(formWarranty.plan_name),
          note: blankToNull(formWarranty.note),
        });
      } else {
        const created = await apiClient.post(`/vehicles/${vehiclePk}/warranties/`, {
          start_date: blankToNull(formWarranty.start_date),
          end_date: blankToNull(formWarranty.end_date),
          plan_name: blankToNull(formWarranty.plan_name),
          note: blankToNull(formWarranty.note),
        });
        setFormWarranty((p: any) => ({ ...p, id: created?.data?.id ?? null }));
      }

      // 再取得して確定
      await fetchDetail();
      setEditMode(false);
    } catch (e: any) {
      console.error(e);
      setError(e?.response?.data ? JSON.stringify(e.response.data) : "更新に失敗しました");
      alert("更新に失敗しました（コンソールとエラー表示を確認）");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={10}>
        <CircularProgress />
      </Box>
    );
  }

  if (!data) {
    return <Typography>データがありません</Typography>;
  }

  const v = data.vehicle;

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Typography variant="h6">車両詳細</Typography>

        {!editMode ? (
          <Button size="small" variant="outlined" onClick={startEdit}>
            編集
          </Button>
        ) : (
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" onClick={cancelEdit} disabled={saving}>
              キャンセル
            </Button>
            <Button size="small" variant="contained" onClick={save} disabled={saving || !canSave}>
              {saving ? <CircularProgress size={18} /> : "保存"}
            </Button>
          </Stack>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {editMode && loadingMasters ? (
        <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* ================= 基本情報（Vehicle + 所有期間） ================= */}
          <Typography variant="h6" mb={1}>
            車両基本情報
          </Typography>

          <Table size="small">
            <TableBody>
              {!editMode ? (
                <>
                  {rowView("車種", v?.vehicle_name || "-")}
                  {rowView("排気量", v?.displacement != null ? `${v.displacement} cc` : "-")}
                  {rowView("年式", v?.model_year || "-")}
                  {rowView("新車 / 中古", v?.new_car_type || "-")}
                  {rowView("メーカー", v?.manufacturer_name || "-")}
                  {rowView("カテゴリ", v?.category_name || "-")}
                  {rowView("カラー", v?.color_label || "-")}
                  {rowView("カラー名称", v?.color_name || "-")}
                  {rowView("カラーコード", v?.color_code || "-")}
                  {rowView("エンジンタイプ", v?.engine_type || "-")}
                  {rowView("車台番号", v?.chassis_no || "-")}
                  {rowView("型式", v?.model_code || "-")}
                  {rowView("購入日", data?.owned_from || "-")}
                  {rowView("手放し日", data?.owned_to || "-")}
                </>
              ) : (
                <>
                  {rowEdit(
                    "車種（vehicle_name）",
                    <TextField
                      size="small"
                      value={formVehicle.vehicle_name ?? ""}
                      onChange={(e) => setFormVehicle((p: any) => ({ ...p, vehicle_name: e.target.value }))}
                      fullWidth
                    />
                  )}

                  {rowEdit(
                    "排気量（displacement）",
                    <TextField
                      size="small"
                      type="number"
                      value={formVehicle.displacement ?? ""}
                      onChange={(e) => setFormVehicle((p: any) => ({ ...p, displacement: e.target.value }))}
                      fullWidth
                    />
                  )}

                  {rowEdit(
                    "年式（model_year）",
                    <TextField
                      size="small"
                      value={formVehicle.model_year ?? ""}
                      onChange={(e) => setFormVehicle((p: any) => ({ ...p, model_year: e.target.value }))}
                      fullWidth
                    />
                  )}

                  {rowEdit(
                    "新車 / 中古（new_car_type）",
                    <FormControl size="small" fullWidth>
                      <InputLabel id="new-used-label">新車 / 中古</InputLabel>
                      <Select
                        labelId="new-used-label"
                        label="新車 / 中古"
                        value={formVehicle.new_car_type ?? ""}
                        onChange={(e) => setFormVehicle((p: any) => ({ ...p, new_car_type: e.target.value }))}
                      >
                        <MenuItem value="">未選択</MenuItem>
                        <MenuItem value="new">新車</MenuItem>
                        <MenuItem value="used">中古</MenuItem>
                      </Select>
                    </FormControl>
                  )}

                  {rowEdit(
                    "メーカー（manufacturer）",
                    <FormControl size="small" fullWidth>
                      <InputLabel id="manufacturer-label">メーカー</InputLabel>
                      <Select
                        labelId="manufacturer-label"
                        label="メーカー"
                        value={formVehicle.manufacturer ?? ""}
                        onChange={(e) =>
                          setFormVehicle((p: any) => ({
                            ...p,
                            manufacturer: e.target.value === "" ? null : Number(e.target.value),
                          }))
                        }
                      >
                        <MenuItem value="">未選択</MenuItem>
                        {manufacturers.map((m) => (
                          <MenuItem key={m.id} value={m.id}>
                            {m.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}

                  {rowEdit(
                    "カテゴリ（category）",
                    <FormControl size="small" fullWidth>
                      <InputLabel id="category-label">カテゴリ</InputLabel>
                      <Select
                        labelId="category-label"
                        label="カテゴリ"
                        value={formVehicle.category ?? ""}
                        onChange={(e) =>
                          setFormVehicle((p: any) => ({
                            ...p,
                            category: e.target.value === "" ? null : Number(e.target.value),
                          }))
                        }
                      >
                        <MenuItem value="">未選択</MenuItem>
                        {categories.map((c) => (
                          <MenuItem key={c.id} value={c.id}>
                            {c.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}

                  {rowEdit(
                    "カラー（color）",
                    <FormControl size="small" fullWidth>
                      <InputLabel id="color-label">カラー</InputLabel>
                      <Select
                        labelId="color-label"
                        label="カラー"
                        value={formVehicle.color ?? ""}
                        onChange={(e) =>
                          setFormVehicle((p: any) => ({
                            ...p,
                            color: e.target.value === "" ? null : Number(e.target.value),
                          }))
                        }
                      >
                        <MenuItem value="">未選択</MenuItem>
                        {colors.map((c) => (
                          <MenuItem key={c.id} value={c.id}>
                            {c.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}

                  {rowEdit(
                    "カラー名称（color_name）",
                    <TextField
                      size="small"
                      value={formVehicle.color_name ?? ""}
                      onChange={(e) => setFormVehicle((p: any) => ({ ...p, color_name: e.target.value }))}
                      fullWidth
                    />
                  )}

                  {rowEdit(
                    "カラーコード（color_code）",
                    <TextField
                      size="small"
                      value={formVehicle.color_code ?? ""}
                      onChange={(e) => setFormVehicle((p: any) => ({ ...p, color_code: e.target.value }))}
                      fullWidth
                    />
                  )}

                  {rowEdit(
                    "エンジンタイプ（engine_type）",
                    <TextField
                      size="small"
                      value={formVehicle.engine_type ?? ""}
                      onChange={(e) => setFormVehicle((p: any) => ({ ...p, engine_type: e.target.value }))}
                      fullWidth
                    />
                  )}

                  {rowEdit(
                    "車台番号（chassis_no）",
                    <TextField
                      size="small"
                      value={formVehicle.chassis_no ?? ""}
                      onChange={(e) => setFormVehicle((p: any) => ({ ...p, chassis_no: e.target.value }))}
                      fullWidth
                    />
                  )}

                  {rowEdit(
                    "型式（model_code）",
                    <TextField
                      size="small"
                      value={formVehicle.model_code ?? ""}
                      onChange={(e) => setFormVehicle((p: any) => ({ ...p, model_code: e.target.value }))}
                      fullWidth
                    />
                  )}

                  {rowEdit(
                    "購入日（owned_from）",
                    <TextField
                      size="small"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      value={formOwnership.owned_from ?? ""}
                      onChange={(e) => setFormOwnership((p: any) => ({ ...p, owned_from: e.target.value }))}
                      fullWidth
                    />
                  )}

                  {rowEdit(
                    "手放し日（owned_to）",
                    <TextField
                      size="small"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      value={formOwnership.owned_to ?? ""}
                      onChange={(e) => setFormOwnership((p: any) => ({ ...p, owned_to: e.target.value }))}
                      fullWidth
                    />
                  )}
                </>
              )}
            </TableBody>
          </Table>

          <Divider sx={{ my: 3 }} />

          {/* ================= 登録情報（VehicleRegistration） ================= */}
          <Typography variant="h6" mb={1}>
            登録情報
          </Typography>

          <Table size="small">
            <TableBody>
              {!editMode ? (
                <>
                  {rowView("登録地域", v?.registrations?.[0]?.registration_area ?? "-")}
                  {rowView("ナンバー", v?.registrations?.[0]?.registration_no ?? "-")}
                  {rowView("認証番号", v?.registrations?.[0]?.certification_no ?? "-")}
                  {rowView("車検期限", v?.registrations?.[0]?.inspection_expiration ?? "-")}
                  {rowView("初年度登録", v?.registrations?.[0]?.first_registration_date ?? "-")}
                  {rowView("セキュリティ登録", v?.registrations?.[0]?.security_registration ?? "-")}
                  {rowView("有効開始", v?.registrations?.[0]?.effective_from ?? "-")}
                  {rowView("有効終了", v?.registrations?.[0]?.effective_to ?? "-")}
                </>
              ) : (
                <>
                  {rowEdit(
                    "登録地域",
                    <TextField
                      size="small"
                      value={formRegistration.registration_area ?? ""}
                      onChange={setField(setFormRegistration, "registration_area")}
                      fullWidth
                    />
                  )}
                  {rowEdit(
                    "ナンバー",
                    <TextField
                      size="small"
                      value={formRegistration.registration_no ?? ""}
                      onChange={setField(setFormRegistration, "registration_no")}
                      fullWidth
                    />
                  )}
                  {rowEdit(
                    "認証番号",
                    <TextField
                      size="small"
                      value={formRegistration.certification_no ?? ""}
                      onChange={setField(setFormRegistration, "certification_no")}
                      fullWidth
                    />
                  )}
                  {rowEdit(
                    "車検期限",
                    <TextField
                      size="small"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      value={formRegistration.inspection_expiration ?? ""}
                      onChange={setField(setFormRegistration, "inspection_expiration")}
                      fullWidth
                    />
                  )}
                  {rowEdit(
                    "初年度登録",
                    <TextField
                      size="small"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      value={formRegistration.first_registration_date ?? ""}
                      onChange={setField(setFormRegistration, "first_registration_date")}
                      fullWidth
                    />
                  )}
                  {rowEdit(
                    "セキュリティ登録",
                    <TextField
                      size="small"
                      value={formRegistration.security_registration ?? ""}
                      onChange={setField(setFormRegistration, "security_registration")}
                      fullWidth
                    />
                  )}
                  {rowEdit(
                    "有効開始",
                    <TextField
                      size="small"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      value={formRegistration.effective_from ?? ""}
                      onChange={setField(setFormRegistration, "effective_from")}
                      fullWidth
                    />
                  )}
                  {rowEdit(
                    "有効終了",
                    <TextField
                      size="small"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      value={formRegistration.effective_to ?? ""}
                      onChange={setField(setFormRegistration, "effective_to")}
                      fullWidth
                    />
                  )}
                </>
              )}
            </TableBody>
          </Table>

          <Divider sx={{ my: 3 }} />

          {/* ================= 保険情報（VehicleInsurance） ================= */}
          <Typography variant="h6" mb={1}>
            保険情報
          </Typography>

          <Table size="small">
            <TableBody>
              {!editMode ? (
                <>
                  {rowView("種別", v?.insurances?.[0]?.type ?? "-")}
                  {rowView("保険会社", v?.insurances?.[0]?.company ?? "-")}
                  {rowView("開始", v?.insurances?.[0]?.start_date ?? "-")}
                  {rowView("終了日", v?.insurances?.[0]?.end_date ?? "-")}
                  {rowView("証券番号", v?.insurances?.[0]?.policy_no ?? "-")}
                </>
              ) : (
                <>
                  {rowEdit(
                    "保険種別",
                    <FormControl size="small" fullWidth>
                      <InputLabel id="ins-type-label">種別</InputLabel>
                      <Select
                        labelId="ins-type-label"
                        label="種別"
                        value={formInsurance.type ?? ""}
                        onChange={setField(setFormInsurance, "type")}
                      >
                        <MenuItem value="">未選択</MenuItem>
                        <MenuItem value="mandatory">自賠責</MenuItem>
                        <MenuItem value="optional">任意</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                  {rowEdit(
                    "保険会社",
                    <TextField
                      size="small"
                      value={formInsurance.company ?? ""}
                      onChange={setField(setFormInsurance, "company")}
                      fullWidth
                    />
                  )}
                  {rowEdit(
                    "開始日",
                    <TextField
                      size="small"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      value={formInsurance.start_date ?? ""}
                      onChange={setField(setFormInsurance, "start_date")}
                      fullWidth
                    />
                  )}
                  {rowEdit(
                    "終了日",
                    <TextField
                      size="small"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      value={formInsurance.end_date ?? ""}
                      onChange={setField(setFormInsurance, "end_date")}
                      fullWidth
                    />
                  )}
                  {rowEdit(
                    "証券番号",
                    <TextField
                      size="small"
                      value={formInsurance.policy_no ?? ""}
                      onChange={setField(setFormInsurance, "policy_no")}
                      fullWidth
                    />
                  )}
                </>
              )}
            </TableBody>
          </Table>

          <Divider sx={{ my: 3 }} />

          {/* ================= 保証情報（VehicleWarranty） ================= */}
          <Typography variant="h6" mb={1}>
            保証情報
          </Typography>

          <Table size="small">
            <TableBody>
              {!editMode ? (
                <>
                  {rowView("開始日", v?.warranties?.[0]?.start_date ?? "-")}
                  {rowView("終了日", v?.warranties?.[0]?.end_date ?? "-")}
                  {rowView("プラン名", v?.warranties?.[0]?.plan_name ?? "-")}
                  {rowView("メモ", v?.warranties?.[0]?.note ?? "-")}
                </>
              ) : (
                <>
                  {rowEdit(
                    "開始日",
                    <TextField
                      size="small"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      value={formWarranty.start_date ?? ""}
                      onChange={setField(setFormWarranty, "start_date")}
                      fullWidth
                    />
                  )}
                  {rowEdit(
                    "終了日",
                    <TextField
                      size="small"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      value={formWarranty.end_date ?? ""}
                      onChange={setField(setFormWarranty, "end_date")}
                      fullWidth
                    />
                  )}
                  {rowEdit(
                    "プラン名",
                    <TextField
                      size="small"
                      value={formWarranty.plan_name ?? ""}
                      onChange={setField(setFormWarranty, "plan_name")}
                      fullWidth
                    />
                  )}
                  {rowEdit(
                    "メモ",
                    <TextField
                      size="small"
                      multiline
                      rows={3}
                      value={formWarranty.note ?? ""}
                      onChange={setField(setFormWarranty, "note")}
                      fullWidth
                    />
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </>
      )}
    </Paper>
  );
}