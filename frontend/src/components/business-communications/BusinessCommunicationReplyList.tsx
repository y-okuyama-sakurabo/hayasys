"use client";

import { Stack, Paper, Typography } from "@mui/material";

export default function BusinessCommunicationReplyList({replies}:any){

  if(!replies?.length) return null;

  return(

    <Stack spacing={1} mt={2}>

      {replies.map((r:any)=>(

        <Paper key={r.id} sx={{p:1,background:"#fafafa"}}>

          <Typography fontSize={13} color="text.secondary">
            {r.sender_shop?.name}
          </Typography>

          <Typography>
            {r.content}
          </Typography>

        </Paper>

      ))}

    </Stack>

  )

}