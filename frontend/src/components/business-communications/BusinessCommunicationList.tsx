"use client";

import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import ForumOutlinedIcon from "@mui/icons-material/ForumOutlined";
import BusinessCommunicationCard from "./BusinessCommunicationCard";

export type BusinessCommunicationMessage = {
  id: number;
  content?: string;
  created_at?: string;
  sender_staff?: { id: number; full_name?: string; login_id?: string };
  sender_shop?: { id: number; name: string };
  receiver_staff?: { id: number; full_name?: string };
  receiver_shop?: { id: number; name: string };
  attachments?: { id: number; file: string }[];
};

export type BusinessCommunicationThread = {
  id: number;
  title: string;
  status: "pending" | "done";
  customer?: { id: number; name: string } | null;
  sender_name?: string;
  receiver_name?: string;
  updated_at?: string;
  messages?: BusinessCommunicationMessage[];
};

type Props = {
  items: BusinessCommunicationThread[];
  loading?: boolean;
  emptyText?: string;
  onChanged?: () => void;
};

export default function BusinessCommunicationList({ items, loading, emptyText, onChanged }: Props) {
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={6}>
        <CircularProgress />
      </Box>
    );
  }

  if (!items || items.length === 0) {
    return (
      <Box
        sx={{
          display: "flex", flexDirection: "column", alignItems: "center",
          py: 10, color: "text.disabled", gap: 1.5,
        }}
      >
        <ForumOutlinedIcon sx={{ fontSize: 52, opacity: 0.35 }} />
        <Typography variant="body2">{emptyText ?? "データがありません"}</Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={1.5}>
      {items.map(item => (
        <BusinessCommunicationCard key={item.id} item={item} refresh={onChanged} />
      ))}
    </Stack>
  );
}
