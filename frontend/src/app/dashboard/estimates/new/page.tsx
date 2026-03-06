"use client";

import { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import EstimateForm from "@/components/estimate/EstimateForm";

export default function EstimateNewPage() {
  return (
    <Suspense
      fallback={
        <Box display="flex" justifyContent="center" mt={10}>
          <CircularProgress />
        </Box>
      }
    >
      <EstimateForm mode="create" />
    </Suspense>
  );
}
