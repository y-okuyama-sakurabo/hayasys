"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Box, Typography, Paper, Divider, Button, CircularProgress } from "@mui/material";
import dayjs from "dayjs";
import apiClient from "@/lib/apiClient";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

import BasicInfoForm from "@/components/orders/BasicInfoForm";
import OrderItemsForm from "@/components/orders/OrderItemsForm";
import VehicleInfoForm from "@/components/orders/VehicleInfoForm";
import OrderPaymentForm from "@/components/orders/OrderPaymentForm";

import SimilarCustomerDialog from "@/components/customers/SimilarCustomerDialog";
import CustomerDetailDialog from "@/components/customers/CustomerDetailDialog";

function OrderNewInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromEstimate = searchParams.get("from_estimate");

  const [loading, setLoading] = useState(true);
  const [estimateId, setEstimateId] = useState<number | null>(null);

  // ==============================
  // フォームデータ
  // ==============================
  const [formData, setFormData] = useState<any>({
    order_date: dayjs().format("YYYY-MM-DD"),
    customer: {},
    customer_id: null,
    new_customer: {},
    target: {},
    tradeIn: {},
    payment_method: "現金",
  });

  const [items, setItems] = useState<any[]>([]);
  const [hasBike, setHasBike] = useState(false);

  // ==============================
  // 類似顧客関連 state
  // ==============================
  const [similarOpen, setSimilarOpen] = useState(false);
  const [similarCandidates, setSimilarCandidates] = useState<any[]>([]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [forceUseExistingCustomer, setForceUseExistingCustomer] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  // ==============================
  // 明細 payload 整形
  // ==============================
  const buildItemsPayload = (items: any[]) =>
    items.map((item) => {
      const product_id = typeof item.product === "object" ? item.product.id : item.product ?? null;

      const cleaned = { ...item };
      delete cleaned.product;

      return {
        ...cleaned,
        product_id,
      };
    });

  const buildPaymentPayload = (formData: any) => {
    if (formData.payment_method !== "クレジット") {
      return [{ payment_method: formData.payment_method }];
    }

    return [
      {
        payment_method: "クレジット",
        credit_company: formData.credit_company || null,
        credit_first_payment: formData.credit_first_payment || null,
        credit_second_payment: formData.credit_second_payment || null,
        credit_bonus_payment: formData.credit_bonus_payment || null,
        credit_installments: formData.credit_installments !== "" ? Number(formData.credit_installments) : null,
        credit_start_month: formData.credit_start_month || null,
      },
    ];
  };

  // ==============================
  // 初期ロード（見積 → 受注）
  // ==============================
  useEffect(() => {
    const init = async () => {
      try {
        if (fromEstimate) {
          const res = await apiClient.post("/orders/prepare-from-estimate/", { estimate_id: fromEstimate });

          const d = res.data;
          setEstimateId(Number(fromEstimate));
          setItems(d.items || []);

          const customer = d.customer_candidate || {};

          setFormData((prev: any) => ({
            ...prev,
            customer,
            new_customer: {
              name: customer.name || "",
              kana: customer.kana || "",
              phone: customer.phone || "",
              mobile_phone: customer.mobile_phone || "",
              email: customer.email || "",
              postal_code: customer.postal_code || "",
              address: customer.address || "",
              company: customer.company || "",
              company_phone: customer.company_phone || "",
              birthdate: customer.birthdate || "",
              customer_class: customer.customer_class?.id || null,
              gender: customer.gender?.id || null,
              region: customer.region?.id || null,
            },
            customer_id: null,
          }));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [fromEstimate]);

  // 🔥 顧客確定後、自動で受注作成
  useEffect(() => {
    if (!forceUseExistingCustomer) return;
    if (!formData.customer_id) return;

    // 二重送信防止
    setForceUseExistingCustomer(false);

    handleSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceUseExistingCustomer, formData.customer_id]);

  // ==============================
  // 類似顧客検索（保存前）
  // ==============================
  const checkSimilarCustomer = async () => {
    const c = formData.new_customer;
    if (!c?.name) return false;

    const res = await apiClient.post("/customers/similar/", {
      name: c.name,
      phone: c.phone,
      email: c.email,
      address: c.address,
    });

    if (res.data.has_similar) {
      setSimilarCandidates(res.data.candidates);
      setSimilarOpen(true);
      return true;
    }
    return false;
  };

  // ==============================
  // 保存
  // ==============================
  const handleSubmit = async () => {
    try {
      setLoading(true);

      // 🔥 類似顧客チェック（新規顧客時のみ）
      if (!formData.customer_id && !forceUseExistingCustomer) {
        const hasSimilar = await checkSimilarCustomer();
        if (hasSimilar) {
          setLoading(false);
          return;
        }
      }

      const payload: any = {
        estimate: estimateId ?? null,
        order_date: formData.order_date,
        payment_method: formData.payment_method,
        items: buildItemsPayload(items),
        payments: buildPaymentPayload(formData),
        target_vehicle: formData.target || null,
        trade_in_vehicle: formData.tradeIn || null,
      };

      if (formData.customer_id) {
        payload.customer_id = formData.customer_id;
      } else {
        payload.new_customer = formData.new_customer;
      }

      const res = await apiClient.post("/orders/", payload);
      router.push(`/dashboard/orders/${res.data.id}`);
    } catch (e) {
      console.error(e);
      alert("受注作成に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" fontWeight="bold" mb={3}>
          受注作成 {estimateId && `(見積ID: ${estimateId})`}
        </Typography>

        <Paper sx={{ p: 3, mb: 3 }}>
          <BasicInfoForm formData={formData} setFormData={setFormData} />
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <OrderItemsForm items={items} setItems={setItems} setHasBike={setHasBike} />
        </Paper>

        {hasBike && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <VehicleInfoForm formData={formData} setFormData={setFormData} />
          </Paper>
        )}

        <Paper sx={{ p: 3, mb: 3 }}>
          <OrderPaymentForm formData={formData} setFormData={setFormData} />
        </Paper>

        <Divider sx={{ my: 3 }} />

        <Box display="flex" justifyContent="flex-end" gap={2}>
          <Button onClick={() => router.back()}>キャンセル</Button>
          <Button variant="contained" onClick={handleSubmit}>
            受注を作成
          </Button>
        </Box>

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
          onCreateNew={() => {
            setSimilarOpen(false);
          }}
          onClose={() => setSimilarOpen(false)}
        />

        {/* 顧客詳細 */}
        <CustomerDetailDialog
          open={detailOpen}
          customer={selectedCustomer}
          onBack={() => {
            setDetailOpen(false);
            setSimilarOpen(true);
          }}
          onClose={() => setDetailOpen(false)}
          onConfirm={() => {
            setFormData((prev: any) => ({
              ...prev,
              customer_id: selectedCustomer.id,
              customer: selectedCustomer,
              new_customer: {},
            }));

            setForceUseExistingCustomer(true);
            setDetailOpen(false);
          }}
        />
      </Box>
    </LocalizationProvider>
  );
}

export default function OrderNewPage() {
  return (
    <Suspense
      fallback={
        <Box display="flex" justifyContent="center" mt={10}>
          <CircularProgress />
        </Box>
      }
    >
      <OrderNewInner />
    </Suspense>
  );
}
