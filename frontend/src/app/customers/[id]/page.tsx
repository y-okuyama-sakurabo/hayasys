"use client";

import { useEffect, useState } from "react";
import { Box, CircularProgress } from "@mui/material";
import { useParams, useRouter } from "next/navigation";
import apiClient from "@/lib/apiClient";

import CustomerHeader from "@/components/customers/CustomerHeader";
import CustomerInfo from "@/components/customers/CustomerInfo";
import CustomerMemos from "@/components/customers/CustomerMemos";
import CustomerImages from "@/components/customers/CustomerImages";
import CustomerVehicles from "@/components/customers/CustomerVehicles";
import CustomerSchedules from "@/components/customers/CustomerSchedules";

export default function CustomerDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const res = await apiClient.get(`/customers/${id}/`);
        setCustomer(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchCustomer();
  }, [id]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={10}>
        <CircularProgress />
      </Box>
    );
  }

  if (!customer) return null;

  return (
    <Box p={3}>
      <CustomerHeader customer={customer} />

      <CustomerInfo customer={customer} />

      <CustomerImages customerId={customer.id} />

      <CustomerMemos customerId={customer.id} />

      <CustomerVehicles customerId={customer.id} />

      <CustomerSchedules customerId={customer.id} />
    </Box>
  );
}
