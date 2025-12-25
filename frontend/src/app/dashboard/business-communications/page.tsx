"use client";

import { Box, Typography } from "@mui/material";
import BusinessCommunicationList from "@/components/business-communications/BusinessCommunicationList";

export default function BusinessCommunicationsPage() {
  return (
    <Box>
      <Typography variant="h5" fontWeight="bold">
        業務連絡
      </Typography>

      <BusinessCommunicationList />
    </Box>
  );
}