"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Paper,
  Divider,
  Button,
  CircularProgress,
} from "@mui/material";
import apiClient from "@/lib/apiClient";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

import BasicInfoForm from "@/components/orders/BasicInfoForm";
import OrderItemsForm from "@/components/orders/OrderItemsForm";
import VehicleInfoForm from "@/components/orders/VehicleInfoForm";
import OrderPaymentForm from "@/components/orders/OrderPaymentForm";

export default function OrderEditPage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState<any>({
    customer: {},
    new_customer: {},
    target: {},
    tradeIn: {},
    payment_method: "現金",
  });

  const [items, setItems] = useState<any[]>([]);
  const [hasBike, setHasBike] = useState(false);

  // 車両データの order/id を除去
  const cleanVehicle = (v: any) => {
    if (!v) return null;

    const cleaned = { ...v };
    delete cleaned.id;
    delete cleaned.order;
    delete cleaned.is_trade_in;
    return cleaned;
  };

  // ======================================================
  // 初期ロード
  // ======================================================
  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        const orderRes = await apiClient.get(`/orders/${id}/`);
        const order = orderRes.data;

        const { customer, items: orderItems, vehicles, payments } = order;

        // 明細
        setItems(orderItems || []);

        // --- 車両データ仕分け ---
        let target = {};
        let tradeIn = {};

        if (vehicles && Array.isArray(vehicles)) {
          vehicles.forEach((v) => {
            const normalized = {
              ...v,
              manufacturer: v.manufacturer?.id ?? null,
            };

            if (v.is_trade_in) {
              tradeIn = normalized;
            } else {
              target = normalized;
            }
          });
        }

        setHasBike(!!(target.vehicle_name || tradeIn.vehicle_name));

        const payment = payments?.[0] || {};

        setFormData({
          ...order,
          customer_id: customer?.id || null,

          // 顧客
          customer: {
            name: customer?.name || "",
            kana: customer?.kana || "",
            phone: customer?.phone || "",
            mobile_phone: customer?.mobile_phone || "",
            company: customer?.company || "",
            company_phone: customer?.company_phone || "",
            birthdate: customer?.birthdate || null,
            email: customer?.email || "",
            postal_code: customer?.postal_code || "",
            address: customer?.address || "",
            customer_class: customer?.customer_class?.id || null,
            gender: customer?.gender?.id || null,
            region: customer?.region?.id || null,
          },

          new_customer: {},

          // 車両（そのまま渡して OK → update 時に clean する）
          target,
          tradeIn,

          payment_id: payment?.id || null,
          payment_method: payment?.payment_method || "現金",
          credit_company: payment?.credit_company || "",
          credit_first_payment: payment?.credit_first_payment || "",
          credit_second_payment: payment?.credit_second_payment || "",
          credit_bonus_payment: payment?.credit_bonus_payment || "",
          credit_installments: payment?.credit_installments || "",
          credit_start_month: payment?.credit_start_month || "",
        });
      } catch (err) {
        console.error("受注ロードエラー:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // ======================================================
  // 更新処理（1発で更新できる）
  // ======================================================
  const handleUpdate = async () => {
    try {
      setLoading(true);

      // --- 顧客データ ---
      let customer_id = formData.customer_id ?? null;
      let customer_data = null;
      let new_customer = null;

      if (customer_id) {
        // 既存顧客 → 編集した内容を送る
        customer_data = formData.customer;
      } else {
        // 新規顧客
        new_customer = formData.customer;
      }

      // --- items 整形 ---
      const itemsPayload = items.map((item) => {
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

      // --- 車両 ---
      const target_vehicle = cleanVehicle(formData.target);
      const trade_in_vehicle = cleanVehicle(formData.tradeIn);

      // --- 支払い ---
      const isCredit = formData.payment_method === "クレジット";

      const paymentsPayload = [
        {
          payment_method: formData.payment_method,

          credit_company: isCredit ? formData.credit_company : null,
          credit_first_payment: isCredit
            ? Number(formData.credit_first_payment) || null
            : null,
          credit_second_payment: isCredit
            ? Number(formData.credit_second_payment) || null
            : null,
          credit_bonus_payment: isCredit
            ? Number(formData.credit_bonus_payment) || null
            : null,
          credit_installments: isCredit
            ? Number(formData.credit_installments) || null
            : null,
          credit_start_month: isCredit ? formData.credit_start_month || null : null,
        },
      ];

      // --- 最終 payload ---
      const payload = {
        shop: formData.shop,
        order_date: formData.order_date,
        payment_method: formData.payment_method,

        customer_id,
        customer_data,
        new_customer,

        items: itemsPayload,
        target_vehicle,
        trade_in_vehicle,

        payments: paymentsPayload,
      };

      // --- PUT 実行 ---
      await apiClient.put(`/orders/${id}/`, payload);

      alert("受注を更新しました！");
      router.push(`/dashboard/orders/${id}`);
    } catch (err) {
      console.error("受注更新エラー:", err.response?.data || err);
      alert("受注更新でエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };


  if (loading)
    return (
      <Box textAlign="center" mt={10}>
        <CircularProgress />
      </Box>
    );

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" fontWeight="bold" mb={3}>
          受注編集
        </Typography>

        <Paper sx={{ p: 3, mb: 3 }}>
          <BasicInfoForm formData={formData} setFormData={setFormData} />
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <OrderItemsForm
            items={items}
            setItems={setItems}
            setHasBike={setHasBike}
          />
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
          <Button variant="outlined" onClick={() => router.back()}>
            キャンセル
          </Button>
          <Button variant="contained" onClick={handleUpdate}>
            更新する
          </Button>
        </Box>
      </Box>
    </LocalizationProvider>
  );
}
