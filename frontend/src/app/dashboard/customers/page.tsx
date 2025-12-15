"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
} from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import apiClient from "@/lib/apiClient";

type Customer = {
  id: number;
  name: string;
  kana?: string;
  email?: string;
  phone?: string;
  mobile_phone?: string;
  postal_code?: string;
  address?: string;
};

export default function CustomerListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const pageSize = 20; // backend と合わせる

  const search = searchParams.get("search") || "";

  // ============================
  // データ取得
  // ============================
  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get("/customers/", {
          params: {
            page,
            search,
          },
        });

        setCustomers(res.data.results || []);
        setCount(res.data.count || 0);
      } catch (err) {
        console.error("顧客一覧取得失敗:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [page, search, searchParams.get("_r")]);

  const maxPage = Math.ceil(count / pageSize);

  if (loading)
    return (
      <Box display="flex" justifyContent="center" mt={10}>
        <CircularProgress />
      </Box>
    );

  return (
    <>
      {/* === ヘッダ === */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
        flexWrap="wrap"
        gap={2}
      >
        <Typography variant="h5" fontWeight="bold">
          顧客一覧
        </Typography>

        <Button
          variant="contained"
          onClick={() =>
            router.push(`/dashboard/customers/new?_r=${Date.now()}`)
          }
        >
          顧客を作成
        </Button>
      </Box>

      {/* === テーブル === */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: "#f9f9f9" }}>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>氏名(フリガナ) / E-mail</TableCell>
              <TableCell>電話</TableCell>
              <TableCell>住所</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {customers.map((c) => (
              <TableRow
                key={c.id}
                hover
                sx={{ cursor: "pointer" }}
                onClick={() =>
                  router.push(`/dashboard/customers/${c.id}`)
                }
              >
                <TableCell>{c.id}</TableCell>

                <TableCell>
                  <strong>
                    {c.name}
                    {c.kana && ` (${c.kana})`}
                  </strong>
                  <br />
                  <Typography variant="body2" color="text.secondary">
                    {c.email || "-"}
                  </Typography>
                </TableCell>

                <TableCell>
                  {c.phone || "-"}
                  <br />
                  <Typography variant="body2" color="text.secondary">
                    {c.mobile_phone || "-"}
                  </Typography>
                </TableCell>

                <TableCell>
                  {c.postal_code && `〒${c.postal_code}`}
                  <br />
                  <Typography variant="body2" color="text.secondary">
                    {c.address || "-"}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}

            {customers.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  データがありません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* === ページング === */}
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        gap={2}
        mt={2}
      >
        <Button
          size="small"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Prev
        </Button>

        <Typography>
          {page} / {maxPage}（全 {count} 件）
        </Typography>

        <Button
          size="small"
          disabled={page >= maxPage}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </Box>
    </>
  );
}
