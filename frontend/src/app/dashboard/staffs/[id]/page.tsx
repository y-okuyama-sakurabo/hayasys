"use client";

import { useEffect, useState } from "react";
import {
  Box, Typography, Paper, TextField,
  FormControl, InputLabel, Select, MenuItem,
  Button, CircularProgress, Stack, Alert,
  Divider, InputAdornment, IconButton, Chip,
} from "@mui/material";
import PersonIcon      from "@mui/icons-material/Person";
import BadgeIcon       from "@mui/icons-material/Badge";
import StoreIcon       from "@mui/icons-material/Store";
import WorkIcon        from "@mui/icons-material/Work";
import LockIcon        from "@mui/icons-material/Lock";
import Visibility      from "@mui/icons-material/Visibility";
import VisibilityOff   from "@mui/icons-material/VisibilityOff";
import ArrowBackIcon   from "@mui/icons-material/ArrowBack";
import apiClient from "@/lib/apiClient";
import { useRouter, useParams } from "next/navigation";

const NO_SHOP_ROLES = ["executive", "accounting"];

const ROLE_OPTIONS = [
  { value: "executive",     label: "役員",     desc: "未所属・全店舗閲覧可" },
  { value: "accounting",    label: "経理総務",  desc: "経理総務グループ・全店舗閲覧可" },
  { value: "manager",       label: "MGR・SV",  desc: "マネージャー / スーパーバイザー" },
  { value: "store_manager", label: "店長",     desc: "店舗管理者" },
  { value: "staff",         label: "スタッフ",  desc: "一般スタッフ" },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="caption" color="text.secondary" fontWeight="bold"
      sx={{ display: "block", mb: 1.5, textTransform: "uppercase", letterSpacing: 1 }}>
      {children}
    </Typography>
  );
}

export default function StaffEditPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [form, setForm] = useState({
    display_name:     "",
    login_id:         "",
    shop:             "" as string | number | null,
    role:             "staff",
    password:         "",
    password_confirm: "",
    is_active:        true,
  });

  const [shops,       setShops]       = useState<any[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [fetching,    setFetching]    = useState(true);
  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success,     setSuccess]     = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const [staffRes, shopRes] = await Promise.all([
          apiClient.get(`/masters/staffs/${id}/`),
          apiClient.get("/masters/shops/"),
        ]);
        const s = staffRes.data;
        setForm({
          display_name:     s.display_name || "",
          login_id:         s.login_id || "",
          shop:             s.shop ?? null,
          role:             s.role || "staff",
          password:         "",
          password_confirm: "",
          is_active:        s.is_active ?? true,
        });
        setShops(shopRes.data.results || shopRes.data);
      } catch {
        setErrors({ _general: "スタッフ情報の取得に失敗しました。" });
      } finally {
        setFetching(false);
      }
    };
    init();
  }, [id]);

  const noShop = NO_SHOP_ROLES.includes(form.role);

  const handleChange = (field: string, value: any) => {
    setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
    setSuccess(false);
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "role" && NO_SHOP_ROLES.includes(value)) next.shop = null;
      return next;
    });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.display_name.trim())     e.display_name = "氏名を入力してください";
    if (!form.login_id.trim())         e.login_id     = "ログインIDを入力してください";
    if (!noShop && !form.shop)         e.shop         = "所属店舗を選択してください";
    if (form.password && form.password !== form.password_confirm)
                                       e.password_confirm = "パスワードが一致しません";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      setLoading(true);
      const payload: any = {
        display_name: form.display_name,
        login_id:     form.login_id,
        shop:         noShop ? null : (form.shop || null),
        role:         form.role,
        is_active:    form.is_active,
      };
      if (form.password) payload.password = form.password;
      await apiClient.patch(`/masters/staffs/${id}/`, payload);
      setSuccess(true);
      setForm((prev) => ({ ...prev, password: "", password_confirm: "" }));
    } catch (e: any) {
      const data = e?.response?.data;
      if (typeof data === "object" && !Array.isArray(data)) {
        const mapped: Record<string, string> = {};
        for (const [k, v] of Object.entries(data)) {
          mapped[k] = Array.isArray(v) ? (v as string[]).join(" ") : String(v);
        }
        setErrors(mapped);
      } else {
        setErrors({ _general: "更新に失敗しました。" });
      }
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    );
  }

  const selectedRole = ROLE_OPTIONS.find((r) => r.value === form.role);

  return (
    <Box sx={{ p: 3, maxWidth: 560 }}>
      {/* ── ヘッダー ── */}
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <IconButton size="small" onClick={() => router.push("/dashboard/staffs")}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h6" fontWeight="bold" lineHeight={1.2}>スタッフ編集</Typography>
            {!form.is_active && (
              <Chip label="無効" size="small" color="default" />
            )}
          </Stack>
          <Typography variant="caption" color="text.secondary">スタッフ管理 › 編集</Typography>
        </Box>
      </Stack>

      {errors._general && <Alert severity="error" sx={{ mb: 2 }}>{errors._general}</Alert>}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(false)}>
          保存しました
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 3 }}>

        {/* ── 基本情報 ── */}
        <SectionLabel>基本情報</SectionLabel>

        <TextField
          fullWidth label="氏名" required
          value={form.display_name}
          onChange={(e) => handleChange("display_name", e.target.value)}
          error={!!errors.display_name}
          helperText={errors.display_name}
          InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon fontSize="small" color="action" /></InputAdornment> }}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth label="ログインID" required
          value={form.login_id}
          onChange={(e) => handleChange("login_id", e.target.value)}
          error={!!errors.login_id}
          helperText={errors.login_id}
          InputProps={{ startAdornment: <InputAdornment position="start"><BadgeIcon fontSize="small" color="action" /></InputAdornment> }}
          sx={{ mb: 0 }}
        />

        <Divider sx={{ my: 3 }} />

        {/* ── 権限・所属 ── */}
        <SectionLabel>権限・所属</SectionLabel>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>役職</InputLabel>
          <Select
            value={form.role}
            label="役職"
            onChange={(e) => handleChange("role", e.target.value)}
            startAdornment={<InputAdornment position="start"><WorkIcon fontSize="small" color="action" /></InputAdornment>}
          >
            {ROLE_OPTIONS.map((r) => (
              <MenuItem key={r.value} value={r.value}>
                <Box>
                  <Typography variant="body2" fontWeight={500}>{r.label}</Typography>
                  <Typography variant="caption" color="text.secondary">{r.desc}</Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {noShop ? (
          <TextField
            fullWidth
            label="所属グループ"
            value={selectedRole?.label === "役員" ? "未所属（全店舗閲覧可）" : "経理総務（全店舗閲覧可）"}
            InputProps={{
              readOnly: true,
              startAdornment: <InputAdornment position="start"><StoreIcon fontSize="small" color="action" /></InputAdornment>,
            }}
            sx={{ mb: 0 }}
          />
        ) : (
          <FormControl fullWidth error={!!errors.shop}>
            <InputLabel>所属店舗 *</InputLabel>
            <Select
              value={form.shop ?? ""}
              label="所属店舗 *"
              onChange={(e) => handleChange("shop", e.target.value)}
              startAdornment={<InputAdornment position="start"><StoreIcon fontSize="small" color="action" /></InputAdornment>}
            >
              <MenuItem value=""><em>選択してください</em></MenuItem>
              {shops.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </Select>
            {errors.shop && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>{errors.shop}</Typography>
            )}
          </FormControl>
        )}

        <Divider sx={{ my: 3 }} />

        {/* ── パスワード変更 ── */}
        <SectionLabel>パスワード変更（任意）</SectionLabel>

        <TextField
          fullWidth label="新しいパスワード"
          type={showPass ? "text" : "password"}
          placeholder="変更しない場合は空欄のまま"
          value={form.password}
          onChange={(e) => handleChange("password", e.target.value)}
          error={!!errors.password}
          helperText={errors.password}
          InputProps={{
            startAdornment: <InputAdornment position="start"><LockIcon fontSize="small" color="action" /></InputAdornment>,
            endAdornment: (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setShowPass((v) => !v)} edge="end">
                  {showPass ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth label="新しいパスワード（確認）"
          type={showConfirm ? "text" : "password"}
          value={form.password_confirm}
          onChange={(e) => handleChange("password_confirm", e.target.value)}
          error={!!errors.password_confirm}
          helperText={errors.password_confirm}
          disabled={!form.password}
          InputProps={{
            startAdornment: <InputAdornment position="start"><LockIcon fontSize="small" color="action" /></InputAdornment>,
            endAdornment: (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setShowConfirm((v) => !v)} edge="end" disabled={!form.password}>
                  {showConfirm ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ mb: 0 }}
        />

        <Divider sx={{ my: 3 }} />

        {/* ── ステータス ── */}
        <SectionLabel>ステータス</SectionLabel>

        <FormControl fullWidth sx={{ mb: 0 }}>
          <InputLabel>アカウント状態</InputLabel>
          <Select
            value={form.is_active ? "active" : "inactive"}
            label="アカウント状態"
            onChange={(e) => handleChange("is_active", e.target.value === "active")}
          >
            <MenuItem value="active">
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip label="有効" size="small" color="success" />
                <Typography variant="body2">ログイン可能</Typography>
              </Stack>
            </MenuItem>
            <MenuItem value="inactive">
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip label="無効" size="small" color="default" />
                <Typography variant="body2">ログイン不可</Typography>
              </Stack>
            </MenuItem>
          </Select>
        </FormControl>

        <Divider sx={{ my: 3 }} />

        {/* ── ボタン ── */}
        <Stack direction="row" justifyContent="flex-end" spacing={1.5}>
          <Button variant="outlined" onClick={() => router.push("/dashboard/staffs")} disabled={loading}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ minWidth: 120 }}
          >
            {loading ? "保存中..." : "保存する"}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
