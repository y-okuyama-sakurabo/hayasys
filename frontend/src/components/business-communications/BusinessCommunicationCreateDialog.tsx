"use client";

import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Stack, Typography, Autocomplete,
  ToggleButtonGroup, ToggleButton, Box, Divider, CircularProgress,
  IconButton, Tooltip,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CloseIcon       from "@mui/icons-material/Close";
import apiClient from "@/lib/apiClient";
import { compressImage } from "@/lib/compressImage";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  customerId?: number;
  customerName?: string;
};

type AttachedFile = {
  file: File;
  preview: string;
};

export default function BusinessCommunicationCreateDialog({
  open,
  onClose,
  onCreated,
  customerId,
  customerName,
}: Props) {
  const [title,    setTitle]    = useState("");
  const [content,  setContent]  = useState("");
  const [fromType, setFromType] = useState<"staff" | "shop">("staff");
  const [toType,   setToType]   = useState<"shop" | "staff">("shop");
  const [shops,    setShops]    = useState<any[]>([]);
  const [staffs,   setStaffs]   = useState<any[]>([]);
  const [to,       setTo]       = useState<any>(null);
  const [attached, setAttached] = useState<AttachedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [sending,  setSending]  = useState(false);
  const [errors,   setErrors]   = useState<Record<string, string>>({});

  // 顧客検索
  const [customerSearch,   setCustomerSearch]   = useState("");
  const [customerResults,  setCustomerResults]  = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const [shopRes, staffRes] = await Promise.all([
        apiClient.get("/masters/shops/"),
        apiClient.get("/masters/staffs/"),
      ]);
      setShops(Array.isArray(shopRes.data)  ? shopRes.data  : shopRes.data.results  ?? []);
      setStaffs(Array.isArray(staffRes.data) ? staffRes.data : staffRes.data.results ?? []);
    };
    load();
  }, [open]);

  useEffect(() => {
    if (customerId || !customerSearch.trim()) { setCustomerResults([]); return; }
    const timer = setTimeout(async () => {
      const res = await apiClient.get(`/customers/?search=${customerSearch}`);
      setCustomerResults(Array.isArray(res.data) ? res.data : res.data.results ?? []);
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch, customerId]);

  const reset = () => {
    setTitle(""); setContent(""); setFromType("staff"); setToType("shop");
    setTo(null); setErrors({}); setCustomerSearch(""); setSelectedCustomer(null);
    // オブジェクトURLを解放
    attached.forEach(a => URL.revokeObjectURL(a.preview));
    setAttached([]);
  };

  const handleClose = () => { reset(); onClose(); };

  // ── ファイル追加 ──────────────────────────
  const addFiles = async (fileList: FileList | null) => {
    if (!fileList) return;
    const imageFiles = Array.from(fileList).filter(f => f.type.startsWith("image/"));
    const newFiles = await Promise.all(
      imageFiles.map(async (file) => {
        const compressed = await compressImage(file);
        return { file: compressed, preview: URL.createObjectURL(compressed) };
      })
    );
    setAttached(prev => [...prev, ...newFiles]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    setAttached(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  // ── 送信 ──────────────────────────────────
  const optionLabel = (o: any) => {
    if (!o) return "";
    if (o.name) return o.name;
    if (o.display_name) return `${o.display_name}（${o.shop_name ?? ""}）`;
    return "";
  };

  const send = async () => {
    const errs: Record<string, string> = {};
    if (!title.trim())   errs.title   = "タイトルは必須です";
    if (!content.trim()) errs.content = "内容は必須です";
    if (!to)             errs.to      = "送信先を選択してください";
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSending(true);
    try {
      const form = new FormData();
      form.append("title",       title);
      form.append("content",     content);
      form.append("sender_type", fromType);
      if (toType === "shop")  form.append("receiver_shop",  String(to.id));
      else                    form.append("receiver_staff", String(to.id));
      const resolvedCustomerId = customerId ?? selectedCustomer?.id;
      if (resolvedCustomerId) form.append("customer_id", String(resolvedCustomerId));
      attached.forEach(a => form.append("files", a.file));

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
            <Typography color="error" fontSize={13}>{errors._}</Typography>
          )}

          {/* 顧客 */}
          {customerId ? (
            <Box sx={{ p: 1.5, bgcolor: "grey.50", borderRadius: 1, border: "1px solid", borderColor: "divider" }}>
              <Typography fontSize={12} color="text.secondary">顧客</Typography>
              <Typography fontWeight="bold">{customerName}</Typography>
            </Box>
          ) : (
            <Autocomplete
              size="small"
              options={customerResults}
              getOptionLabel={(o: any) => o.name + (o.phone ? `（${o.phone}）` : "")}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              filterOptions={x => x}
              value={selectedCustomer}
              onChange={(_, v) => setSelectedCustomer(v)}
              inputValue={customerSearch}
              onInputChange={(_, v) => setCustomerSearch(v)}
              noOptionsText={customerSearch.trim() ? "該当なし" : "名前・電話番号で検索"}
              renderInput={params => (
                <TextField {...params} label="顧客（任意）" placeholder="名前・電話番号で検索" />
              )}
            />
          )}

          <Divider />

          {/* FROM */}
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography sx={{ width: 45, fontSize: 13, color: "text.secondary" }}>From</Typography>
            <ToggleButtonGroup size="small" value={fromType} exclusive
              onChange={(_, v) => { if (!v) return; setFromType(v); }}>
              <ToggleButton value="staff">自分（スタッフ）</ToggleButton>
              <ToggleButton value="shop">自分の店舗</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {/* TO */}
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography sx={{ width: 45, fontSize: 13, color: "text.secondary" }}>To</Typography>
            <ToggleButtonGroup size="small" value={toType} exclusive
              onChange={(_, v) => { if (!v) return; setToType(v); setTo(null); }}>
              <ToggleButton value="shop">店舗</ToggleButton>
              <ToggleButton value="staff">スタッフ</ToggleButton>
            </ToggleButtonGroup>
            <Autocomplete
              key={toType} size="small" sx={{ flex: 1 }}
              options={toOptions}
              getOptionLabel={optionLabel}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              value={to}
              onChange={(_, v) => setTo(v)}
              renderOption={(props, option) => (
                <li {...props} key={`to-${option.id}`}>{optionLabel(option)}</li>
              )}
              renderInput={params => (
                <TextField {...params} placeholder="送信先を選択"
                  error={!!errors.to} helperText={errors.to} />
              )}
            />
          </Stack>

          <Divider />

          {/* タイトル */}
          <TextField
            fullWidth size="small" label="タイトル"
            value={title}
            onChange={e => setTitle(e.target.value)}
            error={!!errors.title} helperText={errors.title}
          />

          {/* 内容 */}
          <TextField
            fullWidth multiline rows={4} label="内容"
            value={content}
            onChange={e => setContent(e.target.value)}
            error={!!errors.content} helperText={errors.content}
          />

          {/* ── 画像添付エリア ── */}
          <Box>
            <Typography fontSize={12} color="text.secondary" mb={1}>添付画像（任意）</Typography>

            {/* ドラッグ&ドロップゾーン */}
            <Box
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              sx={{
                border: "2px dashed",
                borderColor: dragOver ? "primary.main" : "divider",
                borderRadius: 1.5,
                p: 2,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5,
                cursor: "pointer", bgcolor: dragOver ? "primary.50" : "grey.50",
                transition: "all 0.15s",
                "&:hover": { borderColor: "primary.main", bgcolor: "primary.50" },
              }}
            >
              <input ref={fileInputRef} type="file" hidden multiple accept="image/*" onChange={handleFileChange} />
              <CloudUploadIcon sx={{ fontSize: 28, color: dragOver ? "primary.main" : "grey.400" }} />
              <Typography fontSize={12} color="text.secondary">
                クリックまたはドラッグ&ドロップ
              </Typography>
              <Typography fontSize={11} color="text.disabled">JPG / PNG / WEBP　複数選択可</Typography>
            </Box>

            {/* プレビュー */}
            {attached.length > 0 && (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1.5 }}>
                {attached.map((a, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      position: "relative", width: 72, height: 72,
                      borderRadius: 1, overflow: "hidden",
                      border: "1px solid", borderColor: "divider",
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={a.preview}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                    {/* 削除ボタン */}
                    <Tooltip title="削除">
                      <IconButton
                        size="small"
                        onClick={e => { e.stopPropagation(); removeFile(idx); }}
                        sx={{
                          position: "absolute", top: 2, right: 2,
                          width: 20, height: 20, p: 0,
                          bgcolor: "rgba(0,0,0,0.55)", color: "#fff",
                          "&:hover": { bgcolor: "rgba(0,0,0,0.8)" },
                        }}
                      >
                        <CloseIcon sx={{ fontSize: 12 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={sending}>キャンセル</Button>
        <Button variant="contained" onClick={send} disabled={sending}>
          {sending ? <CircularProgress size={20} /> : "送信"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
