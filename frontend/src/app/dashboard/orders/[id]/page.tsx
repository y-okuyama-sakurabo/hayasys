// src/app/dashboard/orders/[id]/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import apiClient from "@/lib/apiClient";
import { SaleOrderDocument } from "@/components/orders/document/SaleOrderDocument";
import { useReactToPrint } from "react-to-print";

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;

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

    fetchOrder();
  }, [id]);

  // ✅ 見積と同じreact-to-print仕様
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `order_${order?.order_no || id}`,
  });

  if (loading)
    return (
      <Box textAlign="center" mt={10}>
        <CircularProgress />
      </Box>
    );

  if (!order)
    return (
      <Typography textAlign="center" mt={10}>
        データを取得できませんでした。
      </Typography>
    );

  return (
    <Box p={3}>
      {/* ===== ボタンバー（見積と同型）===== */}
      <Box display="flex" justifyContent="flex-end" gap={2} mb={3}>
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={() => router.push(`/dashboard/orders/${id}/edit`)}
        >
          編集
        </Button>

        <Button
          variant="outlined"
          startIcon={<PictureAsPdfIcon />}
          onClick={() => handlePrint?.()}
        >
          印刷 / PDF保存
        </Button>
      </Box>

      {/* ===== 印刷対象 ===== */}
      <div ref={printRef}>
        <Paper
          elevation={0}
          sx={{
            width: "210mm",
            minHeight: "297mm",
            mx: "auto",
            p: 0,
            backgroundColor: "#fff",
          }}
        >
          <SaleOrderDocument order={order} />
        </Paper>
      </div>
    </Box>
  );
}