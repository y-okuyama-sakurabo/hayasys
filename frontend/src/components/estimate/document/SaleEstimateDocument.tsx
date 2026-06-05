"use client";

import React, { useEffect, useState } from "react";
import { Box, Typography, Grid } from "@mui/material";
import apiClient from "@/lib/apiClient";

// ─── ページあたりの行数（多ページ時） ────────────────────────────
const ITEMS_PER_FIRST_PAGE = 6;   // 1ページ目（ヘッダーあり）
const ITEMS_PER_PAGE       = 13;  // 続ページ
const FEE_MIN_ROWS         = 4;   // 費用テーブルの最小行数
const FEE_ROWS_PER_PAGE    = 10;  // 費用テーブルの最大行数/ページ

// 1ページにまとめられる最大明細行数（ヘッダーの高さによる）
const SINGLE_PAGE_MAX_SALE        = 6; // 販売モード（ヘッダー大）
const SINGLE_PAGE_MAX_MAINTENANCE = 8; // 整備・その他（ヘッダー小）

// ─── ユーティリティ ───────────────────────────────────────────
const fmt = (v: any) =>
  v == null || v === "" || isNaN(Number(v))
    ? ""
    : `¥${Number(v).toLocaleString()}`;

/** 電話番号をハイフン付きで表示（DBにハイフンなしで保存されていても対応） */
function fmtPhone(v: string | null | undefined): string {
  if (!v) return "";
  if (v.includes("-")) return v; // すでにハイフンあり
  const d = v.replace(/\D/g, "");
  if (d.length === 11) return `${d.slice(0,3)}-${d.slice(3,7)}-${d.slice(7)}`; // 携帯
  if (d.length === 10) {
    // 2桁市外局番（03 東京・06 大阪など）
    if (/^(03|04|06)/.test(d)) return `${d.slice(0,2)}-${d.slice(2,6)}-${d.slice(6)}`;
    return `${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6)}`; // 3桁市外局番
  }
  return v;
}

const fmtOrDash = (v: any) =>
  v == null || v === "" || isNaN(Number(v))
    ? "—"
    : `¥${Number(v).toLocaleString()}`;

/** 保存済み subtotal（税抜）を使って税込合計を算出。nullならrawフィールドで再計算 */
function calcLine(item: any) {
  const stored = Number(item.subtotal ?? 0);
  let subtotal: number;

  if (stored > 0) {
    subtotal = stored;
  } else {
    const qty   = Number(item.quantity   ?? 0);
    const unit  = Number(item.unit_price ?? 0);
    const labor = Number(item.labor_cost ?? 0);
    const disc  = Number(item.discount   ?? 0);
    subtotal = Math.max(0, qty * unit + labor - disc);
  }

  const tax = item.tax_type === "taxable" ? Math.round(subtotal * 0.1) : 0;
  return { subtotal, tax, total: subtotal + tax };
}

function chunkArray<T>(arr: T[], firstSize: number, restSize: number): T[][] {
  if (arr.length === 0) return [[]];
  const chunks: T[][] = [arr.slice(0, firstSize)];
  for (let i = firstSize; i < arr.length; i += restSize) {
    chunks.push(arr.slice(i, i + restSize));
  }
  return chunks;
}

// ─── 共通ページBoxスタイル ────────────────────────────────────
const PAGE_SX = {
  width: "210mm",
  minHeight: "297mm",
  boxSizing: "border-box" as const,
  bgcolor: "#fff",
  fontSize: "9pt",
  fontFamily: "var(--font-noto-sans-jp), 'Noto Sans JP', sans-serif",
  p: "10mm 12mm",
  display: "flex",
  flexDirection: "column" as const,
  mx: "auto",
  mb: 2,
  "@media print": {
    mb: 0,
    height: "297mm",
    overflow: "hidden",
  },
};

// ─── メインコンポーネント ─────────────────────────────────────
export function SaleEstimateDocument({ estimate }: { estimate: any }) {
  const [registrationNumber, setRegistrationNumber] = useState("");
  useEffect(() => {
    apiClient.get("/company-settings/")
      .then(r => setRegistrationNumber(r.data?.registration_number ?? ""))
      .catch(() => {});
  }, []);

  // アイテム分類
  const normalItems = (estimate.items || []).filter(
    (item: any) => item.item_type !== "fee"
  );
  const taxableFeeItems = (estimate.items || []).filter(
    (item: any) => item.item_type === "fee" && item.tax_type !== "non_taxable"
  );
  const nonTaxFeeItems = (estimate.items || []).filter(
    (item: any) => item.item_type === "fee" && item.tax_type === "non_taxable"
  );

  // 合計
  const summary = (estimate.items || []).reduce(
    (acc: any, item: any) => {
      const line = calcLine(item);
      if      (item.item_type === "vehicle")   acc.vehicle   += line.total;
      else if (item.item_type === "accessory") acc.parts     += line.total;
      else if (item.item_type === "fee") {
        if (item.tax_type === "non_taxable")   acc.nonTaxFee += line.total;
        else                                   acc.taxFee    += line.total;
      }
      if (item.tax_type !== "non_taxable")     acc.tax       += line.tax;
      acc.total += line.total;
      return acc;
    },
    { vehicle: 0, parts: 0, taxFee: 0, nonTaxFee: 0, tax: 0, total: 0 }
  );

  const normalTableTotal = summary.vehicle + summary.parts;

  // 決済
  const SETTLEMENT_TYPES = [
    { key: "trade_in", label: "下取車" },
    { key: "cash",     label: "現金" },
    { key: "card",     label: "カード" },
    { key: "loan",     label: "ローン" },
    { key: "qr",       label: "QR決済" },
    { key: "coupon",   label: "商品券・クーポン" },
    { key: "transfer", label: "振込" },
  ];
  const settlementMap = (estimate.settlements || []).reduce(
    (acc: any, s: any) => { acc[s.settlement_type] = Number(s.amount); return acc; },
    {}
  );

  // 費用テーブル行データ（単一ページ・多ページ共通）
  const feeRowCount = Math.max(
    taxableFeeItems.length,
    nonTaxFeeItems.length,
    FEE_MIN_ROWS
  );
  const tRowsAll  = Array.from({ length: feeRowCount }, (_, i) => taxableFeeItems[i]  || null);
  const ntRowsAll = Array.from({ length: feeRowCount }, (_, i) => nonTaxFeeItems[i] || null);

  // ─── 1ページにまとめるか判定 ───────────────────────────
  const isLargeHeader = estimate.vehicle_mode === "sale";
  const maxItemsForSingle = isLargeHeader
    ? SINGLE_PAGE_MAX_SALE
    : SINGLE_PAGE_MAX_MAINTENANCE;
  const feeFitsInline =
    taxableFeeItems.length <= FEE_MIN_ROWS &&
    nonTaxFeeItems.length <= FEE_MIN_ROWS;
  const useSinglePage =
    normalItems.length <= maxItemsForSingle && feeFitsInline;

  // ─── 共通JSX部品 ────────────────────────────────────────

  /** 1ページ目ヘッダー */
  const headerJSX = (
    <Grid container spacing={1} sx={{ mb: 0.8, flexShrink: 0 }}>
      {/* 左列 */}
      <Grid size={{ xs: 6 }}>
        {/* 顧客情報 */}
        <Box sx={{ mb: 0.8, pl: 1 }}>
          <Typography sx={{ fontSize: "10pt", color: "#555" }}>
            〒{estimate.party?.postal_code}　{estimate.party?.address}
          </Typography>
          {estimate.party?.kana && (
            <Typography sx={{ fontSize: "7.5pt", color: "#888" }}>
              {estimate.party.kana}
            </Typography>
          )}
          <Typography sx={{ fontSize: "16pt", fontWeight: "bold", lineHeight: 1.2, mt: 0.3 }}>
            {estimate.party?.name} 様
          </Typography>
          <Typography sx={{ fontSize: "10pt", mt: 0.2 }}>
            TEL：{fmtPhone(estimate.party?.phone || estimate.party?.mobile_phone)}
          </Typography>
        </Box>

        {/* お買い上げ内容 */}
        <Box sx={{ display: "flex", alignItems: "stretch", mb: 1 }}>
          <VerticalLabel>お買い上げ内容</VerticalLabel>
          <Box sx={{ flex: 1, border: "1px solid #000" }}>
            <SummaryRow label="ご商談車両"   value={fmtOrDash(summary.vehicle)} />
            <SummaryRow label="用品＆パーツ" value={fmtOrDash(summary.parts)} />
            <SummaryRow label="課税費用"     value={fmtOrDash(summary.taxFee)} />
            <SummaryRow label="消費税"       value={fmtOrDash(summary.tax)} />
            <SummaryRow label="非課税費用"   value={fmtOrDash(summary.nonTaxFee)} />
            <SummaryRow label="お支払合計額" value={fmtOrDash(summary.total)} bold />
          </Box>
        </Box>

        {/* ご決済内訳 */}
        <Box sx={{ display: "flex", alignItems: "stretch" }}>
          <VerticalLabel>ご決済内訳</VerticalLabel>
          <Box sx={{ flex: 1, border: "1px solid #000" }}>
            {SETTLEMENT_TYPES.map((t, i) => (
              <SummaryRow
                key={t.key}
                label={t.label}
                value={fmtOrDash(settlementMap[t.key] || 0)}
                noBorder={i === SETTLEMENT_TYPES.length - 1}
              />
            ))}
          </Box>
        </Box>
      </Grid>

      {/* 右列 */}
      <Grid size={{ xs: 6 }}>
        {/* タイトル + 伝票情報 */}
        <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 2, mb: 2.1 }}>
          <Box sx={{ textAlign: "right", fontSize: "8pt", color: "#444", lineHeight: 1.4 }}>
            <div>伝票No.　{estimate.estimate_no}</div>
            <div>見積日　{estimate.estimate_date || estimate.created_at?.slice(0, 10)}</div>
            <div>有効期限　{estimate.valid_until || ""}</div>
          </Box>
          <Typography sx={{ fontSize: "18pt", fontWeight: "bold", letterSpacing: "5px", lineHeight: 1.2 }}>
            お見積書
          </Typography>
        </Box>

        {/* 車両情報 */}
        {estimate.vehicle_mode === "sale" && (
          <>
            <VerticalSection label="商談車両">
              <VehicleSection vehicle={estimate.vehicles?.find((v: any) => !v.is_trade_in)} />
            </VerticalSection>
            <VerticalSection label="下取車両">
              <VehicleSection vehicle={estimate.vehicles?.find((v: any) => v.is_trade_in)} />
            </VerticalSection>
            <VerticalSection label="ローン">
              <CreditSection estimate={estimate} />
            </VerticalSection>
          </>
        )}
        {estimate.vehicle_mode === "maintenance" && (
          <VerticalSection label="対象車両">
            <VehicleSection vehicle={estimate.vehicles?.[0]} />
          </VerticalSection>
        )}
      </Grid>
    </Grid>
  );

  /** 通常明細テーブル */
  const renderNormalTable = (items: any[], emptyRows: number) => (
    <Box>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8.5pt", border: "1px solid #000" }}>
        <thead>
          <tr>
            <Th align="left"   width="36%">商品名</Th>
            <Th align="right"  width="6%">数量</Th>
            <Th align="center" width="4%">単位</Th>
            <Th align="right"  width="10%">単価</Th>
            <Th align="right"  width="11%">工賃</Th>
            <Th align="right"  width="11%">値引</Th>
            <Th align="right"  width="14%">金額（税込）</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: any, i: number) => {
            const line = calcLine(item);
            return (
              <tr key={i}>
                <Td align="left">{item.name}</Td>
                <Td align="right">{Math.round(Number(item.quantity ?? 0))}</Td>
                <Td align="center">{item.unit_detail?.name || ""}</Td>
                <Td align="right">{fmt(item.unit_price)}</Td>
                <Td align="right">{item.labor_cost ? fmt(item.labor_cost) : ""}</Td>
                <Td align="right">{item.discount ? `-${fmt(item.discount)}` : ""}</Td>
                <Td align="right">{fmt(line.total)}</Td>
              </tr>
            );
          })}
          {Array.from({ length: emptyRows }).map((_, i) => (
            <tr key={`empty-${i}`}>
              {[0,1,2,3,4,5,6].map(j => <Td key={j}>&nbsp;</Td>)}
            </tr>
          ))}
          {/* 合計行 */}
          <tr>
            <td colSpan={5}
              style={{ borderTop: "1px solid #000", borderBottom: "1px solid #000", padding: "3px 6px", background: "#f5f5f5" }}
            />
            <td style={{ borderTop: "1px solid #000", borderBottom: "1px solid #000", padding: "3px 6px", textAlign: "right",
              fontWeight: "bold", background: "#f5f5f5", fontSize: "8.5pt" }}>
              小計
            </td>
            <td style={{ borderTop: "1px solid #000", borderBottom: "1px solid #000", padding: "3px 6px", textAlign: "right",
              fontWeight: "bold", background: "#f5f5f5", fontSize: "8.5pt" }}>
              {fmt(normalTableTotal)}
            </td>
          </tr>
        </tbody>
      </table>
    </Box>
  );

  /** 費用・スケジュール・保険・フッター（ページ末尾共通） */
  const renderFeeSection = (tRows: (any | null)[], ntRows: (any | null)[]) => (
    <>
      <Grid container spacing={1.5}>
        <Grid size={{ xs: 6 }}>
          <FeeTable title="課税費用" rows={tRows} />
        </Grid>
        <Grid size={{ xs: 6 }}>
          <FeeTable title="非課税費用" rows={ntRows} />
        </Grid>
      </Grid>
      <Grid container spacing={1.5}>
        <Grid size={{ xs: 6 }}>
          <ScheduleSection estimate={estimate} />
        </Grid>
        <Grid size={{ xs: 6 }}>
          <InsuranceSection estimate={estimate} />
        </Grid>
      </Grid>
      <Box sx={{ flex: 1 }} />
      <Footer estimate={estimate} registrationNumber={registrationNumber} />
    </>
  );

  // ══════════════════════════════════════════════════════════
  //  1ページレイアウト（明細が少ない場合）
  // ══════════════════════════════════════════════════════════
  if (useSinglePage) {
    return (
      <Box sx={{ ...PAGE_SX, gap: "2mm", pageBreakAfter: "auto" }}>
        {headerJSX}
        {renderNormalTable(normalItems, Math.max(0, SINGLE_PAGE_MAX_SALE - normalItems.length))}
        {renderFeeSection(tRowsAll, ntRowsAll)}
      </Box>
    );
  }

  // ══════════════════════════════════════════════════════════
  //  多ページレイアウト
  // ══════════════════════════════════════════════════════════
  const itemChunks = chunkArray(normalItems, ITEMS_PER_FIRST_PAGE, ITEMS_PER_PAGE);

  const feePageCount = Math.ceil(feeRowCount / FEE_ROWS_PER_PAGE);
  const feeChunks = Array.from({ length: feePageCount }, (_, i) => {
    const tSlice  = taxableFeeItems.slice(i * FEE_ROWS_PER_PAGE, (i + 1) * FEE_ROWS_PER_PAGE);
    const ntSlice = nonTaxFeeItems.slice( i * FEE_ROWS_PER_PAGE, (i + 1) * FEE_ROWS_PER_PAGE);
    const rows    = Math.max(tSlice.length, ntSlice.length, FEE_MIN_ROWS);
    return { tSlice, ntSlice, rows };
  });

  return (
    <>
      {/* ── 通常明細ページ ── */}
      {itemChunks.map((items, pageIdx) => {
        const isFirst   = pageIdx === 0;
        const minRows   = isFirst ? ITEMS_PER_FIRST_PAGE : ITEMS_PER_PAGE;
        const emptyRows = Math.max(0, minRows - items.length);

        return (
          <Box
            key={`item-${pageIdx}`}
            sx={{
              ...PAGE_SX,
              pageBreakAfter: "always",
              pageBreakInside: "avoid",
            }}
          >
            {/* 1ページ目ヘッダー */}
            {isFirst && headerJSX}

            {/* 続きページのミニヘッダー */}
            {!isFirst && (
              <Box sx={{
                display: "flex", justifyContent: "space-between",
                borderBottom: "1px solid #ccc", pb: 0.5, mb: 1,
                fontSize: "8pt", color: "#666", flexShrink: 0,
              }}>
                <span>{estimate.party?.name} 様　　{estimate.estimate_no}</span>
                <span>通常明細　{pageIdx + 1} ページ</span>
              </Box>
            )}

            {/* 通常明細テーブル */}
            {renderNormalTable(items, emptyRows)}
          </Box>
        );
      })}

      {/* ── 費用・フッターページ ── */}
      {feeChunks.map((feeChunk, feeIdx) => {
        const isLastFee = feeIdx === feeChunks.length - 1;
        const tRows  = Array.from({ length: feeChunk.rows }, (_, i) => feeChunk.tSlice[i]  || null);
        const ntRows = Array.from({ length: feeChunk.rows }, (_, i) => feeChunk.ntSlice[i] || null);

        return (
          <Box
            key={`fee-${feeIdx}`}
            sx={{
              ...PAGE_SX,
              gap: "6mm",
              pageBreakAfter: isLastFee ? "auto" : "always",
              pageBreakInside: "avoid",
            }}
          >
            {/* ミニヘッダー */}
            <Box sx={{
              display: "flex", justifyContent: "space-between",
              borderBottom: "1px solid #ccc", pb: 0.5,
              fontSize: "8pt", color: "#666",
            }}>
              <span>{estimate.party?.name} 様　　{estimate.estimate_no}</span>
              {feeChunks.length > 1 && <span>費用明細　{feeIdx + 1} ページ</span>}
            </Box>

            {/* 課税費用 ／ 非課税費用（横並び） */}
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 6 }}>
                <FeeTable title="課税費用" rows={tRows} />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <FeeTable title="非課税費用" rows={ntRows} />
              </Grid>
            </Grid>

            {/* 最終ページのみ：納車予定・任意保険・フッター */}
            {isLastFee && (
              <>
                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 6 }}>
                    <ScheduleSection estimate={estimate} />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <InsuranceSection estimate={estimate} />
                  </Grid>
                </Grid>
                <Box sx={{ flex: 1 }} />
                <Footer estimate={estimate} registrationNumber={registrationNumber} />
              </>
            )}
          </Box>
        );
      })}
    </>
  );
}

// ─── 費用テーブル ─────────────────────────────────────────────
function FeeTable({ title, rows }: { title: string; rows: (any | null)[] }) {
  return (
    <Box sx={{ border: "1px solid #000" }}>
      <Box sx={{
        display: "grid", gridTemplateColumns: "1fr 100px",
        borderBottom: "1px solid #000", fontWeight: "bold",
        background: "#f5f5f5", fontSize: "8.5pt",
      }}>
        <Box sx={{ px: 1, py: "3px", borderRight: "1px solid #000" }}>{title}</Box>
        <Box sx={{ px: 1, py: "3px", textAlign: "right" }}>金額（税込）</Box>
      </Box>
      {rows.map((item, i) => {
        const line = item ? calcLine(item) : null;
        return (
          <Box
            key={i}
            sx={{
              display: "grid", gridTemplateColumns: "1fr 100px",
              minHeight: "22px",
              borderBottom: "none",
              fontSize: "8.5pt",
            }}
          >
            <Box sx={{ px: 1, py: "2px", borderRight: "1px solid #000", wordBreak: "break-all" }}>
              {item?.name || ""}
            </Box>
            <Box sx={{ px: 1, py: "2px", textAlign: "right" }}>
              {line ? fmt(line.total) : ""}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

// ─── 納車予定 ────────────────────────────────────────────────
function ScheduleSection({ estimate }: any) {
  const rows = [
    { label: "日付", value: estimate.schedule?.start_at?.slice(0, 10) || "" },
    { label: "方法", value: estimate.schedule?.delivery_method || "" },
    { label: "店舗", value: estimate.schedule?.delivery_shop_name || "" },
    { label: "備考", value: estimate.schedule?.description || "" },
  ];
  return (
    <Box sx={{ display: "flex", alignItems: "stretch" }}>
      <VerticalLabel withRight>納車予定</VerticalLabel>
      <Box sx={{ flex: 1, border: "1px solid #000", borderLeft: "none" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8.5pt" }}>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td style={{ width: 50, padding: "3px 6px", fontWeight: "bold",
                  borderBottom: i < rows.length - 1 ? "1px solid #ddd" : "none" }}>
                  {row.label}
                </td>
                <td style={{ padding: "3px 6px",
                  borderBottom: i < rows.length - 1 ? "1px solid #ddd" : "none" }}>
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
    </Box>
  );
}

// ─── 任意保険 ────────────────────────────────────────────────
function InsuranceSection({ estimate }: any) {
  const ins = estimate.insurance;
  const rows = [
    { label: "会社名",   value: ins?.company_name || "" },
    { label: "対人",     value: ins?.bodily_injury || "" },
    { label: "対物",     value: ins?.property_damage || "" },
    { label: "搭乗者",   value: ins?.passenger || "" },
    { label: "車両",     value: ins?.vehicle || "" },
    { label: "ｵﾌﾟｼｮﾝ",  value: ins?.option || "" },
  ];
  return (
    <Box sx={{ display: "flex", alignItems: "stretch" }}>
      <VerticalLabel withRight>任意保険</VerticalLabel>
      <Box sx={{ flex: 1, border: "1px solid #000", borderLeft: "none" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8.5pt" }}>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td style={{ width: 52, padding: "3px 6px", fontWeight: "bold",
                  borderBottom: i < rows.length - 1 ? "1px solid #ddd" : "none" }}>
                  {row.label}
                </td>
                <td style={{ padding: "3px 6px",
                  borderBottom: i < rows.length - 1 ? "1px solid #ddd" : "none" }}>
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
    </Box>
  );
}

// ─── フッター ────────────────────────────────────────────────
function Footer({ estimate, registrationNumber }: any) {
  return (
    <Box>
      <Box sx={{ border: "1px solid #000", display: "flex", minHeight: "90px", mt: 1 }}>
        <Box sx={{ width: "50%", borderRight: "1px solid #000", p: 1.5, whiteSpace: "pre-wrap", fontSize: "8.5pt" }}>
          <Box sx={{ fontWeight: "bold", mb: 0.5 }}>メモ</Box>
          <Box>{estimate.memo || ""}</Box>
        </Box>
        <Box sx={{ width: "50%", p: 1.5, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <Box sx={{ fontSize: "8.5pt", lineHeight: 1.5, color: "#444" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{estimate.shop?.postal_code ? `〒${estimate.shop.postal_code}` : ""}</span>
              {registrationNumber && <span>登録番号：{registrationNumber}</span>}
            </div>
            <div>{estimate.shop?.location || ""}</div>
            <div>営業：{estimate.shop?.opening_hours || ""}</div>
          </Box>
          <Box
            component="img"
            src="/logo_doc.png"
            alt="早坂サイクル商会"
            sx={{ display: "block" }}
          />
          <Box sx={{ fontSize: "8.5pt", color: "#444", lineHeight: 1.5 }}>
            <div>TEL {estimate.shop?.phone || ""}　Fax {estimate.shop?.fax || ""}</div>
            <div>担当：{estimate.created_by?.display_name || ""}　{estimate.shop?.name || ""}</div>
          </Box>
        </Box>
      </Box>
      <Box sx={{ mt: 0.5, fontSize: "6.5pt", color: "#666", lineHeight: 1.6 }}>
        ご記入いただいているデーターは、車輛購入やご購入後のアフターおよび当店からの各種案内等に使用させていただくものであり、お客様の許可なく、第三者に譲渡、提供することはありません。
      </Box>
    </Box>
  );
}

// ─── 小さな共通コンポーネント ─────────────────────────────────
function VerticalLabel({ children, withRight = false }: { children: React.ReactNode; withRight?: boolean }) {
  return (
    <Box sx={{
      writingMode: "vertical-rl", textOrientation: "upright",
      border: "1px solid #000", borderRight: withRight ? "1px solid #000" : "none",
      px: "3px", py: 0.5, fontSize: "8.5pt", fontWeight: "bold",
      display: "flex", alignItems: "center", justifyContent: "center",
      minWidth: "20px",
    }}>
      {children}
    </Box>
  );
}

function SummaryRow({ label, value, noBorder = false, bold = false }: {
  label: string; value: any; noBorder?: boolean; bold?: boolean;
}) {
  return (
    <Box sx={{
      display: "grid", gridTemplateColumns: "1fr 110px",
      borderBottom: noBorder ? "none" : "1px solid #ddd",
      fontSize: "8.5pt",
      fontWeight: bold ? "bold" : "normal",
      background: bold ? "#f0f0f0" : "transparent",
    }}>
      <Box sx={{ px: 1, py: "2px" }}>{label}</Box>
      <Box sx={{ px: 1, py: "2px", textAlign: "right", borderLeft: "1px solid #000" }}>{value}</Box>
    </Box>
  );
}

function Th({ children, align = "center", width }: {
  children?: React.ReactNode; align?: string; width?: string;
}) {
  return (
    <th style={{
      borderTop: "1px solid #000", borderBottom: "1px solid #000",
      padding: "3px 4px", background: "#f0f0f0",
      textAlign: align as any, whiteSpace: "nowrap", width,
    }}>
      {children}
    </th>
  );
}

function Td({ children, align = "left" }: {
  children?: React.ReactNode; align?: string;
}) {
  return (
    <td style={{ padding: "3px 4px", textAlign: align as any }}>
      {children}
    </td>
  );
}

function VerticalSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ display: "flex", alignItems: "stretch", mb: 0.5 }}>
      <Box sx={{
        writingMode: "vertical-rl", textOrientation: "upright",
        border: "1px solid #000", px: "3px", py: 0.5,
        fontSize: "8.5pt", fontWeight: "bold",
        display: "flex", alignItems: "center", justifyContent: "center",
        minWidth: "20px",
      }}>
        {label}
      </Box>
      <Box sx={{ flex: 1 }}>{children}</Box>
    </Box>
  );
}

function VehicleSection({ vehicle }: any) {
  const saleLabel: Record<string, string> = {
    new: "新車", used: "中古車", rental_up: "レンタルアップ", consignment: "委託販売",
  };
  const reg = vehicle?.registrations?.[0];
  const fields = [
    { label: "車両名",   value: vehicle?.vehicle_name },
    { label: "メーカー", value: vehicle?.manufacturer_detail?.name },
    { label: "排気量",   value: vehicle?.displacement ? `${vehicle.displacement}cc` : "" },
    { label: "区分",     value: saleLabel[vehicle?.sale_type || ""] || "" },
    { label: "登録地",   value: reg?.registration_area ?? "" },
    { label: "色",       value: vehicle?.color_name },
    { label: "登録番号", value: reg?.registration_no ?? "" },
    { label: "色記号",   value: vehicle?.color_code },
    { label: "型認定",   value: reg?.certification_no ?? "" },
    { label: "型式",     value: vehicle?.model_code },
    { label: "車検満了", value: reg?.inspection_expiration ?? "" },
    { label: "車台番号", value: vehicle?.chassis_no },
  ];
  const rows: { left: any; right: any }[] = [];
  for (let i = 0; i < fields.length; i += 2) {
    rows.push({ left: fields[i], right: fields[i + 1] || { label: "", value: "" } });
  }
  return (
    <table style={{
      width: "100%", borderCollapse: "collapse", fontSize: "8pt",
      borderTop: "1px solid #000", borderRight: "1px solid #000", borderBottom: "1px solid #000",
    }}>
      <tbody>
        {rows.map((row, i) => {
          const isLast = i === rows.length - 1;
          return (
            <tr key={i}>
              <td style={{ ...cellL, borderBottom: isLast ? "none" : "1px solid #ddd" }}>
                <VCell label={row.left.label}  value={row.left.value} />
              </td>
              <td style={{ ...cellR, borderBottom: isLast ? "none" : "1px solid #ddd" }}>
                <VCell label={row.right.label} value={row.right.value} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

const cellL: React.CSSProperties = {
  borderBottom: "1px solid #ddd", borderRight: "1px solid #000",
  padding: "2px 6px", width: "50%",
};
const cellR: React.CSSProperties = {
  borderBottom: "1px solid #ddd", padding: "2px 6px", width: "50%",
};

function VCell({ label, value }: { label: string; value: any }) {
  return (
    <>
      <span style={{ fontWeight: 600 }}>{label}：</span>
      <span style={{ marginLeft: 4 }}>{value || ""}</span>
    </>
  );
}

function CreditSection({ estimate }: any) {
  const p = estimate?.payments?.[0];
  const rows = [
    [{ label: "会社名",   value: p?.credit_company       }, { label: "回数",      value: p?.credit_installments   }],
    [{ label: "初回支払", value: p?.credit_first_payment }, { label: "2回目以降", value: p?.credit_second_payment  }],
    [{ label: "ボーナス", value: p?.credit_bonus_payment }, { label: "支払開始",  value: p?.credit_start_month    }],
  ];
  return (
    <table style={{
      width: "100%", fontSize: "8pt", borderCollapse: "collapse",
      borderTop: "1px solid #000", borderRight: "1px solid #000", borderBottom: "1px solid #000",
    }}>
      <tbody>
        {rows.map((cols, i) => {
          const isLast = i === rows.length - 1;
          return (
            <tr key={i}>
              <td style={{ ...cellL, borderBottom: isLast ? "none" : "1px solid #ddd" }}>
                <VCell label={cols[0].label} value={cols[0].value || ""} />
              </td>
              <td style={{ ...cellR, borderBottom: isLast ? "none" : "1px solid #ddd" }}>
                <VCell label={cols[1].label} value={cols[1].value || ""} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
