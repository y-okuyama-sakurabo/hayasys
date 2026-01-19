"use client";

import { useEffect, useState } from "react";
import {
  Paper,
  Typography,
  Box,
  Button,
  Grid,
  IconButton,
  CircularProgress,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import apiClient from "@/lib/apiClient";

type CustomerImage = {
  id: number;
  image: string;
  width?: number;
  height?: number;
  bytes?: number;
};

type Props = {
  customerId: number;
};

export default function CustomerImages({ customerId }: Props) {
  const [images, setImages] = useState<CustomerImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  // ============================
  // 画像一覧取得
  // ============================
  const fetchImages = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/customers/${customerId}/images/`);
      setImages(res.data.results || res.data || []);
    } catch (e) {
      console.error(e);
      setError("画像の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [customerId]);

  // ============================
  // アップロード
  // ============================
  const handleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setUploading(true);

    const formData = new FormData();
    formData.append("image", file);

    try {
      await apiClient.post(
        `/customers/${customerId}/images/`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      await fetchImages();
    } catch (e) {
      console.error(e);
      setError("アップロードに失敗しました");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // ============================
  // 削除
  // ============================
  const handleDelete = async (imageId: number) => {
    if (!confirm("この画像を削除しますか？")) return;

    try {
      await apiClient.delete(
        `/customers/${customerId}/images/${imageId}/`
      );
      setImages((prev) => prev.filter((i) => i.id !== imageId));
    } catch (e) {
      console.error(e);
      alert("削除に失敗しました");
    }
  };

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" mb={2}>
        顧客画像
      </Typography>

      {/* === アップロード === */}
      <Box mb={2}>
        <Button variant="outlined" component="label" disabled={uploading}>
          {uploading ? "アップロード中..." : "画像をアップロード"}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={handleUpload}
          />
        </Button>

        {error && (
          <Typography color="error" variant="body2" mt={1}>
            {error}
          </Typography>
        )}
      </Box>

      {/* === 一覧 === */}
      {loading ? (
        <CircularProgress size={24} />
      ) : images.length === 0 ? (
        <Typography color="text.secondary">
          画像はありません
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {images.map((img) => (
            <Grid key={img.id}>
              <Box
                sx={{
                  position: "relative",
                  width: 160,
                  height: 160,
                  border: "1px solid #ddd",
                  borderRadius: 1,
                  overflow: "hidden",
                }}
              >
                <img
                  src={img.image}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />

                <IconButton
                  size="small"
                  onClick={() => handleDelete(img.id)}
                  sx={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    backgroundColor: "rgba(255,255,255,0.8)",
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </Grid>
          ))}
        </Grid>
      )}
    </Paper>
  );
}
