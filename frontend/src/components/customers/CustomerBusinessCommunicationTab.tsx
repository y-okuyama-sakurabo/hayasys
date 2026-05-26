"use client";

import { useEffect, useState } from "react";
import { Box, Button, Stack } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import apiClient from "@/lib/apiClient";

import BusinessCommunicationList, {
  BusinessCommunicationThread,
} from "@/components/business-communications/BusinessCommunicationList";
import BusinessCommunicationCreateDialog from "@/components/business-communications/BusinessCommunicationCreateDialog";

export default function CustomerBusinessCommunicationTab({
  customerId,
  customerName,
}: {
  customerId: number;
  customerName?: string;
}) {
  const [items, setItems] = useState<BusinessCommunicationThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(
        `/customers/${customerId}/communication-threads/`
      );
      const data = Array.isArray(res.data)
        ? res.data
        : res.data.results ?? [];
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [customerId]);

  return (
    <Box>
      <Stack direction="row" justifyContent="flex-end" mb={2}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)}
        >
          新規作成
        </Button>
      </Stack>

      <BusinessCommunicationList
        items={items}
        loading={loading}
        emptyText="業務連絡はありません"
        onChanged={fetchItems}
      />

      <BusinessCommunicationCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          fetchItems();
        }}
        customerId={customerId}
        customerName={customerName}
      />
    </Box>
  );
}
