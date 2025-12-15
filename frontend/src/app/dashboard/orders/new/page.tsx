"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Box, Typography, Paper, Divider, Button } from "@mui/material";
import apiClient from "@/lib/apiClient";
import dayjs from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

import BasicInfoForm from "@/components/orders/BasicInfoForm";
import OrderItemsForm from "@/components/orders/OrderItemsForm";
import VehicleInfoForm from "@/components/orders/VehicleInfoForm";
import OrderPaymentForm from "@/components/orders/OrderPaymentForm";

export default function OrderNewPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const fromEstimate = searchParams.get("from_estimate");

  const [loading, setLoading] = useState(true);
  const [estimateId, setEstimateId] = useState<number | null>(null);

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

  // ================================
  // Item → product_id 整形（共通処理）
  // ================================
  const buildItemsPayload = (items: any[]) => {
    return items.map((item) => {
      const product_id =
        typeof item.product === "object"
          ? item.product.id
          : item.product ?? null;

      const cleaned = { ...item };
      delete cleaned.product;

      return {
        ...cleaned,
        product_id,
      };
    });
  };

  // ================================
  // カテゴリ判定
  // ================================
  useEffect(() => {
    if (!items || items.length === 0) {
      setHasBike(false);
      return;
    }

    const isBike = items.some((item: any) => {
      // ① prepare-from-estimate パターン：item.category が直である
      if (item.category?.large === "バイク") {
        return true;
      }

      // ② product がオブジェクトのパターン：product.small.middle.large.name
      const largeFromProduct =
        item.product?.small?.middle?.large?.name;
      if (largeFromProduct === "バイク") {
        return true;
      }

      // ③ product が ID だけの場合 → 判定できないので false
      return false;
    });

    setHasBike(isBike);
  }, [items]);


  // ================================
  // 初期ロード
  // ================================
  useEffect(() => {
    const init = async () => {
      try {
        if (fromEstimate) {
          const res = await apiClient.post("/orders/prepare-from-estimate/", {
            estimate_id: fromEstimate,
          });

          const d = res.data;
          setEstimateId(Number(fromEstimate));
          setItems(d.items);

          const payment = d.payment?.[0] || {};

          // 顧客情報
          const customer = d.customer_candidate || {};

          setFormData((prev: any) => ({
            ...prev,
            customer: {
              name: customer.name || "",
              kana: customer.kana || "",
              phone: customer.phone || "",
              mobile_phone: customer.mobile_phone || "",
              company: customer.company || "",
              company_phone: customer.company_phone || "",
              birthdate: customer.birthdate || "",
              email: customer.email || "",
              postal_code: customer.postal_code || "",
              address: customer.address || "",
              customer_class: customer.customer_class?.id || null,
              gender: customer.gender?.id || null,
              region: customer.region?.id || null,
            },

            new_customer: {
              name: customer.name || "",
              kana: customer.kana || "",
              phone: customer.phone || "",
              mobile_phone: customer.mobile_phone || "",
              company: customer.company || "",
              company_phone: customer.company_phone || "",
              birthdate: customer.birthdate || "",
              email: customer.email || "",
              postal_code: customer.postal_code || "",
              address: customer.address || "",
              customer_class: customer.customer_class?.id || null,
              gender: customer.gender?.id || null,
              region: customer.region?.id || null,
            },

            customer_id: null, // 新規作成扱い

            target: d.target_vehicle || {},
            tradeIn: d.trade_in_vehicle || {},

            payment_method: payment.payment_method || "現金",
            credit_company: payment.credit_company || "",
            credit_first_payment: payment.credit_first_payment || "",
            credit_second_payment: payment.credit_second_payment || "",
            credit_bonus_payment: payment.credit_bonus_payment || "",
            credit_installments: payment.credit_installments || "",
            credit_start_month: payment.credit_start_month || "",
          }));

          setLoading(false);
          return;
        }

        // 新規ゼロ
        const userRes = await apiClient.get("/auth/user/");
        const user = userRes.data;

        setFormData((prev: any) => ({
          ...prev,
          shop_id: user.shop_id,
          new_customer: {},
          customer_id: null,
        }));

      } catch (err) {
        console.error("初期ロードエラー:", err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [fromEstimate]);

  // ================================
  // 保存
  // ================================
  const handleSubmit = async () => {
    try {
      setLoading(true);

      const payload: any = {
        estimate: estimateId ?? null,
        order_date: formData.order_date,
        payment_method: formData.payment_method,

        items: buildItemsPayload(items),

        payments: [
          {
            payment_method: formData.payment_method,
            credit_company: formData.credit_company,
            credit_first_payment: formData.credit_first_payment,
            credit_second_payment: formData.credit_second_payment,
            credit_bonus_payment: formData.credit_bonus_payment,
            credit_installments: formData.credit_installments,
            credit_start_month: formData.credit_start_month,
          },
        ],

        target_vehicle: formData.target || null,
        trade_in_vehicle: formData.tradeIn || null,
      };

      // -------------------------
      // 顧客情報
      // -------------------------
      if (formData.customer_id) {
        payload.customer_id = formData.customer_id;
      } else if (formData.new_customer?.name?.trim()) {
        payload.new_customer = formData.new_customer;
      } else {
        alert("顧客を選択するか、入力してください。");
        setLoading(false);
        return;
      }

      const res = await apiClient.post("/orders/", payload);

      alert("受注を作成しました");
      router.push(`/dashboard/orders/${res.data.id}`);

    } catch (err: any) {
      console.error("受注作成エラー:", err.response?.data || err);
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
          <Button variant="outlined" color="secondary" onClick={() => router.back()}>
            キャンセル
          </Button>
          <Button variant="contained" color="primary" onClick={handleSubmit}>
            受注を作成
          </Button>
        </Box>
      </Box>
    </LocalizationProvider>
  );
}
