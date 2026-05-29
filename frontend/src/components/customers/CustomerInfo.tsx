"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Paper, Typography, Box, Button, TextField, Stack,
  FormControl, InputLabel, Select, MenuItem,
  CircularProgress, Alert, Divider,
} from "@mui/material";
import PersonIcon    from "@mui/icons-material/Person";
import PhoneIcon     from "@mui/icons-material/Phone";
import EmailIcon     from "@mui/icons-material/Email";
import HomeIcon      from "@mui/icons-material/Home";
import BusinessIcon  from "@mui/icons-material/Business";
import CakeIcon      from "@mui/icons-material/Cake";
import StoreIcon     from "@mui/icons-material/Store";
import BadgeIcon     from "@mui/icons-material/Badge";
import Grid from "@mui/material/Grid";
import PhoneField from "@/components/ui/PhoneField";
import apiClient from "@/lib/apiClient";

type IdName = { id: number; name: string };

const blankToNull = (v: any) => {
  if (v == null) return null;
  if (typeof v !== "string") return v;
  return v.trim() === "" ? null : v.trim();
};

function InfoRow({
  icon, label, value,
}: {
  icon?: React.ReactNode;
  label: string;
  value?: string | null;
}) {
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, py: 0.75 }}>
      <Box sx={{ color: "text.disabled", mt: 0.1, flexShrink: 0 }}>{icon}</Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" display="block" lineHeight={1.2}>
          {label}
        </Typography>
        <Typography variant="body2" fontWeight={value ? 500 : 400} color={value ? "text.primary" : "text.disabled"}>
          {value || "—"}
        </Typography>
      </Box>
    </Box>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="caption"
      color="text.secondary"
      fontWeight="bold"
      sx={{ textTransform: "uppercase", letterSpacing: 0.8, display: "block", mb: 1 }}
    >
      {children}
    </Typography>
  );
}

export default function CustomerInfo({
  customer, onUpdated, editMode, setEditMode,
}: {
  customer: any;
  onUpdated: () => void;
  editMode: boolean;
  setEditMode: (v: boolean) => void;
}) {
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [loadingMasters, setLoadingMasters] = useState(false);
  const [customerClasses, setCustomerClasses] = useState<any[]>([]);
  const [regions,       setRegions]       = useState<IdName[]>([]);
  const [genders,       setGenders]       = useState<IdName[]>([]);
  const [staffs,        setStaffs]        = useState<any[]>([]);
  const [form,          setForm]          = useState<any>({});

  useEffect(() => {
    if (!editMode) setForm(customer ?? {});
  }, [customer, editMode]);

  const loadMasters = async () => {
    setLoadingMasters(true);
    try {
      const toArray = (res: any) =>
        Array.isArray(res?.data) ? res.data : res?.data?.results ?? [];
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
    } catch {
      setError("マスタ取得に失敗しました");
    } finally {
      setLoadingMasters(false);
    }
  };

  const startEdit = async () => {
    setForm({
      ...customer,
      customer_class: customer?.customer_class?.id ?? null,
      staff:          customer?.staff?.id          ?? null,
      region:         customer?.region?.id         ?? null,
      gender:         customer?.gender?.id         ?? null,
    });
    setEditMode(true);
    await loadMasters();
  };

  const cancelEdit = () => {
    setError(null);
    setEditMode(false);
    setForm(customer ?? {});
  };

  const setField = (key: string) => (e: any) =>
    setForm((p: any) => ({ ...p, [key]: e.target.value }));

  const setSelect = (key: string) => (e: any) =>
    setForm((p: any) => ({ ...p, [key]: e.target.value === "" ? null : Number(e.target.value) }));

  const canSave = useMemo(
    () => !!form?.name?.trim() && (form?.customer_class != null && form?.customer_class !== ""),
    [form?.name, form?.customer_class],
  );

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      await apiClient.patch(`/customers/${customer.id}/`, {
        name:          blankToNull(form.name),
        kana:          blankToNull(form.kana),
        email:         blankToNull(form.email),
        postal_code:   blankToNull(form.postal_code),
        address:       blankToNull(form.address),
        phone:         blankToNull(form.phone),
        mobile_phone:  blankToNull(form.mobile_phone),
        company:       blankToNull(form.company),
        company_phone: blankToNull(form.company_phone),
        birthdate:     blankToNull(form.birthdate),
        customer_class: form.customer_class ?? null,
        staff:          form.staff          ?? null,
        region:         form.region         ?? null,
        gender:         form.gender         ?? null,
      });
      setEditMode(false);
      await onUpdated();
    } catch (e: any) {
      const d = e?.response?.data;
      setError(typeof d === "string" ? d : d ? JSON.stringify(d) : "更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  // ── 閲覧モード ──────────────────────────────
  if (!editMode) {
    return (
      <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="subtitle1" fontWeight="bold">基本情報</Typography>
          <Button size="small" variant="outlined" onClick={startEdit}>編集</Button>
        </Stack>

        <Grid container spacing={3}>
          {/* 左: 基本・連絡先 */}
          <Grid size={{ xs: 12, md: 6 }}>
            <SectionTitle>基本</SectionTitle>
            <InfoRow icon={<PersonIcon fontSize="small" />}  label="氏名"       value={customer.name} />
            <InfoRow icon={<BadgeIcon fontSize="small" />}   label="フリガナ"    value={customer.kana} />
            <InfoRow icon={<CakeIcon fontSize="small" />}    label="誕生日"      value={customer.birthdate} />

            <Divider sx={{ my: 1.5 }} />
            <SectionTitle>連絡先</SectionTitle>
            <InfoRow icon={<PhoneIcon fontSize="small" />}   label="電話"        value={customer.phone} />
            <InfoRow icon={<PhoneIcon fontSize="small" />}   label="携帯"        value={customer.mobile_phone} />
            <InfoRow icon={<EmailIcon fontSize="small" />}   label="メール"      value={customer.email} />
            <InfoRow icon={<HomeIcon fontSize="small" />}    label="郵便番号"    value={customer.postal_code ? `〒${customer.postal_code}` : null} />
            <InfoRow icon={<HomeIcon fontSize="small" />}    label="住所"        value={customer.address} />
          </Grid>

          {/* 右: 会社・属性・店舗 */}
          <Grid size={{ xs: 12, md: 6 }}>
            <SectionTitle>会社</SectionTitle>
            <InfoRow icon={<BusinessIcon fontSize="small" />} label="会社名"     value={customer.company} />
            <InfoRow icon={<PhoneIcon fontSize="small" />}    label="会社電話"   value={customer.company_phone} />

            <Divider sx={{ my: 1.5 }} />
            <SectionTitle>属性</SectionTitle>
            <InfoRow
              icon={<BadgeIcon fontSize="small" />}
              label="顧客分類"
              value={customer.customer_class?.name}
            />
            <InfoRow icon={<PersonIcon fontSize="small" />}  label="性別"        value={customer.gender?.name} />
            <InfoRow icon={<HomeIcon fontSize="small" />}    label="地域"        value={customer.region?.name} />
            <InfoRow icon={<BadgeIcon fontSize="small" />}   label="担当スタッフ" value={customer.staff?.display_name ?? customer.staff?.full_name} />

            <Divider sx={{ my: 1.5 }} />
            <SectionTitle>店舗</SectionTitle>
            <InfoRow icon={<StoreIcon fontSize="small" />}   label="初回対応店舗" value={customer.first_shop?.name} />
            <InfoRow icon={<StoreIcon fontSize="small" />}   label="最終対応店舗" value={customer.last_shop?.name} />
          </Grid>
        </Grid>
      </Paper>
    );
  }

  // ── 編集モード ──────────────────────────────
  if (loadingMasters) {
    return (
      <Paper variant="outlined" sx={{ p: 3, mb: 2, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="subtitle1" fontWeight="bold">基本情報（編集）</Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" onClick={cancelEdit} disabled={saving}>
            キャンセル
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={save}
            disabled={saving || !canSave}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
          >
            {saving ? "保存中..." : "保存する"}
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2}>
        {/* 左 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <SectionTitle>基本</SectionTitle>

          <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
            <InputLabel>顧客分類 *</InputLabel>
            <Select value={form.customer_class ?? ""} label="顧客分類 *" onChange={setSelect("customer_class")}>
              <MenuItem value=""><em>未選択</em></MenuItem>
              {customerClasses.map((x: any) => (
                <MenuItem key={x.id} value={x.id}>{x.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField fullWidth size="small" label="氏名 *" value={form.name ?? ""} onChange={setField("name")} sx={{ mb: 1.5 }} />
          <TextField fullWidth size="small" label="フリガナ" value={form.kana ?? ""} onChange={setField("kana")} sx={{ mb: 1.5 }} />
          <TextField
            fullWidth size="small" label="誕生日" type="date"
            value={form.birthdate ?? ""} onChange={setField("birthdate")}
            InputLabelProps={{ shrink: true }} sx={{ mb: 0 }}
          />

          <Divider sx={{ my: 2 }} />
          <SectionTitle>連絡先</SectionTitle>

          <PhoneField fullWidth size="small" label="電話" value={form.phone} onChange={(v) => setForm((p: any) => ({ ...p, phone: v }))} sx={{ mb: 1.5 }} />
          <PhoneField fullWidth size="small" label="携帯" value={form.mobile_phone} onChange={(v) => setForm((p: any) => ({ ...p, mobile_phone: v }))} sx={{ mb: 1.5 }} />
          <TextField fullWidth size="small" label="メール" value={form.email ?? ""} onChange={setField("email")} sx={{ mb: 1.5 }} />
          <TextField fullWidth size="small" label="郵便番号" value={form.postal_code ?? ""} onChange={setField("postal_code")} sx={{ mb: 1.5 }} />
          <TextField fullWidth size="small" label="住所" value={form.address ?? ""} onChange={setField("address")} />
        </Grid>

        {/* 右 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <SectionTitle>会社</SectionTitle>
          <TextField fullWidth size="small" label="会社名" value={form.company ?? ""} onChange={setField("company")} sx={{ mb: 1.5 }} />
          <PhoneField fullWidth size="small" label="会社電話" value={form.company_phone} onChange={(v) => setForm((p: any) => ({ ...p, company_phone: v }))} sx={{ mb: 0 }} />

          <Divider sx={{ my: 2 }} />
          <SectionTitle>属性</SectionTitle>

          <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
            <InputLabel>性別</InputLabel>
            <Select value={form.gender ?? ""} label="性別" onChange={setSelect("gender")}>
              <MenuItem value=""><em>未選択</em></MenuItem>
              {genders.map((x) => <MenuItem key={x.id} value={x.id}>{x.name}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
            <InputLabel>地域</InputLabel>
            <Select value={form.region ?? ""} label="地域" onChange={setSelect("region")}>
              <MenuItem value=""><em>未選択</em></MenuItem>
              {regions.map((x) => <MenuItem key={x.id} value={x.id}>{x.name}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small" sx={{ mb: 0 }}>
            <InputLabel>担当スタッフ</InputLabel>
            <Select value={form.staff ?? ""} label="担当スタッフ" onChange={setSelect("staff")}>
              <MenuItem value=""><em>未選択</em></MenuItem>
              {staffs.map((x: any) => (
                <MenuItem key={x.id} value={x.id}>{x.display_name ?? x.full_name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Divider sx={{ my: 2 }} />
          <SectionTitle>店舗（自動）</SectionTitle>
          <InfoRow icon={<StoreIcon fontSize="small" />} label="初回対応店舗" value={customer.first_shop?.name} />
          <InfoRow icon={<StoreIcon fontSize="small" />} label="最終対応店舗" value={customer.last_shop?.name} />
        </Grid>
      </Grid>
    </Paper>
  );
}
