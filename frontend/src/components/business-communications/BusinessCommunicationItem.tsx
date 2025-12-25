"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Stack,
  Divider,
} from "@mui/material";
import { useRouter } from "next/navigation";

type ShopTiny = { id: number; name: string };
type CustomerTiny = { id: number; name: string };

export type BusinessCommunication = {
  id: number;
  customer: CustomerTiny;
  sender_shop: ShopTiny;
  receiver_shop: ShopTiny;
  created_by: { id: number; name?: string; email?: string } | null;
  title: string;
  content: string;
  status: "pending" | "done";
  created_at: string;
};


type Props = {
  item: BusinessCommunication;
  onDone?: (id: number) => void; // 一覧ページだけ渡す（顧客詳細では省略OK）
  showActions?: boolean;         // ボタン表示のON/OFF
};

export default function BusinessCommunicationItem({
  item,
  onDone,
  showActions = true,
}: Props) {
  const router = useRouter();

  const statusLabel = item.status === "pending" ? "未対応" : "対応済";
  const statusColor = item.status === "pending" ? "error" : "default";

  const createdAtText = useMemo(() => {
    try {
      return new Date(item.created_at).toLocaleString();
    } catch {
      return item.created_at;
    }
  }, [item.created_at]);

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              label={statusLabel}
              color={statusColor as any}
              size="small"
            />
            <Typography fontWeight="bold" sx={{ flex: 1 }}>
              {item.customer?.name}｜{item.title}
            </Typography>
          </Stack>

          <Typography variant="body2" color="text.secondary">
            {item.sender_shop?.name} → {item.receiver_shop?.name}
          </Typography>

          <Typography variant="body2">
            {item.content}
          </Typography>

          <Typography variant="caption" color="text.secondary">
            {createdAtText}
          </Typography>

          {showActions && (
            <>
              <Divider />
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  onClick={() =>
                    router.push(`/dashboard/customers/${item.customer.id}?tab=communications`)
                  }
                >
                  顧客詳細へ
                </Button>

                {item.status === "pending" && onDone && (
                  <Button
                    size="small"
                    color="success"
                    onClick={() => onDone(item.id)}
                  >
                    対応済みにする
                  </Button>
                )}
              </Stack>
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
