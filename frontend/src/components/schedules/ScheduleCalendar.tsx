"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box,
  Paper,
  FormControl,
  InputLabel,
  Select,
  Button,
  MenuItem,
  Typography,
  CircularProgress,
  Stack,
  Chip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import FullCalendar from "@fullcalendar/react";
import type { DatesSetArg, EventClickArg } from "@fullcalendar/core";
import type { DateClickArg } from "@fullcalendar/interaction";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import apiClient from "@/lib/apiClient";
import ScheduleEventDialog from "./ScheduleEventDialog";
import ScheduleCreateDialog from "./ScheduleCreateDialog";

type Customer = { id: number; name: string };
type Shop     = { id: number; name: string };

type Schedule = {
  id?: number;
  title: string;
  start_at: string;
  end_at?: string | null;
  description?: string;
  customer?: number | null;
  customer_id?: number | null;
  customer_name?: string | null;
  shop?: number | null;
  shop_name?: string | null;
  staff?: number;
  staff_name?: string | null;
};

// イベントの色：顧客あり → 青、なし → グレー青
const EVENT_COLOR_WITH_CUSTOMER    = "#1565c0";
const EVENT_COLOR_WITHOUT_CUSTOMER = "#546e7a";

export default function ScheduleCalendar() {
  const calendarRef = useRef<FullCalendar | null>(null);

  const [customers,       setCustomers]       = useState<Customer[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const [shops,        setShops]        = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<number | "all" | "">("");
  const [events,       setEvents]       = useState<any[]>([]);
  const [initLoading,  setInitLoading]  = useState(true);
  const [fetchLoading, setFetchLoading] = useState(false);

  const [visibleRange, setVisibleRange] = useState<{
    startStr: string;
    endStr: string;
  } | null>(null);

  // ダイアログ
  const [dialogOpen,       setDialogOpen]       = useState(false);
  const [dialogMode,       setDialogMode]       = useState<"view" | "edit">("view");
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);

  // -------------------------
  // 初期ロード
  // -------------------------
  useEffect(() => {
    const init = async () => {
      try {
        const [meRes, customerRes, shopRes] = await Promise.all([
          apiClient.get("/auth/user/"),
          apiClient.get("/customers/?page_size=1000"),
          apiClient.get("/masters/shops/"),
        ]);

        const myShopId    = meRes.data?.shop_id ?? "all";
        const customerList = customerRes.data.results || customerRes.data || [];
        const shopList     = shopRes.data.results || shopRes.data || [];

        setCustomers(customerList);
        setShops(shopList);
        setSelectedShop(myShopId);
      } finally {
        setInitLoading(false);
      }
    };
    init();
  }, []);

  // selectedShop が非同期でセットされた後にスケジュールを取得する
  useEffect(() => {
    if (selectedShop !== "" && visibleRange) {
      fetchSchedules(visibleRange.startStr, visibleRange.endStr, selectedShop);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShop]);

  // -------------------------
  // スケジュール取得
  // -------------------------
  const fetchSchedules = async (
    startStr: string,
    endStr: string,
    shop: number | "all" | ""
  ) => {
    setFetchLoading(true);
    try {
      const params: any = { start: startStr, end: endStr };
      if (shop !== "all" && shop !== "") params.shop_id = shop;

      const res  = await apiClient.get("/schedules/", { params });
      const data = res.data.results || res.data || [];

      setEvents(
        data.map((s: any) => ({
          id:    s.id,
          title: s.title,
          start: s.start_at,
          end:   s.end_at,
          backgroundColor: s.customer
            ? EVENT_COLOR_WITH_CUSTOMER
            : EVENT_COLOR_WITHOUT_CUSTOMER,
          borderColor: s.customer
            ? EVENT_COLOR_WITH_CUSTOMER
            : EVENT_COLOR_WITHOUT_CUSTOMER,
          extendedProps: s,
        }))
      );
    } finally {
      setFetchLoading(false);
    }
  };

  // -------------------------
  // 表示期間変更
  // -------------------------
  const handleDatesSet = async (arg: DatesSetArg) => {
    const { startStr, endStr } = arg;
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
  // 現在日時を datetime-local 形式（YYYY-MM-DDTHH:mm）で返す
  // 分を切り上げて次の整時（00分）にする
  // -------------------------
  const nowRoundedUp = (): { startAt: string; endAt: string } => {
    const now = new Date();
    now.setSeconds(0, 0);
    // 分が 0 でなければ次の時間に切り上げ
    if (now.getMinutes() > 0) {
      now.setMinutes(0);
      now.setHours(now.getHours() + 1);
    }
    const toLocal = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:00`;
    const end = new Date(now.getTime() + 60 * 60 * 1000); // +1時間
    return { startAt: toLocal(now), endAt: toLocal(end) };
  };

  // -------------------------
  // 日付クリック → 日程をプリセットして作成ダイアログを開く
  // -------------------------
  const handleDateClick = (arg: DateClickArg) => {
    // allDay クリック → 当日 09:00〜10:00 をデフォルトに
    const base = arg.dateStr; // "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm:ss"
    const isAllDay = arg.allDay;
    const startAt = isAllDay ? `${base}T09:00` : base.slice(0, 16);
    const endAt   = isAllDay ? `${base}T10:00` : "";

    setSelectedSchedule({
      id:          undefined,
      title:       "",
      start_at:    startAt,
      end_at:      endAt,
      description: "",
      customer:    null,
      shop:        selectedShop !== "all" && selectedShop !== "" ? selectedShop : null,
    } as any);
    setCreateDialogOpen(true);
  };

  // -------------------------
  // イベントクリック → 詳細ダイアログ
  // -------------------------
  const handleEventClick = async (info: EventClickArg) => {
    const res = await apiClient.get(`/schedules/${info.event.id}/`);
    setSelectedSchedule(res.data);
    setDialogMode("view");
    setDialogOpen(true);
  };

  // -------------------------
  // 保存（新規 / 更新）
  // -------------------------
  const handleSave = async () => {
    if (!selectedSchedule) return;

    const payload = {
      title:       selectedSchedule.title,
      start_at:    selectedSchedule.start_at,
      end_at:      selectedSchedule.end_at || null,
      description: selectedSchedule.description,
      shop:        selectedSchedule.shop,
      customer:    selectedSchedule.customer,
    };

    if (selectedSchedule.id) {
      await apiClient.patch(`/schedules/${selectedSchedule.id}/`, payload);
    } else {
      await apiClient.post("/schedules/", payload);
    }

    setDialogOpen(false);
    setCreateDialogOpen(false);
    setSelectedSchedule(null);

    if (visibleRange) {
      await fetchSchedules(visibleRange.startStr, visibleRange.endStr, selectedShop);
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
      await fetchSchedules(visibleRange.startStr, visibleRange.endStr, selectedShop);
    }
  };

  // -------------------------
  // 初期ロード中
  // -------------------------
  if (initLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* ===== ツールバー ===== */}
      <Paper
        variant="outlined"
        sx={{ px: 2.5, py: 1.5, mb: 2, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5 }}
      >
        {/* 左：追加ボタン + 件数バッジ */}
        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              const { startAt, endAt } = nowRoundedUp();
              setSelectedSchedule({
                id:          undefined,
                title:       "",
                start_at:    startAt,
                end_at:      endAt,
                description: "",
                customer:    null,
                shop:        selectedShop !== "all" && selectedShop !== "" ? selectedShop : null,
              } as any);
              setCreateDialogOpen(true);
            }}
          >
            スケジュール追加
          </Button>

          {fetchLoading ? (
            <CircularProgress size={20} />
          ) : (
            <Chip
              icon={<CalendarMonthIcon fontSize="small" />}
              label={`${events.length} 件`}
              size="small"
              variant="outlined"
            />
          )}
        </Stack>

        {/* 右：凡例 + 店舗フィルタ */}
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          {/* 凡例 */}
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: EVENT_COLOR_WITH_CUSTOMER }} />
              <Typography variant="caption" color="text.secondary">顧客あり</Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: EVENT_COLOR_WITHOUT_CUSTOMER }} />
              <Typography variant="caption" color="text.secondary">顧客なし</Typography>
            </Stack>
          </Stack>

          {/* 店舗セレクタ */}
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>店舗</InputLabel>
            <Select
              label="店舗"
              value={selectedShop === "" ? "all" : selectedShop}
              onChange={(e) => handleShopChange(e.target.value as any)}
            >
              <MenuItem value="all">全店舗</MenuItem>
              {shops.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* ===== カレンダー ===== */}
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          overflow: "hidden",
          // FullCalendar のスタイル上書き
          "& .fc-toolbar-title": { fontSize: "1.1rem", fontWeight: 700 },
          "& .fc-button": {
            textTransform: "none",
            fontSize: "0.8rem",
            padding: "4px 10px",
          },
          "& .fc-day-today": { bgcolor: "primary.50 !important" },
          "& .fc-event": { cursor: "pointer", fontSize: "0.78rem", borderRadius: "4px", px: 0.5 },
          "& .fc-daygrid-day-number": { fontWeight: 500 },
        }}
      >
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale="ja"
          height="auto"
          headerToolbar={{
            left:   "prev,next today",
            center: "title",
            right:  "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          buttonText={{
            today:        "今日",
            month:        "月",
            week:         "週",
            day:          "日",
          }}
          events={events}
          datesSet={handleDatesSet}
          eventClick={handleEventClick}
          dateClick={handleDateClick}
          eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
          dayMaxEvents={3}
          moreLinkText={(n) => `+${n}件`}
        />
      </Paper>

      {/* ===== 詳細・編集ダイアログ ===== */}
      <ScheduleEventDialog
        open={dialogOpen}
        schedule={selectedSchedule}
        mode={dialogMode}
        shops={shops}
        customers={customers}
        onClose={() => { setDialogOpen(false); setDialogMode("view"); }}
        onEdit={() => setDialogMode("edit")}
        onUpdate={handleSave}
        onDelete={handleDelete}
        onChange={setSelectedSchedule}
      />

      {/* ===== 新規作成ダイアログ ===== */}
      {selectedSchedule && !selectedSchedule.id && (
        <ScheduleCreateDialog
          open={createDialogOpen}
          schedule={selectedSchedule}
          customers={customers}
          onClose={() => {
            setCreateDialogOpen(false);
            setSelectedSchedule(null);
          }}
          onChange={(s) => setSelectedSchedule(s)}
          onSave={handleSave}
        />
      )}
    </Box>
  );
}
