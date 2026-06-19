"use client";

import { useEffect, useState } from "react";
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, IconButton, Tooltip, Button, Chip, CircularProgress,
  Alert, Dialog, DialogTitle, DialogContent, DialogActions,
} from "@mui/material";
import RestoreIcon from "@mui/icons-material/Restore";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/apiClient";

type TrashItem = {
  id: number;
  name: string;
  parent_id: number | null;
  category_type: string | null;
  tax_type: string | null;
  deleted_at: string;
};

const CATEGORY_TYPE_LABELS: Record<string, string> = {
  vehicle:             "車両",
  other:               "その他",
  taxable_expense:     "課税費用",
  non_taxable_expense: "非課税費用",
};

const TYPE_COLORS: Record<string, string> = {
  vehicle:             "#1976d2",
  other:               "#5d4037",
  taxable_expense:     "#e65100",
  non_taxable_expense: "#6a1b9a",
};

export default function CategoryTrashPage() {
  const router = useRouter();
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hardDeleteTarget, setHardDeleteTarget] = useState<TrashItem | null>(null);
  const [processing, setProcessing] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/categories/trash/");
      setItems(res.data?.results ?? res.data ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleRestore = async (item: TrashItem) => {
    try {
      setProcessing(true);
      await apiClient.post(`/categories/${item.id}/restore/`);
      setItems(prev => prev.filter(i => i.id !== item.id));
    } finally {
      setProcessing(false);
    }
  };

  const handleHardDelete = async () => {
    if (!hardDeleteTarget) return;
    try {
      setProcessing(true);
      await apiClient.delete(`/categories/${hardDeleteTarget.id}/hard-delete/`);
      setItems(prev => prev.filter(i => i.id !== hardDeleteTarget.id));
      setHardDeleteTarget(null);
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: "auto" }}>
      <Box display="flex" alignItems="center" gap={1.5} mb={3}>
        <IconButton onClick={() => router.push("/dashboard/settings/categories")}>
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h5" fontWeight="bold">カテゴリ ゴミ箱</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            削除したカテゴリを復元または完全削除できます
          </Typography>
        </Box>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
      ) : items.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: "center" }}>
          <Typography color="text.secondary">ゴミ箱にカテゴリはありません</Typography>
          <Button variant="outlined" sx={{ mt: 2 }} onClick={() => router.push("/dashboard/settings/categories")}>
            カテゴリ管理へ戻る
          </Button>
        </Paper>
      ) : (
        <Paper variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell sx={{ fontWeight: "bold" }}>カテゴリ名</TableCell>
                <TableCell sx={{ fontWeight: "bold", width: 120 }}>種別</TableCell>
                <TableCell sx={{ fontWeight: "bold", width: 100 }}>税区分</TableCell>
                <TableCell sx={{ fontWeight: "bold", width: 160 }}>削除日時</TableCell>
                <TableCell sx={{ width: 100 }} align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map(item => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">{item.name}</Typography>
                    {item.parent_id && (
                      <Typography variant="caption" color="text.secondary">
                        （子カテゴリ）
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.category_type ? (
                      <Chip
                        label={CATEGORY_TYPE_LABELS[item.category_type] ?? item.category_type}
                        size="small"
                        sx={{
                          height: 20, fontSize: 11,
                          bgcolor: (TYPE_COLORS[item.category_type] ?? "#888") + "20",
                          color: TYPE_COLORS[item.category_type] ?? "#888",
                          border: `1px solid ${(TYPE_COLORS[item.category_type] ?? "#888")}40`,
                        }}
                      />
                    ) : (
                      <Typography variant="caption" color="text.disabled">—</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.tax_type ? (
                      <Chip
                        label={item.tax_type === "taxable" ? "課税" : "非課税"}
                        size="small"
                        color={item.tax_type === "taxable" ? "default" : "warning"}
                        variant="outlined"
                        sx={{ height: 20, fontSize: 11 }}
                      />
                    ) : (
                      <Typography variant="caption" color="text.disabled">—</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(item.deleted_at)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="復元">
                      <IconButton
                        size="small" color="primary" disabled={processing}
                        onClick={() => handleRestore(item)}
                      >
                        <RestoreIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="完全削除">
                      <IconButton
                        size="small" color="error" disabled={processing}
                        onClick={() => setHardDeleteTarget(item)}
                      >
                        <DeleteForeverIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* 完全削除確認ダイアログ */}
      <Dialog open={!!hardDeleteTarget} onClose={() => !processing && setHardDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmberIcon color="error" />
          完全削除しますか？
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 1 }}>
            <strong>「{hardDeleteTarget?.name}」</strong> を完全削除します。この操作は取り消せません。
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setHardDeleteTarget(null)} color="inherit" disabled={processing}>キャンセル</Button>
          <Button
            variant="contained" color="error" onClick={handleHardDelete} disabled={processing}
            startIcon={processing ? <CircularProgress size={16} color="inherit" /> : <DeleteForeverIcon />}
          >
            {processing ? "削除中..." : "完全削除"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
