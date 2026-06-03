"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  MenuItem,
  Button,
  IconButton,
  Chip,
  Stack,
  Collapse,
  CircularProgress,
  Tooltip,
  Divider,
  InputAdornment,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import RefreshIcon from "@mui/icons-material/Refresh";
import PersonIcon from "@mui/icons-material/Person";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import DescriptionIcon from "@mui/icons-material/Description";
import apiClient from "@/lib/apiClient";

// ─────────────────────────────────────────────
// 型
// ─────────────────────────────────────────────
type AuditLog = {
  id: number;
  created_at: string;
  action: string;
  summary: string;
  target_type: string;
  target_id: number | null;
  diff: any | null;
  ip: string | null;
  user_agent: string;
  actor: number | null;
  actor_login_id?: string;
  actor_display_name?: string;
  shop: number | null;
};

// ─────────────────────────────────────────────
// アクション定義（色・アイコン・ラベル）
// ─────────────────────────────────────────────
type ActionConfig = {
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  label: string;
};

const ACTION_CONFIGS: Record<string, ActionConfig> = {
  "auth.login":            { color: "#7b1fa2", bgColor: "#f3e5f5", icon: <LoginIcon fontSize="small" />,       label: "ログイン" },
  "auth.logout":           { color: "#5c6bc0", bgColor: "#e8eaf6", icon: <LogoutIcon fontSize="small" />,      label: "ログアウト" },
  "customer.create":       { color: "#2e7d32", bgColor: "#e8f5e9", icon: <AddCircleIcon fontSize="small" />,   label: "顧客登録" },
  "customer.update":       { color: "#1565c0", bgColor: "#e3f2fd", icon: <EditIcon fontSize="small" />,        label: "顧客更新" },
  "customer.delete":       { color: "#c62828", bgColor: "#ffebee", icon: <DeleteIcon fontSize="small" />,      label: "顧客削除" },
  "estimate.create":       { color: "#2e7d32", bgColor: "#e8f5e9", icon: <AddCircleIcon fontSize="small" />,   label: "見積作成" },
  "estimate.update":       { color: "#1565c0", bgColor: "#e3f2fd", icon: <EditIcon fontSize="small" />,        label: "見積更新" },
  "estimate.delete":       { color: "#c62828", bgColor: "#ffebee", icon: <DeleteIcon fontSize="small" />,      label: "見積削除" },
  "estimate.status_change":{ color: "#e65100", bgColor: "#fff3e0", icon: <SwapHorizIcon fontSize="small" />,   label: "見積ステータス" },
  "order.create":          { color: "#2e7d32", bgColor: "#e8f5e9", icon: <AddCircleIcon fontSize="small" />,   label: "受注作成" },
  "order.update":          { color: "#1565c0", bgColor: "#e3f2fd", icon: <EditIcon fontSize="small" />,        label: "受注更新" },
  "order.delete":          { color: "#c62828", bgColor: "#ffebee", icon: <DeleteIcon fontSize="small" />,      label: "受注削除" },
  "order.status_change":   { color: "#e65100", bgColor: "#fff3e0", icon: <SwapHorizIcon fontSize="small" />,   label: "受注ステータス" },
  "order.mark_sales":      { color: "#00695c", bgColor: "#e0f2f1", icon: <AttachMoneyIcon fontSize="small" />, label: "売上計上" },
  "order.from_estimate":   { color: "#2e7d32", bgColor: "#e8f5e9", icon: <DescriptionIcon fontSize="small" />, label: "見積→受注" },
};

const getConfig = (action: string): ActionConfig =>
  ACTION_CONFIGS[action] ?? {
    color: "#546e7a",
    bgColor: "#eceff1",
    icon: <DescriptionIcon fontSize="small" />,
    label: action,
  };

const ACTION_OPTIONS = [
  { value: "", label: "すべての操作" },
  { value: "auth.login",            label: "ログイン" },
  { value: "auth.logout",           label: "ログアウト" },
  { value: "customer.create",       label: "顧客登録" },
  { value: "customer.update",       label: "顧客更新" },
  { value: "customer.delete",       label: "顧客削除" },
  { value: "estimate.create",       label: "見積作成" },
  { value: "estimate.update",       label: "見積更新" },
  { value: "estimate.delete",       label: "見積削除" },
  { value: "estimate.status_change",label: "見積ステータス変更" },
  { value: "order.create",          label: "受注作成" },
  { value: "order.update",          label: "受注更新" },
  { value: "order.delete",          label: "受注削除" },
  { value: "order.status_change",   label: "受注ステータス変更" },
  { value: "order.mark_sales",      label: "売上計上" },
  { value: "order.from_estimate",   label: "見積→受注変換" },
];

// ─────────────────────────────────────────────
// 日時フォーマット
// ─────────────────────────────────────────────
function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch {
    return iso;
  }
}

function formatDateOnly(iso: string) {
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
  } catch {
    return iso;
  }
}

// ─────────────────────────────────────────────
// タイムラインカード
// ─────────────────────────────────────────────
function LogCard({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = getConfig(log.action);
  const actor = log.actor_display_name || log.actor_login_id || "システム";
  const hasDiff = log.diff && Object.keys(log.diff).length > 0;

  return (
    <Box display="flex" gap={2} mb={0.5}>
      {/* タイムラインライン + ドット */}
      <Box display="flex" flexDirection="column" alignItems="center" flexShrink={0}>
        <Box
          sx={{
            width: 36, height: 36,
            borderRadius: "50%",
            bgcolor: cfg.bgColor,
            color: cfg.color,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: `2px solid ${cfg.color}`,
            flexShrink: 0,
          }}
        >
          {cfg.icon}
        </Box>
        <Box sx={{ width: 2, flexGrow: 1, bgcolor: "divider", my: 0.5, minHeight: 8 }} />
      </Box>

      {/* カード本体 */}
      <Paper
        variant="outlined"
        sx={{
          flex: 1,
          p: 1.5,
          mb: 1,
          borderLeft: `3px solid ${cfg.color}`,
          "&:hover": { boxShadow: 2 },
          transition: "box-shadow 0.15s",
        }}
      >
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={1}>
          <Box flex={1}>
            {/* ヘッダー行 */}
            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
              <Chip
                label={cfg.label}
                size="small"
                sx={{
                  height: 20, fontSize: 11,
                  bgcolor: cfg.bgColor, color: cfg.color,
                  border: `1px solid ${cfg.color}40`,
                }}
              />
              <Box display="flex" alignItems="center" gap={0.5}>
                <PersonIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                <Typography variant="caption" fontWeight="bold" color="text.primary">
                  {actor}
                </Typography>
              </Box>
            </Box>

            {/* サマリ */}
            <Typography variant="body2" sx={{ mt: 0.75, color: "text.primary", lineHeight: 1.5 }}>
              {log.summary}
            </Typography>
          </Box>

          {/* 右側: 日時 */}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ whiteSpace: "nowrap", flexShrink: 0, mt: 0.25 }}
          >
            {formatDate(log.created_at)}
          </Typography>
        </Box>

        {/* 補足情報 */}
        <Box display="flex" gap={2} mt={0.75} flexWrap="wrap">
          {log.ip && (
            <Typography variant="caption" color="text.disabled">
              IP: {log.ip}
            </Typography>
          )}
          {log.target_id && (
            <Typography variant="caption" color="text.disabled">
              対象ID: {log.target_id}
            </Typography>
          )}
        </Box>

        {/* diff 折りたたみ */}
        {hasDiff && (
          <>
            <Button
              size="small"
              onClick={() => setExpanded((e) => !e)}
              sx={{ mt: 0.5, px: 1, py: 0, fontSize: 11, color: "text.secondary" }}
              endIcon={expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            >
              変更内容
            </Button>
            <Collapse in={expanded}>
              <Paper
                variant="outlined"
                sx={{ p: 1, mt: 0.5, bgcolor: "#fafafa", overflowX: "auto" }}
              >
                <pre style={{ margin: 0, fontSize: 11, lineHeight: 1.6 }}>
                  {JSON.stringify(log.diff, null, 2)}
                </pre>
              </Paper>
            </Collapse>
          </>
        )}
      </Paper>
    </Box>
  );
}

// ─────────────────────────────────────────────
// ページ本体
// ─────────────────────────────────────────────
export default function AuditLogsPage() {
  const [logs, setLogs]       = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal]     = useState(0);

  // フィルタ
  const [search,    setSearch]    = useState("");
  const [action,    setAction]    = useState("");
  const [dateFrom,  setDateFrom]  = useState("");
  const [dateTo,    setDateTo]    = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  // 検索入力のデバウンス用
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildParams = useCallback(
    (p: number) => {
      const params: Record<string, string> = { page: String(p), page_size: "50" };
      if (search)   params.search    = search;
      if (action)   params.action    = action;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo)   params.date_to   = dateTo;
      return params;
    },
    [search, action, dateFrom, dateTo]
  );

  const fetchLogs = useCallback(
    async (p: number, append = false) => {
      setLoading(true);
      try {
        const res = await apiClient.get("/audit-logs/", { params: buildParams(p) });
        const data: AuditLog[] = Array.isArray(res.data)
          ? res.data
          : res.data?.results ?? [];
        const count = res.data?.count ?? data.length;
        setTotal(count);
        setHasMore(!!res.data?.next);
        setLogs((prev) => (append ? [...prev, ...data] : data));
        setPage(p);
      } finally {
        setLoading(false);
      }
    },
    [buildParams]
  );

  // 初回 + フィルタ変更時
  useEffect(() => {
    fetchLogs(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, dateFrom, dateTo]);

  // 検索デバウンス
  const handleSearchChange = (v: string) => {
    setSearch(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchLogs(1, false), 400);
  };

  const handleReset = () => {
    setSearch("");
    setAction("");
    setDateFrom("");
    setDateTo("");
    // useEffect が action 変化で fetchLogs(1) を呼ぶ
  };

  // 日付ごとにグループ化
  const grouped: { date: string; items: AuditLog[] }[] = [];
  logs.forEach((log) => {
    const d = formatDateOnly(log.created_at);
    const last = grouped[grouped.length - 1];
    if (!last || last.date !== d) {
      grouped.push({ date: d, items: [log] });
    } else {
      last.items.push(log);
    }
  });

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", p: 3 }}>
      {/* ヘッダー */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight="bold">操作ログ</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            誰がいつ何をしたか確認できます
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Tooltip title="再読み込み">
            <IconButton onClick={() => fetchLogs(1, false)} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant={filterOpen ? "contained" : "outlined"}
            startIcon={<FilterListIcon />}
            onClick={() => setFilterOpen((v) => !v)}
            size="small"
          >
            絞り込み
          </Button>
        </Box>
      </Box>

      {/* フィルタパネル */}
      <Collapse in={filterOpen}>
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} flexWrap="wrap">
            <TextField
              label="キーワード"
              size="small"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              sx={{ minWidth: 200 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              select
              label="操作種別"
              size="small"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              sx={{ minWidth: 180 }}
            >
              {ACTION_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="開始日"
              type="date"
              size="small"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 160 }}
            />
            <TextField
              label="終了日"
              type="date"
              size="small"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 160 }}
            />
            <Button variant="outlined" color="inherit" size="small" onClick={handleReset}>
              クリア
            </Button>
          </Stack>
        </Paper>
      </Collapse>

      {/* 件数 */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="body2" color="text.secondary">
          {loading && logs.length === 0 ? "読み込み中..." : `${total.toLocaleString()} 件`}
        </Typography>
      </Box>

      {/* タイムライン */}
      {logs.length === 0 && !loading ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: "center" }}>
          <Typography color="text.secondary">ログがありません</Typography>
        </Paper>
      ) : (
        <>
          {grouped.map(({ date, items }) => (
            <Box key={date} mb={1}>
              {/* 日付区切り */}
              <Box display="flex" alignItems="center" gap={1.5} mb={1.5} mt={1}>
                <Divider sx={{ flex: 1 }} />
                <Chip
                  label={date}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: 12, borderRadius: 1 }}
                />
                <Divider sx={{ flex: 1 }} />
              </Box>

              {items.map((log) => (
                <LogCard key={log.id} log={log} />
              ))}
            </Box>
          ))}

          {/* もっと読み込む */}
          {hasMore && (
            <Box textAlign="center" mt={2} mb={4}>
              <Button
                variant="outlined"
                onClick={() => fetchLogs(page + 1, true)}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={16} /> : undefined}
              >
                {loading ? "読み込み中..." : "さらに読み込む"}
              </Button>
            </Box>
          )}

          {loading && logs.length > 0 && (
            <Box display="flex" justifyContent="center" py={3}>
              <CircularProgress size={24} />
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
