"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Box, Breadcrumbs, Link, Typography, Tabs, Tab, Paper,
} from "@mui/material";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";

import VehicleDetail from "@/components/vehicles/VehicleDetail";
import VehicleMemos  from "@/components/vehicles/VehicleMemos";
import VehicleImages from "@/components/vehicles/VehicleImages";

export default function Page() {
  const params = useParams();
  const router = useRouter();

  const customerId = Number(params.id);
  const vehicleId  = Number(params.vehicleId);

  const [tab, setTab] = useState(0);

  return (
    <Box>
      {/* ── パンくずリスト ── */}
      <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        sx={{ mb: 2, fontSize: "0.85rem" }}
      >
        <Link
          component="button"
          underline="hover"
          color="inherit"
          onClick={() => router.push("/dashboard/customers")}
        >
          顧客一覧
        </Link>
        <Link
          component="button"
          underline="hover"
          color="inherit"
          onClick={() => router.push(`/dashboard/customers/${customerId}`)}
        >
          顧客詳細
        </Link>
        <Typography color="text.primary" fontSize="0.85rem">車両詳細</Typography>
      </Breadcrumbs>

      {/* ── 車両詳細（Card グリッド） ── */}
      <VehicleDetail customerId={customerId} vehicleId={vehicleId} />

      {/* ── メモ / 画像 タブ ── */}
      <Paper sx={{ mt: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ borderBottom: "1px solid", borderColor: "divider", px: 2 }}
        >
          <Tab label="メモ" />
          <Tab label="画像" />
        </Tabs>

        <Box sx={{ p: 2 }}>
          {tab === 0 && <VehicleMemos vehicleId={vehicleId} />}
          {tab === 1 && <VehicleImages vehicleId={vehicleId} />}
        </Box>
      </Paper>
    </Box>
  );
}
