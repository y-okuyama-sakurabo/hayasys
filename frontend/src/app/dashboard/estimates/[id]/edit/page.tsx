"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { Box, CircularProgress } from "@mui/material";
import EstimateForm from "@/components/estimate/EstimateForm";

export default function EstimateEditPage() {
  const { id } = useParams();

  if (!id) return null;

  return (
    <Suspense
      fallback={
        <Box display="flex" justifyContent="center" mt={10}>
          <CircularProgress />
        </Box>
      }
    >
      <EstimateForm mode="edit" estimateId={Number(id)} />
    </Suspense>
  );
}
