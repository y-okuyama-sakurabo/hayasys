"use client";

import { useState } from "react";
import { Box, Typography, Chip, Stack, Badge } from "@mui/material";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import PersonIcon from "@mui/icons-material/Person";
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

function relativeTime(s?: string) {
  if (!s) return "";
  const diff = Date.now() - new Date(s).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "今";
  if (mins < 60) return `${mins}分前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}日前`;
  return new Date(s).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
}

export default function BusinessCommunicationCard({
  item,
  refresh,
}: {
  item: Thread;
  refresh?: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const isPending = item.status === "pending";
  const latestMessage = item.messages?.[item.messages.length - 1]?.content ?? "";
  const messageCount  = item.messages?.length ?? 0;

  return (
    <>
      <Box
        onClick={() => setDialogOpen(true)}
        sx={{
          display: "flex",
          cursor: "pointer",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1.5,
          overflow: "hidden",
          bgcolor: "background.paper",
          transition: "box-shadow 0.15s, border-color 0.15s",
          "&:hover": {
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            borderColor: isPending ? "warning.main" : "success.main",
          },
        }}
      >
        {/* ステータスカラーバー */}
        <Box
          sx={{
            width: 4,
            flexShrink: 0,
            bgcolor: isPending ? "warning.main" : "success.main",
          }}
        />

        {/* メインコンテンツ */}
        <Box sx={{ flex: 1, minWidth: 0, p: 1.5 }}>
          {/* 上段：差出人→宛先 ／ 顧客 ／ 日時 ／ バッジ */}
          <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
            <Typography fontSize={11} color="text.secondary" noWrap sx={{ flex: 1 }}>
              <PersonIcon sx={{ fontSize: 11, mr: 0.3, verticalAlign: "middle" }} />
              {item.sender_name} → {item.receiver_name}
              {item.customer && (
                <Box component="span" sx={{ ml: 1, color: "primary.main" }}>
                  顧客：{item.customer.name}
                </Box>
              )}
            </Typography>

            {messageCount > 0 && (
              <Stack direction="row" alignItems="center" spacing={0.3} sx={{ flexShrink: 0 }}>
                <ChatBubbleOutlineIcon sx={{ fontSize: 11, color: "text.disabled" }} />
                <Typography fontSize={11} color="text.disabled">{messageCount}</Typography>
              </Stack>
            )}

            <Typography fontSize={11} color="text.disabled" sx={{ flexShrink: 0 }}>
              {relativeTime(item.updated_at)}
            </Typography>

            <Chip
              size="small"
              label={isPending ? "未対応" : "対応済み"}
              color={isPending ? "warning" : "success"}
              sx={{ fontSize: "0.65rem", height: 20, flexShrink: 0 }}
            />
          </Stack>

          {/* タイトル */}
          <Typography
            fontWeight="bold"
            noWrap
            sx={{ fontSize: "0.9rem", lineHeight: 1.4 }}
          >
            {item.title}
          </Typography>

          {/* 最新メッセージプレビュー */}
          {latestMessage && (
            <Typography
              fontSize={12}
              color="text.secondary"
              noWrap
              sx={{ mt: 0.3 }}
            >
              {latestMessage}
            </Typography>
          )}
        </Box>
      </Box>

      {dialogOpen && (
        <BusinessCommunicationThreadDialog
          thread={item}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onChanged={() => refresh?.()}
        />
      )}
    </>
  );
}
