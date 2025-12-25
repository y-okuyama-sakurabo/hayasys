"use client";

import { Stack, Typography, Divider } from "@mui/material";
import BusinessCommunicationList from "@/components/business-communications/BusinessCommunicationList";
import BusinessCommunicationCreateForm from "@/components/business-communications/BusinessCommunicationCreateForm";

export default function CustomerBusinessCommunicationTab({
  customerId,
}: {
  customerId: number;
}) {
  return (
    <Stack spacing={3}>
      <Typography variant="h6">業務連絡</Typography>

      {/* 業務連絡 作成フォーム */}
      <BusinessCommunicationCreateForm customerId={customerId} />

      <Divider />

      {/* 業務連絡 一覧 */}
      <BusinessCommunicationList customerId={customerId} />
    </Stack>
  );
}
