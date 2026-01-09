"use client";

import { useEffect, useState } from "react";
import {
  Paper,
  Typography,
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Divider,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
} from "@mui/material";
import apiClient from "@/lib/apiClient";

type Master = { id: number; name: string };

type CustomerVehicle = {
  id: number; // customer_vehicle_id
  owned_from?: string | null;
  owned_to?: string | null;
  is_current?: boolean;
  vehicle: {
    id: number;
    vehicle_name?: string;
    category_name?: string;
    manufacturer_name?: string;
    registrations?: { registration_no?: string | null }[];
    chassis_no?: string | null;
    model_year?: string | null;
    displacement?: number | null;
    model_code?: string | null;
    engine_type?: string | null;
    color_name?: string | null;
    color_code?: string | null;
  };
};

type Props = {
  customerId: number;
};

const initialForm = {
  owned_from: "",
  new_car_type: "used", // new/used
  manufacturer: "", // id string
  category: "", // id string
  color: "", // id string
  vehicle_name: "",
  displacement: "",
  model_year: "",
  model_code: "",
  chassis_no: "",
  color_name: "",
  color_code: "",
  engine_type: "",
};

export default function CustomerVehicles({ customerId }: Props) {
  // --- list ---
  const [current, setCurrent] = useState<CustomerVehicle[]>([]);
  const [past, setPast] = useState<CustomerVehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // --- masters ---
  const [manufacturers, setManufacturers] = useState<Master[]>([]);
  const [categories, setCategories] = useState<Master[]>([]);
  const [colors, setColors] = useState<Master[]>([]);
  const [mastersLoading, setMastersLoading] = useState(true);

  // --- create dialog ---
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ ...initialForm });

  // --- detail dialog ---
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<CustomerVehicle | null>(null);

  const toArray = (data: any): any[] => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results; // DRF pagination
    if (Array.isArray(data?.data)) return data.data; // wrapper
    return [];
  };

  // --- masters fetch ---
  useEffect(() => {
    let mounted = true;

    (async () => {
      setMastersLoading(true);
      try {
        const [m, c, col] = await Promise.all([
          apiClient.get("/masters/manufacturers/"),
          apiClient.get("/masters/vehiclecategories/"),
          apiClient.get("/masters/colors/"),
        ]);
        if (!mounted) return;

        setManufacturers(toArray(m.data));
        setCategories(toArray(c.data));
        setColors(toArray(col.data));
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setMastersLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- vehicles fetch ---
  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const [curRes, pastRes] = await Promise.all([
        apiClient.get(`/customers/${customerId}/vehicles/`, { params: { status: "current" } }),
        apiClient.get(`/customers/${customerId}/vehicles/`, { params: { status: "past" } }),
      ]);

      setCurrent(toArray(curRes.data));
      setPast(toArray(pastRes.data));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const openDetail = (row: CustomerVehicle) => {
    setSelected(row);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setSelected(null);
  };

  const closeCreate = () => {
    setCreateOpen(false);
    setForm({ ...initialForm });
  };

  // 手放す = owned_to を今日でPATCH（MVP）
  const releaseOwnership = async (row: CustomerVehicle) => {
    if (!confirm("この車両を手放しますか？")) return;

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const owned_to = `${yyyy}-${mm}-${dd}`;

    try {
      await apiClient.patch(`/customers/${customerId}/vehicles/${row.id}/`, { owned_to });
      await fetchVehicles();
    } catch (e) {
      console.error(e);
      alert("手放し処理に失敗しました");
    }
  };

  const submitCreate = async () => {
    // 最低限のバリデーション（必要なら増やす）
    if (!form.vehicle_name.trim()) {
      alert("車種名（vehicle_name）は必須です");
      return;
    }

    setCreating(true);
    try {
      const payload = {
        owned_from: form.owned_from || undefined,
        owned_to: undefined, // 新規は現所有扱い
        vehicle: {
          new_car_type: form.new_car_type || "used",
          manufacturer: form.manufacturer ? Number(form.manufacturer) : null,
          category: form.category ? Number(form.category) : null,
          color: form.color ? Number(form.color) : null,

          vehicle_name: form.vehicle_name || "",
          displacement: form.displacement ? Number(form.displacement) : null,
          model_year: form.model_year || "",
          model_code: form.model_code || "",
          chassis_no: form.chassis_no || "",

          color_name: form.color_name || "",
          color_code: form.color_code || "",
          engine_type: form.engine_type || "",
        },
      };

      await apiClient.post(`/customers/${customerId}/vehicles/`, payload);

      closeCreate();
      await fetchVehicles(); // 即反映（MVPは再取得が安全）
    } catch (e: any) {
      console.error(e);

      // DRFのエラーメッセージが取れるなら出す（便利）
      const msg =
        e?.response?.data
          ? JSON.stringify(e.response.data, null, 2)
          : "登録に失敗しました（入力項目が不足/形式不正の可能性）";
      alert(msg);
    } finally {
      setCreating(false);
    }
  };

  const renderTable = (title: string, rows: CustomerVehicle[], isCurrent: boolean) => (
    <Box mb={3}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
        <Typography variant="subtitle1" fontWeight="bold">
          {title}
        </Typography>
        {isCurrent && (
          <Button variant="contained" size="small" onClick={() => setCreateOpen(true)}>
            新規登録
          </Button>
        )}
      </Box>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{isCurrent ? "購入日" : "所有期間"}</TableCell>
            <TableCell>カテゴリ</TableCell>
            <TableCell>メーカー</TableCell>
            <TableCell>車種</TableCell>
            <TableCell>ナンバー</TableCell>
            <TableCell align="center">操作</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center">
                データがありません
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => {
              const v = row.vehicle;
              const regNo = v.registrations?.[0]?.registration_no || "-";

              return (
                <TableRow
                  key={row.id}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => openDetail(row)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {isCurrent
                      ? row.owned_from || "-"
                      : `${row.owned_from || "-"} 〜 ${row.owned_to || "-"}`}
                  </TableCell>
                  <TableCell>{v.category_name || "-"}</TableCell>
                  <TableCell>{v.manufacturer_name || "-"}</TableCell>
                  <TableCell>{v.vehicle_name || "-"}</TableCell>
                  <TableCell>{regNo}</TableCell>
                  <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                    {isCurrent && (
                      <Button
                        size="small"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          releaseOwnership(row);
                        }}
                      >
                        手放す
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </Box>
  );

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" mb={2}>
        所有車両
      </Typography>

      <Divider sx={{ mb: 2 }} />

      {loading ? (
        <CircularProgress />
      ) : (
        <>
          {renderTable("現所有", current, true)}
          {renderTable("過去所有", past, false)}
        </>
      )}

      {/* --- 新規登録Dialog --- */}
      <Dialog open={createOpen} onClose={closeCreate} maxWidth="sm" fullWidth>
        <DialogTitle>所有車両の新規登録</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            {mastersLoading ? (
              <Typography variant="body2">マスタ読込中...</Typography>
            ) : null}

            <TextField
              label="購入日（owned_from）"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={form.owned_from}
              onChange={(e) => setForm((p) => ({ ...p, owned_from: e.target.value }))}
              fullWidth
            />

            <TextField
              select
              label="新車/中古（new_car_type）"
              value={form.new_car_type}
              onChange={(e) => setForm((p) => ({ ...p, new_car_type: e.target.value }))}
              SelectProps={{ native: true }}
              fullWidth
            >
              <option value="new">新車</option>
              <option value="used">中古</option>
            </TextField>

            <TextField
              select
              label="メーカー"
              value={form.manufacturer}
              onChange={(e) => setForm((p) => ({ ...p, manufacturer: e.target.value }))}
              SelectProps={{ native: true }}
              fullWidth
            >
              <option value=""></option>
              {manufacturers.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </TextField>

            <TextField
              select
              label="カテゴリ"
              value={form.category}
              onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              SelectProps={{ native: true }}
              fullWidth
            >
              <option value=""></option>
              {categories.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </TextField>

            <TextField
              select
              label="色（任意）"
              value={form.color}
              onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
              SelectProps={{ native: true }}
              fullWidth
            >
              <option value=""></option>
              {colors.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </TextField>

            <TextField
              label="車種名（vehicle_name）*"
              value={form.vehicle_name}
              onChange={(e) => setForm((p) => ({ ...p, vehicle_name: e.target.value }))}
              fullWidth
            />

            <TextField
              label="車台番号（chassis_no / ユニーク推奨）"
              value={form.chassis_no}
              onChange={(e) => setForm((p) => ({ ...p, chassis_no: e.target.value }))}
              fullWidth
            />

            <TextField
              label="年式（model_year）"
              value={form.model_year}
              onChange={(e) => setForm((p) => ({ ...p, model_year: e.target.value }))}
              fullWidth
            />

            <TextField
              label="型式（model_code）"
              value={form.model_code}
              onChange={(e) => setForm((p) => ({ ...p, model_code: e.target.value }))}
              fullWidth
            />

            <TextField
              label="排気量（displacement）"
              type="number"
              value={form.displacement}
              onChange={(e) => setForm((p) => ({ ...p, displacement: e.target.value }))}
              fullWidth
            />

            <TextField
              label="エンジン種別（engine_type）"
              value={form.engine_type}
              onChange={(e) => setForm((p) => ({ ...p, engine_type: e.target.value }))}
              fullWidth
            />

            <TextField
              label="色名（color_name / 任意）"
              value={form.color_name}
              onChange={(e) => setForm((p) => ({ ...p, color_name: e.target.value }))}
              fullWidth
            />

            <TextField
              label="色コード（color_code / 任意）"
              value={form.color_code}
              onChange={(e) => setForm((p) => ({ ...p, color_code: e.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCreate} disabled={creating}>
            キャンセル
          </Button>
          <Button variant="contained" onClick={submitCreate} disabled={creating}>
            登録
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- 詳細Dialog --- */}
      <Dialog open={detailOpen} onClose={closeDetail} maxWidth="sm" fullWidth>
        <DialogTitle>車両詳細</DialogTitle>
        <DialogContent>
          {selected ? (
            <Stack spacing={1} mt={1}>
              <Typography>
                <b>車種:</b> {selected.vehicle.vehicle_name || "-"}
              </Typography>
              <Typography>
                <b>メーカー:</b> {selected.vehicle.manufacturer_name || "-"}
              </Typography>
              <Typography>
                <b>カテゴリ:</b> {selected.vehicle.category_name || "-"}
              </Typography>
              <Typography>
                <b>車台番号:</b> {selected.vehicle.chassis_no || "-"}
              </Typography>
              <Typography>
                <b>年式:</b> {selected.vehicle.model_year || "-"}
              </Typography>
              <Typography>
                <b>型式:</b> {selected.vehicle.model_code || "-"}
              </Typography>
              <Typography>
                <b>排気量:</b> {selected.vehicle.displacement ?? "-"}
              </Typography>
              <Typography>
                <b>購入日:</b> {selected.owned_from || "-"}
              </Typography>
              <Typography>
                <b>手放し日:</b> {selected.owned_to || "-"}
              </Typography>
              <Typography>
                <b>ナンバー:</b> {selected.vehicle.registrations?.[0]?.registration_no || "-"}
              </Typography>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDetail}>閉じる</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
