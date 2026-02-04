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
    shop: null,
    customer: {},
    customer_id: null,
    new_customer: {},
    target: {},
    tradeIn: {},
    payment_method: "現金",
  });

  const [items, setItems] = useState<any[]>([]);
  const [categoryTree, setCategoryTree] = useState<any[]>([]);
  const [hasBike, setHasBike] = useState(false);
  const [staffs, setStaffs] = useState<any[]>([]);

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
    items.map((item) => ({
      name: item.name,
      category_id: item.category?.id ?? null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount: item.discount,
      tax_type: item.tax_type,
      staff: item.staff ?? null,
      sale_type: item.sale_type ?? null,
    }));

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
        credit_installments:
          formData.credit_installments !== "" ? Number(formData.credit_installments) : null,
        credit_start_month: formData.credit_start_month || null,
      },
    ];
  };

  // ==============================
  // ✅ スタッフ取得（全スタッフ：/masters/staffs/）
  // ==============================
  useEffect(() => {
    apiClient
      .get("/masters/staffs/")
      .then((res) => {
        const data = res.data?.results ?? res.data ?? [];
        setStaffs(data);
      })
      .catch(console.error);
  }, []);

  // ==============================
  // category tree ロード（parent を付与）
  // ==============================
  const attachParents = (nodes: any[], parent: any = null): any[] =>
    (nodes || []).map((n) => {
      const node = { ...n, parent };
      node.children = attachParents(n.children || [], node);
      return node;
    });

  useEffect(() => {
    apiClient.get("/categories/tree/").then((res) => {
      const data = res.data.results || res.data;
      setCategoryTree(attachParents(data));
    });
  }, []);

  const findCategoryById = (nodes: any[], id: number): any | null => {
    for (const n of nodes) {
      if (n.id === id) return n;
      const found = findCategoryById(n.children || [], id);
      if (found) return found;
    }
    return null;
  };

  // ==============================
  // 見積→受注で返ってくる {category:{id,name}} を
  // tree にあるフルnode（parent付き）に復元する
  // ==============================
  useEffect(() => {
    if (!categoryTree.length) return;
    if (!items.length) return;

    setItems((prev) =>
      prev.map((item) => {
        if (!item.category?.id) return item;

        // すでに parent があれば復元済み
        if (item.category.parent) return item;

        const fullCategory = findCategoryById(categoryTree, item.category.id);
        if (!fullCategory) return item;

        return {
          ...item,
          category: fullCategory,
          category_id: fullCategory.id,
        };
      })
    );
  }, [categoryTree, items.length]);

  // === 所属店舗の自動セット（受注用）===
  useEffect(() => {
    const initForm = async () => {
      try {
        const userRes = await apiClient.get("/auth/user/");
        const user = userRes.data;

        setFormData((prev: any) => ({
          ...prev,
          shop: user.shop_id || null,
          shop_name: user.shop_name || "",
        }));
      } catch (err: any) {
        console.error("❌ 初期ロード失敗:", err?.response?.data || err);
      }
    };

    initForm();
  }, []);

  // ==============================
  // 初期ロード（見積 → 受注）
  // ==============================
  useEffect(() => {
    const init = async () => {
      try {
        if (fromEstimate) {
          const res = await apiClient.post("/orders/prepare-from-estimate/", {
            estimate_id: fromEstimate,
          });

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
              birthdate: customer.birthdate || null,
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

    const hasAnyKey = !!c?.name || !!c?.kana || !!c?.phone || !!c?.mobile_phone || !!c?.email;
    if (!hasAnyKey) return false;

    const res = await apiClient.post("/customers/similar/", {
      name: c?.name || null,
      kana: c?.kana || null,
      phone: c?.phone || null,
      mobile_phone: c?.mobile_phone || null,
      email: c?.email || null,
      address: c?.address || null,
    });

    if (res.data.has_similar) {
      setSimilarCandidates(res.data.candidates || []);
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

      if (!formData.customer_id && !forceUseExistingCustomer) {
        const hasSimilar = await checkSimilarCustomer();
        if (hasSimilar) {
          setLoading(false);
          return;
        }
      }

      const payload: any = {
        estimate: estimateId ?? null,
        shop: formData.shop,    
        order_date: formData.order_date,
        payment_method: formData.payment_method,
        items: buildItemsPayload(items),
        payments: buildPaymentPayload(formData),
        target_vehicle: formData.target || null,
        trade_in_vehicle: formData.tradeIn || null,
      };

      if (formData.customer_id) payload.customer_id = formData.customer_id;
      else payload.new_customer = formData.new_customer;

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
