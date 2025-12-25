"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
} from "@mui/material";
import FullCalendar from "@fullcalendar/react";
import type { CalendarApi, DatesSetArg, EventClickArg } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import apiClient from "@/lib/apiClient";
import ScheduleEventDialog from "./ScheduleEventDialog";

type Shop = {
  id: number;
  name: string;
};

type Schedule = {
  id: number;
  title: string;
  start_at: string;
  end_at?: string | null;
  description?: string;
  customer?: number | null;
  customer_name?: string | null;
  shop?: number | null;
  shop_name?: string | null;
  staff?: number;
  staff_name?: string | null;
};

export default function ScheduleCalendar() {
  const calendarRef = useRef<FullCalendar | null>(null);

  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<number | "all" | "">("");
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [visibleRange, setVisibleRange] = useState<{
    startStr: string;
    endStr: string;
  } | null>(null);

  // dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"view" | "edit">("view");
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);

  // -------------------------
  // 初期ロード
  // -------------------------
  useEffect(() => {
    const init = async () => {
      try {
        const meRes = await apiClient.get("/auth/user/");
        const myShopId = meRes.data?.shop_id ?? "all";

        const shopRes = await apiClient.get("/masters/shops/");
        const list = shopRes.data.results || shopRes.data || [];
        setShops(list);

        setSelectedShop(myShopId);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // -------------------------
  // API取得
  // -------------------------
  const fetchSchedules = async (
    startStr: string,
    endStr: string,
    shop: number | "all" | ""
  ) => {
    const params: any = {
      start: startStr,
      end: endStr,
    };
    if (shop !== "all" && shop !== "") {
      params.shop_id = shop;
    }

    const res = await apiClient.get("/schedules/", { params });
    const data = res.data.results || res.data || [];

    setEvents(
      data.map((s: any) => ({
        id: s.id,
        title: s.title,
        start: s.start_at,
        end: s.end_at,
        extendedProps: s,
      }))
    );
  };

  // -------------------------
  // 表示期間変更
  // -------------------------
  const handleDatesSet = async (arg: DatesSetArg) => {
    const startStr = arg.startStr;
    const endStr = arg.endStr;

    setVisibleRange({ startStr, endStr });

    if (selectedShop !== "") {
      await fetchSchedules(startStr, endStr, selectedShop);
    }
  };

  // -------------------------
  // 店舗切替
  // -------------------------
  const handleShopChange = async (value: number | "all") => {
    setSelectedShop(value);

    if (visibleRange) {
      await fetchSchedules(visibleRange.startStr, visibleRange.endStr, value);
    }
  };

  // -------------------------
  // eventClick → 詳細ダイアログ
  // -------------------------
  const handleEventClick = async (info: EventClickArg) => {
    const res = await apiClient.get(`/schedules/${info.event.id}/`);
    setSelectedSchedule(res.data);
    setDialogMode("view");
    setDialogOpen(true);
  };

  // -------------------------
  // 更新
  // -------------------------
  const handleUpdate = async () => {
    if (!selectedSchedule) return;

    await apiClient.patch(`/schedules/${selectedSchedule.id}/`, {
      title: selectedSchedule.title,
      start_at: selectedSchedule.start_at,
      end_at: selectedSchedule.end_at,
      description: selectedSchedule.description,
      shop: selectedSchedule.shop,
    });

    setDialogOpen(false);
    if (visibleRange) {
      await fetchSchedules(
        visibleRange.startStr,
        visibleRange.endStr,
        selectedShop
      );
    }
  };

  // -------------------------
  // 削除
  // -------------------------
  const handleDelete = async () => {
    if (!selectedSchedule) return;
    if (!confirm("このスケジュールを削除しますか？")) return;

    await apiClient.delete(`/schedules/${selectedSchedule.id}/`);
    setDialogOpen(false);

    if (visibleRange) {
      await fetchSchedules(
        visibleRange.startStr,
        visibleRange.endStr,
        selectedShop
      );
    }
  };

  // -------------------------
  // 表示
  // -------------------------
  if (loading) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography>ロード中...</Typography>
      </Paper>
    );
  }

  return (
    <Box>
      {/* ===== 店舗セレクタ ===== */}
     
        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>店舗</InputLabel>
            <Select
              label="店舗"
              value={selectedShop === "" ? "all" : selectedShop}
              onChange={(e) => handleShopChange(e.target.value as any)}
            >
              <MenuItem value="all">全店舗</MenuItem>
              {shops.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      

      {/* ===== カレンダー ===== */}
      <Paper sx={{ p: 2 }}>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale="ja"
          height="auto"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          events={events}
          datesSet={handleDatesSet}
          eventClick={handleEventClick}
        />
      </Paper>

      {/* ===== 詳細・編集ダイアログ ===== */}
      <ScheduleEventDialog
        open={dialogOpen}
        schedule={selectedSchedule}
        mode={dialogMode}
        shops={shops}
        onClose={() => setDialogOpen(false)}
        onEdit={() => setDialogMode("edit")}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onChange={setSelectedSchedule}
      />
    </Box>
  );
}
