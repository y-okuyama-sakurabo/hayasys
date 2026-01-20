"use client";

import { useEffect, useState, useCallback } from "react";
import { Box, CircularProgress, Button, Stack } from "@mui/material";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import apiClient from "@/lib/apiClient";

import CustomerHeader from "@/components/customers/CustomerHeader";
import CustomerInfo from "@/components/customers/CustomerInfo";
import CustomerImages from "@/components/customers/CustomerImages";
import CustomerMemos from "@/components/customers/CustomerMemos";
import CustomerVehicles from "@/components/customers/CustomerVehicles";
import CustomerSchedules from "@/components/customers/CustomerSchedules";
import CustomerBusinessCommunicationTab from "@/components/customers/CustomerBusinessCommunicationTab";

type CustomerTab = "basic" | "vehicles" | "schedules" | "communications";

export default function CustomerDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as CustomerTab) ?? "basic";

  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchCustomer = useCallback(async () => {
    if (!id) return;
    const res = await apiClient.get(`/customers/${id}/`);
    setCustomer(res.data);
  }, [id]);

  useEffect(() => {
    (async () => {
      try {
        await fetchCustomer();
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchCustomer]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={10}>
        <CircularProgress />
      </Box>
    );
  }
  if (!customer) return null;

  const goTab = (t: CustomerTab) =>
    router.push(`/dashboard/customers/${customer.id}?tab=${t}`);

  return (
    <Box p={3}>
      <CustomerHeader customer={customer} />

      <Stack direction="row" spacing={2} mb={3}>
        <Button variant={tab === "basic" ? "contained" : "outlined"} onClick={() => goTab("basic")}>
          基本情報
        </Button>
        <Button variant={tab === "vehicles" ? "contained" : "outlined"} onClick={() => goTab("vehicles")}>
          所有車両
        </Button>
        <Button variant={tab === "schedules" ? "contained" : "outlined"} onClick={() => goTab("schedules")}>
          スケジュール
        </Button>
        <Button variant={tab === "communications" ? "contained" : "outlined"} onClick={() => goTab("communications")}>
          業務連絡
        </Button>
      </Stack>

      {tab === "basic" && (
        <>
          {/* ✅ ここがポイント：更新後に再取得できるよう渡す */}
          <CustomerInfo customer={customer} onUpdated={fetchCustomer} />
          <CustomerImages customerId={customer.id} />
          <CustomerMemos customerId={customer.id} />
        </>
      )}

      {tab === "vehicles" && <CustomerVehicles customerId={customer.id} />}
      {tab === "schedules" && <CustomerSchedules customerId={customer.id} />}
      {tab === "communications" && <CustomerBusinessCommunicationTab customerId={customer.id} />}
    </Box>
  );
}
