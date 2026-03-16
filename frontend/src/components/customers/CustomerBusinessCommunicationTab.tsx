"use client";

import { useEffect, useState } from "react";
import { Box, Stack } from "@mui/material";
import apiClient from "@/lib/apiClient";

import BusinessCommunicationCreate from "@/components/business-communications/BusinessCommunicationCreate";
import BusinessCommunicationList from "@/components/business-communications/BusinessCommunicationList";

export default function CustomerBusinessCommunicationTab({ customerId }: any) {

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (

    <Box>

      <BusinessCommunicationCreate
        customerId={customerId}
        refresh={fetchItems}
      />

      <Stack spacing={2}>

        <BusinessCommunicationList
          items={items}
          loading={loading}
          onChanged={fetchItems}
        />

      </Stack>

    </Box>

  );
}