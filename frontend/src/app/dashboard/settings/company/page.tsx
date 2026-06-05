"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box, Typography, Paper, Stack, TextField,
  Button, Alert, CircularProgress, Divider,
} from "@mui/material";
import BusinessIcon from "@mui/icons-material/Business";
import SaveIcon from "@mui/icons-material/Save";
import apiClient from "@/lib/apiClient";

type CompanySettings = {
  registration_number: string;
};

export default function CompanySettingsPage() {
  const [settings, setSettings] = useState<CompanySettings>({ registration_number: "" });
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/company-settings/");
      setSettings(res.data);
    } catch {
      setError("会社設定の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = async () => {
    setError(null);
    setSaved(false);
    try {
      setSaving(true);
      await apiClient.patch("/company-settings/", settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 640, mx: "auto" }}>
      {/* ヘッダー */}
      <Box display="flex" alignItems="center" gap={1.5} mb={3}>
        <BusinessIcon color="primary" />
        <Box>
          <Typography variant="h5" fontWeight="bold">会社設定</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.3}>
            全店舗共通の設定を管理します
          </Typography>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {saved && <Alert severity="success" sx={{ mb: 2 }}>保存しました</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold" mb={0.5}>
            インボイス（適格請求書）
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            見積書・受注書のフッターに印刷されます
          </Typography>
          <Divider sx={{ mb: 2.5 }} />

          <Stack spacing={2.5}>
            <TextField
              label="適格請求書登録番号"
              size="small"
              fullWidth
              value={settings.registration_number}
              onChange={e => setSettings(s => ({ ...s, registration_number: e.target.value }))}
              placeholder="例: T1234567890123"
              inputProps={{ maxLength: 20 }}
              helperText="Tから始まる13桁の登録番号"
            />
          </Stack>

          <Box display="flex" justifyContent="flex-end" mt={3}>
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "保存中..." : "保存"}
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );
}
