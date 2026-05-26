"use client";

import { Paper, Typography, Box, Chip, Stack } from "@mui/material";
import { useState } from "react";
import BusinessCommunicationThreadDialog from "./BusinessCommunicationThreadDialog";

type Thread = {
  id: number;
  title: string;
  status: "pending" | "done";
  customer?: { id: number; name: string } | null;
  sender_name?: string;
  receiver_name?: string;
  updated_at?: string;
  messages?: any[];
};

export default function BusinessCommunicationCard({
  item,
  refresh,
}: {
  item: Thread;
  refresh?: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const preview = item.messages?.[0]?.content ?? "";

  return (
    <>
      <Paper
        sx={{ p: 2, cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}
        onClick={() => setDialogOpen(true)}
      >
        <Stack direction="row" alignItems="flex-start" spacing={1}>
          <Box flex={1} minWidth={0}>
            <Typography fontSize={12} color="text.secondary" noWrap>
              {item.sender_name} → {item.receiver_name}
              {item.customer && (
                <span style={{ marginLeft: 8 }}>顧客：{item.customer.name}</span>
              )}
            </Typography>
            <Typography fontWeight="bold" noWrap>
              {item.title}
            </Typography>
            {preview && (
              <Typography
                fontSize={13}
                color="text.secondary"
                noWrap
                mt={0.5}
              >
                {preview}
              </Typography>
            )}
          </Box>
          <Chip
            size="small"
            label={item.status === "pending" ? "未対応" : "対応済み"}
            color={item.status === "pending" ? "warning" : "success"}
          />
        </Stack>
      </Paper>

      {dialogOpen && (
        <BusinessCommunicationThreadDialog
          thread={item}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onChanged={() => {
            setDialogOpen(false);
            refresh?.();
          }}
        />
      )}
    </>
  );
}
