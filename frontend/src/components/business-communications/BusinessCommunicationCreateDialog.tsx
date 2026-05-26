"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  Typography,
  Autocomplete,
  ToggleButtonGroup,
  ToggleButton,
  Box,
  Divider,
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

export default function BusinessCommunicationCreateDialog({
  open,
  onClose,
  onCreated,
  customerId,
  customerName,
}: Props) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [fromType, setFromType] = useState<"staff" | "shop">("staff");
  const [toType, setToType] = useState<"shop" | "staff">("shop");
  const [shops, setShops] = useState<any[]>([]);
  const [staffs, setStaffs] = useState<any[]>([]);
  const [to, setTo] = useState<any>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 顧客検索（customerId がない場合）
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const [shopRes, staffRes] = await Promise.all([
        apiClient.get("/masters/shops/"),
        apiClient.get("/masters/staffs/"),
      ]);
      setShops(
        Array.isArray(shopRes.data) ? shopRes.data : shopRes.data.results ?? []
      );
      setStaffs(
        Array.isArray(staffRes.data)
          ? staffRes.data
          : staffRes.data.results ?? []
      );
    };
    load();
  }, [open]);

  // 顧客検索
  useEffect(() => {
    if (customerId || !customerSearch.trim()) {
      setCustomerResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await apiClient.get(`/customers/?search=${customerSearch}`);
      setCustomerResults(
        Array.isArray(res.data) ? res.data : res.data.results ?? []
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch, customerId]);

  const reset = () => {
    setTitle("");
    setContent("");
    setFromType("staff");
    setToType("shop");
    setTo(null);
    setFiles([]);
    setPreviews([]);
    setErrors({});
    setCustomerSearch("");
    setSelectedCustomer(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = Array.from(e.target.files || []);
    setFiles(f);
    setPreviews(f.map((x) => URL.createObjectURL(x)));
  };

  const optionLabel = (o: any) => {
    if (!o) return "";
    if (o.name) return o.name;
    if (o.display_name)
      return `${o.display_name}（${o.shop_name ?? ""}）`;
    return "";
  };

  const send = async () => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = "タイトルは必須です";
    if (!content.trim()) errs.content = "内容は必須です";
    if (!to) errs.to = "送信先を選択してください";
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSending(true);
    try {
      const form = new FormData();
      form.append("title", title);
      form.append("content", content);
      form.append("sender_type", fromType);

      if (toType === "shop") form.append("receiver_shop", String(to.id));
      else form.append("receiver_staff", String(to.id));

      const resolvedCustomerId = customerId ?? selectedCustomer?.id;
      if (resolvedCustomerId)
        form.append("customer_id", String(resolvedCustomerId));

      files.forEach((f) => form.append("files", f));

      await apiClient.post("/communication-threads/", form);

      reset();
      onCreated();
      onClose();
    } catch {
      setErrors({ _: "送信に失敗しました。もう一度試してください。" });
    } finally {
      setSending(false);
    }
  };

  const toOptions = toType === "shop" ? shops : staffs;

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>業務連絡を作成</DialogTitle>

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
              noOptionsText={customerSearch.trim() ? "該当なし" : "名前・電話番号で検索"}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="顧客（任意）"
                  placeholder="名前・電話番号で検索"
                />
              )}
            />
          )}

          <Divider />

          {/* FROM */}
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography sx={{ width: 45, fontSize: 13 }}>From</Typography>
            <ToggleButtonGroup
              size="small"
              value={fromType}
              exclusive
              onChange={(_, v) => {
                if (!v) return;
                setFromType(v);
              }}
            >
              <ToggleButton value="staff">自分（スタッフ）</ToggleButton>
              <ToggleButton value="shop">自分の店舗</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {/* TO */}
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography sx={{ width: 45, fontSize: 13 }}>To</Typography>
            <ToggleButtonGroup
              size="small"
              value={toType}
              exclusive
              onChange={(_, v) => {
                if (!v) return;
                setToType(v);
                setTo(null);
              }}
            >
              <ToggleButton value="shop">店舗</ToggleButton>
              <ToggleButton value="staff">スタッフ</ToggleButton>
            </ToggleButtonGroup>
            <Autocomplete
              key={toType}
              size="small"
              sx={{ flex: 1 }}
              options={toOptions}
              getOptionLabel={optionLabel}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              value={to}
              onChange={(_, v) => setTo(v)}
              renderOption={(props, option) => (
                <li {...props} key={`to-${option.id}`}>
                  {optionLabel(option)}
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="送信先を選択"
                  error={!!errors.to}
                  helperText={errors.to}
                />
              )}
            />
          </Stack>

          <Divider />

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

          {/* 内容 */}
          <TextField
            fullWidth
            multiline
            rows={4}
            label="内容"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            error={!!errors.content}
            helperText={errors.content}
          />

          {/* ファイル */}
          <Box>
            <Button variant="outlined" size="small" component="label">
              画像を添付
              <input
                type="file"
                hidden
                multiple
                accept="image/*"
                onChange={handleFiles}
              />
            </Button>
            {previews.length > 0 && (
              <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
                {previews.map((src, i) => (
                  <Box
                    key={i}
                    component="img"
                    src={src}
                    sx={{
                      width: 72,
                      height: 72,
                      objectFit: "cover",
                      borderRadius: 1,
                    }}
                  />
                ))}
              </Stack>
            )}
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={sending}>
          キャンセル
        </Button>
        <Button variant="contained" onClick={send} disabled={sending}>
          {sending ? <CircularProgress size={20} /> : "送信"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
