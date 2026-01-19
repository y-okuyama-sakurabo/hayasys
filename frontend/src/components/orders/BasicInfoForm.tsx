"use client";

import { useEffect } from "react";
import { Typography, Paper, Grid } from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import OrderPartySelector from "@/components/orders/OrderPartySelector";

export default function BasicInfoForm({ formData, setFormData }: any) {

  const isEdit = !!formData.id; // ★新規 or 編集判定

  // 編集の場合のみ初期値セット
  useEffect(() => {
    if (!isEdit) return; // ★新規はスキップ

    const c = formData?.customer;
    if (!c) return;

    setFormData((prev: any) => ({
      ...prev,
      customer_id: c.id ?? null,
      customer_data: { ...c },
      new_customer: null,
    }));
  }, [formData.customer]);

  // 既存顧客選択
  const handleSelectParty = (party: any) => {
    setFormData((prev: any) => ({
      ...prev,
      customer_id: party.id,
      customer_data: { ...party },
      new_customer: null,
    }));
  };

  // 顧客入力（新規 or 編集で保存先を変える）
  const handleEditCustomer = (field: string, value: any) => {
    setFormData((prev: any) => {
      if (isEdit) {
        // 編集 → customer_data を更新
        return {
          ...prev,
          customer_data: {
            ...prev.customer_data,
            [field]: value,
          },
        };
      } else {
        // 新規 → new_customer を更新
        return {
          ...prev,
          new_customer: {
            ...prev.new_customer,
            [field]: value,
          },
          customer_id: null, // 新規扱い
        };
      }
    });
  };

  return (
    
    <Paper sx={{ p: 2, mb: 3 }}>
      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
        <DatePicker
          label="受注日"
          value={formData.order_date ? dayjs(formData.order_date) : dayjs()}
          onChange={(d) => 
            setFormData((prev: any) => ({
              ...prev,
              order_date: d ? d.format("YYYY-MM-DD") : null,
            }))
          }
          slotProps={{ textField: { fullWidth: true } }}
        />
      </Grid>
      <Typography variant="subtitle1" fontWeight="bold" mb={1}>
        顧客情報
      </Typography>

      <OrderPartySelector
        customer={isEdit ? formData.customer_data : formData.new_customer}
        onCustomerChange={handleEditCustomer}
        onSelectParty={handleSelectParty}
      />
    </Paper>
  );
}
