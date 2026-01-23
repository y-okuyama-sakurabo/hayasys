"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Box,
  Button,
  TextField,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
} from "@mui/material";
import apiClient from "@/lib/apiClient";

type IdName = { id: number; name: string };
type Staff = { id: number; full_name: string; login_id?: string };

const blankToNull = (v: any) => {
  if (v == null) return null;
  if (typeof v !== "string") return v;
  return v.trim() === "" ? null : v.trim();
};

export default function CustomerInfo({ customer, onUpdated }: any) {
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // masters（編集用）
  const [loadingMasters, setLoadingMasters] = useState(false);
  const [customerClasses, setCustomerClasses] = useState<any[]>([]);
  const [regions, setRegions] = useState<IdName[]>([]);
  const [genders, setGenders] = useState<IdName[]>([]);
  const [staffs, setStaffs] = useState<Staff[]>([]);

  // 編集用フォーム state（customer をコピー）
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    // customer が更新されたらフォームも同期（編集モードじゃない時のみ）
    if (!editMode) setForm(customer ?? {});
  }, [customer, editMode]);

  const rowView = (label: string, value: any) => (
    <TableRow>
      <TableCell sx={{ width: 200, fontWeight: "bold" }}>{label}</TableCell>
      <TableCell>{value || "-"}</TableCell>
    </TableRow>
  );

  const rowEdit = (label: string, field: ReactNode) => (
    <TableRow>
      <TableCell sx={{ width: 200, fontWeight: "bold", verticalAlign: "top", pt: 2 }}>
        {label}
      </TableCell>
      <TableCell sx={{ py: 1 }}>{field}</TableCell>
    </TableRow>
  );

  const loadMasters = async () => {
    setLoadingMasters(true);
    setError(null);
    try {
      const toArray = (res: any) =>
        Array.isArray(res?.data) ? res.data : res?.data?.results ?? res?.data ?? [];

      const [cc, st, rg, gd] = await Promise.all([
        apiClient.get("/masters/customer_classes/"),
        apiClient.get("/masters/staffs/"),
        apiClient.get("/masters/regions/"),
        apiClient.get("/masters/genders/"),
      ]);

      setCustomerClasses(toArray(cc));
      setStaffs(toArray(st));
      setRegions(toArray(rg));
      setGenders(toArray(gd));
    } catch (e: any) {
      setError(
        e?.response?.data
          ? typeof e.response.data === "string"
            ? e.response.data
            : JSON.stringify(e.response.data)
          : "マスタ取得に失敗しました"
      );
    } finally {
      setLoadingMasters(false);
    }
  };

  const startEdit = async () => {
    setForm({
      ...customer,
      // 関連は id にしておく（PrimaryKeyRelatedField 前提）
      customer_class: customer?.customer_class?.id ?? null,
      staff: customer?.staff?.id ?? null,
      region: customer?.region?.id ?? null,
      gender: customer?.gender?.id ?? null,
    });
    setEditMode(true);
    await loadMasters();
  };

  const cancelEdit = () => {
    setError(null);
    setEditMode(false);
    setForm(customer ?? {});
  };

  const setField = (key: string) => (e: any) => {
    setForm((p: any) => ({ ...p, [key]: e.target.value }));
  };

  const canSave = useMemo(() => {
    if (!form?.name?.trim?.()) return false;
    // customer_class は required=True なら必須
    if (form?.customer_class == null || form?.customer_class === "") return false;
    return true;
  }, [form?.name, form?.customer_class]);

  const save = async () => {
    setError(null);

    // PATCH payload を作る（空文字→null、電話/郵便は serializer 側で整形される）
    const payload: any = {
      name: blankToNull(form.name),
      kana: blankToNull(form.kana),
      email: blankToNull(form.email),
      postal_code: blankToNull(form.postal_code),
      address: blankToNull(form.address),
      phone: blankToNull(form.phone),
      mobile_phone: blankToNull(form.mobile_phone),
      company: blankToNull(form.company),
      company_phone: blankToNull(form.company_phone),
      birthdate: blankToNull(form.birthdate),

      customer_class: form.customer_class ?? null,
      staff: form.staff ?? null,
      region: form.region ?? null,
      gender: form.gender ?? null,
    };

    setSaving(true);
    try {
      const res = await apiClient.patch(`/customers/${customer.id}/`, payload);

      // 親で再取得したいなら onUpdated を呼ぶ
      // res.data は DetailSerializer じゃない可能性があるので「親でfetch」が一番安全
      setEditMode(false);
      if (onUpdated) await Promise.resolve(onUpdated());
    } catch (e: any) {
      setError(
        e?.response?.data
          ? typeof e.response.data === "string"
            ? e.response.data
            : JSON.stringify(e.response.data)
          : "更新に失敗しました"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      {/* ヘッダー行 */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Typography variant="h6">顧客詳細</Typography>

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

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {editMode && loadingMasters ? (
        <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      ) : (
        <Table size="small">
          <TableBody>
            {!editMode ? (
              <>
                {rowView("顧客分類", customer.customer_class?.name)}
                {rowView("氏名 / フリガナ", `${customer.name}${customer.kana ? `（${customer.kana}）` : ""}`)}
                {rowView("メール", customer.email)}
                {rowView("電話", customer.phone)}
                {rowView("携帯", customer.mobile_phone)}
                {rowView("郵便番号", customer.postal_code)}
                {rowView("住所", customer.address)}
                {rowView("会社名", customer.company)}
                {rowView("会社電話", customer.company_phone)}
                {rowView("担当スタッフ", customer.staff?.full_name)}
                {rowView("地域", customer.region?.name)}
                {rowView("性別", customer.gender?.name)}
                {rowView("誕生日", customer.birthdate)}
                {/* 初回/最終対応店舗は派生なので表示のみ（編集しない） */}
                {rowView("初回対応店舗", customer.first_shop?.name)}
                {rowView("最終対応店舗", customer.last_shop?.name)}
              </>
            ) : (
              <>
                {rowEdit(
                  "顧客分類（必須）",
                  <FormControl fullWidth size="small">
                    <InputLabel id="cc-label">顧客分類</InputLabel>
                    <Select
                      labelId="cc-label"
                      label="顧客分類"
                      value={form.customer_class ?? ""}
                      onChange={(e) => setForm((p: any) => ({ ...p, customer_class: e.target.value === "" ? null : Number(e.target.value) }))}
                    >
                      <MenuItem value="">未選択</MenuItem>
                      {customerClasses.map((x: any) => (
                        <MenuItem key={x.id} value={x.id}>
                          {x.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                {rowEdit(
                  "氏名（必須）",
                  <TextField size="small" value={form.name ?? ""} onChange={setField("name")} fullWidth />
                )}

                {rowEdit(
                  "フリガナ",
                  <TextField size="small" value={form.kana ?? ""} onChange={setField("kana")} fullWidth />
                )}

                {rowEdit(
                  "メール",
                  <TextField size="small" value={form.email ?? ""} onChange={setField("email")} fullWidth />
                )}

                {rowEdit(
                  "電話",
                  <TextField size="small" value={form.phone ?? ""} onChange={setField("phone")} fullWidth />
                )}

                {rowEdit(
                  "携帯",
                  <TextField size="small" value={form.mobile_phone ?? ""} onChange={setField("mobile_phone")} fullWidth />
                )}

                {rowEdit(
                  "郵便番号",
                  <TextField size="small" value={form.postal_code ?? ""} onChange={setField("postal_code")} fullWidth />
                )}

                {rowEdit(
                  "住所",
                  <TextField size="small" value={form.address ?? ""} onChange={setField("address")} fullWidth />
                )}

                {rowEdit(
                  "会社名",
                  <TextField size="small" value={form.company ?? ""} onChange={setField("company")} fullWidth />
                )}

                {rowEdit(
                  "会社電話",
                  <TextField size="small" value={form.company_phone ?? ""} onChange={setField("company_phone")} fullWidth />
                )}

                {rowEdit(
                  "担当スタッフ",
                  <FormControl fullWidth size="small">
                    <InputLabel id="staff-label">担当スタッフ</InputLabel>
                    <Select
                      labelId="staff-label"
                      label="担当スタッフ"
                      value={form.staff ?? ""}
                      onChange={(e) => setForm((p: any) => ({ ...p, staff: e.target.value === "" ? null : Number(e.target.value) }))}
                    >
                      <MenuItem value="">未選択</MenuItem>
                      {staffs.map((x: any) => (
                        <MenuItem key={x.id} value={x.id}>
                          {x.full_name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                {rowEdit(
                  "地域",
                  <FormControl fullWidth size="small">
                    <InputLabel id="region-label">地域</InputLabel>
                    <Select
                      labelId="region-label"
                      label="地域"
                      value={form.region ?? ""}
                      onChange={(e) => setForm((p: any) => ({ ...p, region: e.target.value === "" ? null : Number(e.target.value) }))}
                    >
                      <MenuItem value="">未選択</MenuItem>
                      {regions.map((x) => (
                        <MenuItem key={x.id} value={x.id}>
                          {x.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                {rowEdit(
                  "性別",
                  <FormControl fullWidth size="small">
                    <InputLabel id="gender-label">性別</InputLabel>
                    <Select
                      labelId="gender-label"
                      label="性別"
                      value={form.gender ?? ""}
                      onChange={(e) => setForm((p: any) => ({ ...p, gender: e.target.value === "" ? null : Number(e.target.value) }))}
                    >
                      <MenuItem value="">未選択</MenuItem>
                      {genders.map((x) => (
                        <MenuItem key={x.id} value={x.id}>
                          {x.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                {rowEdit(
                  "誕生日",
                  <TextField
                    size="small"
                    type="date"
                    value={form.birthdate ?? ""}
                    onChange={setField("birthdate")}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                )}

                {/* 初回/最終は派生なので編集行は作らない */}
                {rowView("初回対応店舗", customer.first_shop?.name)}
                {rowView("最終対応店舗", customer.last_shop?.name)}
              </>
            )}
          </TableBody>
        </Table>
      )}
    </Paper>
  );
}
