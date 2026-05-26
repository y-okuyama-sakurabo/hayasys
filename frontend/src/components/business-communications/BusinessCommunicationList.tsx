"use client";

import { CircularProgress, Stack, Typography } from "@mui/material";
import BusinessCommunicationCard from "./BusinessCommunicationCard";

export type BusinessCommunicationMessage = {
  id: number;
  content?: string;
  created_at?: string;
  sender_staff?: { id: number; display_name?: string; login_id?: string };
  sender_shop?: { id: number; name: string };
  receiver_staff?: { id: number; display_name?: string };
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

export default function BusinessCommunicationList({
  items,
  loading,
  emptyText,
  onChanged,
}: Props) {
  if (loading) return <CircularProgress />;

  if (!items || items.length === 0) {
    return <Typography>{emptyText ?? "データがありません"}</Typography>;
  }

  return (
    <Stack spacing={2}>
      {items.map((item) => (
        <BusinessCommunicationCard key={item.id} item={item} refresh={onChanged} />
      ))}
    </Stack>
  );
}
