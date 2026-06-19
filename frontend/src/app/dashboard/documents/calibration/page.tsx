"use client";

import { useSearchParams } from "next/navigation";
import { Box, Button, Typography, Alert } from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";

/**
 * キャリブレーション印刷ページ
 * 用紙上のグリッドを印刷して座標のズレを確認するためのページ。
 * 規定用紙をプリンターにセットしてこのページを印刷し、
 * グリッドの位置と用紙のマス目を比較して座標を調整する。
 */
export default function CalibrationPage() {
  useSearchParams(); // template_id は将来的に使用

  const W = 210; // A4 幅 mm
  const H = 297; // A4 高さ mm
  const STEP = 10; // 10mm ごとにグリッド

  const vLines: number[] = [];
  const hLines: number[] = [];
  for (let x = 0; x <= W; x += STEP) vLines.push(x);
  for (let y = 0; y <= H; y += STEP) hLines.push(y);

  return (
    <>
      <Box p={3} className="no-print">
        <Typography variant="h6" fontWeight="bold" mb={1}>
          キャリブレーション印刷
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>手順：</strong>
          プリンターに<strong>規定の用紙</strong>をセットしてから「印刷する」を押してください。<br />
          印刷されたグリッド（10mmごとの目盛り）と用紙のマス目を重ねて確認し、
          フィールド編集画面でX・Y座標を調整してください。
        </Alert>
        <Button
          variant="contained" startIcon={<PrintIcon />}
          onClick={() => window.print()}
        >
          印刷する
        </Button>
      </Box>

      {/* 印刷用グリッド */}
      <Box
        className="print-page"
        sx={{
          position: "relative",
          width: `${W}mm`,
          height: `${H}mm`,
          overflow: "hidden",
          "@media screen": {
            border: "1px solid #999",
            mt: 3, mx: 3,
            bgcolor: "#fff",
          },
        }}
      >
        {/* 縦線 */}
        {vLines.map((x) => (
          <Box
            key={`v${x}`}
            sx={{
              position: "absolute",
              left: `${x}mm`,
              top: 0,
              width: x % 50 === 0 ? "0.4mm" : "0.2mm",
              height: `${H}mm`,
              bgcolor: x % 50 === 0 ? "#999" : "#ddd",
            }}
          />
        ))}

        {/* 横線 */}
        {hLines.map((y) => (
          <Box
            key={`h${y}`}
            sx={{
              position: "absolute",
              top: `${y}mm`,
              left: 0,
              height: y % 50 === 0 ? "0.4mm" : "0.2mm",
              width: `${W}mm`,
              bgcolor: y % 50 === 0 ? "#999" : "#ddd",
            }}
          />
        ))}

        {/* 座標ラベル（10mmごと） */}
        {vLines.filter((x) => x % 10 === 0 && x > 0).map((x) => (
          <Box
            key={`lv${x}`}
            sx={{
              position: "absolute",
              left: `${x}mm`,
              top: "1mm",
              fontSize: "5pt",
              fontFamily: "monospace",
              color: "#666",
              transform: "translateX(-50%)",
              whiteSpace: "nowrap",
            }}
          >
            {x}
          </Box>
        ))}
        {hLines.filter((y) => y % 10 === 0 && y > 0).map((y) => (
          <Box
            key={`lh${y}`}
            sx={{
              position: "absolute",
              top: `${y}mm`,
              left: "1mm",
              fontSize: "5pt",
              fontFamily: "monospace",
              color: "#666",
              transform: "translateY(-50%)",
            }}
          >
            {y}
          </Box>
        ))}

        {/* 原点マーク */}
        <Box
          sx={{
            position: "absolute",
            top: "2mm",
            left: "2mm",
            fontSize: "6pt",
            fontFamily: "monospace",
            fontWeight: "bold",
            color: "#333",
          }}
        >
          (0,0)
        </Box>
      </Box>

      <style>{`
        @page {
          size: 210mm 297mm;
          margin: 0;
        }
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden; }
          .print-page, .print-page * { visibility: visible; }
          .print-page {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            border: none !important;
          }
        }
      `}</style>
    </>
  );
}
