"use client";

import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Typography,
  Divider,
} from "@mui/material";

type Props = {
  open: boolean;
  customer: any | null;
  onConfirm: () => void;
  onBack: () => void;
  onClose?: () => void;
};

export default function CustomerDetailDialog({
  open,
  customer,
  onConfirm,
  onBack,
  onClose,
}: Props) {
  if (!customer) return null;

  return (
    <Dialog open={open} onClose={onBack} maxWidth="sm" fullWidth>
      <DialogTitle>顧客詳細の確認</DialogTitle>

      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" mb={2}>
          入力された内容と似た顧客が見つかりました。
          この顧客で間違いないかご確認ください。
        </Typography>

        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <Typography variant="subtitle2">氏名</Typography>
            <Typography>{customer.name || "-"}</Typography>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Typography variant="subtitle2">カナ</Typography>
            <Typography>{customer.kana || "-"}</Typography>
          </Grid>

          <Grid size={{ xs: 6 }}>
            <Typography variant="subtitle2">電話番号</Typography>
            <Typography>{customer.phone || "-"}</Typography>
          </Grid>

          <Grid size={{ xs: 6 }}>
            <Typography variant="subtitle2">携帯電話</Typography>
            <Typography>{customer.mobile_phone || "-"}</Typography>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Typography variant="subtitle2">メールアドレス</Typography>
            <Typography>{customer.email || "-"}</Typography>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Typography variant="subtitle2">住所</Typography>
            <Typography>{customer.address || "-"}</Typography>
          </Grid>

          <Grid size={{ xs: 6 }}>
            <Typography variant="subtitle2">会社名</Typography>
            <Typography>{customer.company || "-"}</Typography>
          </Grid>

          <Grid size={{ xs: 6 }}>
            <Typography variant="subtitle2">会社電話</Typography>
            <Typography>{customer.company_phone || "-"}</Typography>
          </Grid>

          <Grid size={{ xs: 6 }}>
            <Typography variant="subtitle2">顧客区分</Typography>
            <Typography>
              {customer.customer_class?.name || "-"}
            </Typography>
          </Grid>

          <Grid size={{ xs: 6 }}>
            <Typography variant="subtitle2">地域</Typography>
            <Typography>
              {customer.region?.name || "-"}
            </Typography>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onBack} color="secondary">
          戻る
        </Button>

        <Button
          onClick={onConfirm}
          variant="contained"
          color="primary"
        >
          この顧客で受注を作成
        </Button>
      </DialogActions>
    </Dialog>
  );
}
