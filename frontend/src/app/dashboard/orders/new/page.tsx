"use client";

import { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import OrderForm from "@/components/orders/OrderForm";

export default function OrderNewPage() {
  return (
    <Suspense
      fallback={
        <Box display="flex" justifyContent="center" mt={10}>
          <CircularProgress />
        </Box>
      }
    >
      <OrderForm mode="create" />
    </Suspense>
  );
}