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

type VehicleImage = {
  id: number;
  image: string;
};

type Props = {
  vehicleId: number;
};

export default function VehicleImages({ vehicleId }: Props) {

  const [images, setImages] = useState<VehicleImage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchImages = async () => {
    const res = await apiClient.get(`/vehicles/${vehicleId}/images/`);
    setImages(res.data.results || res.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchImages();
  }, [vehicleId]);

  const handleUpload = async (e: any) => {

    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    await apiClient.post(
      `/vehicles/${vehicleId}/images/`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    fetchImages();
  };

  const handleDelete = async (imageId: number) => {

    if (!confirm("削除しますか？")) return;

    await apiClient.delete(
      `/vehicles/${vehicleId}/images/${imageId}/`
    );

    setImages((prev) => prev.filter((i) => i.id !== imageId));
  };

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" mb={2}>
        車両画像
      </Typography>

      <Box mb={2}>
        <Button variant="outlined" component="label">
          画像アップロード
          <input
            type="file"
            hidden
            accept="image/*"
            onChange={handleUpload}
          />
        </Button>
      </Box>

      {loading ? (
        <CircularProgress />
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