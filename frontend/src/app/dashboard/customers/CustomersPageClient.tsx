"use client";

import React, { useEffect, useState } from "react";
import {
  Box, Typography, Button, Paper, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, InputAdornment, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Snackbar, Alert, CircularProgress, Pagination, Avatar, Chip,
} from "@mui/material";
import SearchIcon      from "@mui/icons-material/Search";
import ClearIcon       from "@mui/icons-material/Clear";
import AddIcon         from "@mui/icons-material/Add";
import DownloadIcon    from "@mui/icons-material/Download";
import OpenInNewIcon   from "@mui/icons-material/OpenInNew";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
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

function initials(name: string) {
  return name?.slice(0, 1) ?? "?";
}

const AVATAR_COLORS = [
  "#1976d2", "#388e3c", "#f57c00", "#7b1fa2",
  "#c62828", "#00838f", "#558b2f", "#ad1457",
];
function avatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

export default function CustomerListPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [customers,    setCustomers]    = useState<Customer[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [page,         setPage]         = useState(1);
  const [count,        setCount]        = useState(0);
  const [searchInput,  setSearchInput]  = useState("");

  // 削除ダイアログ
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleting,     setDeleting]     = useState(false);

  // スナックバー
  const [snack, setSnack] = useState<{ msg: string; severity: "success" | "error" } | null>(null);

  const pageSize    = 20;
  const searchQuery = searchParams.get("search") || "";
  const refreshKey  = searchParams.get("_r") || "";

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  // ── データ取得 ──
  useEffect(() => {
    setLoading(true);
    apiClient.get("/customers/", { params: { page, search: searchQuery } })
      .then((res) => {
        setCustomers(res.data.results || []);
        setCount(res.data.count || 0);
      })
      .catch(() => setSnack({ msg: "顧客一覧の取得に失敗しました", severity: "error" }))
      .finally(() => setLoading(false));
  }, [page, searchQuery, refreshKey]);

  const maxPage = Math.max(1, Math.ceil(count / pageSize));

  // ── 検索 ──
  const applySearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (searchInput.trim()) params.set("search", searchInput.trim());
    else params.delete("search");
    params.set("_r", String(Date.now()));
    router.push(`/dashboard/customers?${params.toString()}`);
    setPage(1);
  };

  const clearSearch = () => {
    setSearchInput("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("search");
    params.set("_r", String(Date.now()));
    router.push(`/dashboard/customers?${params.toString()}`);
    setPage(1);
  };

  // ── 削除 ──
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/customers/${deleteTarget.id}/`);
      setCustomers((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setCount((n) => n - 1);
      setSnack({ msg: `${deleteTarget.name} を削除しました`, severity: "success" });
      setDeleteTarget(null);
    } catch {
      setSnack({ msg: "削除に失敗しました", severity: "error" });
    } finally {
      setDeleting(false);
    }
  };

  // ── CSV出力 ──
  const handleExportCsv = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      const res = await apiClient.get(`/customers/export-csv/?${params.toString()}`, {
        responseType: "blob",
      });
      const url  = window.URL.createObjectURL(new Blob([res.data], { type: "text/csv;charset=shift_jis;" }));
      const link = document.createElement("a");
      link.href  = url;
      link.download = `customers_${new Date().toISOString().slice(0, 10).replaceAll("-", "")}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setSnack({ msg: "CSV出力に失敗しました", severity: "error" });
    }
  };

  return (
    <Box>
      {/* ── ヘッダー ── */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight="bold">顧客管理</Typography>
          {!loading && (
            <Typography variant="caption" color="text.secondary">
              全 {count.toLocaleString()} 件
              {searchQuery && <> &nbsp;／&nbsp; 「{searchQuery}」の検索結果</>}
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="現在の検索条件でCSVダウンロード">
            <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={handleExportCsv}>
              CSV出力
            </Button>
          </Tooltip>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => router.push(`/dashboard/customers/new?_r=${Date.now()}`)}
          >
            新規登録
          </Button>
        </Stack>
      </Stack>

      {/* ── 検索バー ── */}
      <Paper variant="outlined" sx={{ px: 2, py: 1.5, mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            size="small"
            placeholder="名前・フリガナ・電話番号・住所・メール・ナンバーで検索"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applySearch(); } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
              endAdornment: searchInput ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={clearSearch} edge="end">
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : undefined,
            }}
            sx={{ flex: 1, maxWidth: 480 }}
          />
          <Button variant="contained" size="small" onClick={applySearch} sx={{ minWidth: 72 }}>
            検索
          </Button>
          {searchQuery && (
            <Chip
              label={`「${searchQuery}」をクリア`}
              size="small"
              onDelete={clearSearch}
              color="primary"
              variant="outlined"
            />
          )}
        </Stack>
      </Paper>

      {/* ── テーブル ── */}
      <Paper variant="outlined">
        {loading ? (
          <Box display="flex" justifyContent="center" py={8}>
            <CircularProgress />
          </Box>
        ) : customers.length === 0 ? (
          <Box display="flex" flexDirection="column" alignItems="center" py={8} color="text.disabled">
            <PersonSearchIcon sx={{ fontSize: 52, mb: 1, opacity: 0.3 }} />
            <Typography variant="body2" color="text.secondary">
              {searchQuery ? `「${searchQuery}」に一致する顧客が見つかりません` : "顧客が登録されていません"}
            </Typography>
            {searchQuery && (
              <Button size="small" onClick={clearSearch} sx={{ mt: 1 }}>
                検索をクリア
              </Button>
            )}
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ "& th": { fontWeight: "bold", bgcolor: "#fafafa", fontSize: 12 } }}>
                  <TableCell sx={{ width: 48 }} />
                  <TableCell>氏名 / フリガナ</TableCell>
                  <TableCell>連絡先</TableCell>
                  <TableCell>住所</TableCell>
                  <TableCell align="center" sx={{ width: 80 }}>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customers.map((c) => (
                  <TableRow
                    key={c.id}
                    hover
                    sx={{ cursor: "pointer", "& td": { py: 1.2 } }}
                    onClick={() => router.push(`/dashboard/customers/${c.id}`)}
                  >
                    {/* アバター */}
                    <TableCell sx={{ pl: 2 }}>
                      <Avatar
                        sx={{
                          width: 32, height: 32,
                          fontSize: 13, fontWeight: "bold",
                          bgcolor: avatarColor(c.id),
                        }}
                      >
                        {initials(c.name)}
                      </Avatar>
                    </TableCell>

                    {/* 氏名・フリガナ・メール */}
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} lineHeight={1.4}>
                        {c.name}
                      </Typography>
                      {c.kana && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {c.kana}
                        </Typography>
                      )}
                      {c.email && (
                        <Typography variant="caption" color="text.disabled" display="block">
                          {c.email}
                        </Typography>
                      )}
                    </TableCell>

                    {/* 電話 */}
                    <TableCell>
                      {c.phone ? (
                        <Typography variant="body2">{c.phone}</Typography>
                      ) : null}
                      {c.mobile_phone ? (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {c.mobile_phone}
                        </Typography>
                      ) : null}
                      {!c.phone && !c.mobile_phone && (
                        <Typography variant="caption" color="text.disabled">—</Typography>
                      )}
                    </TableCell>

                    {/* 住所 */}
                    <TableCell>
                      {c.postal_code && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          〒{c.postal_code}
                        </Typography>
                      )}
                      {c.address ? (
                        <Typography variant="body2" sx={{ fontSize: 12 }}>{c.address}</Typography>
                      ) : (
                        <Typography variant="caption" color="text.disabled">—</Typography>
                      )}
                    </TableCell>

                    {/* 操作 */}
                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="詳細">
                        <IconButton
                          size="small"
                          onClick={() => router.push(`/dashboard/customers/${c.id}`)}
                        >
                          <OpenInNewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="削除">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeleteTarget(c)}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* ── ページネーション ── */}
        {!loading && customers.length > 0 && (
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            px={2}
            py={1.5}
            borderTop="1px solid"
            sx={{ borderColor: "divider" }}
          >
            <Typography variant="caption" color="text.secondary">
              {(page - 1) * pageSize + 1}〜{Math.min(page * pageSize, count)} 件表示 / 全 {count} 件
            </Typography>
            <Pagination
              count={maxPage}
              page={page}
              onChange={(_, v) => setPage(v)}
              size="small"
              color="primary"
              showFirstButton
              showLastButton
            />
          </Box>
        )}
      </Paper>

      {/* ── 削除確認ダイアログ ── */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>顧客の削除</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>{deleteTarget?.name}</strong> を削除します。この操作は取り消せません。よろしいですか？
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>キャンセル</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={deleting}>
            {deleting ? "削除中..." : "削除する"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── スナックバー ── */}
      <Snackbar
        open={!!snack}
        autoHideDuration={4000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snack?.severity} onClose={() => setSnack(null)}>
          {snack?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
