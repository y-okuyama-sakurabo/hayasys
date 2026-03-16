"use client";

import {
  Paper,
  Typography,
  Button,
  Collapse,
  Stack
} from "@mui/material";

import DeleteIcon from "@mui/icons-material/Delete";
import { useState } from "react";
import apiClient from "@/lib/apiClient";
import BusinessCommunicationReplyForm from "./BusinessCommunicationReplyForm";

export default function BusinessCommunicationCard({ item, refresh }: any) {

  const [showReplies, setShowReplies] = useState(false);
  const [replyMode, setReplyMode] = useState(false);

  const remove = async () => {

    if (!confirm("この業務連絡を削除しますか？")) return;

    await apiClient.delete(
      `/communication-threads/${item.id}/`
    );

    refresh?.();

  };

  return (

    <Paper sx={{ p:2 }}>

      {/* header */}

      <Typography fontSize={13} color="text.secondary">
        from:{item.sender_name} → to:{item.receiver_name}
      </Typography>

      <Typography fontWeight="bold">
        タイトル：{item.title}
      </Typography>

      {/* 最新メッセージ */}

      <Typography mt={1}>
        本文：{item.messages?.[0]?.content}
      </Typography>

      {/* 添付（最初のメッセージ） */}

      {item.messages?.[0]?.attachments?.map((a:any)=>(

        <img
          key={a.id}
          src={a.file}
          style={{
            maxWidth:200,
            marginTop:8,
            borderRadius:4
          }}
        />

      ))}

      {/* actions */}

      <Stack direction="row" spacing={2} mt={2}>

        <Button
          size="small"
          onClick={()=>setShowReplies(!showReplies)}
        >
          返信 {Math.max((item.messages?.length ?? 1) - 1, 0)}件
        </Button>

        <Button
          size="small"
          onClick={()=>setReplyMode(!replyMode)}
        >
          返信
        </Button>

        <Button
          size="small"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={remove}
        >
          削除
        </Button>

      </Stack>

      {/* 返信一覧 */}

      <Collapse in={showReplies}>

        <Stack spacing={1} mt={2}>

          {(item.messages ?? []).slice(1).map((r:any)=>(

            <Paper
              key={r.id}
              sx={{
                p:1,
                background:"#fafafa"
              }}
            >

            <Typography fontSize={14} color="text.secondary">

              {r.sender_staff?.full_name || r.sender_shop?.name}

              {"  "}

              {new Date(r.created_at).toLocaleString()}

            </Typography>

              <Typography fontSize={14}>
                {r.content}
              </Typography>

            </Paper>

          ))}

        </Stack>

      </Collapse>

      {/* 返信フォーム */}

      {replyMode && (

        <BusinessCommunicationReplyForm
          parentId={item.id}
          receiverShop={item.messages?.[0]?.receiver_shop?.id}
          receiverStaff={item.messages?.[0]?.receiver_staff?.id}
          refresh={refresh}
        />

      )}

    </Paper>

  );

}