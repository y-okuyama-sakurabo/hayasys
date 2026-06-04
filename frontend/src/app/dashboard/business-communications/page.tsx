"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Box, Typography, Stack, Tabs, Tab,
  CircularProgress, Button, Badge,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import apiClient from "@/lib/apiClient";

import BusinessCommunicationList, {
  BusinessCommunicationThread,
} from "@/components/business-communications/BusinessCommunicationList";
import BusinessCommunicationCreateDialog from "@/components/business-communications/BusinessCommunicationCreateDialog";

export default function BusinessCommunicationsPage() {
  const [tab,     setTab]     = useState<"pending" | "done">("pending");
  const [items,   setItems]   = useState<BusinessCommunicationThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  // タブバッジ用件数
  const [counts, setCounts] = useState<{ pending: number | null; done: number | null }>({
    pending: null,
    done: null,
  });

  const fetchItems = useCallback(async (status: "pending" | "done") => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/communication-threads/?status=${status}`);
      const data = Array.isArray(res.data) ? res.data : res.data.results ?? [];
      setItems(data);
      setCounts(prev => ({ ...prev, [status]: data.length }));
    } catch (e) {
      console.error("業務連絡取得失敗", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初期ロード：表示中タブ + 未対応件数（バッジ用）
  useEffect(() => {
    fetchItems(tab);
    if (tab !== "pending") {
      apiClient.get("/communication-threads/?status=pending")
        .then(res => {
          const data = Array.isArray(res.data) ? res.data : res.data.results ?? [];
          setCounts(prev => ({ ...prev, pending: data.length }));
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchItems(tab);
  }, [tab, fetchItems]);

  const tabLabel = (label: string, status: "pending" | "done") => {
    const count = counts[status];
    if (count === null || count === 0) return label;
    return (
      <Stack direction="row" alignItems="center" spacing={0.8}>
        <span>{label}</span>
        <Badge
          badgeContent={count}
          color={status === "pending" ? "warning" : "default"}
          sx={{
            "& .MuiBadge-badge": {
              position: "static",
              transform: "none",
              fontSize: "0.65rem",
              height: 18,
              minWidth: 18,
            },
          }}
        />
      </Stack>
    );
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5" fontWeight="bold">業務連絡</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          新規作成
        </Button>
      </Stack>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 2, borderBottom: "1px solid", borderColor: "divider" }}
      >
        <Tab value="pending" label={tabLabel("未対応", "pending")} />
        <Tab value="done"    label={tabLabel("対応済み", "done")} />
      </Tabs>

      {loading ? (
        <Box display="flex" justifyContent="center" mt={5}>
          <CircularProgress />
        </Box>
      ) : (
        <BusinessCommunicationList
          items={items}
          loading={false}
          emptyText={tab === "pending" ? "未対応の業務連絡はありません" : "対応済みの業務連絡はありません"}
          onChanged={() => fetchItems(tab)}
        />
      )}

      <BusinessCommunicationCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          fetchItems(tab);
        }}
      />
    </Box>
  );
}
