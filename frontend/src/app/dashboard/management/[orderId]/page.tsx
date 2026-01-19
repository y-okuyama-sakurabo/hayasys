"use client";

import { useEffect, useState } from "react";
import {
  Box, Typography, Paper, Grid, TextField, Button, Divider,
  Table, TableBody, TableCell, TableHead, TableRow, IconButton,
  Checkbox
} from "@mui/material";

import DeleteIcon from "@mui/icons-material/Delete";
import apiClient from "@/lib/apiClient";
import dayjs from "dayjs";
import { useParams } from "next/navigation";

export default function ManagementDetailPage() {
  const { orderId } = useParams();

  // ---------- State ----------
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [salesDate, setSalesDate] = useState<string>("");

  // 納品管理
  const [deliveryChecked, setDeliveryChecked] = useState<{ [id: number]: boolean }>({});
  const [deliveryDates, setDeliveryDates] = useState<{ [id: number]: string }>({});

  // 入金管理
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [payMethod, setPayMethod] = useState("現金");

  // ---------- データ読み込み ----------
  const fetchDetail = async () => {
    const res = await apiClient.get(`/management/orders/${orderId}`);

    setOrder(res.data);
    setSalesDate(res.data.sales_date || "");

    const initChecked: any = {};
    const initDates: any = {};

    res.data.deliveries.forEach((d: any) => {
      d.items.forEach((it: any) => {
        initChecked[it.order_item] = true;
        initDates[it.order_item] = d.delivery_date;
      });
    });

    setDeliveryChecked(initChecked);
    setDeliveryDates(initDates);
    setLoading(false);
  };

  useEffect(() => {
    fetchDetail();
  }, []);

  if (loading) return <Box>Loading...</Box>;

  // 納品状況の整理
  const deliveredItemIds = new Set(
    order.deliveries.flatMap((d: any) =>
      d.items.map((it: any) => it.order_item)
    )
  );

  const undeliveredItems = order.items.filter(
    (item: any) => !deliveredItemIds.has(item.id)
  );

  const deliveredGroups = order.deliveries;

  // ====================================================
  // チェック変更処理
  // ====================================================
  const handleCheck = (itemId: number, checked: boolean) => {
    setDeliveryChecked(prev => ({ ...prev, [itemId]: checked }));

    setDeliveryDates(prev => ({
      ...prev,
      [itemId]: checked ? dayjs().format("YYYY-MM-DD") : ""
    }));
  };

  // ====================================================
  // 納品登録
  // ====================================================
  const createDelivery = async () => {
    const targetItems = order.items
      .filter((it: any) => deliveryChecked[it.id])
      .map((it: any) => ({
        order_item_id: it.id,
        quantity: 1,
      }));

    if (targetItems.length === 0) {
      alert("納品する商品を選択してください");
      return;
    }

    const firstId = targetItems[0].order_item_id;
    const deliveryDate = deliveryDates[firstId] || dayjs().format("YYYY-MM-DD");

    await apiClient.post(`/deliveries/`, {
      order: orderId,
      delivery_date: deliveryDate,
      items: targetItems,
    });

    alert("納品を登録しました");
    fetchDetail();
  };

  // ====================================================
  // 納品取消
  // ====================================================
  const cancelDelivery = async (deliveryItemId: number) => {
    if (!confirm("この納品を取消しますか？")) return;

    await apiClient.post(`/deliveries/cancel-item/`, {
      delivery_item_id: deliveryItemId,
    });

    alert("納品を取消しました");
    fetchDetail();
  };

  // ====================================================
  // 入金追加
  // ====================================================
  const addPayment = async () => {
    await apiClient.post(`/management/payments/${orderId}/records/`, {
      amount: Number(payAmount),
      payment_date: payDate,
      method: payMethod,
    });

    alert("入金を追加しました");
    fetchDetail();
  };

  const deletePayment = async (recordId: number) => {
    await apiClient.delete(`/payment-records/${recordId}/`);
    fetchDetail();
  };

  // ====================================================
  // 売上計上
  // ====================================================
  const markSales = async () => {
    // 売上計上して良いかチェック
    if (order.delivery_status !== "delivered") {
      alert("納品が完了していません。売上計上できません。");
      return;
    }

    if (order.payment_status !== "paid") {
      alert("入金が完了していません。売上計上できません。");
      return;
    }

    // 実行
    await apiClient.post(`/orders/${orderId}/mark-sales/`, {
      sales_date: salesDate,
    });

    alert("売上計上しました");
    fetchDetail();
  };


  // ====================================================
  // UI
  // ====================================================
  return (
    <Box>

      {/* 基本情報 */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6">基本情報</Typography>
        <Divider sx={{ my: 2 }} />

        <Grid container spacing={2}>
          <Grid size={{ xs: 6 }}>
            <TextField fullWidth label="顧客名" value={order.customer_name} InputProps={{ readOnly: true }} />
          </Grid>

          <Grid size={{ xs: 6 }}>
            <TextField fullWidth label="受注日" value={order.order_date} InputProps={{ readOnly: true }} />
          </Grid>

          <Grid size={{ xs: 6 }}>
            <TextField
              fullWidth
              label="受注金額"
              value={`¥${Number(order.grand_total).toLocaleString()}`}
              InputProps={{ readOnly: true }}
            />
          </Grid>

          <Grid size={{ xs: 6 }}>
            <TextField
              fullWidth
              label="売上日"
              type="date"
              value={salesDate}
              onChange={(e) => setSalesDate(e.target.value)}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* 納品管理ブロック */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6">納品管理</Typography>
        <Divider sx={{ my: 2 }} />

        {/* 全体納品ステータス */}
        <Typography sx={{ mb: 1 }}>
          <strong>全体ステータス：</strong>
          {order.delivery_status === "not_delivered" && "未納品"}
          {order.delivery_status === "partial" && "一部納品"}
          {order.delivery_status === "delivered" && "全て納品済"}
        </Typography>

        {/* 全納品完了日 */}
        {order.final_delivery_date && (
          <Typography sx={{ mb: 2 }}>
            <strong>全納品完了日：</strong>{order.final_delivery_date}
          </Typography>
        )}

        {/* 未納品リスト */}
        <Typography variant="subtitle1">未納品リスト</Typography>

        {undeliveredItems.length === 0 && <Box>未納品の商品はありません</Box>}

        <Table size="small" sx={{ mt: 1 }}>
          <TableHead>
            <TableRow>
              <TableCell>納品</TableCell>
              <TableCell>商品名</TableCell>
              <TableCell>納品日</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {undeliveredItems.map((item: any) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Checkbox
                    checked={deliveryChecked[item.id] ?? false}
                    onChange={(e) => handleCheck(item.id, e.target.checked)}
                  />
                </TableCell>

                <TableCell>{item.name}</TableCell>

                <TableCell>
                  <TextField
                    type="date"
                    size="small"
                    disabled={!deliveryChecked[item.id]}
                    value={deliveryDates[item.id] ?? ""}
                    onChange={(e) =>
                      setDeliveryDates(prev => ({ ...prev, [item.id]: e.target.value }))
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {undeliveredItems.length > 0 && (
          <Button variant="contained" sx={{ mt: 2 }} onClick={createDelivery}>
            納品を登録
          </Button>
        )}

        {/* 納品済みリスト */}
        <Typography variant="subtitle1" sx={{ mt: 4 }}>納品済みリスト</Typography>

        {deliveredGroups.length === 0 && <Box>納品済みの商品はありません</Box>}

        {deliveredGroups.map((d: any) => (
          <Paper key={d.id} sx={{ p: 2, mt: 2 }}>
            <Table size="small">
              <TableBody>
                {d.items.map((it: any) => (
                  <TableRow key={it.id}>
                    <TableCell>{it.order_item_name}（{d.delivery_date}）</TableCell>

                    <TableCell align="right">
                      <Button
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

      </Paper>

{/* 入金管理 */}
<Paper sx={{ p: 3, mb: 4 }}>
  <Box display="flex" justifyContent="space-between" alignItems="center">
    <Typography variant="h6">入金管理</Typography>

    <Button
      variant="contained"
      disabled={order.unpaid_total <= 0}
      onClick={addPayment}
    >
      入金追加
    </Button>
  </Box>

  <Divider sx={{ my: 2 }} />

  


  {/* --- 入金済・残額 --- */}
  <Box sx={{ mb: 3 }}>
    <Typography>入金済み： ¥{Number(order.paid_total).toLocaleString()}</Typography>
    <Typography>残額　　 ： ¥{Number(order.unpaid_total).toLocaleString()}</Typography>
  </Box>

  {order.final_payment_date && (
    <Box sx={{ mb: 2 }}>
      入金完了日：{order.final_payment_date}
    </Box>
  )}

  {/* --- 入金入力欄 --- */}
  <Grid container spacing={2} sx={{ mb: 2 }}>
    <Grid size={{ xs: 3 }}>
      <TextField
        label="入金額"
        type="number"
        fullWidth
        value={payAmount}
        disabled={order.unpaid_total <= 0}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (v > order.unpaid_total) {
            alert("残額を超える金額は入力できません");
            return;
          }
          setPayAmount(e.target.value);
        }}
      />
    </Grid>

    <Grid size={{ xs: 3 }}>
      <TextField
        label="入金日"
        type="date"
        fullWidth
        disabled={order.unpaid_total <= 0}
        value={payDate}
        onChange={(e) => setPayDate(e.target.value)}
      />
    </Grid>

    <Grid size={{ xs: 3 }}>
      <TextField
        label="方法"
        fullWidth
        disabled={order.unpaid_total <= 0}
        value={payMethod}
        onChange={(e) => setPayMethod(e.target.value)}
      />
    </Grid>
  </Grid>

  <Divider sx={{ my: 3 }} />

  <Typography variant="subtitle1">入金履歴</Typography>

  {(order.payments ?? []).length === 0 && <Box>入金記録なし</Box>}

  <Table>
    <TableHead>
      <TableRow>
        <TableCell>日付</TableCell>
        <TableCell>金額</TableCell>
        <TableCell>方法</TableCell>
        <TableCell>操作</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      {(order.payments ?? []).map((p: any) => (
        <TableRow key={p.id}>
          <TableCell>{p.payment_date}</TableCell>
          <TableCell>¥{Number(p.amount).toLocaleString()}</TableCell>
          <TableCell>{p.method}</TableCell>
          <TableCell>
            <IconButton color="error" onClick={() => deletePayment(p.id)}>
              <DeleteIcon />
            </IconButton>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</Paper>


      {/* 売上計上 */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6">売上計上</Typography>
        <Divider sx={{ my: 2 }} />
        <Button variant="contained" color="success" onClick={markSales}>
          売上計上する
        </Button>
      </Paper>

    </Box>
  );
}
