"use client";

import {
  Box,
  Typography,
  Grid,
  TextField,
} from "@mui/material";

type Props = {
  basic: any;
  items: any[];
  global_discount: number;
  dispatch: React.Dispatch<any>;
};

const TYPES = [
  { key: "trade_in", label: "下取車" },
  { key: "cash", label: "現金" },
  { key: "card", label: "カード・クーポン" },
  { key: "credit", label: "クレジット" },
  { key: "advance", label: "前受金" },
];

export default function EstimatePaymentForm({
  basic,
  items,
  global_discount,
  dispatch,
}: Props) {

  // ===============================
  // settlements 初期化
  // ===============================
  const settlements = basic.settlements || {
    trade_in: 0,
    cash: 0,
    card: 0,
    credit: 0,
    advance: 0,
  };

  // ===============================
  // 🔥 請求額計算（ここが重要）
  // ===============================
  const grandTotal = (() => {
    const itemsTotal = (items || []).reduce(
      (sum: number, item: any) => {
        const price =
          Number(item.unit_price || 0) * Number(item.quantity || 0);
        const discount = Number(item.discount || 0);
        return sum + price - discount;
      },
      0
    );

    return itemsTotal - Number(global_discount || 0);
  })();

  // ===============================
  // 内訳変更
  // ===============================
  const handleSettlementChange = (key: string, value: number) => {
    const next = {
      ...settlements,
      [key]: value,
    };

    const total = Object.values(next).reduce(
      (sum: number, v: any) => sum + Number(v || 0),
      0
    );

    // 超過防止
    if (total > grandTotal) return;

    dispatch({
      type: "SET_BASIC",
      payload: {
        settlements: next,
      },
    });
  };

  // ===============================
  // クレジット変更
  // ===============================
  const handleCreditChange = (field: string, value: any) => {
    dispatch({
      type: "SET_BASIC",
      payload: {
        [field]: value,
      },
    });
  };

  // ===============================
  // 計算
  // ===============================
  const total = Object.values(settlements).reduce(
    (sum: number, v: any) => sum + Number(v || 0),
    0
  );

  const remaining = grandTotal - total;
  const creditAmount = Number(settlements.credit || 0);

  const isMismatch = total !== grandTotal;

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight="bold" mb={2}>
        支払い内訳
      </Typography>

      {/* 内訳入力 */}
      <Grid container spacing={2}>
        {TYPES.map((t) => (
          <Grid key={t.key} size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label={t.label}
              type="number"
              value={settlements[t.key] || ""}
              inputProps={{
                min: 0,
                max: grandTotal,
              }}
              onChange={(e) =>
                handleSettlementChange(
                  t.key,
                  Number(e.target.value)
                )
              }
            />
          </Grid>
        ))}
      </Grid>

      {/* 合計・残額 */}
      <Box mt={2}>

        <Typography fontWeight="">
          請求額: {grandTotal.toLocaleString()} 円
        </Typography>
        <Typography fontWeight="bold">
          合　計: {total.toLocaleString()} 円
        </Typography>



        <Typography
          color={remaining < 0 ? "error" : "primary"}
          fontWeight="bold"
        >
          残　額: {remaining.toLocaleString()} 円
        </Typography>

        {isMismatch && (
          <Typography color="error">
            ※支払い合計が請求額と一致していません
          </Typography>
        )}
      </Box>

      {/* クレジット詳細 */}
      {creditAmount > 0 && (
        <Box mt={3} p={2} border="1px solid #ccc" borderRadius={2}>
          <Typography variant="subtitle2" gutterBottom>
            クレジット詳細
          </Typography>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="クレジット会社"
                value={basic.credit_company || ""}
                onChange={(e) =>
                  handleCreditChange("credit_company", e.target.value)
                }
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="回数"
                type="number"
                value={basic.credit_installments || ""}
                onChange={(e) =>
                  handleCreditChange(
                    "credit_installments",
                    Number(e.target.value)
                  )
                }
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="初回支払額"
                type="number"
                value={basic.credit_first_payment || ""}
                onChange={(e) =>
                  handleCreditChange(
                    "credit_first_payment",
                    Number(e.target.value)
                  )
                }
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="2回目以降支払額"
                type="number"
                value={basic.credit_second_payment || ""}
                onChange={(e) =>
                  handleCreditChange(
                    "credit_second_payment",
                    Number(e.target.value)
                  )
                }
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="ボーナス支払い額"
                type="number"
                value={basic.credit_bonus_payment || ""}
                onChange={(e) =>
                  handleCreditChange(
                    "credit_bonus_payment",
                    Number(e.target.value)
                  )
                }
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                type="month"
                label="支払い開始月"
                InputLabelProps={{ shrink: true }}
                value={basic.credit_start_month || ""}
                onChange={(e) =>
                  handleCreditChange(
                    "credit_start_month",
                    e.target.value
                  )
                }
              />
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
}