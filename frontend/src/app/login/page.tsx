"use client";

import { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  InputAdornment,
  IconButton,
} from "@mui/material";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { useRouter } from "next/navigation";
import { loginUser } from "@/lib/auth";
import apiClient from "@/lib/apiClient";

export default function LoginPage() {
  const router = useRouter();

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiClient.get("/auth/user/")
      .then(() => router.replace("/dashboard"))
      .catch(() => {});
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await loginUser(loginId, password);
      await apiClient.get("/auth/user/");
      router.replace("/dashboard");
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError("ログインIDまたはパスワードが正しくありません。");
      } else {
        setError("通信エラーが発生しました。もう一度お試しください。");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f5f7fa 0%, #e8edf2 100%)",
        px: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 400,
          p: { xs: 4, sm: 5 },
          borderRadius: 4,
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
        }}
      >
        {/* ロゴヘッダー */}
        <Box
          sx={{
            mx: { xs: -4, sm: -5 },
            mt: { xs: -4, sm: -5 },
            mb: 4,
            py: 3,
            borderRadius: "16px 16px 0 0",
            background: "linear-gradient(135deg, #1a237e 0%, #283593 100%)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Box
            component="img"
            src="/logo.png"
            alt="Links"
            sx={{ height: 44 }}
          />
        </Box>

        <Typography
          variant="h6"
          fontWeight="bold"
          textAlign="center"
          color="text.primary"
          mb={0.5}
        >
          ログイン
        </Typography>
        <Typography
          variant="body2"
          textAlign="center"
          color="text.secondary"
          mb={3}
        >
          アカウント情報を入力してください
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <TextField
            fullWidth
            label="ログインID"
            variant="outlined"
            size="small"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            autoComplete="username"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonOutlineIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            label="パスワード"
            type={showPassword ? "text" : "password"}
            variant="outlined"
            size="small"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlinedIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setShowPassword((v) => !v)}
                    edge="end"
                  >
                    {showPassword ? (
                      <VisibilityOffIcon fontSize="small" />
                    ) : (
                      <VisibilityIcon fontSize="small" />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button
            fullWidth
            type="submit"
            variant="contained"
            disabled={loading || !loginId || !password}
            sx={{ mt: 1, py: 1.2, borderRadius: 2, fontWeight: "bold" }}
          >
            {loading ? (
              <CircularProgress size={22} sx={{ color: "white" }} />
            ) : (
              "ログイン"
            )}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
