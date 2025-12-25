"use client";

import { useEffect, useState } from "react";
import {
  Stack,
  CircularProgress,
  Card,
  CardContent,
  Typography,
} from "@mui/material";
import apiClient from "@/lib/apiClient";
import BusinessCommunicationItem from "./BusinessCommunicationItem";

type ShopTiny = { id: number; name: string };
type UserTiny = { id: number; name?: string };

export type BusinessCommunication = {
  id: number;
  customer: { id: number; name: string };
  sender_shop: ShopTiny;
  receiver_shop: ShopTiny;
  staff: UserTiny | null;
  title: string;
  content: string;
  status: "pending" | "done";
  created_at: string;
};

export default function BusinessCommunicationList({
  customerId,
}: {
  customerId?: number;
}) {
  const [items, setItems] = useState<BusinessCommunication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const url = customerId
          ? `/customers/${customerId}/business_communications/`
          : "/business_communications/inbox/";

        const res = await apiClient.get(url);

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

    fetch();
  }, [customerId]);


  if (loading) {
    return <CircularProgress />;
  }

  return (
    <Stack spacing={2}>
      {items.length === 0 ? (
        <Card variant="outlined">
          <CardContent>
            <Typography
              variant="body1"
              color="text.secondary"
              align="center"
            >
              お知らせはありません
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              align="center"
              sx={{ mt: 1 }}
            >
              新しい業務連絡が届くと、ここに表示されます。
            </Typography>
          </CardContent>
        </Card>
      ) : (
        items.map((item) => (
          <BusinessCommunicationItem
            key={item.id}
            item={item}
            onDone={(id) =>
              setItems((prev) => prev.filter((i) => i.id !== id))
            }
          />
        ))
      )}
    </Stack>
  );
}
