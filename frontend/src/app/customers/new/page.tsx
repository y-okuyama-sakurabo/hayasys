"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Divider,
} from "@mui/material";
import apiClient from "@/lib/apiClient";

import SimilarCustomerDialog from "@/components/customers/SimilarCustomerDialog";
import CustomerDetailDialog from "@/components/customers/NewCustomerDetailDialog";

export default function CustomerNewPage() {
  const router = useRouter();

  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<any>({
    name: "",
    kana: "",
    phone: "",
    mobile_phone: "",
    email: "",
    postal_code: "",
    address: "",
    company: "",
    company_phone: "",
    birthdate: null,
    customer_class: null,
    region: null,
    gender: null,
  });

  const [similarOpen, setSimilarOpen] = useState(false);
  const [similarCandidates, setSimilarCandidates] = useState<any[]>([]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const handleChange = (key: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [key]: value }));
  };

  // 類似検索
  const checkSimilar = async () => {
    if (!form.name && !form.phone && !form.email) return false;

    const res = await apiClient.post("/customers/similar/", {
      name: form.name || null,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
    });

    if (res.data?.has_similar) {
      setSimilarCandidates(res.data.candidates || []);
      setSimilarOpen(true);
      return true;
    }
    return false;
  };

  // 新規作成
  const createCustomer = async () => {
    const payload = {
      ...form,
      phone: form.phone || null,
      mobile_phone: form.mobile_phone || null,
      email: form.email || null,
      postal_code: form.postal_code || null,
      address: form.address || null,
      company: form.company || null,
      company_phone: form.company_phone || null,
    };

    const res = await apiClient.post("/customers/", payload);
    return res.data;
  };

  // 登録ボタン
  const handleSubmit = async () => {
    try {
      setSaving(true);

      const hasSimilar = await checkSimilar();
      if (hasSimilar) return;

      const created = await createCustomer();
      console.log("created=", created);       // ← id ある？
      console.log("created.id=", created?.id);
      router.push(`/dashboard/customers/${created.id}`);
    } catch (e: any) {
      console.error(e?.response?.data || e);
      alert("顧客登録に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight="bold" mb={3}>
        顧客 新規登録
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="氏名"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              fullWidth
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="カナ"
              value={form.kana}
              onChange={(e) => handleChange("kana", e.target.value)}
              fullWidth
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="電話番号"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              fullWidth
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="携帯電話"
              value={form.mobile_phone}
              onChange={(e) => handleChange("mobile_phone", e.target.value)}
              fullWidth
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="メール"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              fullWidth
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              label="郵便番号"
              value={form.postal_code}
              onChange={(e) => handleChange("postal_code", e.target.value)}
              fullWidth
            />
          </Grid>

          <Grid item xs={12} sm={8}>
            <TextField
              label="住所"
              value={form.address}
              onChange={(e) => handleChange("address", e.target.value)}
              fullWidth
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="会社名"
              value={form.company}
              onChange={(e) => handleChange("company", e.target.value)}
              fullWidth
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="会社電話"
              value={form.company_phone}
              onChange={(e) => handleChange("company_phone", e.target.value)}
              fullWidth
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Box display="flex" justifyContent="flex-end" gap={2}>
          <Button onClick={() => router.back()} disabled={saving}>
            キャンセル
          </Button>
          <Button variant="contained" onClick={handleSubmit} disabled={saving}>
            登録
          </Button>
        </Box>
      </Paper>

      {/* 類似顧客 */}
      <SimilarCustomerDialog
        open={similarOpen}
        candidates={similarCandidates}
        onSelect={async (c: any) => {
          const res = await apiClient.get(`/customers/${c.id}/`);
          setSelectedCustomer(res.data);
          setSimilarOpen(false);
          setDetailOpen(true);
        }}
        onCreateNew={async () => {
          // 類似がいても新規登録する
          setSimilarOpen(false);
          try {
            setSaving(true);
            const created = await createCustomer();
            router.push(`/dashboard/customers/${created.id}`);
          } catch (e: any) {
            console.error(e?.response?.data || e);
            alert("顧客登録に失敗しました");
          } finally {
            setSaving(false);
          }
        }}
        onClose={() => setSimilarOpen(false)}
      />

      {/* 顧客詳細 */}
      <CustomerDetailDialog
        open={detailOpen}
        customer={selectedCustomer}
        confirmLabel="この顧客を採用して詳細へ"
        onBack={() => {
          setDetailOpen(false);
          setSimilarOpen(true);
        }}
        onClose={() => setDetailOpen(false)}
        onConfirm={(customer: any) => {
          setDetailOpen(false);
          router.push(`/dashboard/customers/${customer.id}`);
        }}
      />
    </Box>
  );
}
