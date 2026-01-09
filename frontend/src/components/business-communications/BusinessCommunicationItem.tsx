"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Stack,
  Divider,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Box,
} from "@mui/material";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/apiClient";

type ShopTiny = { id: number; name: string; code?: string };
type CustomerTiny = { id: number; name?: string };
type UserTiny = { id: number; login_id?: string; full_name?: string; display_name?: string };

type Attachment = {
  id: number;
  file?: string;
  url?: string;
  image?: string;
};

export type BusinessCommunication = {
  id: number;
  customer: number | CustomerTiny;
  sender_shop: ShopTiny;
  receiver_shop: ShopTiny;
  created_by?: UserTiny | null;
  staff?: UserTiny | null;
  title: string;
  content: string;
  status: "pending" | "done";
  created_at: string;
  attachments?: Attachment[];
};

type Props = {
  item: BusinessCommunication;
  onChanged?: () => void | Promise<void>;
  showActions?: boolean;
  pendingOnlyView?: boolean;
};

function pickAttachmentUrl(a: Attachment): string | null {
  return a.url || a.file || a.image || null;
}

export default function BusinessCommunicationItem({
  item,
  onChanged,
  showActions = true,
}: Props) {
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [content, setContent] = useState(item.content);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMsg, setSnackMsg] = useState("");
  const [snackSeverity, setSnackSeverity] = useState<"success" | "error">("success");

  const statusLabel = item.status === "pending" ? "未対応" : "対応済";
  const statusColor = item.status === "pending" ? "error" : "default";

  const createdAtText = useMemo(() => {
    try {
      return new Date(item.created_at).toLocaleString();
    } catch {
      return item.created_at;
    }
  }, [item.created_at]);

  const customerId =
    typeof item.customer === "number" ? item.customer : item.customer?.id;

  const customerName =
    typeof item.customer === "number"
      ? `顧客ID:${item.customer}`
      : item.customer?.name ?? "顧客名未設定";

  const creator = item.created_by ?? item.staff ?? null;
  const creatorLabel =
    creator?.full_name || creator?.display_name || creator?.login_id || null;

  const attachments = item.attachments ?? [];
  const imageUrls = attachments
    .map(pickAttachmentUrl)
    .filter((x): x is string => !!x);

  const toast = (msg: string, ok = true) => {
    setSnackMsg(msg);
    setSnackSeverity(ok ? "success" : "error");
    setSnackOpen(true);
  };

  const handleToggleStatus = async () => {
    const nextStatus = item.status === "pending" ? "done" : "pending";
    try {
      await apiClient.patch(`/business_communications/${item.id}/status/`, {
        status: nextStatus,
      });
      toast("更新完了しました。");
      await onChanged?.();
    } catch (e: any) {
      toast(e?.response?.data?.detail || "更新に失敗しました。", false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      await apiClient.patch(`/business_communications/${item.id}/`, {
        title,
        content,
      });
      toast("更新完了しました。");
      setEditing(false);
      await onChanged?.();
    } catch (e: any) {
      toast(e?.response?.data?.detail || "更新に失敗しました。", false);
    }
  };

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/business_communications/${item.id}/`);
      toast("削除しました。");
      setConfirmOpen(false);
      await onChanged?.();
    } catch (e: any) {
      toast(e?.response?.data?.detail || "削除に失敗しました。", false);
    }
  };

  return (
    <>
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.2}>
            {/* 1行目：ステータス + 顧客名 */}
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip label={statusLabel} color={statusColor as any} size="small" />
              <Typography fontWeight="bold">
                顧客名：{customerName}
              </Typography>
            </Stack>

            {/* 2行目：タイトル */}
            <Typography fontWeight="bold" sx={{ pl: 0.5 }}>
              {item.title}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              {item.sender_shop?.name} → {item.receiver_shop?.name}
            </Typography>

            {creatorLabel && (
              <Typography variant="caption" color="text.secondary">
                作成者：{creatorLabel}
              </Typography>
            )}

            {editing ? (
              <Stack spacing={1}>
                <TextField
                  label="タイトル"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  fullWidth
                  size="small"
                />
                <TextField
                  label="内容"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  fullWidth
                  multiline
                  rows={4}
                  size="small"
                />
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button size="small" onClick={() => setEditing(false)}>
                    キャンセル
                  </Button>
                  <Button size="small" variant="contained" onClick={handleSaveEdit}>
                    保存
                  </Button>
                </Stack>
              </Stack>
            ) : (
              <Typography variant="body2">{item.content}</Typography>
            )}

            {!!imageUrls.length && (
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                {imageUrls.map((src, idx) => (
                  <Box
                    key={`${item.id}-${idx}`}
                    component="img"
                    src={src}
                    alt="attachment"
                    sx={{
                      width: 120,
                      height: 120,
                      objectFit: "cover",
                      borderRadius: 1,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  />
                ))}
              </Stack>
            )}

            <Typography variant="caption" color="text.secondary">
              {createdAtText}
            </Typography>

            {showActions && (
              <>
                <Divider />
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                  <Button
                    size="small"
                    disabled={!customerId}
                    onClick={() =>
                      router.push(`/dashboard/customers/${customerId}?tab=communications`)
                    }
                  >
                    顧客詳細へ
                  </Button>

                  <Button
                    size="small"
                    color={item.status === "pending" ? "success" : "warning"}
                    onClick={handleToggleStatus}
                  >
                    {item.status === "pending" ? "対応済みにする" : "未対応に戻す"}
                  </Button>

                  <Button
                    size="small"
                    onClick={() => setEditing((v) => !v)}
                    disabled={item.status !== "pending"}
                  >
                    編集
                  </Button>

                  <Button
                    size="small"
                    color="error"
                    onClick={() => setConfirmOpen(true)}
                    disabled={item.status !== "pending"}
                  >
                    削除
                  </Button>
                </Stack>
              </>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* 削除確認 */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>削除しますか？</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            この業務連絡を削除すると元に戻せません。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>キャンセル</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            削除
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackOpen}
        autoHideDuration={2000}
        onClose={() => setSnackOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackSeverity} variant="filled">
          {snackMsg}
        </Alert>
      </Snackbar>
    </>
  );
}
