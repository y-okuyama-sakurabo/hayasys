"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
} from "@mui/material";
import apiClient from "@/lib/apiClient";
import { useRouter } from "next/navigation";

export default function StaffNewPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    display_name: "",
    login_id: "",
    shop: "",
    role: "staff",
    password: "",
  });

  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // === 店舗一覧の取得 ===
  useEffect(() => {
    const fetchShops = async () => {
      try {
        const res = await apiClient.get("/masters/shops/");
        setShops(res.data.results || res.data);
      } catch (err) {
        console.error("店舗一覧の取得失敗:", err);
      } finally {
        setFetching(false);
      }
    };
    fetchShops();
  }, []);

  // === 入力変更ハンドラ ===
  const handleChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // === スタッフ登録 ===
  const handleSubmit = async () => {
    if (!form.display_name || !form.login_id) {
      alert("名前とログインIDは必須です。");
      return;
    }
    try {
      setLoading(true);
      const res = await apiClient.post("/masters/staffs/", form);
      alert("スタッフを登録しました！");
      router.push("/dashboard/staffs"); // スタッフ一覧ページへ遷移（存在する場合）
    } catch (err: any) {
      console.error("登録エラー:", err.response?.data || err);
      alert("登録に失敗しました。詳細はコンソールを確認してください。");
    } finally {
      setLoading(false);
    }
  };

  if (fetching)
    return (
      <Box display="flex" justifyContent="center" mt={10}>
        <CircularProgress />
      </Box>
    );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight="bold" mb={3}>
        スタッフ新規登録
      </Typography>

      <Paper sx={{ p: 3, maxWidth: 600 }}>
        {/* 名前 */}
        <TextField
          fullWidth
          label="表示名（名前）"
          variant="outlined"
          value={form.display_name}
          onChange={(e) => handleChange("display_name", e.target.value)}
          sx={{ mb: 3 }}
          required
        />

        {/* ログインID */}
        <TextField
          fullWidth
          label="ログインID"
          variant="outlined"
          value={form.login_id}
          onChange={(e) => handleChange("login_id", e.target.value)}
          sx={{ mb: 3 }}
          required
        />

        {/* 所属店舗 */}
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel id="shop-select-label">所属店舗</InputLabel>
          <Select
            labelId="shop-select-label"
            value={form.shop || ""}
            label="所属店舗"
            onChange={(e) => handleChange("shop", e.target.value)}
          >
            <MenuItem value="">未所属</MenuItem>
            {shops.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* 権限ロール */}
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel id="role-select-label">権限</InputLabel>
          <Select
            labelId="role-select-label"
            value={form.role}
            label="権限"
            onChange={(e) => handleChange("role", e.target.value)}
          >
            <MenuItem value="staff">スタッフ</MenuItem>
            <MenuItem value="admin">管理者</MenuItem>
          </Select>
        </FormControl>

        {/* パスワード */}
        <TextField
          fullWidth
          label="パスワード"
          variant="outlined"
          type="password"
          value={form.password}
          onChange={(e) => handleChange("password", e.target.value)}
          sx={{ mb: 3 }}
        />

        {/* ボタン */}
        <Box display="flex" justifyContent="flex-end" gap={2}>
          <Button
            variant="outlined"
            onClick={() => router.push("/dashboard/staffs")}
          >
            キャンセル
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "登録中..." : "登録する"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
