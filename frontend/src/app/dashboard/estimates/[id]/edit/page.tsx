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
import BasicInfoForm from "@/components/estimate/BasicInfoForm";
import EstimateItemsForm from "@/components/estimate/EstimateItemsForm";
import VehicleInfoForm from "@/components/estimate/VehicleInfoForm";
import EstimatePaymentForm from "@/components/estimate/EstimatePaymentForm";

export default function EstimateEditPage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<any>({
    estimate_no: "",
    target: {},
    tradeIn: {},
    payment_method: "現金",
  });
  const [items, setItems] = useState<any[]>([]);
  const [hasBike, setHasBike] = useState(false);

  // === 初期ロード ===
  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        const [estimateRes, itemsRes, vehiclesRes, paymentRes] = await Promise.all([
          apiClient.get(`/estimates/${id}/`),
          apiClient.get(`/estimates/${id}/items/`),
          apiClient.get(`/estimates/${id}/vehicles/`).catch(() => ({ data: [] })),
          apiClient.get(`/estimates/${id}/payments/`).catch(() => ({ data: [] })),
        ]);

        const estimate = estimateRes.data;
        const itemsData = itemsRes.data.results || itemsRes.data || [];
        const vehicleList = vehiclesRes.data.results || vehiclesRes.data || [];
        const payments = paymentRes.data.results || paymentRes.data || [];

        const target = vehicleList.find((v: any) => !v.is_trade_in) || {};
        const tradeIn = vehicleList.find((v: any) => v.is_trade_in) || {};
        const payment = payments[0] || {};

        setItems(Array.isArray(itemsData) ? itemsData : []);

        // バイクカテゴリ判定
        const containsBike = itemsData.some(
          (item: any) =>
            item.product?.small?.middle?.large?.name === "バイク" ||
            item.product?.product_category?.large?.name === "バイク" ||
            item.product_category?.large?.id === 1
        );
        setHasBike(containsBike);

        setFormData({
          ...estimate,
          party_id: estimate.party?.id || null,
          shop: estimate.shop || null,
          new_party: null,
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

        console.log("編集ロード完了:", { estimate, itemsData, vehicleList, payment });
      } catch (err) {
        console.error("データ読み込みエラー:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const buildItemPayload = (item: any) => {
    return {
      category_id: item.category_id ?? item.category?.id ?? null,
      product_id: item.product?.id ?? item.product_id ?? null,

      name: item.name ?? "",
      quantity: Number(item.quantity ?? 0),
      unit_price: Number(item.unit_price ?? 0),
      discount: Number(item.discount ?? 0),
      tax_type: item.tax_type ?? "taxable",

      staff: item.staff?.id ?? item.staff ?? null,
      sale_type: item.sale_type ?? null,

    };
  };


  // === 更新処理 ===
  const handleUpdate = async () => {
    try {
      setLoading(true);

      const payload = {
        estimate_no: formData.estimate_no,
        party_id: formData.party_id || null,
        new_party: formData.new_party || null,
        shop: formData.shop?.id || formData.shop || null,
      };

      console.log("📤 見積更新 payload:", payload);
      await apiClient.put(`/estimates/${id}/`, payload);

      for (const item of items) {
        const itemPayload = buildItemPayload(item);

        if (item.id) {
          await apiClient.patch(`/estimates/${id}/items/${item.id}/`, itemPayload);
        } else {
          await apiClient.post(`/estimates/${id}/items/`, itemPayload);
        }
      }

      if (hasBike) {
        const vehicles = [];
        if (formData.target?.vehicle_name)
          vehicles.push({ ...formData.target, is_trade_in: false });
        if (formData.tradeIn?.vehicle_name)
          vehicles.push({ ...formData.tradeIn, is_trade_in: true });

        for (const v of vehicles) {
          const vehiclePayload = {
            ...v,
            estimate: Number(id),
          };

          if (v.id)
            await apiClient.patch(`/estimates/${id}/vehicles/${v.id}/`, vehiclePayload);
          else await apiClient.post(`/estimates/${id}/vehicles/`, vehiclePayload);
        }
      }

      const paymentPayload = {
        payment_method: formData.payment_method || "現金",
        credit_company:
          formData.payment_method === "クレジット"
            ? formData.credit_company || null
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
      };

      try {
        const paymentCheck = await apiClient.get(`/estimates/${id}/payments/`);
        const existing = paymentCheck.data?.[0] || paymentCheck.data?.results?.[0];

        if (existing?.id)
          await apiClient.put(`/payments/${existing.id}/`, paymentPayload);
        else await apiClient.post(`/estimates/${id}/payments/`, paymentPayload);
      } catch (err) {
        console.error("⚠️ 支払い登録・更新エラー:", err);
      }

      alert("見積を更新しました！");
      router.push(`/dashboard/estimates/${id}?_r=${Date.now()}`);
    } catch (err) {
      console.error("更新エラー:", err);
      alert("更新中にエラーが発生しました。詳細はコンソールを確認してください。");
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight="bold" mb={3}>
        見積編集
      </Typography>

      {/* 基本情報 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <BasicInfoForm formData={formData} setFormData={setFormData} />
      </Paper>

      <Divider sx={{ my: 3 }} />

      {/* 明細 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <EstimateItemsForm
          items={items}
          setItems={setItems}
          estimateId={Number(id)}
          setHasBike={setHasBike}
          formData={formData}
          setFormData={setFormData}
        />
      </Paper>

      {/* 車両情報（バイクありのみ） */}
      {hasBike && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <VehicleInfoForm
            estimateId={Number(id)}
            formData={formData}
            setFormData={setFormData}
          />
        </Paper>
      )}

      {/* 支払い情報 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <EstimatePaymentForm formData={formData} setFormData={setFormData} />
      </Paper>

      <Divider sx={{ my: 3 }} />

      {/* ボタン群 */}
      <Box display="flex" justifyContent="flex-end" gap={2}>
        <Button variant="outlined" color="secondary" onClick={() => router.back()}>
          戻る
        </Button>
        <Button variant="contained" color="primary" onClick={handleUpdate} disabled={loading}>
          {loading ? "更新中..." : "更新する"}
        </Button>
      </Box>
    </Box>
  );
}
