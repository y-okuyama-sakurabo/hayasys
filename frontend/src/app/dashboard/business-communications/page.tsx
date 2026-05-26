"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Stack,
  Tabs,
  Tab,
  CircularProgress,
  Button,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import apiClient from "@/lib/apiClient";

import BusinessCommunicationList, {
  BusinessCommunicationThread,
} from "@/components/business-communications/BusinessCommunicationList";
import BusinessCommunicationCreateDialog from "@/components/business-communications/BusinessCommunicationCreateDialog";

export default function BusinessCommunicationsPage() {
  const [tab, setTab] = useState<"pending" | "done">("pending");
  const [items, setItems] = useState<BusinessCommunicationThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchItems = useCallback(async (status: "pending" | "done") => {
    setLoading(true);
    try {
      const res = await apiClient.get(
        `/communication-threads/?status=${status}`
      );
      const data = Array.isArray(res.data)
        ? res.data
        : res.data.results ?? [];
      setItems(data);
    } catch (e) {
      console.error("業務連絡取得失敗", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems(tab);
  }, [tab, fetchItems]);

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        mb={2}
      >
        <Typography variant="h5" fontWeight="bold">
          業務連絡
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)}
        >
          新規作成
        </Button>
      </Stack>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 2 }}
      >
        <Tab value="pending" label="未対応" />
        <Tab value="done" label="対応済み" />
      </Tabs>

      {loading ? (
        <Box display="flex" justifyContent="center" mt={5}>
          <CircularProgress />
        </Box>
      ) : (
        <BusinessCommunicationList
          items={items}
          loading={false}
          emptyText="業務連絡はありません"
          onChanged={() => fetchItems(tab)}
        />
      )}

      <BusinessCommunicationCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          fetchItems(tab);
        }}
      />
    </Box>
  );
}
