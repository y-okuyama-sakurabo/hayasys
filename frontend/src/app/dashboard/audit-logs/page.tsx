"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Stack,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
} from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import apiClient from "@/lib/apiClient";

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

export default function AuditLogsPage() {
  const [rows, setRows] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // ---- filters (最小) ----
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [fromDt, setFromDt] = useState("");
  const [toDt, setToDt] = useState("");

  // ---- detail dialog ----
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (action) params.action = action;
      if (fromDt) params.from_dt = fromDt;
      if (toDt) params.to_dt = toDt;
      params.ordering = "-created_at";

      const res = await apiClient.get("/audit-logs/", { params });
      const data = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
      setRows(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cols: GridColDef[] = useMemo(
    () => [
      { field: "created_at", headerName: "日時", width: 190 },
      { field: "action", headerName: "操作", width: 170 },
      { field: "summary", headerName: "内容", flex: 1, minWidth: 260 },
      { field: "target_type", headerName: "対象", width: 120 },
      { field: "target_id", headerName: "ID", width: 90 },
      { field: "actor_login_id", headerName: "操作者", width: 140 },
      { field: "ip", headerName: "IP", width: 140 },
    ],
    []
  );

  const onRowClick = (row: AuditLog) => {
    setSelected(row);
    setOpen(true);
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        操作ログ
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            label="検索（summary等）"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth
          />
          <TextField
            label="action（例: customer.update）"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            sx={{ minWidth: 260 }}
          />
          <TextField
            label="from_dt（例: 2026-01-01T00:00:00）"
            value={fromDt}
            onChange={(e) => setFromDt(e.target.value)}
            sx={{ minWidth: 260 }}
          />
          <TextField
            label="to_dt（例: 2026-01-22T23:59:59）"
            value={toDt}
            onChange={(e) => setToDt(e.target.value)}
            sx={{ minWidth: 260 }}
          />

          <Button variant="contained" onClick={fetchLogs} sx={{ whiteSpace: "nowrap" }}>
            絞り込み
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              setSearch("");
              setAction("");
              setFromDt("");
              setToDt("");
              // すぐ反映
              setTimeout(fetchLogs, 0);
            }}
            sx={{ whiteSpace: "nowrap" }}
          >
            クリア
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ height: 700 }}>
        <DataGrid
          rows={rows}
          columns={cols}
          loading={loading}
          getRowId={(r) => r.id}
          onRowClick={(p) => onRowClick(p.row as AuditLog)}
          disableRowSelectionOnClick
        />
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>ログ詳細</DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Stack spacing={1.2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip label={selected.action} />
                <Typography variant="body2">{selected.created_at}</Typography>
              </Stack>

              <Typography variant="subtitle1">{selected.summary}</Typography>

              <Typography variant="body2">
                対象: {selected.target_type} / {selected.target_id ?? "-"}
              </Typography>

              <Typography variant="body2">
                操作者: {selected.actor_display_name || selected.actor_login_id || "-"}
              </Typography>

              <Typography variant="body2">IP: {selected.ip ?? "-"}</Typography>

              <Typography variant="subtitle2" sx={{ mt: 1 }}>
                diff
              </Typography>
              <Paper variant="outlined" sx={{ p: 1.5, overflowX: "auto" }}>
                <pre style={{ margin: 0, fontSize: 12 }}>
                  {JSON.stringify(selected.diff ?? {}, null, 2)}
                </pre>
              </Paper>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>閉じる</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
