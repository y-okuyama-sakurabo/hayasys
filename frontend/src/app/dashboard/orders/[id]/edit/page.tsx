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
    target: null,
    tradeIn: null,
    payment_method: "現金",
  });

  const [items, setItems] = useState<any[]>([]);
  const [hasBike, setHasBike] = useState(false);
  const [staffs, setStaffs] = useState<any[]>([]);

  // ============================
  // スタッフ一覧（全店舗共通）
  // ============================
  useEffect(() => {
    apiClient
      .get("/masters/staffs/")
      .then((res) => setStaffs(res.data.results || res.data))
      .catch(console.error);
  }, []);

  // ============================
  // カテゴリツリー
  // ============================
  const [categoryTree, setCategoryTree] = useState<any[]>([]);

  const attachParents = (nodes: any[], parent: any = null): any[] =>
    (nodes || []).map((n) => {
      const node = { ...n, parent };
      node.children = attachParents(n.children || [], node);
      return node;
    });

  const findCategoryById = (nodes: any[], id: number): any | null => {
    for (const n of nodes) {
      if (n.id === id) return n;
      const found = findCategoryById(n.children || [], id);
      if (found) return found;
    }
    return null;
  };

  useEffect(() => {
    apiClient.get("/categories/tree/").then((res) => {
      const data = res.data.results || res.data;
      setCategoryTree(attachParents(data));
    });
  }, []);

  // ============================
  // 初期ロード
  // ============================
  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        const res = await apiClient.get(`/orders/${id}/`);
        const order = res.data;

        const { customer, items: orderItems, vehicles, payments } = order;

        setItems(orderItems || []);

        // --- 車両 ---
        let target: any = null;
        let tradeIn: any = null;

        vehicles?.forEach((v: any) => {
          const normalized = {
            ...v,
            manufacturer: v.manufacturer?.id ?? null,
          };

          if (v.is_trade_in) tradeIn = normalized;
          else target = normalized;
        });

        setHasBike(!!(target?.vehicle_name || tradeIn?.vehicle_name));

        const payment = payments?.[0] ?? null;

        setFormData({
          ...order,
          shop: order.shop?.id ?? null,
          customer_id: customer?.id || null,

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

          target,
          tradeIn,

          payment_method: payment?.payment_method || "現金",
          credit_company: payment?.credit_company || "",
          credit_first_payment: payment?.credit_first_payment || "",
          credit_second_payment: payment?.credit_second_payment || "",
          credit_bonus_payment: payment?.credit_bonus_payment || "",
          credit_installments: payment?.credit_installments || "",
          credit_start_month: payment?.credit_start_month || "",
        });
      } catch (e) {
        console.error("受注ロードエラー:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // ============================
  // category 復元（Edit 用）
  // ============================
  useEffect(() => {
    if (!categoryTree.length) return;

    setItems((prev) =>
      prev.map((item) => {
        if (!item.category?.id) return item;
        if (item.category.parent) return item;

        const full = findCategoryById(categoryTree, item.category.id);
        if (!full) return item;

        return { ...item, category: full };
      })
    );
  }, [categoryTree]);

  // ============================
  // 更新
  // ============================
  const handleUpdate = async () => {
    try {
      setLoading(true);

      const itemsPayload = items.map((item) => ({
        name: item.name,
        category_id: item.category?.id ?? null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount,
        tax_type: item.tax_type,
        staff: item.staff ?? null,
        sale_type: item.sale_type ?? null,
      }));

      const payload = {
        order_date: formData.order_date,
        payment_method: formData.payment_method,
        customer_id: formData.customer_id ?? null,
        customer_data: formData.customer_id ? formData.customer : null,
        new_customer: formData.customer_id ? null : formData.customer,
        items: itemsPayload,
        target_vehicle: formData.target,
        trade_in_vehicle: formData.tradeIn,
        payments: [
          {
            payment_method: formData.payment_method,
            credit_company:
              formData.payment_method === "クレジット"
                ? formData.credit_company
                : null,
            credit_first_payment:
              formData.payment_method === "クレジット"
                ? Number(formData.credit_first_payment) || null
                : null,
            credit_second_payment:
              formData.payment_method === "クレジット"
                ? Number(formData.credit_second_payment) || null
                : null,
            credit_bonus_payment:
              formData.payment_method === "クレジット"
                ? Number(formData.credit_bonus_payment) || null
                : null,
            credit_installments:
              formData.payment_method === "クレジット"
                ? Number(formData.credit_installments) || null
                : null,
            credit_start_month:
              formData.payment_method === "クレジット"
                ? formData.credit_start_month || null
                : null,
          },
        ],
      };

      await apiClient.put(`/orders/${id}/`, payload);

      alert("受注を更新しました");
      router.push(`/dashboard/orders/${id}`);
    } catch (e) {
      console.error("更新エラー:", e);
      alert("更新に失敗しました");
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
            staffs={staffs}
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
