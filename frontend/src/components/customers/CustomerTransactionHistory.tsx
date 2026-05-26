"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Link,
} from "@mui/material";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
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
  draft: "default",
  issued: "info",
  ordered: "success",
};

const ORDER_STATUS_COLOR: Record<
  string,
  "default" | "warning" | "error" | "success" | "primary"
> = {
  draft: "default",
  ordered: "primary",
  cancelled: "error",
  delivered: "success",
};

export default function CustomerTransactionHistory({
  customerId,
}: {
  customerId: number;
}) {
  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get(`/customers/${customerId}/transactions/`)
      .then((res) => setItems(Array.isArray(res.data) ? res.data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [customerId]);

  const totalEstimates = items.filter((i) => i.type === "estimate").length;
  const totalOrders = items.filter((i) => i.type === "order").length;
  const totalAmount = items
    .filter((i) => i.type === "order")
    .reduce((sum, i) => sum + Number(i.grand_total), 0);

  return (
    <Box mt={4}>
      <Typography variant="h6" mb={1}>
        取引履歴
      </Typography>

      {/* サマリー */}
      <Box display="flex" gap={3} mb={2} flexWrap="wrap">
        <Box sx={{ p: 1.5, background: "#f0f4ff", borderRadius: 1, minWidth: 100 }}>
          <Typography fontSize={12} color="text.secondary">見積件数</Typography>
          <Typography fontWeight="bold" fontSize={18}>{totalEstimates} 件</Typography>
        </Box>
        <Box sx={{ p: 1.5, background: "#f0fff4", borderRadius: 1, minWidth: 100 }}>
          <Typography fontSize={12} color="text.secondary">受注件数</Typography>
          <Typography fontWeight="bold" fontSize={18}>{totalOrders} 件</Typography>
        </Box>
        <Box sx={{ p: 1.5, background: "#fff8e1", borderRadius: 1, minWidth: 130 }}>
          <Typography fontSize={12} color="text.secondary">受注合計金額</Typography>
          <Typography fontWeight="bold" fontSize={18}>
            ¥{totalAmount.toLocaleString()}
          </Typography>
        </Box>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : items.length === 0 ? (
        <Paper sx={{ p: 2 }}>
          <Typography color="text.secondary">取引履歴はありません</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
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
                >
                  {/* 種別 */}
                  <TableCell>
                    {item.type === "estimate" ? (
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <ReceiptLongIcon fontSize="small" color="action" />
                        <Typography fontSize={13}>見積</Typography>
                      </Box>
                    ) : (
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <ShoppingCartIcon fontSize="small" color="primary" />
                        <Typography fontSize={13}>受注</Typography>
                      </Box>
                    )}
                  </TableCell>

                  {/* 番号（リンク） */}
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
                    >
                      {item.no}
                    </Link>
                  </TableCell>

                  {/* 日付 */}
                  <TableCell>
                    <Typography fontSize={13}>
                      {item.date
                        ? new Date(item.date).toLocaleDateString("ja-JP")
                        : "-"}
                    </Typography>
                  </TableCell>

                  {/* ステータス */}
                  <TableCell>
                    {item.type === "estimate" ? (
                      <Chip
                        size="small"
                        label={item.status}
                        color={
                          ESTIMATE_STATUS_COLOR[item.status_key] ?? "default"
                        }
                      />
                    ) : (
                      <Chip
                        size="small"
                        label={item.status}
                        color={
                          ORDER_STATUS_COLOR[item.status_key] ?? "default"
                        }
                      />
                    )}
                  </TableCell>

                  {/* 金額 */}
                  <TableCell align="right">
                    <Typography fontSize={13}>
                      ¥{Number(item.grand_total).toLocaleString()}
                    </Typography>
                  </TableCell>

                  {/* 担当者 */}
                  <TableCell>
                    <Typography fontSize={13}>{item.staff ?? "-"}</Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
