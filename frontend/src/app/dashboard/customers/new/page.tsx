"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Paper, Typography, TextField, Stack, Button, Divider,
  FormControl, InputLabel, Select, MenuItem, CircularProgress,
  Alert, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, List, ListItemButton, ListItemText, ListItemIcon,
  IconButton,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import PersonIcon       from "@mui/icons-material/Person";
import PhoneIcon        from "@mui/icons-material/Phone";
import HomeIcon         from "@mui/icons-material/Home";
import BusinessIcon     from "@mui/icons-material/Business";
import BadgeIcon        from "@mui/icons-material/Badge";
import SearchIcon       from "@mui/icons-material/Search";
import ArrowBackIcon    from "@mui/icons-material/ArrowBack";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import { useRouter }    from "next/navigation";
import PhoneField       from "@/components/ui/PhoneField";
import JaDatePicker     from "@/components/common/JaDatePicker";
import apiClient        from "@/lib/apiClient";

// ── 型 ─────────────────────────────────────────────────────────
type CustomerClass = { id: number; name: string };
type Region        = { id: number; name: string };
type Gender        = { id: number; name: string };
type Staff         = { id: number; login_id: string; display_name?: string; full_name?: string; role?: string; shop_name?: string };

type FormState = {
  name: string; kana: string; email: string;
  postal_code: string; address: string;
  phone: string; mobile_phone: string;
  company: string; company_phone: string;
  birthdate: string | null;
  customer_class: number | null;
  staff: number | null;
  region: number | null;
  gender: number | null;
};

// ── ユーティリティ ──────────────────────────────────────────────
const blankToNull = (v: string | null | undefined) =>
  v == null || v.trim() === "" ? null : v.trim();

const toInt = (v: any): number | null =>
  v === "" || v == null ? null : Number(v);

const formatZip = (val: string) => {
  const raw = val.replace(/[^0-9]/g, "").slice(0, 7);
  return raw.length <= 3 ? raw : `${raw.slice(0, 3)}-${raw.slice(3)}`;
};

const hiraganaToKatakana = (str: string) =>
  str.replace(/[ぁ-ゖ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60));

// ── セクションラベル（PartySelector と同スタイル） ────────────────
function SectionLabel({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Box mb={1.5} mt={0.5}>
      <Stack direction="row" alignItems="center" spacing={0.75} mb={0.5}>
        {icon && <Box sx={{ color: "primary.main", display: "flex", fontSize: 16 }}>{icon}</Box>}
        <Typography
          variant="overline"
          fontSize={10}
          fontWeight="bold"
          color="text.disabled"
          letterSpacing={1.5}
          lineHeight={1.8}
        >
          {children}
        </Typography>
      </Stack>
      <Divider />
    </Box>
  );
}

// ── メインページ ────────────────────────────────────────────────
export default function CustomerNewPage() {
  const router = useRouter();
  const today  = new Date().toISOString().slice(0, 10);

  // マスタ
  const [customerClasses, setCustomerClasses] = useState<CustomerClass[]>([]);
  const [regions,         setRegions]         = useState<Region[]>([]);
  const [genders,         setGenders]         = useState<Gender[]>([]);
  const [staffs,          setStaffs]          = useState<Staff[]>([]);
  const [loadingMasters,  setLoadingMasters]  = useState(true);

  // フォーム
  const [form, setForm] = useState<FormState>({
    name: "", kana: "", email: "", postal_code: "", address: "",
    phone: "", mobile_phone: "", company: "", company_phone: "",
    birthdate: null, customer_class: null, staff: null,
    region: null, gender: null,
  });

  // フリガナ自動入力
  const composingHiraganaRef = useRef("");
  const kanaAutoRef          = useRef(true);

  // エラー・状態
  const [touched,        setTouched]        = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [zipLoading,     setZipLoading]     = useState(false);
  const [zipError,       setZipError]       = useState<string | null>(null);
  const [emailError,     setEmailError]     = useState<string | null>(null);
  const [birthdateError, setBirthdateError] = useState<string | null>(null);

  // 類似顧客
  const [similarOpen,       setSimilarOpen]       = useState(false);
  const [similarCandidates, setSimilarCandidates] = useState<any[]>([]);
  const [pendingPayload,    setPendingPayload]    = useState<any>(null);

  // マスタ取得
  useEffect(() => {
    const toArr = (res: any) =>
      Array.isArray(res?.data) ? res.data : res?.data?.results ?? [];
    Promise.all([
      apiClient.get("/masters/customer_classes/"),
      apiClient.get("/masters/staffs/"),
      apiClient.get("/masters/regions/"),
      apiClient.get("/masters/genders/"),
    ]).then(([cc, st, rg, gd]) => {
      setCustomerClasses(toArr(cc));
      setStaffs(toArr(st));
      setRegions(toArr(rg));
      setGenders(toArr(gd));
    }).catch(() => setError("マスタデータの取得に失敗しました"))
      .finally(() => setLoadingMasters(false));
  }, []);

  // ── フォームヘルパー ─────────────────────────────────────────
  const setF = (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [key]: e.target.value }));

  const setS = (key: keyof FormState) => (e: any) =>
    setForm(p => ({ ...p, [key]: toInt(e.target.value) }));

  // ── フリガナ自動入力 ─────────────────────────────────────────
  const handleNameCompositionUpdate = (e: React.CompositionEvent<HTMLInputElement>) => {
    composingHiraganaRef.current = e.data || "";
  };
  const handleNameCompositionEnd = () => {
    if (!kanaAutoRef.current) return;
    const katakana = hiraganaToKatakana(composingHiraganaRef.current);
    if (katakana) {
      setForm(p => ({ ...p, kana: (p.kana || "") + katakana }));
    }
    composingHiraganaRef.current = "";
  };
  const handleNameChange = (val: string) => {
    setTouched(true);
    setForm(p => ({ ...p, name: val }));
  };
  const handleKanaChange = (val: string) => {
    kanaAutoRef.current = false;
    setForm(p => ({ ...p, kana: val }));
  };

  // ── バリデーション ────────────────────────────────────────────
  const canSubmit = useMemo(
    () => form.name.trim() !== "" && form.customer_class != null,
    [form.name, form.customer_class]
  );
  const hasErr = (v: any) =>
    touched && (v == null || (typeof v === "string" && v.trim() === ""));

  // ── 郵便番号 → 住所 ──────────────────────────────────────────
  const fetchAddress = async () => {
    const raw = (form.postal_code || "").replace(/[^0-9]/g, "");
    if (raw.length !== 7) { setZipError("7桁の郵便番号を入力してから検索してください"); return; }
    setZipLoading(true);
    setZipError(null);
    try {
      const res  = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${raw}`);
      const data = await res.json();
      if (!data.results) { setZipError("該当する住所が見つかりませんでした"); return; }
      const r           = data.results[0];
      const addr        = r.address2 + r.address3;
      const regionMatch = regions.find(x => x.name === r.address1);
      setForm(p => ({
        ...p,
        address: addr,
        ...(regionMatch ? { region: regionMatch.id } : {}),
      }));
    } catch { setZipError("住所取得に失敗しました（通信エラー）"); }
    finally  { setZipLoading(false); }
  };

  // ── 登録 ─────────────────────────────────────────────────────
  const submit = async () => {
    setTouched(true);
    setError(null);
    setEmailError(null);
    setBirthdateError(null);
    if (!canSubmit) return;

    if (form.email?.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        setEmailError("正しい形式で入力してください（例: name@example.com）");
        return;
      }
    }
    if (form.birthdate) {
      const picked = new Date(form.birthdate);
      const todayD = new Date(); todayD.setHours(0, 0, 0, 0);
      if (picked > todayD) { setBirthdateError("今日以前の日付を入力してください"); return; }
    }

    setSaving(true);
    try {
      const payload = {
        name:          form.name.trim(),
        kana:          blankToNull(form.kana),
        email:         blankToNull(form.email),
        postal_code:   blankToNull(form.postal_code),
        address:       blankToNull(form.address),
        phone:         blankToNull(form.phone),
        mobile_phone:  blankToNull(form.mobile_phone),
        company:       blankToNull(form.company),
        company_phone: blankToNull(form.company_phone),
        birthdate:     form.birthdate || null,
        customer_class: form.customer_class,
        staff:          form.staff,
        region:         form.region,
        gender:         form.gender,
      };

      const simRes = await apiClient.post("/customers/similar/", {
        name: payload.name, kana: payload.kana,
        phone: payload.phone, mobile_phone: payload.mobile_phone,
        email: payload.email, address: payload.address,
      });
      if (simRes.data.has_similar) {
        setSimilarCandidates(simRes.data.candidates);
        setPendingPayload(payload);
        setSimilarOpen(true);
        setSaving(false);
        return;
      }

      const res = await apiClient.post("/customers/", payload);
      router.push(`/dashboard/customers/${res.data.id}`);
    } catch (e: any) {
      const d = e?.response?.data;
      setError(typeof d === "string" ? d : d ? JSON.stringify(d) : "登録に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const doRegister = async (payload: any) => {
    try {
      const res = await apiClient.post("/customers/", payload);
      router.push(`/dashboard/customers/${res.data.id}`);
    } catch {
      setError("登録に失敗しました");
      setSimilarOpen(false);
    }
  };

  // ── ローディング ─────────────────────────────────────────────
  if (loadingMasters) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    );
  }

  // ── JSX ──────────────────────────────────────────────────────
  return (
    <Box sx={{ maxWidth: 860, mx: "auto", pb: 10 }}>

      {/* ページヘッダー */}
      <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
        <IconButton size="small" onClick={() => router.push("/dashboard/customers")}
          sx={{ border: "1px solid", borderColor: "divider" }}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography variant="h6" fontWeight="bold">顧客 新規登録</Typography>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Stack spacing={2.5}>

        {/* ══ 基本情報 ══ */}
        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <SectionLabel icon={<PersonIcon fontSize="inherit" />}>基本情報</SectionLabel>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 5 }}>
              <TextField
                fullWidth size="small" label="氏名 *"
                value={form.name}
                error={hasErr(form.name)}
                helperText={hasErr(form.name) ? "氏名は必須です" : ""}
                placeholder="例：田中 太郎"
                onChange={e => handleNameChange(e.target.value)}
                onBlur={() => setTouched(true)}
                inputProps={{
                  onCompositionUpdate: handleNameCompositionUpdate,
                  onCompositionEnd:    handleNameCompositionEnd,
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 5 }}>
              <TextField
                fullWidth size="small" label="フリガナ（カタカナ）"
                value={form.kana}
                placeholder="例：タナカ タロウ"
                onChange={e => handleKanaChange(e.target.value)}
                onFocus={() => { kanaAutoRef.current = false; }}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 2 }}>
              <TextField
                select fullWidth size="small" label="性別"
                value={form.gender ?? ""}
                onChange={setS("gender")}
              >
                <MenuItem value="">-</MenuItem>
                {genders.map(x => <MenuItem key={x.id} value={x.id}>{x.name}</MenuItem>)}
              </TextField>
            </Grid>
          </Grid>
        </Paper>

        {/* ══ 個人属性 ══ */}
        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <SectionLabel icon={<BadgeIcon fontSize="inherit" />}>個人属性</SectionLabel>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                select fullWidth size="small" label="顧客区分 *"
                value={form.customer_class ?? ""}
                error={hasErr(form.customer_class)}
                onChange={setS("customer_class")}
              >
                <MenuItem value="">未選択</MenuItem>
                {customerClasses.map(x => (
                  <MenuItem key={x.id} value={x.id}>{x.name}</MenuItem>
                ))}
              </TextField>
              {hasErr(form.customer_class) && (
                <Typography variant="caption" color="error" display="block" mt={0.5} ml={1.75}>
                  顧客区分は必須です
                </Typography>
              )}
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <JaDatePicker
                label="生年月日"
                value={form.birthdate}
                onChange={v => { setBirthdateError(null); setForm(p => ({ ...p, birthdate: v })); }}
                maxDate={today}
              />
              {birthdateError && (
                <Typography variant="caption" color="error" display="block" mt={0.5}>
                  {birthdateError}
                </Typography>
              )}
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                select fullWidth size="small" label="担当スタッフ"
                value={form.staff ?? ""}
                onChange={setS("staff")}
              >
                <MenuItem value="">未選択</MenuItem>
                {staffs
                  .filter(x => x.role !== "admin")
                  .map(x => (
                    <MenuItem key={x.id} value={x.id}>
                      {x.display_name || x.full_name || x.login_id}
                      {x.shop_name ? `　(${x.shop_name})` : ""}
                    </MenuItem>
                  ))}
              </TextField>
            </Grid>
          </Grid>
        </Paper>

        {/* ══ 連絡先 ══ */}
        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <SectionLabel icon={<PhoneIcon fontSize="inherit" />}>連絡先</SectionLabel>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <PhoneField
                fullWidth size="small" label="電話番号（自宅・固定）"
                value={form.phone}
                onChange={v => setForm(p => ({ ...p, phone: v }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <PhoneField
                fullWidth size="small" label="携帯電話番号"
                value={form.mobile_phone}
                onChange={v => setForm(p => ({ ...p, mobile_phone: v }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth size="small" label="メールアドレス" type="email"
                value={form.email}
                onChange={e => { setEmailError(null); setF("email")(e); }}
                error={!!emailError}
                helperText={emailError ?? ""}
                placeholder="例：taro@example.com"
              />
            </Grid>
          </Grid>
        </Paper>

        {/* ══ 住所 ══ */}
        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <SectionLabel icon={<HomeIcon fontSize="inherit" />}>住所</SectionLabel>

          {zipError && (
            <Alert severity="warning" onClose={() => setZipError(null)} sx={{ mb: 1.5 }}>
              {zipError}
            </Alert>
          )}

          <Grid container spacing={2} alignItems="flex-end">
            <Grid size={{ xs: 7, sm: 3 }}>
              <TextField
                fullWidth size="small" label="郵便番号"
                placeholder="000-0000"
                value={form.postal_code}
                onChange={e => setForm(p => ({ ...p, postal_code: formatZip(e.target.value) }))}
                inputProps={{ maxLength: 8 }}
              />
            </Grid>
            <Grid size={{ xs: 5, sm: "auto" }}>
              <Button
                size="small" variant="outlined"
                startIcon={zipLoading ? <CircularProgress size={14} /> : <SearchIcon fontSize="small" />}
                onClick={fetchAddress}
                disabled={zipLoading}
                sx={{ whiteSpace: "nowrap", height: 40 }}
              >
                住所を検索
              </Button>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                select fullWidth size="small" label="都道府県"
                value={form.region ?? ""}
                onChange={setS("region")}
              >
                <MenuItem value="">未選択</MenuItem>
                {regions.map(x => <MenuItem key={x.id} value={x.id}>{x.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth size="small" label="市区町村・番地・建物名"
                value={form.address}
                onChange={setF("address")}
                placeholder="例：渋谷区道玄坂1-1-1"
              />
            </Grid>
          </Grid>
        </Paper>

        {/* ══ 勤務先 ══ */}
        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <SectionLabel icon={<BusinessIcon fontSize="inherit" />}>勤務先</SectionLabel>

          <Grid container spacing={2} mb={0.5}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth size="small" label="会社名・法人名"
                value={form.company}
                onChange={setF("company")}
                placeholder="例：株式会社〇〇"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <PhoneField
                fullWidth size="small" label="会社電話番号"
                value={form.company_phone}
                onChange={v => setForm(p => ({ ...p, company_phone: v }))}
              />
            </Grid>
          </Grid>
        </Paper>

      </Stack>

      {/* 固定フッター */}
      <Box
        sx={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
          bgcolor: "background.paper", borderTop: "1px solid", borderColor: "divider",
          px: 3, py: 1.5, display: "flex", justifyContent: "flex-end", gap: 1.5,
        }}
      >
        <Button variant="outlined" onClick={() => router.push("/dashboard/customers")} disabled={saving}>
          キャンセル
        </Button>
        <Button
          variant="contained" size="large" onClick={submit} disabled={saving}
          startIcon={saving ? <CircularProgress size={18} color="inherit" /> : undefined}
          sx={{ minWidth: 140 }}
        >
          {saving ? "登録中..." : "登録する"}
        </Button>
      </Box>

      {/* 類似顧客ダイアログ */}
      <Dialog open={similarOpen} onClose={() => setSimilarOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <WarningAmberIcon color="warning" />
          類似する顧客が見つかりました
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            以下の顧客と似たデータが登録されています。既存の顧客ではないか確認してください。
          </Typography>
          <List disablePadding>
            {similarCandidates.map(c => (
              <ListItemButton
                key={c.id}
                onClick={() => router.push(`/dashboard/customers/${c.id}`)}
                sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, mb: 1 }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <PersonSearchIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body2" fontWeight="bold">
                      {c.name}
                      <Chip size="small" label={`スコア ${c.score}`} color="warning"
                        sx={{ ml: 1, height: 18, fontSize: 11 }} />
                    </Typography>
                  }
                  secondary={c.reasons?.join(" / ")}
                />
              </ListItemButton>
            ))}
          </List>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" onClick={() => setSimilarOpen(false)}>戻って確認する</Button>
          <Button variant="contained" color="warning"
            onClick={() => pendingPayload && doRegister(pendingPayload)}>
            重複を無視して登録
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
