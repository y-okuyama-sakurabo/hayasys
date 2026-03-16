"use client";

import { Box, Paper, Typography, Divider, Stack } from "@mui/material";
import BusinessCommunicationReplyForm from "./BusinessCommunicationReplyForm";
import apiClient from "@/lib/apiClient";
import { useEffect, useState } from "react";

export default function BusinessCommunicationDetail({ item }: any) {

  const [thread,setThread] = useState<any>(null);

  const fetchThread = async () => {

    const res = await apiClient.get(
      `/business-communications/${item.id}/`
    );

    setThread(res.data);
  };

  useEffect(()=>{
    fetchThread();
  },[item]);

  if(!thread) return null;

  return (

    <Paper sx={{ p:3 }}>

      <Typography variant="h6">
        {thread.title}
      </Typography>

      <Divider sx={{my:2}} />

      <Stack spacing={2}>

        {thread.messages?.map((m:any)=>(
          <Paper key={m.id} sx={{p:2}}>

            <Typography fontSize={13} color="text.secondary">
              {m.sender_shop?.name}
            </Typography>

            <Typography>
              {m.content}
            </Typography>

          </Paper>
        ))}

      </Stack>

      <Box mt={3}>

        <BusinessCommunicationReplyForm
          communicationId={thread.id}
          refresh={fetchThread}
        />

      </Box>

    </Paper>

  );
}