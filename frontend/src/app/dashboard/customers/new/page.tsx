"use client";

import { useEffect, useMemo, useState, useRef } from "react";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/apiClient";

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
  birthdate?: string | null;
  customer_class: number | null;
  staff?: number | null;
  region?: number | null;
  gender?: number | null;
};

const blankToNull = (v: string) => (v.trim() === "" ? null : v.trim());
const toNumberOrNull = (v: any) => (v === "" || v == null ? null : Number(v));

const formatZip = (val: string) => {
  const v = val.replace("-", "");
  if (v.length <= 3) return v;
  return `${v.slice(0, 3)}-${v.slice(3)}`;
};

export default function CustomerNewPage() {
  const router = useRouter();

  const [customerClasses, setCustomerClasses] = useState<CustomerClass[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [genders, setGenders] = useState<Gender[]>([]);
  const [staffs, setStaffs] = useState<Staff[]>([]);

  const [loadingMasters, setLoadingMasters] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zipError, setZipError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [similarCandidates, setSimilarCandidates] = useState<any[]>([]);
  const [similarOpen, setSimilarOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<any>(null);

  const debounceRef = useRef<any>(null);

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

  useEffect(() => {
    (async () => {
      try {
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
        setError("マスタ取得失敗");
      } finally {
        setLoadingMasters(false);
      }
    })();
  }, []);

  const setField =
    (key: keyof CreatePayload) =>
    (e: any) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const canSubmit = useMemo(() => {
    return form.name.trim() && form.customer_class != null;
  }, [form]);

  // =========================
  // 郵便番号 → 住所取得
  // =========================
  const fetchAddress = async (zip: string, force = false) => {
    if (zip.length !== 7) return;

    try {
      setZipError(null);

      const res = await fetch(
        `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zip}`
      );
      const data = await res.json();

      if (!data.results) {
        setZipError("郵便番号が見つかりません");
        return;
      }

      const r = data.results[0];
      const prefecture = r.address1;
      const address = r.address2 + r.address3;

      const regionMatch = regions.find((x) => x.name === prefecture);

      setForm((prev) => ({
        ...prev,
        region: regionMatch?.id ?? prev.region,
        // 🔥 ここが重要
        address: force ? address : prev.address || address,
      }));
    } catch {
      setZipError("住所取得に失敗しました");
    }
  };

  const handleZipChange = (val: string) => {
    const raw = val.replace("-", "");

    setForm((p) => ({
      ...p,
      postal_code: formatZip(raw),
    }));

    // 🔥 自動取得はしない
  };

  const currentYear = new Date().getFullYear();

  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const [birth, setBirth] = useState({
    year: "",
    month: "",
    day: "",
  });

  const submit = async () => {
    if (!canSubmit) return;

    setSaving(true);

    try {
      // 🔥 生年月日生成
      let birthdate = null;

      if (birth.year && birth.month && birth.day) {
        const m = String(birth.month).padStart(2, "0");
        const d = String(birth.day).padStart(2, "0");
        birthdate = `${birth.year}-${m}-${d}`;
      }

      const payload = {
        ...form,
        name: form.name.trim(),
        kana: blankToNull(form.kana || ""),
        email: blankToNull(form.email || ""),
        postal_code: blankToNull(form.postal_code || ""),
        address: blankToNull(form.address || ""),
        phone: blankToNull(form.phone || ""),
        mobile_phone: blankToNull(form.mobile_phone || ""),
        company: blankToNull(form.company || ""),
        company_phone: blankToNull(form.company_phone || ""),
        birthdate,
      };

      // 🔥 追加：類似チェック
      const similarRes = await apiClient.post("/customers/similar/", {
        name: payload.name,
        kana: payload.kana,
        phone: payload.phone,
        mobile_phone: payload.mobile_phone,
        email: payload.email,
        address: payload.address,
      });

      if (similarRes.data.has_similar) {
        setSimilarCandidates(similarRes.data.candidates);
        setPendingPayload(payload);
        setSimilarOpen(true);
        setSaving(false);
        return;
      }

      // 元の処理
      const res = await apiClient.post("/customers/", payload);
      router.push(`/dashboard/customers/${res.data.id}`);

    } catch {
      setError("作成失敗");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={2}>

        {/* ヘッダ */}
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="h5" fontWeight="bold">
            顧客 新規登録
          </Typography>

          <Stack direction="row" spacing={1}>
            <Button onClick={() => router.push("/dashboard/customers")}>
              一覧へ戻る
            </Button>
            <Button variant="contained" onClick={submit} disabled={!canSubmit || saving}>
              {saving ? <CircularProgress size={20} /> : "登録"}
            </Button>
          </Stack>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}
        {zipError && <Alert severity="warning">{zipError}</Alert>}

        {/* システム管理 */}
        <Paper sx={{ p: 2 }}>
          <Typography fontWeight="bold">システム管理</Typography>
          <Divider sx={{ mb: 2 }} />

          <Stack direction={{ md: "row" }} spacing={2}>
            <FormControl fullWidth>
              <InputLabel>顧客区分（必須）</InputLabel>
              <Select
                value={form.customer_class ?? ""}
                label="顧客区分"
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    customer_class: toNumberOrNull(e.target.value),
                  }))
                }
              >
                <MenuItem value="">未選択</MenuItem>
                {customerClasses.map((x) => (
                  <MenuItem key={x.id} value={x.id}>{x.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>担当スタッフ</InputLabel>
              <Select
                value={form.staff ?? ""}
                label="担当スタッフ"
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    staff: toNumberOrNull(e.target.value),
                  }))
                }
              >
                <MenuItem value="">未選択</MenuItem>
                  {staffs
                    .filter((x: any) => x.role === "staff") // ← admin除外（おすすめ）
                    .map((x: any) => (
                      <MenuItem key={x.id} value={x.id}>
                        {x.display_name || x.login_id}
                        {x.shop_name ? `（${x.shop_name}）` : ""}
                      </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Stack>
        </Paper>

        {/* 個人情報 */}
        <Paper sx={{ p: 2 }}>
          <Typography fontWeight="bold">個人情報</Typography>
          <Divider sx={{ mb: 2 }} />

          <Stack spacing={2}>
            <TextField
              label="氏名（必須）"
              value={form.name}
              onChange={setField("name")}
              fullWidth
            />

            <TextField
              label="フリガナ"
              value={form.kana ?? ""}
              onChange={setField("kana")}
              fullWidth
            />

            {/* 性別 */}
            <FormControl sx={{ maxWidth: 200 }}>
              <InputLabel>性別</InputLabel>
              <Select
                value={form.gender ?? ""}
                label="性別"
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    gender: toNumberOrNull(e.target.value),
                  }))
                }
              >
                <MenuItem value="">未選択</MenuItem>
                {genders.map((x) => (
                  <MenuItem key={x.id} value={x.id}>{x.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* 🔥 生年月日（独立） */}
            <Box sx={{ maxWidth: 400 }}>
              <Typography variant="caption" color="text.secondary">
                生年月日
              </Typography>

              <Stack direction="row" spacing={1.5} mt={1} alignItems="center">
                <FormControl sx={{ flex: 1 }}>
                  <Select
                    displayEmpty
                    value={birth.year}
                    onChange={(e) =>
                      setBirth((p) => ({ ...p, year: e.target.value }))
                    }
                  >
                    <MenuItem value="">年</MenuItem>
                    {years.map((y) => (
                      <MenuItem key={y} value={y}>{y}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Typography>年</Typography>

                <FormControl sx={{ flex: 1 }}>
                  <Select
                    displayEmpty
                    value={birth.month}
                    onChange={(e) =>
                      setBirth((p) => ({ ...p, month: e.target.value }))
                    }
                  >
                    <MenuItem value="">月</MenuItem>
                    {months.map((m) => (
                      <MenuItem key={m} value={m}>{m}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Typography>月</Typography>

                <FormControl sx={{ flex: 1 }}>
                  <Select
                    displayEmpty
                    value={birth.day}
                    onChange={(e) =>
                      setBirth((p) => ({ ...p, day: e.target.value }))
                    }
                  >
                    <MenuItem value="">日</MenuItem>
                    {days.map((d) => (
                      <MenuItem key={d} value={d}>{d}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Typography>日</Typography>
                
              </Stack>
            </Box>
          </Stack>
        </Paper>

        {/* 連絡先 */}
        <Paper sx={{ p: 2 }}>
          <Typography fontWeight="bold">連絡先情報</Typography>
          <Divider sx={{ mb: 2 }} />

          <Stack spacing={2}>

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="郵便番号（必須）"
                value={form.postal_code ?? ""}
                onChange={(e) => handleZipChange(e.target.value)}
                sx={{ maxWidth: 200 }}
              />

              <Button
                variant="outlined"
                onClick={() =>
                  fetchAddress((form.postal_code || "").replace("-", ""), true)
                }
              >
                住所自動入力
              </Button>
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <FormControl sx={{ minWidth: 160 }}>
                <InputLabel>都道府県</InputLabel>
                <Select
                  value={form.region ?? ""}
                  label="都道府県"
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      region: toNumberOrNull(e.target.value),
                    }))
                  }
                >
                  <MenuItem value="">未選択</MenuItem>
                  {regions.map((x) => (
                    <MenuItem key={x.id} value={x.id}>{x.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="住所"
                value={form.address ?? ""}
                onChange={setField("address")}
                fullWidth
              />
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField label="電話番号（自宅・固定）" value={form.phone ?? ""} onChange={setField("phone")} fullWidth />
              <TextField label="携帯電話番号" value={form.mobile_phone ?? ""} onChange={setField("mobile_phone")} fullWidth />
            </Stack>

            <TextField label="メール" value={form.email ?? ""} onChange={setField("email")} fullWidth />
          </Stack>
        </Paper>

        {/* 勤務先 */}
        <Paper sx={{ p: 2 }}>
          <Typography fontWeight="bold">勤務先情報</Typography>
          <Divider sx={{ mb: 2 }} />

          <Stack direction={{ md: "row" }} spacing={2}>
            <TextField label="会社名（勤務先・法人名）" value={form.company ?? ""} onChange={setField("company")} fullWidth />
            <TextField label="会社電話番号" value={form.company_phone ?? ""} onChange={setField("company_phone")} fullWidth />
          </Stack>
        </Paper>      

      </Stack>
      <Dialog open={similarOpen} onClose={() => setSimilarOpen(false)} fullWidth>
        <DialogTitle>類似顧客が見つかりました</DialogTitle>

        <DialogContent>
          <List>
            {similarCandidates.map((c) => (
              <ListItemButton
                key={c.id}
                onClick={() => router.push(`/dashboard/customers/${c.id}`)}
              >
                <ListItemText
                  primary={`${c.name}（スコア:${c.score}）`}
                  secondary={c.reasons.join(" / ")}
                />
              </ListItemButton>
            ))}
          </List>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setSimilarOpen(false)}>
            戻る
          </Button>

          <Button
            variant="contained"
            color="warning"
            onClick={async () => {
              if (!pendingPayload) return;

              const res = await apiClient.post("/customers/", pendingPayload);
              router.push(`/dashboard/customers/${res.data.id}`);
            }}
          >
            無視して登録
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}