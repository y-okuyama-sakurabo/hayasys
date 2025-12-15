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
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import EditIcon from "@mui/icons-material/Edit";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AddTaskIcon from "@mui/icons-material/AddTask";
import apiClient from "@/lib/apiClient";

export default function EstimateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;

  const [estimate, setEstimate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // === 詳細データの取得 ===
  useEffect(() => {
    const fetchEstimate = async () => {
      try {
        const res = await apiClient.get(`/estimates/${id}/`);
        setEstimate(res.data);
      } catch (err) {
        console.error("詳細取得エラー:", err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchEstimate();
  }, [id, searchParams.get("_r")]); // ✅ _rが変わるたびに再フェッチ

  if (loading)
    return (
      <Box textAlign="center" mt={10}>
        <CircularProgress />
      </Box>
    );

  if (!estimate)
    return (
      <Typography textAlign="center" mt={10}>
        データを取得できませんでした。
      </Typography>
    );

  // --- 小計・消費税・合計をフロント側で計算 ---
  const subtotal = estimate.items?.reduce(
    (sum: number, item: any) => sum + parseFloat(item.subtotal || 0),
    0
  );
  const taxAmount = subtotal * 0.1; // 仮で10%課税
  const totalAmount = subtotal + taxAmount;

  const formatPrice = (value: any) => {
    if (value == null || isNaN(Number(value))) return "-";
    return Number(value).toLocaleString();
  };

  // --- アクション ---
  const handleEdit = () => {
    router.push(`/dashboard/estimates/${id}/edit?_r=${Date.now()}`);
  };

  const handlePrint = () => window.print();

  const handleDuplicate = () => {
    // ✅ 新規作成ページに複製モードで遷移
    router.push(`/dashboard/estimates/new?copy_from=${id}&_r=${Date.now()}`);
  };

  const handleCreateOrder = () => {
    router.push(`/dashboard/orders/new?from_estimate=${id}`);
  };



  return (
    <Box p={3}>
      {/* === ボタンバー === */}
      <Box display="flex" justifyContent="flex-end" gap={2} mb={3}>
        <Button variant="outlined" startIcon={<EditIcon />} onClick={handleEdit}>
          編集
        </Button>
        <Button variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={handlePrint}>
          PDF
        </Button>
        <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={handleDuplicate}>
          複製して新規作成
        </Button>
        <Button variant="contained" startIcon={<AddTaskIcon />} onClick={handleCreateOrder}>
          受注作成
        </Button>
      </Box>

      {/* === 見積書レイアウト === */}
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
          見　積　書
        </Typography>

        <Grid container justifyContent="space-between" mb={2}>
          <Grid item>
            <Typography variant="subtitle1">
              見積番号：{estimate.estimate_no}
            </Typography>
            <Typography variant="subtitle1">
              発行日：{estimate.created_at?.slice(0, 10)}
            </Typography>
          </Grid>

          {/* ✅ 顧客情報 */}
          <Grid item textAlign="right">
            <Typography variant="subtitle1">
              {estimate.party?.name || "（顧客名なし）"}
            </Typography>
            {estimate.party?.company && (
              <Typography>{estimate.party.company}</Typography>
            )}
            {estimate.party?.address && (
              <Typography>{estimate.party.address}</Typography>
            )}
            {estimate.party?.phone && (
              <Typography>{estimate.party.phone}</Typography>
            )}
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* === 明細一覧 === */}
        <Box mb={2}>
          <Typography variant="subtitle2">■ 見積明細</Typography>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f5f5f5" }}>
                <th style={{ border: "1px solid #ddd", padding: "8px" }}>品名</th>
                <th style={{ border: "1px solid #ddd", padding: "8px" }}>分類</th>
                <th style={{ border: "1px solid #ddd", padding: "8px" }}>数量</th>
                <th style={{ border: "1px solid #ddd", padding: "8px" }}>単価</th>
                <th style={{ border: "1px solid #ddd", padding: "8px" }}>金額</th>
              </tr>
            </thead>
            <tbody>
              {estimate.items?.map((item: any, idx: number) => {
                const name = item.name ?? item.product?.name ?? "（商品名なし）";
                const category =
                  item.product?.small?.middle?.large?.name ??
                  item.product?.tax_type ??
                  "-";
                const qty = parseFloat(item.quantity || 0);
                const unit = parseFloat(item.unit_price || 0);
                const subtotal = parseFloat(item.subtotal || unit * qty);

                return (
                  <tr key={idx}>
                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>{name}</td>
                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>{category}</td>
                    <td
                      style={{
                        border: "1px solid #ddd",
                        padding: "8px",
                        textAlign: "right",
                      }}
                    >
                      {qty}
                    </td>
                    <td
                      style={{
                        border: "1px solid #ddd",
                        padding: "8px",
                        textAlign: "right",
                      }}
                    >
                      ¥{formatPrice(unit)}
                    </td>
                    <td
                      style={{
                        border: "1px solid #ddd",
                        padding: "8px",
                        textAlign: "right",
                      }}
                    >
                      ¥{formatPrice(subtotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Box>

        {/* === 合計欄 === */}
        <Box textAlign="right" mt={3}>
          <Typography>小計：¥{formatPrice(subtotal)}</Typography>
          <Typography>消費税（10%）：¥{formatPrice(taxAmount)}</Typography>
          <Typography variant="h6">
            合計金額（税込）：¥{formatPrice(totalAmount)}
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        {estimate.remarks && (
          <Box>
            <Typography variant="subtitle2">備考</Typography>
            <Typography>{estimate.remarks}</Typography>
          </Box>
        )}

        <Box mt={5} textAlign="right">
          <Typography variant="body2">株式会社ハヤサカサイクル</Typography>
          <Typography variant="body2">〒980-0011 仙台市青葉区○○町1-1-1</Typography>
          <Typography variant="body2">TEL：022-000-0000</Typography>
        </Box>
      </Paper>
    </Box>
  );
}
