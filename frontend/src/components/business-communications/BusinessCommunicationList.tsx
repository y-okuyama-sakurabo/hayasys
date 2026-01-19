"use client";

import { Stack, CircularProgress, Typography, Paper } from "@mui/material";
import BusinessCommunicationItem, { type BusinessCommunication } from "./BusinessCommunicationItem";
export type { BusinessCommunication };

export default function BusinessCommunicationList({
  items,
  loading,
  emptyText = "お知らせはありません",
  showActions = true,
  pendingOnlyView = false,
  onChanged,
}: {
  items: BusinessCommunication[];
  loading?: boolean;
  emptyText?: string;
  showActions?: boolean;
  pendingOnlyView?: boolean;
  onChanged?: () => void | Promise<void>;
}) {
  if (loading) return <CircularProgress />;

  if (!items?.length) {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography color="text.secondary">{emptyText}</Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={2}>
      {items.map((item) => (
        <BusinessCommunicationItem
          key={item.id}
          item={item}
          showActions={showActions}
          pendingOnlyView={pendingOnlyView}
          onChanged={onChanged}
        />
      ))}
    </Stack>
  );
}
