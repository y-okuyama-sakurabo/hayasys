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
} from "@mui/material";

import DeleteIcon      from "@mui/icons-material/Delete";
import ArrowBackIcon   from "@mui/icons-material/ArrowBack";
import AddIcon         from "@mui/icons-material/Add";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

import apiClient from "@/lib/apiClient";
import JaDatePicker from "@/components/common/JaDatePicker";

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

  const [loading,  setLoading]  = useState(true);
  const [order,    setOrder]    = useState<any>(null);
  const [opError,  setOpError]  = useState<string | null>(null);

  // 納品
  const [deliveryChecked, setDeliveryChecked] = useState<Record<number, boolean>>({});
  const [deliveryDate,    setDeliveryDate]    = useState(dayjs().format("YYYY-MM-DD"));

  // 入金
  const [payAmount, setPayAmount] = useState("");
  const [payDate,   setPayDate]   = useState(dayjs().format("YYYY-MM-DD"));
  const [payMethod, setPayMethod] = useState("cash");

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
    if (!confirm("この納品を取消しますか？")) return;
    setOpError(null);
    try {
      await apiClient.post("/deliveries/cancel-item/", { delivery_item_id: deliveryItemId });
      fetchDetail();
    } catch (e: any) {
      setOpError(e?.response?.data?.detail || "納品取消に失敗しました");
    }
  };

  const addPayment = async () => {
    if (!payAmount || Number(payAmount) <= 0) { alert("入金額を入力してください"); return; }
    if (Number(payAmount) > unpaidTotal) { alert("残額を超える金額は入力できません"); return; }

    setOpError(null);
    try {
      await apiClient.post(`/management/payments/${orderId}/records/`, {
        amount:       Number(payAmount),
        payment_date: payDate,
        method:       payMethod,
      });
      setPayAmount("");
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

  // ========================
  // UI
  // ========================
  return (
    <Box sx={{ maxWidth: 900, mx: "auto" }}>

      {/* ── 戻るボタン ── */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => router.push("/dashboard/management")}
        sx={{ mb: 2 }}
      >
        一覧に戻る
      </Button>

      {/* ── 操作エラー表示 ── */}
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
          <Stack direction="row" spacing={1}>
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

      {/* ── 入金管理 ── */}
      <Paper sx={{ p: 3, mb: 3 }}>
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

        {paymentDone ? (
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
              <Grid size={{ xs: 12, sm: 3 }}>
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

              <Grid size={{ xs: 12, sm: 3 }}>
                <JaDatePicker
                  label="入金日"
                  value={payDate || null}
                  onChange={v => setPayDate(v ?? "")}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 3 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>支払方法</InputLabel>
                  <Select
                    value={payMethod}
                    label="支払方法"
                    onChange={(e) => setPayMethod(e.target.value)}
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <MenuItem key={m.key} value={m.key}>
                        {m.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 3 }}>
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
      <Paper sx={{ p: 3, mb: 3 }}>
        <SectionTitle>📦 納品管理</SectionTitle>
        <Divider sx={{ mb: 2 }} />

        {/* 未納品リスト */}
        {undeliveredItems.length > 0 ? (
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
                            onClick={() => cancelDelivery(it.id)}
                          >
                            取消
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

    </Box>
  );
}
