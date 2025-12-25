"use client";

import { useEffect, useState } from "react";
import { Stack, Button } from "@mui/material";
import apiClient from "@/lib/apiClient";
import BusinessCommunicationItem from "@/components/business-communications/BusinessCommunicationItem";

export default function CustomerBusinessCommunicationTab({
  customerId,
}: {
  customerId: number;
}) {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    apiClient
      .get(`/customers/${customerId}/communications/`)
      .then((res) => setItems(res.data));
  }, [customerId]);

  return (
    <Stack spacing={2}>
      <Button variant="contained">業務連絡を作成</Button>

      {items.map((item) => (
        <BusinessCommunicationItem
          key={item.id}
          item={item}
          onDone={() => {}}
        />
      ))}
    </Stack>
  );
}
