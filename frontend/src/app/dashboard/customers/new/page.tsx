"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Stack,
  Button,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
} from "@mui/material";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/apiClient";

// ---- 型（必要最低限）----
type CustomerClass = { id: number; code: string; name: string; is_wholesale: boolean };
type Region = { id: number; code: string; name: string };
type Gender = { id: number; code: string; name: string };
type Staff = { id: number; login_id: string; full_name: string };

type CreatePayload = {
  name: string;
  kana?: string | null;
  email?: string | null;
  postal_code?: string | null;
  address?: string | null;
  phone?: string | null;
  mobile_phone?: string | null;
  company?: string | null;
  company_phone?: string | null;
  birthdate?: string | null; // "YYYY-MM-DD"

  customer_class: number | null; // required=True 前提でUIでも必須にする
  staff?: number | null;
  region?: number | null;
  gender?: number | null;

  // vehicles?: any[]  // 今回は一旦なし（必要なら後で追加）
};

const blankToNull = (v: string) => (v.trim() === "" ? null : v.trim());
const toNumberOrNull = (v: any) => (v === "" || v == null ? null : Number(v));

export default function CustomerNewPage() {
  const router = useRouter();

  // ---- masters ----
  const [loadingMasters, setLoadingMasters] = useState(true);
  const [mastersError, setMastersError] = useState<string | null>(null);

  const [customerClasses, setCustomerClasses] = useState<CustomerClass[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [genders, setGenders] = useState<Gender[]>([]);
  const [staffs, setStaffs] = useState<Staff[]>([]);

  // ---- form ----
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<CreatePayload>({
    name: "",
    kana: "",
    email: "",
    postal_code: "",
    address: "",
    phone: "",
    mobile_phone: "",
    company: "",
    company_phone: "",
    birthdate: "",
    customer_class: null,
    staff: null,
    region: null,
    gender: null,
  });

  const toArray = (res: any) =>
    Array.isArray(res?.data) ? res.data : res?.data?.results ?? res?.data ?? [];

  // ============================
  // マスタ取得
  // ============================
  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoadingMasters(true);
      setMastersError(null);

      try {
        const [cc, st, rg, gd] = await Promise.all([
          apiClient.get("/masters/customer_classes/"),
          apiClient.get("/masters/staffs/"),
          apiClient.get("/masters/regions/"),
          apiClient.get("/masters/genders/"),
        ]);

        if (!mounted) return;

        setCustomerClasses(toArray(cc));
        setStaffs(toArray(st));
        setRegions(toArray(rg));
        setGenders(toArray(gd));
      } catch (e: any) {
        if (!mounted) return;
        const msg =
          e?.response?.data
            ? typeof e.response.data === "string"
              ? e.response.data
              : JSON.stringify(e.response.data)
            : "マスタ取得に失敗しました";
        setMastersError(msg);
      } finally {
        if (mounted) setLoadingMasters(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const setField =
    <K extends keyof CreatePayload>(key: K) =>
    (e: any) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
    };

  const canSubmit = useMemo(() => {
    if (!form.name.trim()) return false;
    if (form.customer_class == null) return false;
    return true;
  }, [form.name, form.customer_class]);

  // ============================
  // 登録
  // ============================
  const submit = async () => {
    setError(null);

    if (!form.name.trim()) {
      setError("氏名は必須です");
      return;
    }
    if (form.customer_class == null) {
      setError("顧客区分（customer_class）は必須です");
      return;
    }

    const payload: CreatePayload = {
      name: form.name.trim(),
      kana: blankToNull(String(form.kana ?? "")),
      email: blankToNull(String(form.email ?? "")),
      postal_code: blankToNull(String(form.postal_code ?? "")),
      address: blankToNull(String(form.address ?? "")),
      phone: blankToNull(String(form.phone ?? "")),
      mobile_phone: blankToNull(String(form.mobile_phone ?? "")),
      company: blankToNull(String(form.company ?? "")),
      company_phone: blankToNull(String(form.company_phone ?? "")),
      birthdate: blankToNull(String(form.birthdate ?? "")),

      customer_class: form.customer_class,
      staff: form.staff ?? null,
      region: form.region ?? null,
      gender: form.gender ?? null,
    };

    setSaving(true);
    try {
      const res = await apiClient.post("/customers/", payload);
      // 作成後：詳細へ
      router.push(`/dashboard/customers/${res.data.id}`);
      // もし「一覧へ戻して更新」運用ならこっちでもOK
      // router.push(`/dashboard/customers?_r=${Date.now()}`);
    } catch (e: any) {
      const msg =
        e?.response?.data
          ? typeof e.response.data === "string"
            ? e.response.data
            : JSON.stringify(e.response.data)
          : "作成に失敗しました";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={2}>
        {/* ヘッダ */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
          <Typography variant="h5" fontWeight="bold">
            顧客 新規登録
          </Typography>

          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => router.push("/dashboard/customers")}>
              一覧へ戻る
            </Button>
            <Button variant="contained" onClick={submit} disabled={saving || !canSubmit}>
              {saving ? <CircularProgress size={20} /> : "登録"}
            </Button>
          </Stack>
        </Stack>

        {mastersError && <Alert severity="error">{mastersError}</Alert>}
        {error && <Alert severity="error">{error}</Alert>}

        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            基本情報
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {loadingMasters ? (
            <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
              <CircularProgress />
            </Box>
          ) : (
            <Stack spacing={2}>
              <TextField label="氏名（必須）" value={form.name} onChange={setField("name")} fullWidth />

              <TextField label="フリガナ" value={form.kana ?? ""} onChange={setField("kana")} fullWidth />

              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField label="電話" value={form.phone ?? ""} onChange={setField("phone")} fullWidth />
                <TextField label="携帯" value={form.mobile_phone ?? ""} onChange={setField("mobile_phone")} fullWidth />
              </Stack>

              <TextField label="メール" value={form.email ?? ""} onChange={setField("email")} fullWidth />

              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField label="郵便番号" value={form.postal_code ?? ""} onChange={setField("postal_code")} fullWidth />
                <TextField label="住所" value={form.address ?? ""} onChange={setField("address")} fullWidth />
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField label="会社名" value={form.company ?? ""} onChange={setField("company")} fullWidth />
                <TextField label="会社電話" value={form.company_phone ?? ""} onChange={setField("company_phone")} fullWidth />
              </Stack>

              <TextField
                label="生年月日"
                type="date"
                value={form.birthdate ?? ""}
                onChange={setField("birthdate")}
                InputLabelProps={{ shrink: true }}
              />

              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <FormControl fullWidth>
                  <InputLabel id="customer-class-label">顧客区分（必須）</InputLabel>
                  <Select
                    labelId="customer-class-label"
                    label="顧客区分（必須）"
                    value={form.customer_class ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, customer_class: toNumberOrNull(e.target.value) }))}
                  >
                    <MenuItem value="">未選択</MenuItem>
                    {customerClasses.map((x) => (
                      <MenuItem key={x.id} value={x.id}>
                        {x.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel id="staff-label">担当スタッフ</InputLabel>
                  <Select
                    labelId="staff-label"
                    label="担当スタッフ"
                    value={form.staff ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, staff: toNumberOrNull(e.target.value) }))}
                  >
                    <MenuItem value="">未選択</MenuItem>
                    {staffs.map((x) => (
                      <MenuItem key={x.id} value={x.id}>
                        {x.full_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <FormControl fullWidth>
                  <InputLabel id="region-label">都道府県</InputLabel>
                  <Select
                    labelId="region-label"
                    label="都道府県"
                    value={form.region ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, region: toNumberOrNull(e.target.value) }))}
                  >
                    <MenuItem value="">未選択</MenuItem>
                    {regions.map((x) => (
                      <MenuItem key={x.id} value={x.id}>
                        {x.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel id="gender-label">性別</InputLabel>
                  <Select
                    labelId="gender-label"
                    label="性別"
                    value={form.gender ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, gender: toNumberOrNull(e.target.value) }))}
                  >
                    <MenuItem value="">未選択</MenuItem>
                    {genders.map((x) => (
                      <MenuItem key={x.id} value={x.id}>
                        {x.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </Stack>
          )}
        </Paper>
        
      </Stack>
    </Box>
  );
}
