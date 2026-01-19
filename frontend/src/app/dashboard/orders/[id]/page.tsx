// src/app/dashboard/orders/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import apiClient from "@/lib/apiClient";

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // === 詳細データ取得 ===
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await apiClient.get(`/orders/${id}/`);
        setOrder(res.data);
      } catch (err) {
        console.error("受注詳細取得エラー:", err);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchOrder();
  }, [id, searchParams.get("_r")]);

  if (loading) {
    return (
      <Box textAlign="center" mt={10}>
        <CircularProgress />
      </Box>
    );
  }

  if (!order) {
    return (
      <Typography textAlign="center" mt={10}>
        データを取得できませんでした。
      </Typography>
    );
  }

  const formatPrice = (value: any) => {
    if (value == null || isNaN(Number(value))) return "-";
    return Number(value).toLocaleString();
  };

  const handleEdit = () => {
    router.push(`/dashboard/orders/${id}/edit?_r=${Date.now()}`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Box p={3}>
      {/* === ボタンバー === */}
      <Box display="flex" justifyContent="flex-end" gap={2} mb={3}>
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={handleEdit}
        >
          編集
        </Button>
        <Button
          variant="outlined"
          startIcon={<PictureAsPdfIcon />}
          onClick={handlePrint}
        >
          PDF
        </Button>
      </Box>

      {/* === 受注書レイアウト === */}
      <Paper
        elevation={3}
        sx={{
          width: "210mm",
          minHeight: "297mm",
          mx: "auto",
          p: 5,
          backgroundColor: "#fff",
          "@media print": {
            boxShadow: "none",
            border: "none",
            margin: 0,
            width: "100%",
            minHeight: "auto",
            padding: 0,
          },
        }}
      >
        <Typography variant="h5" align="center" mb={2}>
          受　注　書
        </Typography>

        {/* ヘッダ情報 */}
        <Grid container justifyContent="space-between" mb={2}>
          <Grid>
            <Typography variant="subtitle1">
              受注番号：{order.order_no}
            </Typography>
            <Typography variant="subtitle1">
              受注日：{order.order_date}
            </Typography>
            <Typography variant="subtitle1">
              状態：{order.status}
            </Typography>
            {order.shop && (
              <Typography variant="subtitle1">
                店舗：{order.shop.name}
              </Typography>
            )}
          </Grid>

          {/* 顧客スナップショット */}
          <Grid textAlign="right">
            <Typography variant="subtitle1">
              {order.party_name || "（顧客名なし）"}
            </Typography>
            {order.address && <Typography>{order.address}</Typography>}
            {order.phone && <Typography>{order.phone}</Typography>}
            {order.email && <Typography>{order.email}</Typography>}
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* 明細 */}
        <Box mb={2}>
          <Typography variant="subtitle2">■ 受注明細</Typography>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f5f5f5" }}>
                <th style={{ border: "1px solid #ddd", padding: "8px" }}>
                  品名
                </th>
                <th style={{ border: "1px solid #ddd", padding: "8px" }}>
                  数量
                </th>
                <th style={{ border: "1px solid #ddd", padding: "8px" }}>
                  単価
                </th>
                <th style={{ border: "1px solid #ddd", padding: "8px" }}>
                  金額
                </th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map((item: any, idx: number) => (
                <tr key={idx}>
                  <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                    {item.name || item.product?.name || "（商品名なし）"}
                  </td>
                  <td
                    style={{
                      border: "1px solid #ddd",
                      padding: "8px",
                      textAlign: "right",
                    }}
                  >
                    {item.quantity}
                  </td>
                  <td
                    style={{
                      border: "1px solid #ddd",
                      padding: "8px",
                      textAlign: "right",
                    }}
                  >
                    ¥{formatPrice(item.unit_price)}
                  </td>
                  <td
                    style={{
                      border: "1px solid #ddd",
                      padding: "8px",
                      textAlign: "right",
                    }}
                  >
                    ¥{formatPrice(item.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>

        {/* 車両情報（あれば） */}
        {order.vehicles && order.vehicles.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box mb={2}>
              <Typography variant="subtitle2">■ 車両情報</Typography>
              {order.vehicles.map((v: any, idx: number) => (
                <Box key={idx} sx={{ mb: 1 }}>
                  <Typography>
                    {v.is_trade_in ? "下取り車両" : "商談車両"}：
                    {v.vehicle_name}
                  </Typography>
                  <Typography>
                    排気量：{v.displacement} / 年式：{v.model_year} / 新車・中古：
                    {v.new_car_type}
                  </Typography>
                  {(v.color_name || v.model_code || v.chassis_no) && (
                    <Typography variant="body2" color="text.secondary">
                      色：{v.color_name} / 型式：{v.model_code} / 車台番号：
                      {v.chassis_no}
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          </>
        )}

        {/* 支払い情報（あれば） */}
        {order.payments && order.payments.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box mb={2}>
              <Typography variant="subtitle2">■ 支払い情報</Typography>
              {order.payments.map((p: any, idx: number) => (
                <Box key={idx} sx={{ mb: 1 }}>
                  <Typography>支払方法：{p.payment_method}</Typography>
                  {p.payment_method === "クレジット" && (
                    <Typography variant="body2" color="text.secondary">
                      会社：{p.credit_company} / 初回：
                      {p.credit_first_payment} / 2回目：
                      {p.credit_second_payment} / ボーナス：
                      {p.credit_bonus_payment} / 回数：
                      {p.credit_installments} 回 / 開始月：
                      {p.credit_start_month}
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          </>
        )}

        {/* 合計欄 */}
        <Divider sx={{ my: 3 }} />
        <Box textAlign="right" mt={3}>
          <Typography>小計：¥{formatPrice(order.subtotal)}</Typography>
          <Typography>値引合計：¥{formatPrice(order.discount_total)}</Typography>
          <Typography>消費税：¥{formatPrice(order.tax_total)}</Typography>
          <Typography variant="h6">
            合計金額（税込）：¥{formatPrice(order.grand_total)}
          </Typography>
        </Box>

        <Box mt={5} textAlign="right">
          <Typography variant="body2">株式会社ハヤサカサイクル</Typography>
          <Typography variant="body2">
            〒980-0011 仙台市青葉区○○町1-1-1
          </Typography>
          <Typography variant="body2">TEL：022-000-0000</Typography>
        </Box>
      </Paper>
    </Box>
  );
}
