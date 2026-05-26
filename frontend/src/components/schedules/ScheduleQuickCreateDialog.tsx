"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Autocomplete,
  Box,
  Typography,
  CircularProgress,
} from "@mui/material";
import { useEffect, useState } from "react";
import apiClient from "@/lib/apiClient";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  customerId?: number;
  customerName?: string;
};

export default function ScheduleQuickCreateDialog({
  open,
  onClose,
  onCreated,
  customerId,
  customerName,
}: Props) {
  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 顧客検索
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  // 開いたとき・閉じたときにリセット
  useEffect(() => {
    if (!open) return;
    setTitle("");
    setStartAt("");
    setEndAt("");
    setDescription("");
    setErrors({});
    setCustomerSearch("");
    setCustomerResults([]);
    setSelectedCustomer(null);
  }, [open]);

  // 顧客検索（debounce）
  useEffect(() => {
    if (customerId || !customerSearch.trim()) {
      setCustomerResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await apiClient.get(
          `/customers/?search=${encodeURIComponent(customerSearch)}`
        );
        setCustomerResults(
          Array.isArray(res.data) ? res.data : res.data.results ?? []
        );
      } catch {
        setCustomerResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch, customerId]);

  const handleSave = async () => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = "タイトルは必須です";
    if (!startAt) errs.startAt = "開始日時は必須です";
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSaving(true);
    try {
      const resolvedCustomerId = customerId ?? selectedCustomer?.id ?? null;
      await apiClient.post("/schedules/", {
        title: title.trim(),
        start_at: startAt,
        end_at: endAt || null,
        description: description.trim() || null,
        customer: resolvedCustomerId,
      });
      onCreated();
      onClose();
    } catch {
      setErrors({ _: "保存に失敗しました。もう一度試してください。" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>スケジュール追加</DialogTitle>

      <DialogContent>
        <Stack spacing={2} mt={1}>
          {errors._ && (
            <Typography color="error" fontSize={13}>
              {errors._}
            </Typography>
          )}

          {/* 顧客 */}
          {customerId ? (
            <Box sx={{ p: 1, background: "#f5f5f5", borderRadius: 1 }}>
              <Typography fontSize={13} color="text.secondary">
                顧客
              </Typography>
              <Typography fontWeight="bold">{customerName}</Typography>
            </Box>
          ) : (
            <Autocomplete
              size="small"
              options={customerResults}
              getOptionLabel={(o: any) =>
                o.name + (o.phone ? `（${o.phone}）` : "")
              }
              isOptionEqualToValue={(o, v) => o.id === v.id}
              filterOptions={(x) => x}
              value={selectedCustomer}
              onChange={(_, v) => setSelectedCustomer(v)}
              inputValue={customerSearch}
              onInputChange={(_, v) => setCustomerSearch(v)}
              noOptionsText={
                customerSearch.trim() ? "該当なし" : "名前・電話番号で検索"
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="顧客（任意）"
                  placeholder="名前・電話番号で検索"
                />
              )}
            />
          )}

          {/* タイトル */}
          <TextField
            fullWidth
            size="small"
            label="タイトル"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={!!errors.title}
            helperText={errors.title}
          />

          {/* 開始 */}
          <TextField
            fullWidth
            size="small"
            type="datetime-local"
            label="開始"
            InputLabelProps={{ shrink: true }}
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            error={!!errors.startAt}
            helperText={errors.startAt}
          />

          {/* 終了 */}
          <TextField
            fullWidth
            size="small"
            type="datetime-local"
            label="終了（任意）"
            InputLabelProps={{ shrink: true }}
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
          />

          {/* 備考 */}
          <TextField
            fullWidth
            size="small"
            multiline
            rows={3}
            label="備考（任意）"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          キャンセル
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : "保存"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
