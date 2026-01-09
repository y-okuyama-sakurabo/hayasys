"use client";

import { useEffect, useState, useCallback } from "react";
import { Box, Typography, Stack, Tabs, Tab } from "@mui/material";
import apiClient from "@/lib/apiClient";
import BusinessCommunicationList, {
  BusinessCommunication,
} from "@/components/business-communications/BusinessCommunicationList";

export default function BusinessCommunicationsPage() {
  const [tab, setTab] = useState<"pending" | "done">("pending");
  const [items, setItems] = useState<BusinessCommunication[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async (status: "pending" | "done") => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/business_communications/inbox/?status=${status}`);
      const data = Array.isArray(res.data) ? res.data : res.data.results ?? [];
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
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        業務連絡
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="pending" label="未対応" />
        <Tab value="done" label="対応済み" />
      </Tabs>

      <Stack spacing={2}>
        <BusinessCommunicationList
          items={items}
          loading={loading}
          emptyText={tab === "pending" ? "未対応はありません" : "対応済みはありません"}
          showActions
          pendingOnlyView={tab === "pending"}
          onChanged={() => fetchItems(tab)}   // ✅ これが超重要
        />
      </Stack>
    </Box>
  );
}
