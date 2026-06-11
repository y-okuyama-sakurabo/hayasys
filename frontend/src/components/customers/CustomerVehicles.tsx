"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Chip,
  Alert,
  Divider,
  FormControl,
  InputLabel,
  Select,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import VehicleCategorySelect from "@/components/vehicles/VehicleCategorySelect";
import JaDatePicker from "@/components/common/JaDatePicker";
import JaMonthPicker from "@/components/common/JaMonthPicker";
import AddIcon from "@mui/icons-material/Add";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DescriptionIcon from "@mui/icons-material/Description";
import DeleteIcon from "@mui/icons-material/Delete";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HistoryIcon from "@mui/icons-material/History";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/apiClient";
import dayjs from "dayjs";

// ── 型 ────────────────────────────────────────────────────────
type OwnedVehicle = {
  id: number;
  owned_from?: string | null;
  owned_to?: string | null;
  is_current: boolean;
  vehicle: {
    id: number;
    vehicle_name?: string;
    manufacturer_name?: string;
    model_year?: string;
    chassis_no?: string;
    registrations?: { registration_no?: string | null }[];
  };
};

type IdName = { id: number; name: string };

type Props = { customerId: number };

// ── ヘルパー ──────────────────────────────────────────────────
const toArray = (res: any): IdName[] =>
  Array.isArray(res?.data) ? res.data : res?.data?.results ?? res?.data ?? [];

/** 空文字・空の場合は undefined（送信から除外）*/
const nullIfEmpty = (v: any) => {
  if (v === "" || v === null || v === undefined) return undefined;
  return v;
};

// ── 車両追加ダイアログ ────────────────────────────────────────
const NEW_CAR_TYPE_OPTIONS = [
  { value: "new",         label: "新車" },
  { value: "used",        label: "中古車" },
  { value: "rental_up",   label: "レンタルアップ" },
  { value: "consignment", label: "委託販売" },
];

const INS_TYPE_OPTIONS = [
  { value: "mandatory", label: "自賠責" },
  { value: "optional",  label: "任意保険" },
];

function AddVehicleDialog({
  open,
  onClose,
  customerId,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  customerId: number;
  onAdded: () => void;
}) {
  const today = dayjs().format("YYYY-MM-DD");

  // masters
  const [manufacturers, setManufacturers] = useState<IdName[]>([]);
  const [colors,        setColors]        = useState<IdName[]>([]);
  const [mastersLoaded, setMastersLoaded] = useState(false);

  // form state
  const blankVehicle = () => ({
    vehicle_name: "", displacement: "", model_year: "", new_car_type: "",
    manufacturer_id: "", category_id: null as number | null, color_id: "",
    model_code: "", chassis_no: "", color_name: "", color_code: "", engine_type: "",
  });
  const blankReg = () => ({
    registration_area: "", registration_no: "", certification_no: "",
    inspection_expiration: "", first_registration_date: "",
    security_registration: "", effective_from: "", effective_to: "",
  });
  const blankIns = () => ({
    type: "", company: "", start_date: "", end_date: "", policy_no: "",
  });
  const blankWarranty = () => ({
    start_date: "", end_date: "", plan_name: "", note: "",
  });

  const [vehicle,  setVehicle]  = useState(blankVehicle());
  const [reg,      setReg]      = useState(blankReg());
  const [ins,      setIns]      = useState(blankIns());
  const [warranty, setWarranty] = useState(blankWarranty());
  const [ownedFrom, setOwnedFrom] = useState(today);

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  // マスタ読み込み
  useEffect(() => {
    if (!open || mastersLoaded) return;
    Promise.all([
      apiClient.get("/masters/manufacturers/"),
      apiClient.get("/masters/colors/"),
    ]).then(([m, col]) => {
      setManufacturers(toArray(m));
      setColors(toArray(col));
      setMastersLoaded(true);
    });
  }, [open, mastersLoaded]);

  const reset = () => {
    setVehicle(blankVehicle());
    setReg(blankReg());
    setIns(blankIns());
    setWarranty(blankWarranty());
    setOwnedFrom(today);
    setError("");
  };

  const handleClose = () => { reset(); onClose(); };

  const setV = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setVehicle(prev => ({ ...prev, [field]: e.target.value }));
  const setR = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setReg(prev => ({ ...prev, [field]: e.target.value }));
  const setI = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setIns(prev => ({ ...prev, [field]: e.target.value }));
  const setW = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setWarranty(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async () => {
    if (!vehicle.vehicle_name.trim()) {
      setError("車両名を入力してください");
      return;
    }
    setSaving(true);
    setError("");
    try {
      // 基本情報
      const vehiclePayload: any = {
        vehicle_name: vehicle.vehicle_name.trim(),
        ...(vehicle.displacement     ? { displacement: Number(vehicle.displacement) } : {}),
        ...(vehicle.model_year       ? { model_year: vehicle.model_year } : {}),
        ...(vehicle.new_car_type     ? { new_car_type: vehicle.new_car_type } : {}),
        ...(vehicle.manufacturer_id  ? { manufacturer_id: Number(vehicle.manufacturer_id) } : {}),
        ...(vehicle.category_id      ? { category_id: vehicle.category_id } : {}),
        ...(vehicle.color_id         ? { color_id: Number(vehicle.color_id) } : {}),
        ...(vehicle.model_code       ? { model_code: vehicle.model_code } : {}),
        ...(vehicle.chassis_no       ? { chassis_no: vehicle.chassis_no } : {}),
        ...(vehicle.color_name       ? { color_name: vehicle.color_name } : {}),
        ...(vehicle.color_code       ? { color_code: vehicle.color_code } : {}),
        ...(vehicle.engine_type      ? { engine_type: vehicle.engine_type } : {}),
      };

      // 登録情報（1項目でも入力があれば送る）
      const hasReg = Object.values(reg).some(v => v !== "");
      if (hasReg) {
        vehiclePayload.registrations = [{
          ...(reg.registration_area       ? { registration_area: reg.registration_area } : {}),
          ...(reg.registration_no         ? { registration_no: reg.registration_no } : {}),
          ...(reg.certification_no        ? { certification_no: reg.certification_no } : {}),
          ...(reg.inspection_expiration   ? { inspection_expiration: reg.inspection_expiration } : {}),
          ...(reg.first_registration_date ? { first_registration_date: reg.first_registration_date } : {}),
          ...(reg.security_registration   ? { security_registration: reg.security_registration } : {}),
          ...(reg.effective_from          ? { effective_from: reg.effective_from } : {}),
          ...(reg.effective_to            ? { effective_to: reg.effective_to } : {}),
        }];
      }

      // 保険情報
      const hasIns = Object.values(ins).some(v => v !== "");
      if (hasIns) {
        vehiclePayload.insurances = [{
          ...(ins.type       ? { type: ins.type } : {}),
          ...(ins.company    ? { company: ins.company } : {}),
          ...(ins.start_date ? { start_date: ins.start_date } : {}),
          ...(ins.end_date   ? { end_date: ins.end_date } : {}),
          ...(ins.policy_no  ? { policy_no: ins.policy_no } : {}),
        }];
      }

      // 保証情報
      const hasWarranty = Object.values(warranty).some(v => v !== "");
      if (hasWarranty) {
        vehiclePayload.warranties = [{
          ...(warranty.start_date ? { start_date: warranty.start_date } : {}),
          ...(warranty.end_date   ? { end_date: warranty.end_date } : {}),
          ...(warranty.plan_name  ? { plan_name: warranty.plan_name } : {}),
          ...(warranty.note       ? { note: warranty.note } : {}),
        }];
      }

      await apiClient.post(`/customers/${customerId}/vehicles/`, {
        vehicle: vehiclePayload,
        owned_from: ownedFrom || null,
      });

      onAdded();
      handleClose();
    } catch (e: any) {
      const data = e?.response?.data;
      setError(
        typeof data?.detail === "string"
          ? data.detail
          : JSON.stringify(data) || "追加に失敗しました"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { maxHeight: "90vh" } }}>
      <DialogTitle sx={{ fontWeight: "bold", pb: 1 }}>所有車両を追加</DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {error && (
          <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
        )}

        {/* ━━ 車両基本情報 ━━ */}
        <Accordion defaultExpanded disableGutters elevation={0}
          sx={{ border: "none", "&:before": { display: "none" } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}
            sx={{ bgcolor: "#f5f7fa", px: 3, minHeight: 44, "& .MuiAccordionSummary-content": { my: 0.75 } }}>
            <Typography fontWeight="bold" fontSize={14}>車両基本情報</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 3, pt: 2, pb: 2 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth size="small" label="車両名 *"
                  value={vehicle.vehicle_name} onChange={setV("vehicle_name")} />
              </Grid>
              <Grid size={{ xs: 6, md: 4 }}>
                <TextField fullWidth size="small" label="年式" placeholder="例: 2022"
                  value={vehicle.model_year} onChange={setV("model_year")} />
              </Grid>
              <Grid size={{ xs: 6, md: 4 }}>
                <TextField fullWidth size="small" label="型式"
                  value={vehicle.model_code} onChange={setV("model_code")} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>区分</InputLabel>
                  <Select label="区分" value={vehicle.new_car_type}
                    onChange={(e) => setVehicle(p => ({ ...p, new_car_type: e.target.value }))}>
                    <MenuItem value="">未選択</MenuItem>
                    {NEW_CAR_TYPE_OPTIONS.map(o => (
                      <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <VehicleCategorySelect
                  value={vehicle.category_id}
                  onChange={(id) => setVehicle(p => ({ ...p, category_id: id }))}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>メーカー</InputLabel>
                  <Select label="メーカー" value={vehicle.manufacturer_id}
                    onChange={(e) => setVehicle(p => ({ ...p, manufacturer_id: String(e.target.value) }))}>
                    <MenuItem value="">未選択</MenuItem>
                    {manufacturers.map(m => <MenuItem key={m.id} value={String(m.id)}>{m.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth size="small" label="車台番号"
                  value={vehicle.chassis_no} onChange={setV("chassis_no")} />
              </Grid>
              <Grid size={{ xs: 6, md: 4 }}>
                <TextField fullWidth size="small" label="排気量" type="number"
                  value={vehicle.displacement} onChange={setV("displacement")}
                  InputProps={{ endAdornment: <InputAdornment position="end">cc</InputAdornment> }} />
              </Grid>
              <Grid size={{ xs: 6, md: 4 }}>
                <TextField fullWidth size="small" label="原動型"
                  value={vehicle.engine_type} onChange={setV("engine_type")} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>カラー</InputLabel>
                  <Select label="カラー" value={vehicle.color_id}
                    onChange={(e) => setVehicle(p => ({ ...p, color_id: String(e.target.value) }))}>
                    <MenuItem value="">未選択</MenuItem>
                    {colors.map(c => <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField fullWidth size="small" label="カラー名称"
                  value={vehicle.color_name} onChange={setV("color_name")} />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField fullWidth size="small" label="カラーコード" placeholder="#FFFFFF"
                  value={vehicle.color_code} onChange={setV("color_code")} />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        <Divider />

        {/* ━━ 登録情報 ━━ */}
        <Accordion disableGutters elevation={0}
          sx={{ border: "none", "&:before": { display: "none" } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}
            sx={{ bgcolor: "#f5f7fa", px: 3, minHeight: 44, "& .MuiAccordionSummary-content": { my: 0.75 } }}>
            <Typography fontWeight="bold" fontSize={14}>登録情報</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 3, pt: 2, pb: 2 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6, md: 4 }}>
                <TextField fullWidth size="small" label="登録地域"
                  value={reg.registration_area} onChange={setR("registration_area")} />
              </Grid>
              <Grid size={{ xs: 6, md: 4 }}>
                <TextField fullWidth size="small" label="ナンバープレート"
                  placeholder="品川 500 あ 1234"
                  value={reg.registration_no} onChange={setR("registration_no")} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField fullWidth size="small" label="型認番号"
                  value={reg.certification_no} onChange={setR("certification_no")} />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <JaMonthPicker label="初年度登録"
                  value={reg.first_registration_date || null}
                  onChange={v => setReg(p => ({ ...p, first_registration_date: v ?? "" }))} />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <JaDatePicker label="車検満了日"
                  value={reg.inspection_expiration || null}
                  onChange={v => setReg(p => ({ ...p, inspection_expiration: v ?? "" }))} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth size="small" label="防犯登録番号"
                  value={reg.security_registration} onChange={setR("security_registration")} />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <JaDatePicker label="有効開始日"
                  value={reg.effective_from || null}
                  onChange={v => setReg(p => ({ ...p, effective_from: v ?? "" }))} />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <JaDatePicker label="有効終了日"
                  value={reg.effective_to || null}
                  onChange={v => setReg(p => ({ ...p, effective_to: v ?? "" }))} />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        <Divider />

        {/* ━━ 保険情報 ━━ */}
        <Accordion disableGutters elevation={0}
          sx={{ border: "none", "&:before": { display: "none" } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}
            sx={{ bgcolor: "#f5f7fa", px: 3, minHeight: 44, "& .MuiAccordionSummary-content": { my: 0.75 } }}>
            <Typography fontWeight="bold" fontSize={14}>保険情報</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 3, pt: 2, pb: 2 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>種別</InputLabel>
                  <Select label="種別" value={ins.type}
                    onChange={(e) => setIns(p => ({ ...p, type: e.target.value }))}>
                    <MenuItem value="">未選択</MenuItem>
                    {INS_TYPE_OPTIONS.map(o => (
                      <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                <TextField fullWidth size="small" label="保険会社"
                  value={ins.company} onChange={setI("company")} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth size="small" label="証券番号"
                  value={ins.policy_no} onChange={setI("policy_no")} />
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <JaDatePicker label="開始日"
                  value={ins.start_date || null}
                  onChange={v => setIns(p => ({ ...p, start_date: v ?? "" }))} />
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <JaDatePicker label="終了日"
                  value={ins.end_date || null}
                  onChange={v => setIns(p => ({ ...p, end_date: v ?? "" }))} />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        <Divider />

        {/* ━━ 保証情報 ━━ */}
        <Accordion disableGutters elevation={0}
          sx={{ border: "none", "&:before": { display: "none" } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}
            sx={{ bgcolor: "#f5f7fa", px: 3, minHeight: 44, "& .MuiAccordionSummary-content": { my: 0.75 } }}>
            <Typography fontWeight="bold" fontSize={14}>保証情報</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 3, pt: 2, pb: 2 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth size="small" label="プラン名"
                  value={warranty.plan_name} onChange={setW("plan_name")} />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <JaDatePicker label="保証開始日"
                  value={warranty.start_date || null}
                  onChange={v => setWarranty(p => ({ ...p, start_date: v ?? "" }))} />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <JaDatePicker label="保証終了日"
                  value={warranty.end_date || null}
                  onChange={v => setWarranty(p => ({ ...p, end_date: v ?? "" }))} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth size="small" label="メモ" multiline rows={2}
                  value={warranty.note} onChange={setW("note")} />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        <Divider />

        {/* ━━ 所有期間 ━━ */}
        <Box sx={{ px: 3, py: 2, bgcolor: "#fafafa" }}>
          <Typography fontWeight="bold" fontSize={14} mb={1.5}>所有期間</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}>
              <JaDatePicker label="所有開始日"
                value={ownedFrom || null}
                onChange={v => setOwnedFrom(v ?? "")} />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={saving}>キャンセル</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          {saving ? "追加中…" : "追加する"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── 手放すダイアログ ──────────────────────────────────────────
function ReleaseVehicleDialog({
  open,
  onClose,
  customerId,
  target,
  onReleased,
}: {
  open: boolean;
  onClose: () => void;
  customerId: number;
  target: OwnedVehicle | null;
  onReleased: () => void;
}) {
  const [ownedTo, setOwnedTo] = useState(dayjs().format("YYYY-MM-DD"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!target) return;
    setSaving(true);
    setError("");
    try {
      await apiClient.patch(
        `/customers/${customerId}/vehicles/${target.id}/`,
        { owned_to: ownedTo }
      );
      onReleased();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "処理に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const vehicleName = target?.vehicle?.vehicle_name || "この車両";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: "bold" }}>車両を手放す</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Typography color="text.secondary" mb={2.5}>
          「<strong>{vehicleName}</strong>」の所有を終了します。
          <br />
          手放した日付を入力してください。
        </Typography>
        <JaDatePicker label="手放した日付"
          value={ownedTo || null}
          onChange={v => setOwnedTo(v ?? "")} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>キャンセル</Button>
        <Button variant="contained" color="warning" onClick={handleSubmit} disabled={saving}>
          {saving ? "処理中…" : "手放す"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── テーブル行 ────────────────────────────────────────────────
function VehicleTableRow({
  v, customerId, isCurrent, onAction, menuAnchor, onMenuOpen, onMenuClose,
}: {
  v: OwnedVehicle;
  customerId: number;
  isCurrent: boolean;
  onAction: (action: string, v: OwnedVehicle) => void;
  menuAnchor: HTMLElement | null;
  onMenuOpen: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onMenuClose: () => void;
}) {
  const router = useRouter();
  const regNo = v.vehicle?.registrations?.[0]?.registration_no || "-";

  return (
    <TableRow hover sx={{ cursor: "pointer" }}
      onClick={() => router.push(`/dashboard/customers/${customerId}/vehicles/${v.id}`)}>
      {isCurrent ? (
        <TableCell>
          {v.owned_from ? new Date(v.owned_from).toLocaleDateString("ja-JP") : "-"}
        </TableCell>
      ) : (
        <TableCell>
          <Typography variant="caption">
            {v.owned_from ? new Date(v.owned_from).toLocaleDateString("ja-JP") : "-"}
            {" 〜 "}
            {v.owned_to ? new Date(v.owned_to).toLocaleDateString("ja-JP") : ""}
          </Typography>
        </TableCell>
      )}
      <TableCell>{v.vehicle?.manufacturer_name || "-"}</TableCell>
      <TableCell>{v.vehicle?.vehicle_name || "-"}</TableCell>
      <TableCell>{v.vehicle?.model_year || "-"}</TableCell>
      <TableCell>{regNo}</TableCell>
      <TableCell align="center" onClick={(e) => e.stopPropagation()}>
        <IconButton size="small" onClick={onMenuOpen}>
          <MoreVertIcon fontSize="small" />
        </IconButton>
        <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={onMenuClose}>
          <MenuItem onClick={() => { onMenuClose(); router.push(`/dashboard/customers/${customerId}/vehicles/${v.id}`); }}>
            <ListItemIcon><DescriptionIcon fontSize="small" /></ListItemIcon>
            <ListItemText>詳細</ListItemText>
          </MenuItem>
          {isCurrent && (
            <MenuItem onClick={() => { onMenuClose(); onAction("release", v); }}>
              <ListItemIcon>
                <DirectionsCarIcon fontSize="small" sx={{ color: "warning.main" }} />
              </ListItemIcon>
              <ListItemText sx={{ color: "warning.dark" }}>手放す</ListItemText>
            </MenuItem>
          )}
          <Divider />
          <MenuItem onClick={() => { onMenuClose(); onAction("delete", v); }}
            sx={{ color: "error.main" }}>
            <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
            <ListItemText>削除</ListItemText>
          </MenuItem>
        </Menu>
      </TableCell>
    </TableRow>
  );
}

// ── メインコンポーネント ──────────────────────────────────────
export default function CustomerVehicles({ customerId }: Props) {
  const [vehicles, setVehicles] = useState<OwnedVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuAnchor, setMenuAnchor] = useState<{ [key: number]: HTMLElement | null }>({});
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [releaseTarget, setReleaseTarget] = useState<OwnedVehicle | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OwnedVehicle | null>(null);
  const [deleteError,  setDeleteError]  = useState<string | null>(null);
  const [deleting,     setDeleting]     = useState(false);

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/customers/${customerId}/vehicles/`);
      setVehicles(res.data.results || res.data || []);
    } catch (err) {
      console.error("車両取得失敗:", err);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  const handleMenuOpen = (e: React.MouseEvent<HTMLButtonElement>, id: number) =>
    setMenuAnchor(prev => ({ ...prev, [id]: e.currentTarget }));
  const handleMenuClose = (id: number) =>
    setMenuAnchor(prev => ({ ...prev, [id]: null }));

  const handleAction = async (action: string, v: OwnedVehicle) => {
    switch (action) {
      case "detail": break; // VehicleTableRow の MenuItem が直接 router.push するため不要
      case "release":
        setReleaseTarget(v);
        break;
      case "delete":
        setDeleteTarget(v);
        break;
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await apiClient.delete(`/customers/${customerId}/vehicles/${deleteTarget.id}/`);
      setVehicles(prev => prev.filter(x => x.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setDeleteError("削除に失敗しました");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={6}>
        <CircularProgress />
      </Box>
    );
  }

  const currentVehicles = vehicles.filter(v => v.is_current);
  const pastVehicles    = vehicles.filter(v => !v.is_current);

  const thead = (cols: string[]) => (
    <TableHead sx={{ bgcolor: "#f5f7fa" }}>
      <TableRow>
        {cols.map((c, i) => (
          <TableCell
            key={c}
            align={i === cols.length - 1 ? "center" : "left"}
            sx={{ fontWeight: "bold", fontSize: 12 }}
          >
            {c}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );

  return (
    <>
      {/* ── ヘッダ ── */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" fontWeight="bold">所有車両</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddDialogOpen(true)}>
          車両を追加
        </Button>
      </Box>

      {/* ── 現在の所有車両 ── */}
      <Box mb={1} display="flex" alignItems="center" gap={1}>
        <CheckCircleOutlineIcon fontSize="small" color="success" />
        <Typography variant="subtitle2" fontWeight="bold" color="success.dark">
          現在の所有車両
        </Typography>
        <Chip label={currentVehicles.length} size="small" color="success" variant="outlined" />
      </Box>

      <TableContainer component={Paper} variant="outlined" sx={{ mb: 4 }}>
        <Table size="small">
          {thead(["所有開始日", "メーカー", "車種", "年式", "ナンバープレート", "操作"])}
          <TableBody>
            {currentVehicles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  現在の所有車両はありません
                </TableCell>
              </TableRow>
            ) : currentVehicles.map(v => (
              <VehicleTableRow key={v.id} v={v} customerId={customerId} isCurrent
                onAction={handleAction}
                menuAnchor={menuAnchor[v.id] ?? null}
                onMenuOpen={e => handleMenuOpen(e, v.id)}
                onMenuClose={() => handleMenuClose(v.id)}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── 過去の所有車両 ── */}
      {pastVehicles.length > 0 && (
        <>
          <Box mb={1} display="flex" alignItems="center" gap={1}>
            <HistoryIcon fontSize="small" sx={{ color: "text.disabled" }} />
            <Typography variant="subtitle2" fontWeight="bold" color="text.secondary">
              過去の所有車両
            </Typography>
            <Chip label={pastVehicles.length} size="small" variant="outlined" />
          </Box>
          <TableContainer component={Paper} variant="outlined" sx={{ opacity: 0.8 }}>
            <Table size="small">
              {thead(["所有期間", "メーカー", "車種", "年式", "ナンバープレート", "操作"])}
              <TableBody>
                {pastVehicles.map(v => (
                  <VehicleTableRow key={v.id} v={v} customerId={customerId} isCurrent={false}
                    onAction={handleAction}
                    menuAnchor={menuAnchor[v.id] ?? null}
                    onMenuOpen={e => handleMenuOpen(e, v.id)}
                    onMenuClose={() => handleMenuClose(v.id)}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* ── ダイアログ ── */}
      <AddVehicleDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        customerId={customerId}
        onAdded={fetchVehicles}
      />
      <ReleaseVehicleDialog
        open={!!releaseTarget}
        onClose={() => setReleaseTarget(null)}
        customerId={customerId}
        target={releaseTarget}
        onReleased={() => { setReleaseTarget(null); fetchVehicles(); }}
      />

      {/* 削除確認ダイアログ */}
      <Dialog open={!!deleteTarget} onClose={() => { setDeleteTarget(null); setDeleteError(null); }} maxWidth="xs" fullWidth>
        <DialogTitle>車両の削除</DialogTitle>
        <DialogContent>
          {deleteError && <Alert severity="error" sx={{ mb: 2 }}>{deleteError}</Alert>}
          <Typography>
            「<strong>{deleteTarget?.vehicle?.vehicle_name || "この車両"}</strong>」の所有記録を削除しますか？
            この操作は取り消せません。
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setDeleteTarget(null); setDeleteError(null); }} disabled={deleting}>
            キャンセル
          </Button>
          <Button color="error" variant="contained" onClick={handleDeleteConfirm} disabled={deleting}>
            {deleting ? "削除中…" : "削除する"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
