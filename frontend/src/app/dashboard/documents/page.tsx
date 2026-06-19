"use client";

import { useEffect, useState } from "react";
import {
  Box, Typography, Paper, Button, TextField, MenuItem,
  Stepper, Step, StepLabel, Divider, CircularProgress, Alert,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import apiClient from "@/lib/apiClient";

type Template = { id: number; name: string; fields: any[] };
type Customer = { id: number; name: string; kana: string };
type OwnedVehicle = { id: number; vehicle: { id: number; vehicle_name: string; chassis_no: string } };
type RenderedField = {
  id: number; label: string; source_key: string;
  input_label: string; value: string;
  x: number; y: number; font_size: number; letter_spacing: number;
};

export default function DocumentIssuancePage() {
  const [step, setStep] = useState(0);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState<number | "">("");

  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState<number | "">("");

  const [ownedVehicles, setOwnedVehicles] = useState<OwnedVehicle[]>([]);
  const [vehicleId, setVehicleId] = useState<number | "">("");

  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [rendered, setRendered] = useState<{ template: any; fields: RenderedField[] } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiClient.get("/document-templates/?active_only=1").then((r) => setTemplates(r.data.results ?? r.data));
  }, []);

  // 顧客検索
  useEffect(() => {
    if (!customerSearch.trim()) { setCustomers([]); return; }
    const t = setTimeout(() => {
      apiClient.get(`/customers/?search=${encodeURIComponent(customerSearch)}&page_size=10`)
        .then((r) => setCustomers(r.data.results || r.data || []));
    }, 300);
    return () => clearTimeout(t);
  }, [customerSearch]);

  // 顧客の所有車両取得
  useEffect(() => {
    if (!customerId) { setOwnedVehicles([]); setVehicleId(""); return; }
    apiClient.get(`/customers/${customerId}/`)
      .then((r) => setOwnedVehicles(r.data.owned_vehicles || []));
  }, [customerId]);

  // 手入力フィールドの抽出
  const selectedTemplate = templates.find((t) => t.id === templateId);
  const inputFields = selectedTemplate?.fields.filter((f: any) => f.source_key === "input") ?? [];

  const canPreview = templateId && customerId && vehicleId !== "";

  const handlePreview = async () => {
    setLoading(true);
    try {
      const res = await apiClient.post(`/document-templates/${templateId}/render/`, {
        customer_id: customerId || null,
        vehicle_id: vehicleId || null,
        inputs,
      });
      setRendered(res.data);
      setStep(3);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  return (
    <>
      {/* ── 印刷時は発行フォームを隠す ── */}
      <Box p={3} className="no-print">
        <Typography variant="h5" fontWeight="bold" mb={3}>書類発行</Typography>

        <Stepper activeStep={step} sx={{ mb: 4 }}>
          {["書類選択", "顧客・車両選択", "追加入力", "印刷"].map((l) => (
            <Step key={l}><StepLabel>{l}</StepLabel></Step>
          ))}
        </Stepper>

        {/* Step 0: 書類選択 */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography fontWeight="bold" mb={1.5}>① 書類を選択</Typography>
          <TextField
            select fullWidth size="small" label="書類テンプレート"
            value={templateId}
            onChange={(e) => { setTemplateId(Number(e.target.value)); setStep(Math.max(step, 1)); }}
          >
            {templates.map((t) => (
              <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
            ))}
          </TextField>
        </Paper>

        {/* Step 1: 顧客・車両選択 */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography fontWeight="bold" mb={1.5}>② 顧客・車両を選択</Typography>
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              fullWidth size="small" label="顧客名で検索"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
            />
            {customers.length > 0 && (
              <TextField
                select fullWidth size="small" label="顧客を選択"
                value={customerId}
                onChange={(e) => {
                  setCustomerId(Number(e.target.value));
                  setVehicleId("");
                  setStep(Math.max(step, 2));
                }}
              >
                {customers.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}　{c.kana && `（${c.kana}）`}
                  </MenuItem>
                ))}
              </TextField>
            )}
            {customerId && (
              <TextField
                select fullWidth size="small" label="車両を選択"
                value={vehicleId}
                onChange={(e) => { setVehicleId(Number(e.target.value)); setStep(Math.max(step, 2)); }}
              >
                <MenuItem value="">車両なし</MenuItem>
                {ownedVehicles.map((ov) => (
                  <MenuItem key={ov.vehicle.id} value={ov.vehicle.id}>
                    {ov.vehicle.vehicle_name || "車名未登録"}
                    {ov.vehicle.chassis_no && `　（${ov.vehicle.chassis_no}）`}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </Box>
        </Paper>

        {/* Step 2: 手入力フィールド */}
        {inputFields.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography fontWeight="bold" mb={1.5}>③ 追加入力</Typography>
            <Box display="flex" flexDirection="column" gap={2}>
              {inputFields.map((f: any) => (
                <TextField
                  key={f.id}
                  fullWidth size="small"
                  label={f.input_label || f.label}
                  value={inputs[f.input_label || f.label] || ""}
                  onChange={(e) =>
                    setInputs({ ...inputs, [f.input_label || f.label]: e.target.value })
                  }
                />
              ))}
            </Box>
          </Paper>
        )}

        <Box display="flex" gap={2}>
          <Button
            variant="contained" size="large" startIcon={<PrintIcon />}
            disabled={!canPreview || loading}
            onClick={handlePreview}
          >
            {loading ? <CircularProgress size={20} /> : "印刷プレビューを表示"}
          </Button>
        </Box>

        {rendered && (
          <>
            <Divider sx={{ my: 3 }} />
            <Alert severity="success" sx={{ mb: 2 }}>
              プレビューが表示されています。プリンターに用紙をセットしてから印刷ボタンを押してください。
            </Alert>
            <Button variant="contained" color="success" size="large" startIcon={<PrintIcon />} onClick={handlePrint}>
              印刷する
            </Button>
          </>
        )}
      </Box>

      {/* ── 印刷プレビュー（画面上でも表示、印刷時はこれだけ出る） ── */}
      {rendered && <PrintPage data={rendered} />}

      <style>{`
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>
    </>
  );
}

// ── 印刷ページ本体 ────────────────────────────────────────────────
function PrintPage({ data }: { data: { template: any; fields: RenderedField[] } }) {
  const { template, fields } = data;

  return (
    <Box
      className="print-page"
      sx={{
        position: "relative",
        width: `${template.paper_width}mm`,
        height: `${template.paper_height}mm`,
        overflow: "hidden",
        bgcolor: "transparent",
        // 画面表示時のみ枠を表示
        "@media screen": {
          border: "1px dashed #ccc",
          mt: 3,
          mx: 3,
          bgcolor: "#fafafa",
        },
      }}
    >
      {fields.map((f) => (
        <Box
          key={f.id}
          sx={{
            position: "absolute",
            left: `${f.x}mm`,
            top: `${f.y}mm`,
            fontSize: `${f.font_size}pt`,
            fontFamily: '"MS Gothic", "ＭＳ ゴシック", "Noto Sans JP", monospace',
            whiteSpace: "nowrap",
            letterSpacing: f.letter_spacing > 0 ? `${f.letter_spacing}mm` : undefined,
            lineHeight: 1,
          }}
        >
          {f.value}
        </Box>
      ))}

      <style>{`
        @page {
          size: ${template.paper_width}mm ${template.paper_height}mm;
          margin: 0;
        }
        @media print {
          body * { visibility: hidden; }
          .print-page, .print-page * { visibility: visible; }
          .print-page {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            margin: 0 !important;
            border: none !important;
            background: transparent !important;
          }
        }
      `}</style>
    </Box>
  );
}
