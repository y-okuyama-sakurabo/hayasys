"use client";

import React, { useEffect, useState } from "react";
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
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  TextField,
  Stack,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DescriptionIcon from "@mui/icons-material/Description";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
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
  const pageSize = 20;

  const [menuAnchor, setMenuAnchor] = useState<{
    [key: number]: HTMLElement | null;
  }>({});

  const searchQuery = searchParams.get("search") || "";
  const refreshKey = searchParams.get("_r") || "";

  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

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
            search: searchQuery,
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
  }, [page, searchQuery, refreshKey]);

  const maxPage = Math.ceil(count / pageSize);

  // ============================
  // メニュー操作
  // ============================
  const openMenu = (e: React.MouseEvent<HTMLButtonElement>, id: number) => {
    e.stopPropagation();
    setMenuAnchor((prev) => ({ ...prev, [id]: e.currentTarget }));
  };

  const closeMenu = (id: number) => {
    setMenuAnchor((prev) => ({ ...prev, [id]: null }));
  };

  // ============================
  // 検索（Enter or ボタン）
  // ============================
  const applySearch = () => {
    // ページは1に戻す
    const params = new URLSearchParams(searchParams.toString());
    if (searchInput.trim()) params.set("search", searchInput.trim());
    else params.delete("search");
    params.set("_r", String(Date.now()));
    router.push(`/dashboard/customers?${params.toString()}`);
    setPage(1);
  };

    // ============================
  // CSV出力
  // ============================
  const handleExportCsv = async () => {
    try {
      const params = new URLSearchParams();

      // 現在の検索条件をCSVにも反映
      if (searchQuery) {
        params.set("search", searchQuery);
      }

      const res = await apiClient.get(`/customers/export-csv/?${params.toString()}`, {
        responseType: "blob",
      });

      const blob = new Blob([res.data], {
        type: "text/csv;charset=shift_jis;",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      const today = new Date().toISOString().slice(0, 10).replaceAll("-", "");

      link.href = url;
      link.download = `customers_${today}.csv`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("CSV出力失敗:", err);
      alert("CSV出力に失敗しました。");
    }
  };

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

        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportCsv}
          >
            CSV出力
          </Button>

          <Button
            variant="contained"
            onClick={() => router.push(`/dashboard/customers/new?_r=${Date.now()}`)}
          >
            顧客を作成
          </Button>
        </Stack>
      </Box>

      {/* ✅ 検索バー */}
      
        <Box
          display="flex"
          gap={1}
          alignItems="center"
          flexWrap="wrap"
          sx={{ mb: 2 }}
        >
          <TextField
            size="small"
            placeholder="名前 / フリガナ / 電話 / 住所 / メール / ナンバー"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applySearch();
              }
            }}
            sx={{
              width: 360,     // ← ここで幅固定
              maxWidth: "100%"
            }}
          />

          <Button
            variant="contained"
            size="small"
            onClick={applySearch}
          >
            検索
          </Button>

          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              setSearchInput("");
              const params = new URLSearchParams(searchParams.toString());
              params.delete("search");
              params.set("_r", String(Date.now()));
              router.push(`/dashboard/customers?${params.toString()}`);
              setPage(1);
            }}
          >
            クリア
          </Button>
        </Box>
    

      {/* === テーブル === */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: "#f9f9f9" }}>
            <TableRow>
              
              <TableCell>氏名(フリガナ) / E-mail</TableCell>
              <TableCell>電話</TableCell>
              <TableCell>住所</TableCell>
              <TableCell align="center">操作</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {customers.map((c) => (
              <TableRow
                key={c.id}
                hover
                sx={{ cursor: "pointer" }}
                onClick={() => router.push(`/dashboard/customers/${c.id}`)}
              >
                

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

                {/* === 操作（︙メニュー） === */}
                <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                  <IconButton aria-label="操作メニュー" onClick={(e) => openMenu(e, c.id)}>
                    <MoreVertIcon />
                  </IconButton>

                  <Menu
                    anchorEl={menuAnchor[c.id]}
                    open={Boolean(menuAnchor[c.id])}
                    onClose={() => closeMenu(c.id)}
                  >
                    <MenuItem
                      onClick={() => {
                        closeMenu(c.id);
                        router.push(`/dashboard/customers/${c.id}`);
                      }}
                    >
                      <ListItemIcon>
                        <DescriptionIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary="詳細" />
                    </MenuItem>

                    <MenuItem
                      onClick={async () => {
                        closeMenu(c.id);
                        if (!confirm(`顧客「${c.name}」を削除しますか？`)) return;

                        try {
                          await apiClient.delete(`/customers/${c.id}/`);
                          setCustomers((prev) => prev.filter((x) => x.id !== c.id));
                        } catch {
                          alert("削除に失敗しました");
                        }
                      }}
                    >
                      <ListItemIcon>
                        <DeleteIcon fontSize="small" color="error" />
                      </ListItemIcon>
                      <ListItemText primary="削除" />
                    </MenuItem>
                  </Menu>
                </TableCell>
              </TableRow>
            ))}

            {customers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  データがありません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* === ページング === */}
      <Box display="flex" justifyContent="center" alignItems="center" gap={2} mt={2}>
        <Button size="small" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Prev
        </Button>

        <Typography>
          {page} / {maxPage}（全 {count} 件）
        </Typography>

        <Button size="small" disabled={page >= maxPage} onClick={() => setPage((p) => p + 1)}>
          Next
        </Button>
      </Box>
    </>
  );
}