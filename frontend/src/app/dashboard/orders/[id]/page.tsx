// src/app/dashboard/orders/[id]/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import apiClient from "@/lib/apiClient";
import { SaleOrderDocument } from "@/components/orders/document/SaleOrderDocument";
import { useReactToPrint } from "react-to-print";

const STATUS_LABEL: Record<string, string> = {
  draft:           "下書き",
  ordered:         "受注確定",
  cancelled:       "キャンセル",
  delivered:       "納品済み",
  sales_completed: "売上計上済",
};

const STATUS_COLOR: Record<string, "default" | "warning" | "primary" | "error" | "success" | "info"> = {
  draft:           "warning",
  ordered:         "primary",
  cancelled:       "error",
  delivered:       "success",
  sales_completed: "info",
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

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

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `order_${order?.order_no || id}`,
  });

  const handleConfirm = async () => {
    if (!order) return;
    setConfirming(true);
    try {
      const res = await apiClient.patch(`/orders/${id}/status/`, {
        status: "ordered",
      });
      setOrder((prev: any) => ({
        ...prev,
        status: res.data.status,
      }));
    } catch (err) {
      console.error("受注確定エラー:", err);
    } finally {
      setConfirming(false);
    }
  };

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
      {/* ===== ボタンバー ===== */}
      <Box display="flex" justifyContent="flex-end" alignItems="center" gap={2} mb={3} flexWrap="wrap">
        {/* ステータス表示 */}
        <Chip
          label={STATUS_LABEL[order.status] ?? order.status}
          color={(STATUS_COLOR[order.status] ?? "default") as any}
          sx={{ fontWeight: "bold" }}
        />

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

        <Button
          variant="outlined"
          startIcon={<ContentCopyIcon />}
          onClick={() => router.push(`/dashboard/orders/new?copy_from=${id}`)}
        >
          複製して新規作成
        </Button>

        {/* 受注確定ボタン：下書きの時のみ */}
        {order.status === "draft" && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<CheckCircleIcon />}
            onClick={handleConfirm}
            disabled={confirming}
          >
            受注確定
          </Button>
        )}
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
      {order.internal_memo && (
        <Paper
          sx={{
            mb: 3,
            p: 2,
            backgroundColor: "#fff7e6",
            border: "1px solid #f0c36d",
          }}
        >
          <Typography fontWeight="bold" mb={1}>
            内部メモ（お客様には表示されません）
          </Typography>

          <Typography
            sx={{
              whiteSpace: "pre-wrap",
              fontSize: "14px",
              color: "text.primary",
            }}
          >
            {order.internal_memo}
          </Typography>
        </Paper>
      )}
    </Box>
  );
}
