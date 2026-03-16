"use client";

import { CircularProgress, Typography } from "@mui/material";
import BusinessCommunicationCard from "./BusinessCommunicationCard";

export type BusinessCommunicationMessage = {
  id: number;
  content?: string;
  created_at?: string;
  sender_staff?: {
    id: number;
    display_name?: string;
    login_id?: string;
  };
  sender_shop?: {
    id: number;
    name: string;
  };
};

export type BusinessCommunication = {
  id: number;
  title?: string;
  sender_name?: string;
  receiver_name?: string;
  messages?: BusinessCommunicationMessage[];
};

type Props = {
  items: BusinessCommunication[];
  loading?: boolean;
  emptyText?: string;
  showActions?: boolean;
  pendingOnlyView?: boolean;
  onChanged?: () => void;
};

export default function BusinessCommunicationList({
  items,
  loading,
  emptyText,
  onChanged,
}: Props) {

  if (loading) {
    return <CircularProgress />;
  }

  if (!items || items.length === 0) {
    return <Typography>{emptyText ?? "データがありません"}</Typography>;
  }

  return (
    <>
      {items.map((item) => (
        <BusinessCommunicationCard
          key={item.id}
          item={item}
          refresh={onChanged}
        />
      ))}
    </>
  );
}