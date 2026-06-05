"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box, Typography, IconButton, CircularProgress,
  Tooltip, Stack,
} from "@mui/material";
import DeleteIcon      from "@mui/icons-material/Delete";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import ImageIcon       from "@mui/icons-material/Image";
import apiClient from "@/lib/apiClient";
import { compressImage } from "@/lib/compressImage";
import ImageLightbox from "@/components/common/ImageLightbox";

type VehicleImage = { id: number; image: string };
type Props = { vehicleId: number };

/** 相対パス（/media/...）の場合、APIのベースURLホストを補完する */
const resolveImageUrl = (url: string): string => {
  if (!url) return url;
  if (url.startsWith("http")) return url;
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/api\/?$/, "");
  return `${base}${url}`;
};

export default function VehicleImages({ vehicleId }: Props) {
  const [images,    setImages]    = useState<VehicleImage[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver,  setDragOver]  = useState(false);
  const [lightbox,  setLightbox]  = useState<number | null>(null); // index
  const [hoverId,   setHoverId]   = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchImages = async () => {
    try {
      const res = await apiClient.get(`/vehicles/${vehicleId}/images/`);
      setImages(res.data.results || res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchImages(); }, [vehicleId]);

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const fd = new FormData();
      fd.append("image", compressed);
      await apiClient.post(`/vehicles/${vehicleId}/images/`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await fetchImages();
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

  const handleDelete = async (imageId: number) => {
    if (!confirm("この画像を削除しますか？")) return;
    await apiClient.delete(`/vehicles/${vehicleId}/images/${imageId}/`);
    setImages(prev => prev.filter(i => i.id !== imageId));
    if (lightbox !== null) {
      const newImages = images.filter(i => i.id !== imageId);
      if (newImages.length === 0) setLightbox(null);
      else setLightbox(idx => idx !== null ? Math.min(idx, newImages.length - 1) : null);
    }
  };

  return (
    <Box>
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
          "&:hover": uploading ? {} : {
            borderColor: "primary.main",
            bgcolor: "primary.50",
          },
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
            <Typography variant="caption" color="text.disabled">
              JPG / PNG / WEBP
            </Typography>
          </>
        )}
      </Box>

      {/* ── 画像グリッド ── */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress size={28} />
        </Box>
      ) : images.length === 0 ? (
        <Box
          sx={{
            display: "flex", flexDirection: "column", alignItems: "center",
            py: 6, color: "text.disabled", gap: 1,
          }}
        >
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
                position: "relative",
                width: 140, height: 140,
                border: "1px solid",
                borderColor: hoverId === img.id ? "primary.main" : "divider",
                borderRadius: 1.5,
                overflow: "hidden",
                cursor: "pointer",
                flexShrink: 0,
                transition: "border-color 0.15s, transform 0.15s",
                "&:hover": { transform: "scale(1.02)" },
              }}
            >
              <img
                src={resolveImageUrl(img.image)}
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
                    onClick={() => handleDelete(img.id)}
                    sx={{ bgcolor: "rgba(255,255,255,0.9)", color: "error.main",
                      "&:hover": { bgcolor: "#fff" }, width: 28, height: 28 }}
                  >
                    <DeleteIcon sx={{ fontSize: 16 }} />
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
    </Box>
  );
}
