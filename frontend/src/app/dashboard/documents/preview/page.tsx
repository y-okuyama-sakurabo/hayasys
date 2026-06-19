"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Box, Typography, Button, Alert, Chip, CircularProgress,
  TextField, Paper, Divider, Collapse, IconButton, Tooltip,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import TuneIcon from "@mui/icons-material/Tune";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import apiClient from "@/lib/apiClient";

type Field = {
  id: number; label: string; source_key: string;
  static_value: string; input_label: string;
  x: number; y: number; font_size: number; letter_spacing: number; order: number;
};
type Template = {
  id: number; name: string; paper_width: number; paper_height: number; fields: Field[];
};

// ── デフォルトサンプルデータ ───────────────────────────────────
const now = new Date();
const yyyy = now.getFullYear();
const mm = String(now.getMonth() + 1).padStart(2, "0");
const dd = String(now.getDate()).padStart(2, "0");
const WAREKI_BASE: [number, string][] = [[2019, "令和"], [1989, "平成"], [1926, "昭和"]];
const toWareki = (y: number) => {
  const [base, name] = WAREKI_BASE.find(([b]) => y >= b)!;
  return `${name}${y - base + 1}年${mm}月${dd}日`;
};

const SAMPLE: Record<string, string> = {
  "customer.name":                   "山田　太郎",
  "customer.kana":                   "ヤマダ　タロウ",
  "customer.postal_code":            "123-4567",
  "customer.address":                "東京都新宿区西新宿１丁目２番３号",
  "customer.phone":                  "03-1234-5678",
  "customer.mobile_phone":           "090-1234-5678",
  "vehicle.vehicle_name":            "ホンダ スーパーカブ110",
  "vehicle.model_code":              "JA44",
  "vehicle.chassis_no":              "JA44-1234567",
  "vehicle.engine_type":             "JA44E",
  "vehicle.displacement":            "109",
  "vehicle.model_year":              "2022",
  "vehicle.color_name":              "パールグレアホワイト",
  "registration.registration_no":    "品川 あ 12-34",
  "registration.registration_area":  "品川",
  "registration.inspection_expiration": "2025-12-31",
  "registration.first_registration_date": "2022-04-01",
  "company.name":                    "株式会社サンプル商会",
  "company.address":                 "東京都渋谷区渋谷２丁目１番１号",
  "company.phone":                   "03-9876-5432",
  date_today:                        `${yyyy}/${mm}/${dd}`,
  date_wareki:                       toWareki(yyyy),
};

function resolveText(f: Field, overrides: Record<number, string>): string {
  if (overrides[f.id] !== undefined) return overrides[f.id];
  if (f.source_key === "static") return f.static_value || "";
  if (f.source_key === "input")  return `《${f.input_label || f.label}》`;
  return SAMPLE[f.source_key] ?? `[${f.source_key}]`;
}

// ── フィールド色（画面表示のみ） ──────────────────────────────
function fieldColor(source_key: string) {
  if (source_key === "static") return "#333";
  if (source_key === "input")  return "#1565c0";
  return "#b71c1c";
}

// ────────────────────────────────────────────────────────────────
function PreviewContent() {
  const searchParams = useSearchParams();
  const templateId = searchParams.get("template_id");
  const [template, setTemplate] = useState<Template | null>(null);
  const [overrides, setOverrides] = useState<Record<number, string>>({});
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    if (!templateId) return;
    apiClient.get(`/document-templates/${templateId}/`).then((r) => setTemplate(r.data));
  }, [templateId]);

  if (!templateId) return <Box p={4}><Alert severity="error">template_id が指定されていません。</Alert></Box>;
  if (!template)   return <Box display="flex" justifyContent="center" alignItems="center" height="80vh"><CircularProgress /></Box>;

  const isLandscape = template.paper_width > template.paper_height;
  const hasOverride = Object.keys(overrides).length > 0;

  return (
    <>
      {/* ── ツールバー ──────────────────────────────────── */}
      <Box
        className="no-print"
        display="flex" alignItems="center" gap={1.5} px={2} py={1}
        sx={{ borderBottom: "1px solid", borderColor: "divider", bgcolor: "#fafafa" }}
      >
        <Typography variant="subtitle1" fontWeight="bold">{template.name}</Typography>
        <Chip label={`${template.paper_width}×${template.paper_height}mm (${isLandscape ? "横" : "縦"})`} size="small" variant="outlined" />
        <Chip label={`${template.fields.length} フィールド`} size="small" />
        <Box flex={1} />
        <Tooltip title="値を個別に上書き入力できます">
          <Button
            size="small"
            variant={panelOpen ? "contained" : "outlined"}
            startIcon={<TuneIcon />}
            onClick={() => setPanelOpen((p) => !p)}
          >
            値を上書き{hasOverride && ` (${Object.keys(overrides).length}件)`}
          </Button>
        </Tooltip>
        {hasOverride && (
          <Tooltip title="すべてサンプルデータに戻す">
            <IconButton size="small" onClick={() => setOverrides({})}>
              <RestartAltIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <Button variant="contained" startIcon={<PrintIcon />} size="small" onClick={() => window.print()}>
          印刷
        </Button>
      </Box>

      {/* ── 上書き入力パネル ────────────────────────────── */}
      <Collapse in={panelOpen} className="no-print">
        <Paper variant="outlined" sx={{ m: 2, p: 2 }}>
          <Typography variant="body2" fontWeight="bold" mb={1.5}>
            値を上書き入力（空欄はサンプルデータを使用）
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1.5}>
            {template.fields.map((f) => {
              const placeholder =
                f.source_key === "static" ? f.static_value || `（固定: ${f.label}）`
                : f.source_key === "input"  ? `《${f.input_label || f.label}》`
                : SAMPLE[f.source_key] ?? f.source_key;
              return (
                <TextField
                  key={f.id}
                  size="small"
                  label={f.label}
                  placeholder={placeholder}
                  value={overrides[f.id] ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setOverrides((prev) => {
                      const next = { ...prev };
                      if (val === "") delete next[f.id];
                      else next[f.id] = val;
                      return next;
                    });
                  }}
                  sx={{ width: 200 }}
                  InputProps={{
                    sx: { fontSize: 13 },
                    endAdornment: overrides[f.id] !== undefined
                      ? <Tooltip title="元に戻す">
                          <IconButton size="small" onClick={() => setOverrides((p) => { const n = {...p}; delete n[f.id]; return n; })}>
                            <RestartAltIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                      : null,
                  }}
                />
              );
            })}
          </Box>
        </Paper>
        <Divider className="no-print" />
      </Collapse>

      {/* ── 用紙プレビュー ──────────────────────────────── */}
      <Box
        className="print-page"
        sx={{
          position: "relative",
          width: `${template.paper_width}mm`,
          height: `${template.paper_height}mm`,
          overflow: "hidden",
          bgcolor: "transparent",
          "@media screen": {
            border: "1px solid #ccc",
            m: 2,
            bgcolor: "#fff",
            boxShadow: 2,
          },
        }}
      >
        {/* 薄いグリッド (10mm) */}
        {Array.from({ length: Math.ceil(template.paper_width / 10) + 1 }, (_, i) => i * 10).map((x) => (
          <Box key={`v${x}`} sx={{ position: "absolute", left: `${x}mm`, top: 0, width: "0.15mm", height: `${template.paper_height}mm`, bgcolor: "#e8e8e8" }} />
        ))}
        {Array.from({ length: Math.ceil(template.paper_height / 10) + 1 }, (_, i) => i * 10).map((y) => (
          <Box key={`h${y}`} sx={{ position: "absolute", top: `${y}mm`, left: 0, height: "0.15mm", width: `${template.paper_width}mm`, bgcolor: "#e8e8e8" }} />
        ))}

        {/* フィールド */}
        {template.fields.map((f) => {
          const text = resolveText(f, overrides);
          const isOverridden = overrides[f.id] !== undefined;
          return (
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
                "@media screen": {
                  color: isOverridden ? "#2e7d32" : fieldColor(f.source_key),
                },
                "@media print": { color: "#000" },
              }}
            >
              {text}
            </Box>
          );
        })}
      </Box>

      {/* 凡例 */}
      <Box px={2} pb={2} display="flex" gap={2} flexWrap="wrap" className="no-print">
        {[
          { color: "#b71c1c", label: "DB取得項目（サンプル）" },
          { color: "#1565c0", label: "手入力項目" },
          { color: "#333",    label: "固定テキスト" },
          { color: "#2e7d32", label: "上書き入力中" },
        ].map(({ color, label }) => (
          <Box key={label} display="flex" alignItems="center" gap={0.5}>
            <Box sx={{ width: 12, height: 12, bgcolor: color, borderRadius: 0.5 }} />
            <Typography variant="caption">{label}</Typography>
          </Box>
        ))}
      </Box>

      <style>{`
        @page { size: ${template.paper_width}mm ${template.paper_height}mm; margin: 0; }
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden; }
          .print-page, .print-page * { visibility: visible; }
          .print-page { position: fixed !important; top: 0 !important; left: 0 !important; border: none !important; background: transparent !important; }
        }
      `}</style>
    </>
  );
}

export default function DocumentPreviewPage() {
  return (
    <Suspense fallback={<Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>}>
      <PreviewContent />
    </Suspense>
  );
}
