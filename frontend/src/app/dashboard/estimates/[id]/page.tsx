"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Typography,
} from "@mui/material";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import EditIcon from "@mui/icons-material/Edit";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AddTaskIcon from "@mui/icons-material/AddTask";
import apiClient from "@/lib/apiClient";
import { SaleEstimateDocument } from "@/components/estimate/document/SaleEstimateDocument";
import { useReactToPrint } from "react-to-print";

export default function EstimateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [estimate, setEstimate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;

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

    fetchEstimate();
  }, [id]);

  // ✅ v3対応
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `estimate_${estimate?.estimate_no || id}`,
  });

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
      <Box display="flex" justifyContent="flex-end" gap={2} mb={3}>
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={() =>
            router.push(`/dashboard/estimates/${id}/edit`)
          }
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

        <Button
          variant="contained"
          startIcon={<AddTaskIcon />}
          onClick={() =>
            router.push(`/dashboard/orders/new?from_estimate=${id}`)
          }
        >
          受注作成
        </Button>
      </Box>

      {/* 印刷対象 */}
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
          <SaleEstimateDocument estimate={estimate} />
        </Paper>
      </div>
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