"use client";

import {
  Box,
  Typography,
  Grid,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
} from "@mui/material";

type Props = {
  basic: any;
  dispatch: React.Dispatch<any>;
};

export default function EstimatePaymentForm({
  basic,
  dispatch,
}: Props) {
  const handleChange = (field: string, value: any) => {
    dispatch({
      type: "SET_BASIC",
      payload: {
        [field]: value,
      },
    });
  };

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight="bold" mb={2}>
        支払い情報
      </Typography>

      {/* 支払い方法 */}
      <RadioGroup
        row
        value={basic.payment_method || "現金"}
        onChange={(e) =>
          handleChange("payment_method", e.target.value)
        }
      >
        <FormControlLabel value="現金" control={<Radio />} label="現金" />
        <FormControlLabel
          value="クレジット"
          control={<Radio />}
          label="クレジット"
        />
        <FormControlLabel value="請求書" control={<Radio />} label="請求書" />
      </RadioGroup>

      {/* クレジット詳細 */}
      {basic.payment_method === "クレジット" && (
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
                  handleChange("credit_company", e.target.value)
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
                  handleChange(
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
                  handleChange(
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
                  handleChange(
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
                  handleChange(
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
                  handleChange(
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
