"use client";

import { useEffect, useState } from "react";
import {
  Paper, Typography, Box, Button, IconButton, Tooltip,
  CircularProgress, Stack, Alert,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
} from "@mui/material";
import PhotoLibraryIcon  from "@mui/icons-material/PhotoLibrary";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import FileUploadIcon    from "@mui/icons-material/FileUpload";
import apiClient from "@/lib/apiClient";

type CustomerImage = {
  id: number;
  image: string;
  width?: number;
  height?: number;
  bytes?: number;
};

export default function CustomerImages({ customerId }: { customerId: number }) {
  const [images,    setImages]    = useState<CustomerImage[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<CustomerImage | null>(null);
  const [deleting,     setDeleting]     = useState(false);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/customers/${customerId}/images/`);
      setImages(res.data.results ?? res.data ?? []);
    } catch {
      setError("画像の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchImages(); }, [customerId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      await apiClient.post(`/customers/${customerId}/images/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await fetchImages();
    } catch {
      setError("アップロードに失敗しました");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/customers/${customerId}/images/${deleteTarget.id}/`);
      setImages((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setError("削除に失敗しました");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <PhotoLibraryIcon fontSize="small" color="action" />
          <Typography variant="subtitle1" fontWeight="bold">顧客画像</Typography>
        </Stack>
        <Button
          variant="outlined"
          size="small"
          component="label"
          disabled={uploading}
          startIcon={uploading ? <CircularProgress size={13} color="inherit" /> : <FileUploadIcon />}
        >
          {uploading ? "アップロード中..." : "画像を追加"}
          <input type="file" accept="image/*" hidden onChange={handleUpload} />
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={3}>
          <CircularProgress size={24} />
        </Box>
      ) : images.length === 0 ? (
        <Typography variant="body2" color="text.disabled" sx={{ py: 1 }}>
          画像はありません
        </Typography>
      ) : (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
          {images.map((img) => (
            <Box
              key={img.id}
              sx={{
                position: "relative",
                width: 140,
                height: 140,
                borderRadius: 1,
                overflow: "hidden",
                border: "1px solid",
                borderColor: "divider",
                "&:hover .delete-btn": { opacity: 1 },
              }}
            >
              <img
                src={img.image}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
              <Box
                className="delete-btn"
                sx={{
                  position: "absolute",
                  inset: 0,
                  bgcolor: "rgba(0,0,0,0.35)",
                  opacity: 0,
                  transition: "opacity 0.15s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Tooltip title="削除">
                  <IconButton
                    size="small"
                    onClick={() => setDeleteTarget(img)}
                    sx={{ color: "white", bgcolor: "rgba(0,0,0,0.4)", "&:hover": { bgcolor: "error.main" } }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {/* 削除確認ダイアログ */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>画像の削除</DialogTitle>
        <DialogContent>
          <DialogContentText>この画像を削除しますか？この操作は取り消せません。</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>キャンセル</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={deleting}>
            {deleting ? "削除中..." : "削除する"}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
