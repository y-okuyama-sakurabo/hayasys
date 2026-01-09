"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Stack, Typography, Divider, Tabs, Tab } from "@mui/material";
import apiClient from "@/lib/apiClient";
import BusinessCommunicationList from "@/components/business-communications/BusinessCommunicationList";
import BusinessCommunicationCreateForm from "@/components/business-communications/BusinessCommunicationCreateForm";
import type { BusinessCommunication } from "@/components/business-communications/BusinessCommunicationItem";

export default function CustomerBusinessCommunicationTab({
  customerId,
}: {
  customerId: number;
}) {
  const [tab, setTab] = useState<"pending" | "done">("pending");
  const [items, setItems] = useState<BusinessCommunication[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      // ✅ APIが status フィルタ対応してるならこれでOK
      const res = await apiClient.get(
        `/customers/${customerId}/business_communications/`,
        { params: { status: tab } }
      );

      const data = Array.isArray(res.data) ? res.data : res.data.results ?? [];

      // ✅ 念のためフロント側でもフィルタ（APIが未対応でも動く）
      const filtered = data.filter((x: any) => (tab ? x.status === tab : true));

      setItems(filtered);
    } catch (e) {
      console.error("業務連絡取得失敗", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [customerId, tab]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleCreated = async () => {
    // pendingタブを開いてるなら「作成直後に見える」方が自然
    setTab("pending");
    // tab変更が反映された後に取り直したいので、軽く待つより確実に再取得
    // (setTab直後でも fetchItems は tab依存なので次の effect で走る)
    // ただ即反映重視ならここで一回取り直し
    await fetchItems();
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h6">業務連絡</Typography>

      {/* 作成フォーム */}
      <BusinessCommunicationCreateForm customerId={customerId} onCreated={handleCreated} />

      <Divider />

      {/* ✅ タブ */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 1 }}
      >
        <Tab value="pending" label="未対応" />
        <Tab value="done" label="対応済み" />
      </Tabs>

      <BusinessCommunicationList
        items={items}
        loading={loading}
        emptyText={tab === "pending" ? "未対応の業務連絡はありません" : "対応済みの業務連絡はありません"}
        showActions
        pendingOnlyView={tab === "pending"}
        onChanged={fetchItems} // ✅ トグル/編集/削除の後に確実に反映
      />
    </Stack>
  );
}
