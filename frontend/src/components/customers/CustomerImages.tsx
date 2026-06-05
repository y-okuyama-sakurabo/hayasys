"use client";

import { useEffect, useRef, useState } from "react";
import {
  Paper, Typography, Box, IconButton, Tooltip,
  CircularProgress, Stack, Alert,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button,
} from "@mui/material";
import PhotoLibraryIcon  from "@mui/icons-material/PhotoLibrary";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CloudUploadIcon   from "@mui/icons-material/CloudUpload";
import ImageIcon         from "@mui/icons-material/Image";
import apiClient from "@/lib/apiClient";
import { compressImage } from "@/lib/compressImage";
import ImageLightbox from "@/components/common/ImageLightbox";

type CustomerImage = { id: number; image: string; width?: number; height?: number; bytes?: number };

/** 相対パス（/media/...）の場合、APIのベースURLホストを補完する */
const resolveImageUrl = (url: string): string => {
  if (!url) return url;
  if (url.startsWith("http")) return url;                              // すでに絶対URL
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/api\/?$/, "");
  return `${base}${url}`;
};

export default function CustomerImages({ customerId }: { customerId: number }) {
  const [images,    setImages]    = useState<CustomerImage[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver,  setDragOver]  = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [hoverId,   setHoverId]   = useState<number | null>(null);
  const [lightbox,  setLightbox]  = useState<number | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<CustomerImage | null>(null);
  const [deleting,     setDeleting]     = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

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

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setError(null);
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const fd = new FormData();
      fd.append("image", compressed);
      await apiClient.post(`/customers/${customerId}/images/`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await fetchImages();
    } catch {
      setError("アップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/customers/${customerId}/images/${deleteTarget.id}/`);
      const newImages = images.filter(i => i.id !== deleteTarget.id);
      setImages(newImages);
      setDeleteTarget(null);
      if (lightbox !== null) {
        if (newImages.length === 0) setLightbox(null);
        else setLightbox(idx => idx !== null ? Math.min(idx, newImages.length - 1) : null);
      }
    } catch {
      setError("削除に失敗しました");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
      {/* タイトル */}
      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
        <PhotoLibraryIcon fontSize="small" color="action" />
        <Typography variant="subtitle1" fontWeight="bold">顧客画像</Typography>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* ── ドラッグ & ドロップ アップロードゾーン ── */}
      <Box
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        sx={{
          border: "2px dashed",
          borderColor: dragOver ? "primary.main" : uploading ? "primary.light" : "divider",
          borderRadius: 2,
          p: 3, mb: 3,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
          cursor: uploading ? "default" : "pointer",
          bgcolor: dragOver ? "primary.50" : "grey.50",
          transition: "all 0.15s",
          "&:hover": uploading ? {} : { borderColor: "primary.main", bgcolor: "primary.50" },
        }}
      >
        <input ref={inputRef} type="file" hidden accept="image/*" onChange={handleFileChange} />
        {uploading ? (
          <>
            <CircularProgress size={28} />
            <Typography variant="body2" color="text.secondary">アップロード中…</Typography>
          </>
        ) : (
          <>
            <CloudUploadIcon sx={{ fontSize: 36, color: dragOver ? "primary.main" : "grey.400" }} />
            <Typography variant="body2" color="text.secondary">
              クリックまたはドラッグ&ドロップで画像を追加
            </Typography>
            <Typography variant="caption" color="text.disabled">JPG / PNG / WEBP</Typography>
          </>
        )}
      </Box>

      {/* ── 画像グリッド ── */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress size={28} />
        </Box>
      ) : images.length === 0 ? (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 6, color: "text.disabled", gap: 1 }}>
          <ImageIcon sx={{ fontSize: 40, opacity: 0.4 }} />
          <Typography variant="body2">画像がありません</Typography>
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
          {images.map((img, idx) => (
            <Box
              key={img.id}
              onMouseEnter={() => setHoverId(img.id)}
              onMouseLeave={() => setHoverId(null)}
              onClick={() => setLightbox(idx)}
              sx={{
                position: "relative", width: 140, height: 140,
                border: "1px solid",
                borderColor: hoverId === img.id ? "primary.main" : "divider",
                borderRadius: 1.5, overflow: "hidden", cursor: "pointer", flexShrink: 0,
                transition: "border-color 0.15s, transform 0.15s",
                "&:hover": { transform: "scale(1.02)" },
              }}
            >
              <img
                src={resolveImageUrl(img.image)}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                loading="lazy"
              />
              {/* ホバーオーバーレイ */}
              <Box
                sx={{
                  position: "absolute", inset: 0,
                  bgcolor: "rgba(0,0,0,0.35)",
                  opacity: hoverId === img.id ? 1 : 0,
                  transition: "opacity 0.15s",
                  display: "flex", alignItems: "flex-start", justifyContent: "flex-end",
                  p: 0.5,
                }}
                onClick={e => e.stopPropagation()}
              >
                <Tooltip title="削除">
                  <IconButton
                    size="small"
                    onClick={() => setDeleteTarget(img)}
                    sx={{
                      bgcolor: "rgba(255,255,255,0.9)", color: "error.main",
                      "&:hover": { bgcolor: "#fff" }, width: 28, height: 28,
                    }}
                  >
                    <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {/* ── ライトボックス ── */}
      <ImageLightbox
        images={images.map(img => ({
          src:  resolveImageUrl(img.image),
          name: img.image.split("/").pop(),
        }))}
        index={lightbox}
        onClose={() => setLightbox(null)}
        onChange={setLightbox}
      />

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
