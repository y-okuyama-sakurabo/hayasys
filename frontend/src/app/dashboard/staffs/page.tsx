"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box, Paper, Typography, Stack, Button, Chip,
  Table, TableHead, TableRow, TableCell, TableBody,
  IconButton, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, Tooltip,
  Alert, Snackbar, CircularProgress,
} from "@mui/material";
import AddIcon        from "@mui/icons-material/Add";
import EditIcon       from "@mui/icons-material/Edit";
import DeleteIcon     from "@mui/icons-material/Delete";
import FileDownload   from "@mui/icons-material/FileDownload";
import FileUpload     from "@mui/icons-material/FileUpload";
import { useRouter }  from "next/navigation";
import apiClient      from "@/lib/apiClient";
import { useUserRole, isPrivileged } from "@/hooks/useUserRole";

// ========================
// ロール表示設定
// ========================
const ROLE_LABELS: Record<string, string> = {
  executive:     "役員",
  accounting:    "経理総務",
  manager:       "MGR・SV",
  store_manager: "店長",
  staff:         "スタッフ",
  admin:         "管理者(旧)",
};

const ROLE_COLORS: Record<string, "error" | "warning" | "info" | "success" | "default"> = {
  executive:     "error",
  accounting:    "warning",
  manager:       "info",
  store_manager: "success",
  staff:         "default",
  admin:         "warning",
};

// ========================
// メイン
// ========================
export default function StaffListPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const userRole = useUserRole();

  const [staffs,       setStaffs]       = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [myRole,       setMyRole]       = useState<string | null>(null); // null = まだ取得中
  const [isSuperuser,  setIsSuperuser]  = useState(false);

  // 削除確認
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting,     setDeleting]     = useState(false);

  // スナックバー
  const [snack, setSnack] = useState<{ msg: string; severity: "success" | "error" } | null>(null);

  // CSV インポート結果
  const [importResult, setImportResult] = useState<any | null>(null);
  const [importing, setImporting] = useState(false);

  const MANAGER_ROLES = ["executive", "accounting", "manager", "store_manager", "admin"];
  // null = ロード中（表示を保留）、それ以外はロール確定
  const canManage = myRole !== null && (isSuperuser || MANAGER_ROLES.includes(myRole));

  const fetchStaffs = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/masters/staffs/");
      setStaffs(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffs();
    apiClient.get("/auth/user/")
      .then((r) => {
        setMyRole(r.data?.role ?? "");
        setIsSuperuser(!!r.data?.is_superuser);
      })
      .catch(() => setMyRole(""));
  }, []);

  // ── 削除 ──
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/masters/staffs/${deleteTarget.id}/`);
      setSnack({ msg: `${deleteTarget.display_name} を削除しました`, severity: "success" });
      setDeleteTarget(null);
      fetchStaffs();
    } catch (e: any) {
      setSnack({ msg: e?.response?.data?.detail || "削除に失敗しました", severity: "error" });
    } finally {
      setDeleting(false);
    }
  };

  // ── CSV エクスポート ──
  const handleExport = async () => {
    try {
      const res = await apiClient.get("/masters/staffs/csv-export/", { responseType: "blob" });
      const url  = URL.createObjectURL(new Blob([res.data]));
      const a    = document.createElement("a");
      a.href     = url;
      a.download = "staffs.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setSnack({ msg: "エクスポートに失敗しました", severity: "error" });
    }
  };

  // ── CSV インポート ──
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await apiClient.post("/masters/staffs/csv-import/", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImportResult(res.data);
      fetchStaffs();
    } catch (e: any) {
      setSnack({ msg: e?.response?.data?.detail || "インポートに失敗しました", severity: "error" });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight="bold">スタッフ管理</Typography>
        {canManage && (
          <Stack direction="row" spacing={1}>
            {isPrivileged(userRole) && (
              <>
                <Tooltip title="CSVダウンロード">
                  <Button variant="outlined" size="small" startIcon={<FileDownload />} onClick={handleExport}>
                    エクスポート
                  </Button>
                </Tooltip>
                <Tooltip title="CSVから一括登録・更新">
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={importing ? <CircularProgress size={14} /> : <FileUpload />}
                    onClick={() => fileRef.current?.click()}
                    disabled={importing}
                  >
                    インポート
                  </Button>
                </Tooltip>
                <input ref={fileRef} type="file" accept=".csv" hidden onChange={handleImportFile} />
              </>
            )}
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => router.push("/dashboard/staffs/new")}
            >
              新規登録
            </Button>
          </Stack>
        )}
      </Stack>

      {/* CSV インポート結果 */}
      {importResult && (
        <Alert
          severity={importResult.errors?.length ? "warning" : "success"}
          onClose={() => setImportResult(null)}
          sx={{ mb: 2 }}
        >
          <Typography variant="body2">
            登録: {importResult.created}件 ／ 更新: {importResult.updated}件
          </Typography>
          {importResult.errors?.map((e: string, i: number) => (
            <Typography key={i} variant="caption" display="block" color="error">{e}</Typography>
          ))}
        </Alert>
      )}

      <Paper variant="outlined">
        {loading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ "& th": { fontWeight: "bold", bgcolor: "#fafafa" } }}>
                <TableCell>ID</TableCell>
                <TableCell>氏名</TableCell>
                <TableCell>ログインID</TableCell>
                <TableCell>所属</TableCell>
                <TableCell>役職</TableCell>
                {canManage && <TableCell align="center" sx={{ width: 96 }}>操作</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {staffs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.secondary" }}>
                    スタッフが登録されていません
                  </TableCell>
                </TableRow>
              )}
              {staffs.map((s) => (
                <TableRow key={s.id} hover>
                  <TableCell sx={{ color: "text.secondary", fontSize: 12 }}>{s.id}</TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{s.display_name}</TableCell>
                  <TableCell sx={{ fontSize: 12, color: "text.secondary" }}>{s.login_id}</TableCell>
                  <TableCell>
                    {s.shop_display
                      ? <Typography variant="body2">{s.shop_display}</Typography>
                      : <Typography variant="body2" color="text.disabled">-</Typography>}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={ROLE_LABELS[s.role] || s.role}
                      size="small"
                      color={ROLE_COLORS[s.role] || "default"}
                      variant="outlined"
                    />
                  </TableCell>
                  {canManage && (
                    <TableCell align="center">
                      <Tooltip title="編集">
                        <IconButton
                          size="small"
                          onClick={() => router.push(`/dashboard/staffs/${s.id}`)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="削除">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeleteTarget(s)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* 削除確認ダイアログ */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>スタッフの削除</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>{deleteTarget?.display_name}</strong> を削除します。
            この操作は取り消せません（論理削除）。よろしいですか？
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>キャンセル</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={deleting}>
            {deleting ? "削除中..." : "削除する"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* スナックバー */}
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
