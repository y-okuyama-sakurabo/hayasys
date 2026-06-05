"use client";

import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, LinearProgress,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";

type Props = {
  open: boolean;
  countdown: number;   // 秒
  onContinue: () => void;
  onLogout: () => void;
};

const WARNING_SECONDS = 2 * 60; // 2分

export default function InactivityWarningDialog({
  open, countdown, onContinue, onLogout,
}: Props) {
  const progress = (countdown / WARNING_SECONDS) * 100;
  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;
  const timeStr = mins > 0
    ? `${mins}分${secs.toString().padStart(2, "0")}秒`
    : `${secs}秒`;

  return (
    <Dialog open={open} maxWidth="xs" fullWidth disableEscapeKeyDown>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, pb: 1 }}>
        <AccessTimeIcon color="warning" />
        セッションがまもなく終了します
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" mb={2}>
          しばらく操作がなかったため、自動的にログアウトします。
          続けて使用する場合は「続ける」を押してください。
        </Typography>

        <Box sx={{ mb: 1 }}>
          <LinearProgress
            variant="determinate"
            value={progress}
            color={countdown <= 30 ? "error" : "warning"}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        <Typography
          variant="h6"
          align="center"
          fontWeight="bold"
          color={countdown <= 30 ? "error.main" : "text.primary"}
        >
          {timeStr} 後にログアウト
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button
          variant="outlined"
          color="inherit"
          onClick={onLogout}
          size="small"
        >
          今すぐログアウト
        </Button>
        <Button
          variant="contained"
          onClick={onContinue}
          autoFocus
        >
          続ける
        </Button>
      </DialogActions>
    </Dialog>
  );
}
