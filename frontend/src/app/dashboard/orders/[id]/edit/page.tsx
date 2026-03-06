"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { Box, CircularProgress } from "@mui/material";
import OrderForm from "@/components/orders/OrderForm";

export default function OrderEditPage() {
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
      <OrderForm mode="edit" orderId={Number(id)} />
    </Suspense>
  );
}