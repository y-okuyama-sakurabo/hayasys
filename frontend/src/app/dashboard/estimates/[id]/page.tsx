"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Typography,
} from "@mui/material";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import EditIcon from "@mui/icons-material/Edit";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AddTaskIcon from "@mui/icons-material/AddTask";
import SendIcon from "@mui/icons-material/Send";
import apiClient from "@/lib/apiClient";
import { SaleEstimateDocument } from "@/components/estimate/document/SaleEstimateDocument";
import { useReactToPrint } from "react-to-print";

const STATUS_LABEL: Record<string, string> = {
  draft: "下書き",
  issued: "提出済み",
  ordered: "受注済み",
};

const STATUS_COLOR: Record<
  string,
  "default" | "info" | "success" | "warning"
> = {
  draft: "warning",
  issued: "info",
  ordered: "success",
};

export default function EstimateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [estimate, setEstimate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  const fetchEstimate = async () => {
    const res = await apiClient.get(`/estimates/${id}/`);
    setEstimate(res.data);
  };

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        await fetchEstimate();
      } catch (err) {
        console.error("詳細取得エラー:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `estimate_${estimate?.estimate_no || id}`,
    pageStyle: `
      @page { size: A4 portrait; margin: 0mm; }
      @media print {
        html, body { margin: 0; padding: 0; background: #fff; }
      }
    `,
  });

  const handleSubmit = async () => {
    if (!estimate) return;
    setSubmitting(true);
    try {
      const res = await apiClient.patch(`/estimates/${id}/status/`, {
        status: "issued",
      });
      setEstimate((prev: any) => ({
        ...prev,
        status: res.data.status,
      }));
    } catch (err) {
      console.error("提出エラー:", err);
    } finally {
      setSubmitting(false);
    }
  };

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

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="flex-end" alignItems="center" gap={2} mb={3} flexWrap="wrap">
        {/* ステータス表示 */}
        <Chip
          label={STATUS_LABEL[estimate.status] ?? estimate.status}
          color={STATUS_COLOR[estimate.status] ?? "default"}
          sx={{ fontWeight: "bold" }}
        />

        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={() => router.push(`/dashboard/estimates/${id}/edit`)}
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
          onClick={() =>
            router.push(`/dashboard/estimates/new?copy_from=${id}`)
          }
        >
          複製して新規作成
        </Button>

        {/* 見積提出ボタン：下書きの時のみ */}
        {estimate.status === "draft" && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<SendIcon />}
            onClick={handleSubmit}
            disabled={submitting}
          >
            見積提出
          </Button>
        )}

        {/* 受注作成：提出済みの時のみ（下書きでは不可） */}
        {estimate.status === "issued" && (
          <Button
            variant="contained"
            color="success"
            startIcon={<AddTaskIcon />}
            onClick={() =>
              router.push(`/dashboard/orders/new?from_estimate=${id}`)
            }
          >
            受注作成
          </Button>
        )}
      </Box>

      {/* 印刷対象 */}
      <Box
        sx={{
          overflowX: "auto",
          bgcolor: "#e8e8e8",
          py: 2,
          "@media print": { bgcolor: "transparent", p: 0 },
        }}
      >
        <div ref={printRef}>
          <SaleEstimateDocument estimate={estimate} />
        </div>
      </Box>
      {estimate.internal_memo && (
        <Paper
          sx={{
            mb: 3,
            mt: 5,
            mx: "auto",
            p: 2,
            width: "210mm",
            backgroundColor: "#e8f1fb",
            border: "1px solid #d5d5d5",
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
            {estimate.internal_memo}
          </Typography>
        </Paper>
      )}
    </Box>
  );
}
