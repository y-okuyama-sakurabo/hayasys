"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dayjs from "dayjs";
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Checkbox,
  Chip,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  Alert,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
} from "@mui/material";

import DeleteIcon      from "@mui/icons-material/Delete";
import ArrowBackIcon   from "@mui/icons-material/ArrowBack";
import AddIcon         from "@mui/icons-material/Add";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon      from "@mui/icons-material/Cancel";

import apiClient from "@/lib/apiClient";
import JaDatePicker from "@/components/common/JaDatePicker";
import { useUserRole, isPrivileged } from "@/hooks/useUserRole";

// ========================
// 定数
// ========================
const PAYMENT_METHODS = [
  { key: "trade_in", label: "下取車" },
  { key: "cash",     label: "現金" },
  { key: "card",     label: "カード" },
  { key: "loan",     label: "ローン" },
  { key: "qr",       label: "QR決済" },
  { key: "coupon",   label: "商品券・クーポン" },
  { key: "transfer", label: "振込" },
];

const ITEM_TYPE_LABEL: Record<string, string> = {
  vehicle:   "車両",
  accessory: "用品",
  insurance: "保険",
  fee:       "諸費用",
  discount:  "値引き",
};

const DELIVERY_LABEL: Record<string, string> = {
  pending:       "未納品",
  partial:       "一部納品",
  completed:     "納品済",
  not_delivered: "未納品",
  delivered:     "納品済",
};
const DELIVERY_COLOR: Record<string, "default" | "warning" | "success"> = {
  pending:       "default",
  partial:       "warning",
  completed:     "success",
  not_delivered: "default",
  delivered:     "success",
};

const PAYMENT_LABEL: Record<string, string> = {
  pending: "未入金",
  unpaid:  "未入金",   // バックエンド旧値のフォールバック
  partial: "一部入金",
  paid:    "入金済",
};
const PAYMENT_COLOR: Record<string, "error" | "warning" | "success"> = {
  pending: "error",
  unpaid:  "error",
  partial: "warning",
  paid:    "success",
};

const fmt = (n: number | string) =>
  "¥" + new Intl.NumberFormat("ja-JP").format(Number(n || 0));

// ========================
// セクションヘッダー
// ========================
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="subtitle1"
      fontWeight="bold"
      sx={{ mb: 1.5, display: "flex", alignItems: "center", gap: 0.5 }}
    >
      {children}
    </Typography>
  );
}

// ========================
// メイン
// ========================
export default function ManagementDetailPage() {
  const { orderId } = useParams();
  const router      = useRouter();
  const userRole    = useUserRole();

  const [loading,  setLoading]  = useState(true);
  const [order,    setOrder]    = useState<any>(null);
  const [opError,      setOpError]      = useState<string | null>(null);
  const [opSuccess,    setOpSuccess]    = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  // キャンセル申請ダイアログ
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason,     setCancelReason]     = useState("");
  const [cancelLoading,    setCancelLoading]    = useState(false);
  const [snack,            setSnack]            = useState<{ msg: string; severity: "success" | "error" } | null>(null);

  // 特権操作ダイアログ（キャンセル取消 / 受注削除）
  const [privDialogMode, setPrivDialogMode] = useState<"uncancel" | "delete" | null>(null);

  // 納品
  const [deliveryChecked, setDeliveryChecked] = useState<Record<number, boolean>>({});
  const [deliveryDate,    setDeliveryDate]    = useState(dayjs().format("YYYY-MM-DD"));

  // 入金
  const [payAmount,  setPayAmount]  = useState("");
  const [payDate,    setPayDate]    = useState(dayjs().format("YYYY-MM-DD"));
  const [payMethod,  setPayMethod]  = useState("cash");
  const [payCompany, setPayCompany] = useState<number | "">("");

  // 会社リスト（支払種別ごと）
  const [companyMap, setCompanyMap] = useState<Record<string, any[]>>({ loan: [], card: [], qr: [] });

  // ========================
  // データ取得
  // ========================
  const fetchDetail = async () => {
    try {
      const res = await apiClient.get(`/management/orders/${orderId}`);
      setOrder(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => { fetchDetail(); }, []);

  // 会社リスト（ローン・カード・QR）を一括取得
  useEffect(() => {
    const types = ["loan", "card", "qr"];
    Promise.all(
      types.map((t) =>
        apiClient
          .get(`/masters/payment-companies/?type=${t}`)
          .then((res) => ({ type: t, data: res.data || [] }))
          .catch(() => ({ type: t, data: [] }))
      )
    ).then((results) => {
      const map: Record<string, any[]> = {};
      results.forEach(({ type, data }) => { map[type] = data; });
      setCompanyMap(map);
    });
  }, []);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton height={60} />
        <Skeleton height={200} sx={{ mt: 2 }} />
        <Skeleton height={200} sx={{ mt: 2 }} />
      </Box>
    );
  }

  if (!order) {
    return <Alert severity="error">データを取得できませんでした</Alert>;
  }

  // ========================
  // 派生データ
  // ========================
  const deliveredItemIds = new Set(
    order.deliveries.flatMap((d: any) => d.items.map((it: any) => it.order_item))
  );
  const undeliveredItems = order.items.filter((item: any) => !deliveredItemIds.has(item.id));
  const checkedCount     = Object.values(deliveryChecked).filter(Boolean).length;

  const deliveryDone = ["delivered", "completed"].includes(order.delivery_status);
  const paymentDone  = order.payment_status === "paid";
  const canMarkSales = deliveryDone && !order.sales_date;

  const unpaidTotal  = Number(order.unpaid_total  || 0);
  const paidTotal    = Number(order.paid_total    || 0);
  const grandTotal   = Number(order.grand_total   || 0);

  // ========================
  // 操作
  // ========================
  const handleCheck = (itemId: number, checked: boolean) => {
    setDeliveryChecked(prev => ({ ...prev, [itemId]: checked }));
  };

  const createDelivery = async () => {
    const items = order.items
      .filter((it: any) => deliveryChecked[it.id])
      .map((it: any) => ({
        order_item_id: it.id,
        quantity: Number(it.quantity),  // 受注数量をそのまま納品数量に使用
      }));

    if (items.length === 0) { alert("納品する商品を選択してください"); return; }

    setOpError(null);
    try {
      await apiClient.post("/deliveries/", {
        order: orderId,
        delivery_date: deliveryDate,
        items,
      });
      setDeliveryChecked({});
      fetchDetail();
    } catch (e: any) {
      setOpError(e?.response?.data?.detail || "納品登録に失敗しました");
    }
  };

  const cancelDelivery = async (deliveryItemId: number) => {
    const hasSales = !!order.sales_date;
    const message = hasSales
      ? "この納品を取消すと、売上計上も取消されます。よろしいですか？"
      : "この納品を取消しますか？";
    if (!confirm(message)) return;

    setOpError(null);
    setOpSuccess(null);
    setCancellingId(deliveryItemId);
    try {
      const res = await apiClient.post("/deliveries/cancel-item/", { delivery_item_id: deliveryItemId });
      await fetchDetail();
      setOpSuccess(res.data?.sales_cancelled
        ? "納品を取消しました。売上計上も取消されました。"
        : "納品を取消しました。"
      );
    } catch (e: any) {
      setOpError(e?.response?.data?.detail || "納品取消に失敗しました");
    } finally {
      setCancellingId(null);
    }
  };

  const addPayment = async () => {
    if (!payAmount || Number(payAmount) <= 0) { alert("入金額を入力してください"); return; }
    if (Number(payAmount) > unpaidTotal) { alert("残額を超える金額は入力できません"); return; }

    setOpError(null);
    try {
      const COMPANY_METHODS = ["loan", "card", "qr"];
      await apiClient.post(`/management/payments/${orderId}/records/`, {
        amount:       Number(payAmount),
        payment_date: payDate,
        method:       payMethod,
        ...(COMPANY_METHODS.includes(payMethod) && payCompany !== ""
          ? { company: payCompany }
          : {}),
      });
      setPayAmount("");
      setPayCompany("");
      fetchDetail();
    } catch (e: any) {
      setOpError(e?.response?.data?.detail || "入金登録に失敗しました");
    }
  };

  const deletePayment = async (recordId: number) => {
    if (!confirm("この入金記録を削除しますか？")) return;
    setOpError(null);
    try {
      await apiClient.delete(`/payment-records/${recordId}/`);
      fetchDetail();
    } catch (e: any) {
      setOpError(e?.response?.data?.detail || "入金削除に失敗しました");
    }
  };

  const markSales = async () => {
    if (!canMarkSales) return;
    setOpError(null);
    try {
      await apiClient.post(`/orders/${orderId}/mark-sales/`, {});
      fetchDetail();
    } catch (e: any) {
      setOpError(e?.response?.data?.detail || "売上計上に失敗しました");
    }
  };

  const submitCancelRequest = async () => {
    if (!cancelReason.trim()) return;
    setCancelLoading(true);
    try {
      await apiClient.post(`/orders/${orderId}/cancel-request/`, { reason: cancelReason.trim() });
      setSnack({ msg: "キャンセル申請を送信しました", severity: "success" });
      setCancelDialogOpen(false);
      setCancelReason("");
    } catch (e: any) {
      setSnack({ msg: e?.response?.data?.detail || "申請に失敗しました", severity: "error" });
    } finally {
      setCancelLoading(false);
    }
  };

  const handlePrivAction = async () => {
    if (!privDialogMode) return;
    setCancelLoading(true);
    try {
      if (privDialogMode === "uncancel") {
        await apiClient.post(`/orders/${orderId}/uncancel/`);
        setSnack({ msg: "キャンセルを取消しました", severity: "success" });
        fetchDetail();
      } else {
        await apiClient.delete(`/orders/${orderId}/force-delete/`);
        setSnack({ msg: "受注を削除しました", severity: "success" });
        router.push("/dashboard/management");
      }
      setPrivDialogMode(null);
    } catch (e: any) {
      setSnack({ msg: e?.response?.data?.detail || "操作に失敗しました", severity: "error" });
    } finally {
      setCancelLoading(false);
    }
  };

  // ========================
  // UI
  // ========================
  return (
    <Box sx={{ maxWidth: 1100, mx: "auto" }}>

      {/* ── 戻るボタン ── */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => router.push("/dashboard/management")}
        sx={{ mb: 2 }}
      >
        一覧に戻る
      </Button>

      {/* ── 操作結果表示 ── */}
      {opSuccess && (
        <Alert severity="success" onClose={() => setOpSuccess(null)} sx={{ mb: 2 }}>
          {opSuccess}
        </Alert>
      )}
      {opError && (
        <Alert severity="error" onClose={() => setOpError(null)} sx={{ mb: 2 }}>
          {opError}
        </Alert>
      )}

      {/* ── 基本情報 ── */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box>
            <Typography variant="h6" fontWeight="bold">{order.customer_name}</Typography>
            <Typography variant="body2" color="text.secondary">
              受注日: {order.order_date ?? "-"}
              {order.order_no && `　受注番号: ${order.order_no}`}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              label={DELIVERY_LABEL[order.delivery_status] ?? order.delivery_status}
              color={DELIVERY_COLOR[order.delivery_status] ?? "default"}
              size="small"
            />
            <Chip
              label={PAYMENT_LABEL[order.payment_status] ?? order.payment_status}
              color={PAYMENT_COLOR[order.payment_status] ?? "default"}
              size="small"
            />
            {order.status !== "cancelled" && (
              <Button
                size="small"
                color="warning"
                variant="outlined"
                startIcon={<CancelIcon />}
                onClick={() => { setCancelReason(""); setCancelDialogOpen(true); }}
              >
                キャンセル申請
              </Button>
            )}
          </Stack>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Paper variant="outlined" sx={{ p: 1.5, textAlign: "center" }}>
              <Typography variant="caption" color="text.secondary">受注金額</Typography>
              <Typography fontWeight="bold">{fmt(grandTotal)}</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Paper variant="outlined" sx={{ p: 1.5, textAlign: "center" }}>
              <Typography variant="caption" color="text.secondary">入金済</Typography>
              <Typography fontWeight="bold" color="success.main">{fmt(paidTotal)}</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Paper variant="outlined" sx={{ p: 1.5, textAlign: "center" }}>
              <Typography variant="caption" color="text.secondary">残額</Typography>
              <Typography fontWeight="bold" color={unpaidTotal > 0 ? "error.main" : "text.secondary"}>
                {fmt(unpaidTotal)}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      {/* キャンセル済みバナー */}
      {order.status === "cancelled" && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            isPrivileged(userRole) ? (
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  color="warning"
                  variant="outlined"
                  onClick={() => setPrivDialogMode("uncancel")}
                  sx={{ whiteSpace: "nowrap" }}
                >
                  キャンセル取消
                </Button>
                <Button
                  size="small"
                  color="error"
                  variant="outlined"
                  onClick={() => setPrivDialogMode("delete")}
                  sx={{ whiteSpace: "nowrap" }}
                >
                  受注削除
                </Button>
              </Stack>
            ) : undefined
          }
        >
          この受注はキャンセル済みです。入金・納品の操作はできません。
        </Alert>
      )}

      {/* ── 入金管理 ── */}
      <Paper sx={{ p: 3, mb: 3, opacity: order.status === "cancelled" ? 0.6 : 1 }}>
        <SectionTitle>💴 入金管理</SectionTitle>
        <Divider sx={{ mb: 2 }} />

        {/* 残額サマリ */}
        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <Paper variant="outlined" sx={{ flex: 1, p: 1.5, textAlign: "center" }}>
            <Typography variant="caption" color="text.secondary">受注金額</Typography>
            <Typography fontWeight="bold">{fmt(grandTotal)}</Typography>
          </Paper>
          <Paper variant="outlined" sx={{ flex: 1, p: 1.5, textAlign: "center" }}>
            <Typography variant="caption" color="text.secondary">入金済</Typography>
            <Typography fontWeight="bold" color="success.main">{fmt(paidTotal)}</Typography>
          </Paper>
          <Paper variant="outlined" sx={{ flex: 1, p: 1.5, textAlign: "center" }}>
            <Typography variant="caption" color="text.secondary">残額</Typography>
            <Typography fontWeight="bold" color={unpaidTotal > 0 ? "error.main" : "text.secondary"}>
              {fmt(unpaidTotal)}
            </Typography>
          </Paper>
        </Stack>

        {order.status === "cancelled" ? null : paymentDone ? (
          <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 2 }}>
            入金完了
            {order.final_payment_date && `（完了日: ${order.final_payment_date}）`}
          </Alert>
        ) : (
          /* 入金入力フォーム */
          <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: "grey.50" }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5 }}>
              入金を追加
            </Typography>
            <Grid container spacing={2} alignItems="flex-end">
              {/* 入金額 */}
              <Grid size={{ xs: 12, sm: 2 }}>
                <TextField
                  label="入金額"
                  type="number"
                  size="small"
                  fullWidth
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">¥</InputAdornment>,
                  }}
                  inputProps={{ min: 0 }}
                />
              </Grid>

              {/* 入金日 */}
              <Grid size={{ xs: 12, sm: 2 }}>
                <JaDatePicker
                  label="入金日"
                  value={payDate || null}
                  onChange={v => setPayDate(v ?? "")}
                />
              </Grid>

              {/* 支払方法 + 会社・サービス（横並び） */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Stack direction="row" spacing={1.5} alignItems="flex-end">
                  <FormControl size="small" sx={{ flex: "0 0 160px" }}>
                    <InputLabel>支払方法</InputLabel>
                    <Select
                      value={payMethod}
                      label="支払方法"
                      onChange={(e) => { setPayMethod(e.target.value); setPayCompany(""); }}
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <MenuItem key={m.key} value={m.key}>
                          {m.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* ローン・カード・QR のとき会社選択 */}
                  {["loan", "card", "qr"].includes(payMethod) && (
                    <FormControl size="small" sx={{ flex: 1 }}>
                      <InputLabel>会社・サービス</InputLabel>
                      <Select
                        value={payCompany}
                        label="会社・サービス"
                        onChange={(e) => setPayCompany(e.target.value as number | "")}
                      >
                        <MenuItem value="">未選択</MenuItem>
                        {(companyMap[payMethod] || []).map((c: any) => (
                          <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                </Stack>
              </Grid>

              {/* 入金追加ボタン */}
              <Grid size={{ xs: 12, sm: 2 }}>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<AddIcon />}
                  onClick={addPayment}
                  disabled={!payAmount || Number(payAmount) <= 0}
                >
                  入金追加
                </Button>
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* 入金履歴 */}
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          入金履歴
        </Typography>

        {(order.payments ?? []).length === 0 ? (
          <Typography variant="body2" color="text.secondary">入金記録はありません</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell>入金日</TableCell>
                <TableCell align="right">金額</TableCell>
                <TableCell>支払方法</TableCell>
                <TableCell>会社・サービス</TableCell>
                <TableCell align="center" sx={{ width: 60 }}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(order.payments ?? []).map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell>{p.payment_date}</TableCell>
                  <TableCell align="right">{fmt(p.amount)}</TableCell>
                  <TableCell>
                    {PAYMENT_METHODS.find((m) => m.key === p.method)?.label ?? p.method}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color={p.company_name ? "text.primary" : "text.disabled"}>
                      {p.company_name ?? "—"}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => deletePayment(p.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* ── 納品管理 ── */}
      <Paper sx={{ p: 3, mb: 3, opacity: order.status === "cancelled" ? 0.6 : 1 }}>
        <SectionTitle>📦 納品管理</SectionTitle>
        <Divider sx={{ mb: 2 }} />

        {/* 未納品リスト */}
        {order.status === "cancelled" ? (
          <Alert severity="info">キャンセル済みのため納品操作はできません</Alert>
        ) : undeliveredItems.length > 0 ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              納品する商品にチェックを入れてください
            </Typography>

            <Table size="small" sx={{ mb: 2 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "grey.50" }}>
                  <TableCell padding="checkbox" />
                  <TableCell>商品名</TableCell>
                  <TableCell>種別</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {undeliveredItems.map((item: any) => (
                  <TableRow key={item.id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={deliveryChecked[item.id] ?? false}
                        onChange={(e) => handleCheck(item.id, e.target.checked)}
                      />
                    </TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={ITEM_TYPE_LABEL[item.item_type] ?? item.item_type ?? "-"}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* 納品日 + 登録ボタン */}
            <Stack direction="row" spacing={2} alignItems="center">
              <JaDatePicker
                label="納品日"
                value={deliveryDate || null}
                onChange={v => setDeliveryDate(v ?? "")}
                fullWidth={false}
                sx={{ width: 180 }}
              />
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                disabled={checkedCount === 0}
                onClick={createDelivery}
              >
                納品登録 {checkedCount > 0 && `(${checkedCount}件)`}
              </Button>
            </Stack>
          </>
        ) : (
          <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 2 }}>
            すべての商品が納品済みです
            {order.final_delivery_date && `（完了日: ${order.final_delivery_date}）`}
          </Alert>
        )}

        {/* 納品済みリスト */}
        {order.deliveries.length > 0 && (
          <>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 3, mb: 1 }}>
              納品済み
            </Typography>
            {order.deliveries.map((d: any) => (
              <Paper key={d.id} variant="outlined" sx={{ mb: 1 }}>
                <Table size="small">
                  <TableBody>
                    {d.items.map((it: any) => (
                      <TableRow key={it.id}>
                        <TableCell>{it.order_item_name}</TableCell>
                        <TableCell sx={{ color: "text.secondary" }}>{d.delivery_date}</TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            disabled={cancellingId === it.id}
                            onClick={() => cancelDelivery(it.id)}
                          >
                            {cancellingId === it.id ? "取消中…" : "取消"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            ))}
          </>
        )}
      </Paper>

      {/* ── 売上計上 ── */}
      <Paper sx={{ p: 3 }}>
        <SectionTitle>📊 売上計上</SectionTitle>
        <Divider sx={{ mb: 2 }} />

        {order.sales_date ? (
          <Alert severity="success" icon={<CheckCircleIcon />}>
            売上計上済み（売上日: {order.sales_date}）
          </Alert>
        ) : (
          <>
            {!deliveryDone && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                納品が完了していません
              </Alert>
            )}

            <Button
              variant="contained"
              color="success"
              disabled={!canMarkSales}
              onClick={markSales}
            >
              売上計上する
            </Button>

            {!canMarkSales && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                ※ 納品が完了すると売上計上できます
              </Typography>
            )}
          </>
        )}
      </Paper>

      {/* ── 特権操作ダイアログ（キャンセル取消 / 受注削除） ── */}
      <Dialog open={Boolean(privDialogMode)} onClose={() => !cancelLoading && setPrivDialogMode(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {privDialogMode === "uncancel" ? "キャンセルを取消す" : "受注を削除"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {privDialogMode === "uncancel"
              ? "受注ステータスを「受注確定」に戻します。よろしいですか？"
              : "この受注を完全に削除します。この操作は取り消せません。"}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrivDialogMode(null)} disabled={cancelLoading}>閉じる</Button>
          <Button
            color={privDialogMode === "uncancel" ? "warning" : "error"}
            variant="contained"
            onClick={handlePrivAction}
            disabled={cancelLoading}
          >
            {cancelLoading ? "処理中..." : privDialogMode === "uncancel" ? "取消す" : "削除する"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── キャンセル申請ダイアログ ── */}
      <Dialog open={cancelDialogOpen} onClose={() => !cancelLoading && setCancelDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>キャンセル申請</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {order.customer_name} の受注についてキャンセルを申請します。理由を入力してください。
          </DialogContentText>
          <TextField
            label="キャンセル理由"
            multiline
            rows={3}
            fullWidth
            value={cancelReason}
            onChange={e => setCancelReason(e.target.value)}
            required
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)} disabled={cancelLoading}>閉じる</Button>
          <Button
            color="warning"
            variant="contained"
            onClick={submitCancelRequest}
            disabled={!cancelReason.trim() || cancelLoading}
          >
            {cancelLoading ? "送信中..." : "申請する"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── スナックバー ── */}
      <Snackbar
        open={Boolean(snack)}
        autoHideDuration={4000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snack?.severity} onClose={() => setSnack(null)}>{snack?.msg}</Alert>
      </Snackbar>

    </Box>
  );
}
