"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Box, CircularProgress, Tabs, Tab, Avatar, Typography,
  Stack, Chip, IconButton, Tooltip, Paper,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon      from "@mui/icons-material/Edit";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import apiClient from "@/lib/apiClient";

import CustomerInfo                    from "@/components/customers/CustomerInfo";
import CustomerImages                  from "@/components/customers/CustomerImages";
import CustomerMemos                   from "@/components/customers/CustomerMemos";
import CustomerVehicles                from "@/components/customers/CustomerVehicles";
import CustomerSchedules               from "@/components/customers/CustomerSchedules";
import CustomerBusinessCommunicationTab from "@/components/customers/CustomerBusinessCommunicationTab";
import CustomerTransactionHistory      from "@/components/customers/CustomerTransactionHistory";

type CustomerTab = "basic" | "vehicles" | "schedules" | "communications";

const TABS: { value: CustomerTab; label: string }[] = [
  { value: "basic",          label: "基本情報" },
  { value: "vehicles",       label: "所有車両" },
  { value: "schedules",      label: "スケジュール" },
  { value: "communications", label: "業務連絡" },
];

const AVATAR_COLORS = [
  "#1976d2","#388e3c","#f57c00","#7b1fa2",
  "#c62828","#00838f","#558b2f","#ad1457",
];

export default function CustomerDetailPage() {
  const { id }       = useParams();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const tab          = (searchParams.get("tab") as CustomerTab) ?? "basic";

  const [customer, setCustomer] = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [editMode, setEditMode] = useState(false);

  const fetchCustomer = useCallback(async () => {
    if (!id) return;
    const res = await apiClient.get(`/customers/${id}/`);
    setCustomer(res.data);
  }, [id]);

  useEffect(() => {
    (async () => {
      try { await fetchCustomer(); }
      finally { setLoading(false); }
    })();
  }, [fetchCustomer]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={12}>
        <CircularProgress />
      </Box>
    );
  }
  if (!customer) return null;

  const goTab = (t: CustomerTab) =>
    router.push(`/dashboard/customers/${customer.id}?tab=${t}`);

  const avatarBg   = AVATAR_COLORS[customer.id % AVATAR_COLORS.length];
  const initials   = customer.name?.slice(0, 1) ?? "?";

  return (
    <Box>
      {/* ── ヘッダー ── */}
      <Paper
        variant="outlined"
        sx={{ px: 2.5, py: 2, mb: 2, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}
      >
        <Tooltip title="顧客一覧に戻る">
          <IconButton size="small" onClick={() => router.push("/dashboard/customers")}>
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>

        <Avatar sx={{ width: 44, height: 44, bgcolor: avatarBg, fontWeight: "bold", fontSize: 18 }}>
          {initials}
        </Avatar>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
            <Typography variant="h6" fontWeight="bold" lineHeight={1.2}>
              {customer.name}
            </Typography>
            {customer.kana && (
              <Typography variant="body2" color="text.secondary">
                {customer.kana}
              </Typography>
            )}
            {customer.customer_class?.name && (
              <Chip label={customer.customer_class.name} size="small" color="primary" variant="outlined" />
            )}
          </Stack>
          <Stack direction="row" spacing={2} mt={0.3} flexWrap="wrap">
            {customer.phone && (
              <Typography variant="caption" color="text.secondary">{customer.phone}</Typography>
            )}
            {customer.mobile_phone && (
              <Typography variant="caption" color="text.secondary">{customer.mobile_phone}</Typography>
            )}
            {customer.email && (
              <Typography variant="caption" color="text.secondary">{customer.email}</Typography>
            )}
          </Stack>
        </Box>

        {tab === "basic" && (
          <Tooltip title="基本情報を編集">
            <IconButton
              size="small"
              onClick={() => setEditMode(true)}
              color={editMode ? "primary" : "default"}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Paper>

      {/* ── タブ ── */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => { setEditMode(false); goTab(v); }}
          variant="scrollable"
          scrollButtons="auto"
        >
          {TABS.map((t) => (
            <Tab key={t.value} value={t.value} label={t.label} sx={{ minWidth: 100 }} />
          ))}
        </Tabs>
      </Box>

      {/* ── タブコンテンツ ── */}
      {tab === "basic" && (
        <>
          <CustomerInfo
            customer={customer}
            onUpdated={fetchCustomer}
            editMode={editMode}
            setEditMode={setEditMode}
          />
          <CustomerTransactionHistory customerId={customer.id} />
          <CustomerImages customerId={customer.id} />
          <CustomerMemos customerId={customer.id} />
        </>
      )}
      {tab === "vehicles"       && <CustomerVehicles customerId={customer.id} />}
      {tab === "schedules"      && <CustomerSchedules customerId={customer.id} />}
      {tab === "communications" && (
        <CustomerBusinessCommunicationTab
          customerId={customer.id}
          customerName={customer.name}
        />
      )}
    </Box>
  );
}
