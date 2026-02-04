"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Box,
  Typography,
  Paper,
  Divider,
  Button,
  CircularProgress,
} from "@mui/material";

import BasicInfoForm from "@/components/estimate/BasicInfoForm";
import EstimateItemsForm from "@/components/estimate/EstimateItemsForm";
import VehicleInfoForm from "@/components/estimate/VehicleInfoForm";
import EstimatePaymentForm from "@/components/estimate/EstimatePaymentForm";
import apiClient from "@/lib/apiClient";

function EstimateNewInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ?copy_from=ID
  const copyFrom = useMemo(() => searchParams.get("copy_from"), [searchParams]);

  const [formData, setFormData] = useState<any>({
    estimate_no: "",
    target: {},
    tradeIn: {},
    payment_method: "現金",
  });

  const [items, setItems] = useState<any[]>([]);
  const [estimateId, setEstimateId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasBike, setHasBike] = useState(false);

  // ===== 送信用payloadを作る（循環参照を含めない） =====
  const buildEstimatePayload = (fd: any) => {
    return {
      estimate_no: fd.estimate_no ?? "",
      party_id: fd.party_id ?? fd.party?.id ?? null,
      new_party: fd.new_party ?? null,
      shop: fd.shop?.id ?? fd.shop ?? null,

      // BasicInfoForm側で必要なフィールドが他にもあるならここに明示で追加
      // 例: staff, memo, valid_until, etc...
    };
  };

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

      saveAsProduct: item.saveAsProduct === true,
    };
  };

  // === 見積番号と所属店舗の自動セット ===
  useEffect(() => {
    const initForm = async () => {
      try {
        const userRes = await apiClient.get("/auth/user/");
        const user = userRes.data;

        const res = await apiClient.get("/estimates/next-no/");
        const nextNo = res.data.next_estimate_no;

        setFormData((prev: any) => ({
          ...prev,
          estimate_no: nextNo,
          shop: user.shop_id || null,
          shop_name: user.shop_name || "",
        }));
      } catch (err: any) {
        console.error("❌ 初期ロード失敗:", err?.response?.data || err);
      }
    };

    initForm();
  }, []);

  // === 複製元のデータ読み込み ===
  useEffect(() => {
    if (!copyFrom) return;

    const fetchCopySource = async () => {
      try {
        const [estimateRes, itemsRes, vehiclesRes, paymentsRes] =
          await Promise.all([
            apiClient.get(`/estimates/${copyFrom}/`),
            apiClient.get(`/estimates/${copyFrom}/items/`),
            apiClient
              .get(`/estimates/${copyFrom}/vehicles/`)
              .catch(() => ({ data: [] })),
            apiClient
              .get(`/estimates/${copyFrom}/payments/`)
              .catch(() => ({ data: [] })),
          ]);

        const estimate = estimateRes.data;
        const itemsData = itemsRes.data.results || itemsRes.data || [];
        const vehicles = vehiclesRes.data.results || vehiclesRes.data || [];
        const payments = paymentsRes.data.results || paymentsRes.data || [];
        const payment = payments[0] || {};

        const target = vehicles.find((v: any) => !v.is_trade_in) || {};
        const tradeIn = vehicles.find((v: any) => v.is_trade_in) || {};

        setFormData((prev: any) => ({
          ...prev,
          ...estimate,
          estimate_no: prev.estimate_no, // 新番号を維持
          target,
          tradeIn,
          payment_method: payment.payment_method || "現金",
          credit_company: payment.credit_company || "",
          credit_first_payment: payment.credit_first_payment || "",
          credit_second_payment: payment.credit_second_payment || "",
          credit_bonus_payment: payment.credit_bonus_payment || "",
          credit_installments: payment.credit_installments || "",
          credit_start_month: payment.credit_start_month || "",
        }));

        setItems(itemsData);

        setHasBike(
          itemsData.some(
            (item: any) =>
              item.product?.small?.middle?.large?.name === "バイク" ||
              item.product?.product_category?.large?.name === "バイク"
          )
        );

        console.log("✅ 複製元読み込み完了:", {
          estimate,
          itemsDataCount: Array.isArray(itemsData) ? itemsData.length : 0,
          vehiclesCount: Array.isArray(vehicles) ? vehicles.length : 0,
          payment,
        });
      } catch (err) {
        console.error("❌ 複製元の読み込みエラー:", err);
      }
    };

    fetchCopySource();
  }, [copyFrom]);

  // === 保存処理 ===
  const handleSubmit = async () => {
    console.log("🟢 保存処理開始:", formData, items);

    try {
      setLoading(true);

      // 1️⃣ 見積ヘッダー登録（安全payload）
      const estimatePayload = buildEstimatePayload(formData);
      const res = await apiClient.post("/estimates/", estimatePayload);
      const newEstimateId = res.data.id;
      setEstimateId(newEstimateId);

      // 2️⃣ 明細登録（安全payload）
      for (const item of items) {
        const itemPayload = buildItemPayload(item);
        await apiClient.post(`/estimates/${newEstimateId}/items/`, itemPayload);
      }

      // 3️⃣ 車両情報登録（バイクが含まれている場合のみ）
      if (hasBike) {
        const vehiclesToCreate: any[] = [];
        if (formData.target?.vehicle_name) {
          vehiclesToCreate.push({ ...formData.target, is_trade_in: false });
        }
        if (formData.tradeIn?.vehicle_name) {
          vehiclesToCreate.push({ ...formData.tradeIn, is_trade_in: true });
        }

        for (const v of vehiclesToCreate) {
          // ここも、不要なオブジェクトが入ってたら落ちる可能性あるので必要なら絞る
          await apiClient.post(`/estimates/${newEstimateId}/vehicles/`, {
            estimate: newEstimateId,
            ...v,
          });
        }
      }

      // 4️⃣ 支払い情報登録
      const paymentPayload = {
        payment_method: formData.payment_method,
        credit_company: formData.credit_company,
        credit_first_payment: formData.credit_first_payment,
        credit_second_payment: formData.credit_second_payment,
        credit_bonus_payment: formData.credit_bonus_payment,
        credit_installments: formData.credit_installments,
        credit_start_month: formData.credit_start_month,
      };

      console.log("支払い情報送信:", paymentPayload);
      await apiClient.post(
        `/estimates/${newEstimateId}/payments/`,
        paymentPayload
      );

      alert("✅ 見積を登録しました！");
      router.push(`/dashboard/estimates/${newEstimateId}`);
    } catch (err: any) {
      console.error("登録エラー詳細:", err?.response?.data || err);
      alert("登録に失敗しました。詳細はコンソールを確認してください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight="bold" mb={3}>
        見積作成{copyFrom && "（複製）"}
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
          estimateId={estimateId}
          setHasBike={setHasBike}
          formData={formData}
          setFormData={setFormData}
        />
      </Paper>

      {/* バイク関連フォーム */}
      {hasBike && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <VehicleInfoForm formData={formData} setFormData={setFormData} />
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
          キャンセル
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "保存中..." : "見積を作成"}
        </Button>
      </Box>
    </Box>
  );
}

export default function EstimateNewPage() {
  return (
    <Suspense
      fallback={
        <Box display="flex" justifyContent="center" mt={10}>
          <CircularProgress />
        </Box>
      }
    >
      <EstimateNewInner />
    </Suspense>
  );
}
