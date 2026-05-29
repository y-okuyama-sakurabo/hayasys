"use client";

import { useEffect, useState } from "react";
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, CircularProgress,
  Stack, Link,
} from "@mui/material";
import { useRouter } from "next/navigation";
import HistoryIcon        from "@mui/icons-material/History";
import ReceiptLongIcon    from "@mui/icons-material/ReceiptLong";
import ShoppingCartIcon   from "@mui/icons-material/ShoppingCart";
import apiClient from "@/lib/apiClient";

type Transaction = {
  type: "estimate" | "order";
  id: number;
  no: string;
  date: string | null;
  status: string;
  status_key: string;
  grand_total: string | number;
  staff: string | null;
};

const ESTIMATE_STATUS_COLOR: Record<string, "default" | "info" | "success"> = {
  draft: "default", issued: "info", ordered: "success",
};

const ORDER_STATUS_COLOR: Record<string, "default" | "warning" | "error" | "success" | "primary"> = {
  draft: "default", ordered: "primary", cancelled: "error",
  delivered: "success", sales_completed: "success",
};

export default function CustomerTransactionHistory({ customerId }: { customerId: number }) {
  const router = useRouter();
  const [items,   setItems]   = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get(`/customers/${customerId}/transactions/`)
      .then((res) => setItems(Array.isArray(res.data) ? res.data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [customerId]);

  const totalEstimates = items.filter((i) => i.type === "estimate").length;
  const totalOrders    = items.filter((i) => i.type === "order").length;
  const totalAmount    = items
    .filter((i) => i.type === "order")
    .reduce((sum, i) => sum + Number(i.grand_total), 0);

  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
        <HistoryIcon fontSize="small" color="action" />
        <Typography variant="subtitle1" fontWeight="bold">取引履歴</Typography>
      </Stack>

      {/* サマリー */}
      <Stack direction="row" spacing={1.5} mb={2} flexWrap="wrap">
        <Box sx={{ px: 2, py: 1, bgcolor: "primary.50", border: "1px solid", borderColor: "primary.100", borderRadius: 1, minWidth: 100 }}>
          <Typography variant="caption" color="text.secondary" display="block">見積件数</Typography>
          <Typography fontWeight="bold" fontSize={16}>{totalEstimates} 件</Typography>
        </Box>
        <Box sx={{ px: 2, py: 1, bgcolor: "success.50", border: "1px solid", borderColor: "success.100", borderRadius: 1, minWidth: 100 }}>
          <Typography variant="caption" color="text.secondary" display="block">受注件数</Typography>
          <Typography fontWeight="bold" fontSize={16}>{totalOrders} 件</Typography>
        </Box>
        <Box sx={{ px: 2, py: 1, bgcolor: "warning.50", border: "1px solid", borderColor: "warning.100", borderRadius: 1, minWidth: 130 }}>
          <Typography variant="caption" color="text.secondary" display="block">受注合計金額</Typography>
          <Typography fontWeight="bold" fontSize={16}>¥{totalAmount.toLocaleString()}</Typography>
        </Box>
      </Stack>

      {loading ? (
        <Box display="flex" justifyContent="center" py={3}>
          <CircularProgress size={24} />
        </Box>
      ) : items.length === 0 ? (
        <Typography variant="body2" color="text.disabled" sx={{ py: 1 }}>
          取引履歴はありません
        </Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>種別</TableCell>
                <TableCell>番号</TableCell>
                <TableCell>日付</TableCell>
                <TableCell>ステータス</TableCell>
                <TableCell align="right">金額</TableCell>
                <TableCell>担当者</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow
                  key={`${item.type}-${item.id}`}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() =>
                    router.push(
                      item.type === "estimate"
                        ? `/dashboard/estimates/${item.id}`
                        : `/dashboard/orders/${item.id}`
                    )
                  }
                >
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      {item.type === "estimate"
                        ? <ReceiptLongIcon fontSize="small" color="action" />
                        : <ShoppingCartIcon fontSize="small" color="primary" />}
                      <Typography fontSize={13}>
                        {item.type === "estimate" ? "見積" : "受注"}
                      </Typography>
                    </Box>
                  </TableCell>

                  <TableCell>
                    <Link
                      href={
                        item.type === "estimate"
                          ? `/dashboard/estimates/${item.id}`
                          : `/dashboard/orders/${item.id}`
                      }
                      underline="hover"
                      fontSize={13}
                      fontWeight="bold"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {item.no}
                    </Link>
                  </TableCell>

                  <TableCell>
                    <Typography fontSize={13}>
                      {item.date ? new Date(item.date).toLocaleDateString("ja-JP") : "-"}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Chip
                      size="small"
                      label={item.status}
                      color={
                        item.type === "estimate"
                          ? (ESTIMATE_STATUS_COLOR[item.status_key] ?? "default")
                          : (ORDER_STATUS_COLOR[item.status_key] ?? "default")
                      }
                    />
                  </TableCell>

                  <TableCell align="right">
                    <Typography fontSize={13}>¥{Number(item.grand_total).toLocaleString()}</Typography>
                  </TableCell>

                  <TableCell>
                    <Typography fontSize={13}>{item.staff ?? "-"}</Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}
