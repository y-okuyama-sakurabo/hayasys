"use client";

import {
  Box,
  Typography,
  Grid,
  TextField,
  Divider,
  Paper,
  LinearProgress,
  Collapse,
  InputAdornment,
  Chip,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { calcLine } from "@/utils/calcLine";

type Props = {
  basic: any;
  items: any[];
  global_discount: number;
  dispatch: React.Dispatch<any>;
};

const TYPES = [
  { key: "trade_in", label: "下取車",          color: "#7b5ea7" },
  { key: "cash",     label: "現金",             color: "#2e7d32" },
  { key: "card",     label: "カード",           color: "#0277bd" },
  { key: "loan",     label: "ローン",           color: "#e65100" },
  { key: "qr",       label: "QR決済",          color: "#00838f" },
  { key: "coupon",   label: "商品券・クーポン", color: "#6a1b9a" },
  { key: "transfer", label: "振込",             color: "#5d4037" },
];

export default function PaymentForm({
  basic,
  items,
  global_discount,
  dispatch,
}: Props) {
  const settlements = basic.settlements || {
    trade_in: 0,
    cash: 0,
    card: 0,
    loan: 0,
    qr: 0,
    coupon: 0,
    transfer: 0,
  };

  // ── 請求額計算 ──
  const grandTotal = (() => {
    const itemsTotal = (items || []).reduce((sum: number, item: any) => {
      const line = calcLine(item);
      return sum + line.total;
    }, 0);
    return itemsTotal - Number(global_discount || 0);
  })();

  const total = Object.values(settlements).reduce(
    (sum: number, v: any) => sum + Number(v || 0),
    0
  );
  const remaining = grandTotal - total;
  const creditAmount = Number(settlements.loan || 0);
  const isMismatch = total !== grandTotal;

  // 充当率 (0〜100)
  const fillPct = grandTotal > 0 ? Math.min(100, Math.round((total / grandTotal) * 100)) : 0;

  const handleSettlementChange = (key: string, value: number) => {
    const next = { ...settlements, [key]: value };
    const nextTotal = Object.values(next).reduce(
      (sum: number, v: any) => sum + Number(v || 0),
      0
    );
    if (nextTotal > grandTotal) return;
    dispatch({ type: "SET_BASIC", payload: { settlements: next } });
  };

  const handleCreditChange = (field: string, value: any) => {
    dispatch({ type: "SET_BASIC", payload: { [field]: value } });
  };

  return (
    <Box>
      {/* ── 請求額サマリカード ── */}
      <Paper
        variant="outlined"
        sx={{
          p: 2.5,
          mb: 3,
          bgcolor: isMismatch ? "#fff8e1" : "#f1f8e9",
          borderColor: isMismatch ? "warning.light" : "success.light",
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight="bold">
              請求額合計
            </Typography>
            <Typography variant="h5" fontWeight="bold" color="text.primary">
              ¥{grandTotal.toLocaleString()}
            </Typography>
          </Box>

          {!isMismatch && grandTotal > 0 ? (
            <Chip
              icon={<CheckCircleOutlineIcon />}
              label="支払い完了"
              color="success"
              size="small"
              variant="outlined"
            />
          ) : isMismatch && total > 0 ? (
            <Chip
              icon={<WarningAmberIcon />}
              label={`残 ¥${remaining.toLocaleString()}`}
              color="warning"
              size="small"
              variant="outlined"
            />
          ) : null}
        </Box>

        {/* プログレスバー */}
        <Box mb={1.5}>
          <Box display="flex" justifyContent="space-between" mb={0.5}>
            <Typography variant="caption" color="text.secondary">
              充当済み: ¥{total.toLocaleString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {fillPct}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={fillPct}
            color={!isMismatch && grandTotal > 0 ? "success" : "warning"}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        {/* 残額表示 */}
        {remaining > 0 && (
          <Typography variant="body2" color="warning.dark" fontWeight="bold">
            未充当: ¥{remaining.toLocaleString()}
          </Typography>
        )}
        {remaining < 0 && (
          <Typography variant="body2" color="error.main" fontWeight="bold">
            超過: ¥{Math.abs(remaining).toLocaleString()}
          </Typography>
        )}
      </Paper>

      {/* ── 支払い内訳入力 ── */}
      <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" mb={1.5}>
        支払い内訳
      </Typography>

      <Grid container spacing={2} mb={3}>
        {TYPES.map((t) => (
          <Grid key={t.key} size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              fullWidth
              size="small"
              label={t.label}
              type="number"
              value={settlements[t.key] || ""}
              inputProps={{ min: 0, max: grandTotal, step: 1, style: { textAlign: "right" } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: t.color,
                        flexShrink: 0,
                      }}
                    />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">円</InputAdornment>
                ),
              }}
              onChange={(e) =>
                handleSettlementChange(t.key, Number(e.target.value))
              }
              sx={{
                "& .MuiOutlinedInput-root": {
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: t.color,
                  },
                },
                "& label.Mui-focused": { color: t.color },
              }}
            />
          </Grid>
        ))}
      </Grid>

      {/* 超過エラー */}
      {isMismatch && total > 0 && (
        <Typography variant="caption" color="warning.dark" display="block" mb={2}>
          ※ 支払い合計が請求額と一致していません（残 ¥{remaining.toLocaleString()}）
        </Typography>
      )}

      {/* ── ローン詳細 ── */}
      <Collapse in={creditAmount > 0}>
        <Divider sx={{ mb: 2.5 }} />
        <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" mb={1.5}>
          ローン詳細
        </Typography>
        <Paper variant="outlined" sx={{ p: 2, bgcolor: "#fff8f2" }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="ローン会社"
                value={basic.credit_company || ""}
                onChange={(e) =>
                  handleCreditChange("credit_company", e.target.value)
                }
              />
            </Grid>

            <Grid size={{ xs: 6, md: 3 }}>
              <TextField
                fullWidth
                size="small"
                label="支払回数"
                type="number"
                value={basic.credit_installments || ""}
                InputProps={{
                  endAdornment: <InputAdornment position="end">回</InputAdornment>,
                }}
                onChange={(e) =>
                  handleCreditChange("credit_installments", Number(e.target.value))
                }
              />
            </Grid>

            <Grid size={{ xs: 6, md: 3 }}>
              <TextField
                fullWidth
                size="small"
                label="支払開始月"
                type="month"
                InputLabelProps={{ shrink: true }}
                value={basic.credit_start_month || ""}
                onChange={(e) =>
                  handleCreditChange("credit_start_month", e.target.value)
                }
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="初回支払額"
                type="number"
                value={basic.credit_first_payment || ""}
                inputProps={{ step: 1, style: { textAlign: "right" } }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">¥</InputAdornment>,
                }}
                onChange={(e) =>
                  handleCreditChange("credit_first_payment", Number(e.target.value))
                }
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="2回目以降支払額"
                type="number"
                value={basic.credit_second_payment || ""}
                inputProps={{ step: 1, style: { textAlign: "right" } }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">¥</InputAdornment>,
                }}
                onChange={(e) =>
                  handleCreditChange("credit_second_payment", Number(e.target.value))
                }
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="ボーナス支払い額"
                type="number"
                value={basic.credit_bonus_payment || ""}
                inputProps={{ step: 1, style: { textAlign: "right" } }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">¥</InputAdornment>,
                }}
                onChange={(e) =>
                  handleCreditChange("credit_bonus_payment", Number(e.target.value))
                }
              />
            </Grid>
          </Grid>
        </Paper>
      </Collapse>
    </Box>
  );
}
