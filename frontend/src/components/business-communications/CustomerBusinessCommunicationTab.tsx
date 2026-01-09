"use client";

import { useEffect, useState } from "react";
import { Stack, Typography, Divider } from "@mui/material";
import apiClient from "@/lib/apiClient";
import BusinessCommunicationList, {
  BusinessCommunication,
} from "@/components/business-communications/BusinessCommunicationList";
import BusinessCommunicationCreateForm from "@/components/business-communications/BusinessCommunicationCreateForm";

export default function CustomerBusinessCommunicationTab({ customerId }: { customerId: number }) {
  const [items, setItems] = useState<BusinessCommunication[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/customers/${customerId}/business_communications/`);
      const data = Array.isArray(res.data) ? res.data : res.data.results;
      setItems(data ?? []);
    } catch (e) {
      console.error("業務連絡取得失敗", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [customerId]);

  const handleCreated = (created: BusinessCommunication) => {
    setItems((prev) => [created, ...prev]); // ✅ 即反映
  };

  const handleDone = async (id: number) => {
    try {
      await apiClient.patch(`/business_communications/${id}/status/`, { status: "done" });
      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, status: "done" } : x)));
    } catch (e) {
      console.error("対応済み更新失敗", e);
    }
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h6">業務連絡</Typography>

      <BusinessCommunicationCreateForm customerId={customerId} onCreated={handleCreated} />

      <Divider />

      <BusinessCommunicationList
        items={items}
        loading={loading}
        onDone={handleDone}
        emptyText="業務連絡はありません"
        showActions={true}
      />
    </Stack>
  );
}
