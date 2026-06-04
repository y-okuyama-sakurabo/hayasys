"use client";

import React from "react";
import { Box, Typography, Grid } from "@mui/material";

// ─── ページあたりの行数 ───────────────────────────────────────
const ITEMS_PER_FIRST_PAGE        = 6;
const ITEMS_PER_PAGE              = 13;
const FEE_MIN_ROWS                = 4;
const SINGLE_PAGE_MAX_SALE        = 6;
const SINGLE_PAGE_MAX_MAINTENANCE = 8;

// ─── ユーティリティ ───────────────────────────────────────────
const fmt = (v: any) =>
  v == null || v === "" || isNaN(Number(v))
    ? ""
    : `¥${Number(v).toLocaleString()}`;

const fmtOrDash = (v: any) =>
  v == null || v === "" || isNaN(Number(v))
    ? "—"
    : `¥${Number(v).toLocaleString()}`;

function fmtPhone(v: string | null | undefined): string {
  if (!v) return "";
  if (v.includes("-")) return v;
  const d = v.replace(/\D/g, "");
  if (d.length === 11) return `${d.slice(0,3)}-${d.slice(3,7)}-${d.slice(7)}`;
  if (d.length === 10) {
    if (/^(03|04|06)/.test(d)) return `${d.slice(0,2)}-${d.slice(2,6)}-${d.slice(6)}`;
    return `${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6)}`;
  }
  return v;
}

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
export function SaleOrderDocument({ order }: { order: any }) {
  // アイテム分類
  const normalItems = (order.items || []).filter(
    (item: any) => item.item_type !== "fee"
  );
  const taxableFeeItems = (order.items || []).filter(
    (item: any) => item.item_type === "fee" && item.tax_type !== "non_taxable"
  );
  const nonTaxFeeItems = (order.items || []).filter(
    (item: any) => item.item_type === "fee" && item.tax_type === "non_taxable"
  );

  // 合計
  const summary = (order.items || []).reduce(
    (acc: any, item: any) => {
      const line = calcLine(item);
      const taxType = item.tax_type ?? "taxable";
      if      (item.item_type === "vehicle")   acc.vehicle      += line.total;
      else if (item.item_type === "accessory") acc.parts        += line.total;
      else if (item.item_type === "fee") {
        if (taxType === "non_taxable")         acc.nonTaxFee    += line.total;
        else                                   acc.taxableFee   += line.total;
      }
      if (taxType !== "non_taxable")           acc.tax          += line.tax;
      acc.total += line.total;
      return acc;
    },
    { vehicle: 0, parts: 0, taxableFee: 0, nonTaxFee: 0, tax: 0, total: 0 }
  );

  const normalItemsTotal = summary.vehicle + summary.parts;

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
  const settlementMap = (order.settlements || []).reduce(
    (acc: any, s: any) => { acc[s.settlement_type] = Number(s.amount); return acc; },
    {}
  );

  // 費用テーブル行データ
  const feeRowCount = Math.max(taxableFeeItems.length, nonTaxFeeItems.length, FEE_MIN_ROWS);
  const tRowsAll  = Array.from({ length: feeRowCount }, (_, i) => taxableFeeItems[i]  || null);
  const ntRowsAll = Array.from({ length: feeRowCount }, (_, i) => nonTaxFeeItems[i] || null);

  // ─── 1ページにまとめるか判定 ──────────────────────────────
  const isLargeHeader = order.vehicle_mode === "sale";
  const maxItemsForSingle = isLargeHeader ? SINGLE_PAGE_MAX_SALE : SINGLE_PAGE_MAX_MAINTENANCE;
  const feeFitsInline =
    taxableFeeItems.length <= FEE_MIN_ROWS &&
    nonTaxFeeItems.length <= FEE_MIN_ROWS;
  const useSinglePage = normalItems.length <= maxItemsForSingle && feeFitsInline;

  // ─── 共通JSX部品 ─────────────────────────────────────────

  /** 1ページ目ヘッダー */
  const headerJSX = (
    <Grid container spacing={1} sx={{ mb: 0.8, flexShrink: 0 }}>
      {/* 左列 */}
      <Grid size={{ xs: 6 }}>
        <Box sx={{ mb: 0.8, pl: 1 }}>
          <Typography sx={{ fontSize: "10pt", color: "#555" }}>
            〒{order.customer?.postal_code}　{order.customer?.address}
          </Typography>
          {order.customer?.kana && (
            <Typography sx={{ fontSize: "7.5pt", color: "#888" }}>
              {order.customer.kana}
            </Typography>
          )}
          <Typography sx={{ fontSize: "16pt", fontWeight: "bold", lineHeight: 1.2, mt: 0.3 }}>
            {order.customer?.name} 様
          </Typography>
          <Typography sx={{ fontSize: "10pt", mt: 0.2 }}>
            TEL：{fmtPhone(order.customer?.phone || order.customer?.mobile_phone)}
          </Typography>
        </Box>

        {/* お買い上げ内容 */}
        <Box sx={{ display: "flex", alignItems: "stretch", mb: 1 }}>
          <VerticalLabel>お買い上げ内容</VerticalLabel>
          <Box sx={{ flex: 1, border: "1px solid #000" }}>
            <SummaryRow label="ご商談車両"   value={fmtOrDash(summary.vehicle)} />
            <SummaryRow label="用品＆パーツ" value={fmtOrDash(summary.parts)} />
            <SummaryRow label="課税費用"     value={fmtOrDash(summary.taxableFee)} />
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
        <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 2, mb: 4 }}>
          <Box sx={{ textAlign: "right", fontSize: "8pt", color: "#444", lineHeight: 1.4 }}>
            <div>伝票No.　{order.order_no || order.estimate_no}</div>
            <div>受注日　{order.order_date || order.created_at?.slice(0, 10)}</div>
          </Box>
          <Typography sx={{ fontSize: "18pt", fontWeight: "bold", letterSpacing: "5px", lineHeight: 1.2 }}>
            受注書
          </Typography>
        </Box>

        {order.vehicle_mode === "sale" && (
          <>
            <VerticalSection label="商談車両">
              <VehicleSection vehicle={order.vehicles?.find((v: any) => !v.is_trade_in)} />
            </VerticalSection>
            <VerticalSection label="下取車両">
              <VehicleSection vehicle={order.vehicles?.find((v: any) => v.is_trade_in)} />
            </VerticalSection>
            <VerticalSection label="ローン">
              <CreditSection order={order} />
            </VerticalSection>
          </>
        )}
        {order.vehicle_mode === "maintenance" && (
          <VerticalSection label="対象車両">
            <VehicleSection vehicle={order.vehicles?.[0]} />
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
            <Th align="left"   width="40%">商品名</Th>
            <Th align="right"  width="6%">数量</Th>
            <Th align="center" width="4%">単位</Th>
            <Th align="right"  width="10%">単価</Th>
            <Th align="right"  width="11%">工賃</Th>
            <Th align="right"  width="15%">金額（税込）</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: any, i: number) => {
            const line = calcLine(item);
            return (
              <tr key={i}>
                <Td align="left">{item.name}</Td>
                <Td align="right">{item.quantity}</Td>
                <Td align="center">{item.unit_detail?.name || ""}</Td>
                <Td align="right">{fmt(item.unit_price)}</Td>
                <Td align="right">{item.labor_cost ? fmt(item.labor_cost) : ""}</Td>
                <Td align="right">{fmt(line.total)}</Td>
              </tr>
            );
          })}
          {Array.from({ length: emptyRows }).map((_, i) => (
            <tr key={`empty-${i}`}>
              {[0,1,2,3,4,5].map(j => <Td key={j}>&nbsp;</Td>)}
            </tr>
          ))}
          {/* 合計行 */}
          <tr>
            <td colSpan={4}
              style={{ borderTop: "1px solid #000", borderBottom: "1px solid #000", padding: "3px 6px", background: "#f5f5f5" }}
            />
            <td style={{ borderTop: "1px solid #000", borderBottom: "1px solid #000", padding: "3px 6px", textAlign: "right",
              fontWeight: "bold", background: "#f5f5f5", fontSize: "8.5pt" }}>
              合計
            </td>
            <td style={{ borderTop: "1px solid #000", borderBottom: "1px solid #000", padding: "3px 6px", textAlign: "right",
              fontWeight: "bold", background: "#f5f5f5", fontSize: "8.5pt" }}>
              {fmt(normalItemsTotal)}
            </td>
          </tr>
        </tbody>
      </table>
    </Box>
  );

  /** 費用テーブル（課税・非課税横並び） */
  const renderFeeSection = (tRows: (any | null)[], ntRows: (any | null)[]) => (
    <Grid container spacing={1.5}>
      <Grid size={{ xs: 6 }}>
        <FeeTable title="課税費用" rows={tRows} />
      </Grid>
      <Grid size={{ xs: 6 }}>
        <FeeTable title="非課税費用" rows={ntRows} />
      </Grid>
    </Grid>
  );

  /** 納車予定 & 任意保険 & フッター（ページ末尾共通） */
  const renderFooterSection = () => (
    <>
      <Grid container spacing={1.5} sx={{ mt: 1 }}>
        <Grid size={{ xs: 6 }}>
          <ScheduleSection order={order} />
        </Grid>
        <Grid size={{ xs: 6 }}>
          <InsuranceSection order={order} />
        </Grid>
      </Grid>
      <Box sx={{ flex: 1 }} />
      <Footer order={order} />
    </>
  );

  // ══════════════════════════════════════════════════════════
  //  1ページレイアウト
  // ══════════════════════════════════════════════════════════
  if (useSinglePage) {
    return (
      <Box sx={{ ...PAGE_SX, gap: "2mm", pageBreakAfter: "auto" }}>
        {headerJSX}
        {renderNormalTable(normalItems, Math.max(0, SINGLE_PAGE_MAX_SALE - normalItems.length))}
        {renderFeeSection(tRowsAll, ntRowsAll)}
        {renderFooterSection()}
      </Box>
    );
  }

  // ══════════════════════════════════════════════════════════
  //  多ページレイアウト
  // ══════════════════════════════════════════════════════════
  const itemChunks = chunkArray(normalItems, ITEMS_PER_FIRST_PAGE, ITEMS_PER_PAGE);

  return (
    <>
      {itemChunks.map((items, pageIdx) => {
        const isFirst   = pageIdx === 0;
        const isLast    = pageIdx === itemChunks.length - 1;
        const minRows   = isFirst ? ITEMS_PER_FIRST_PAGE : ITEMS_PER_PAGE;
        const emptyRows = Math.max(0, minRows - items.length);

        return (
          <Box
            key={pageIdx}
            sx={{
              ...PAGE_SX,
              gap: "4mm",
              pageBreakAfter: isLast ? "auto" : "always",
              pageBreakInside: "avoid",
            }}
          >
            {isFirst && headerJSX}

            {!isFirst && (
              <Box sx={{
                display: "flex", justifyContent: "space-between",
                borderBottom: "1px solid #ccc", pb: 0.5, mb: 1,
                fontSize: "8pt", color: "#666", flexShrink: 0,
              }}>
                <span>{order.customer?.name} 様　　{order.order_no || order.estimate_no}</span>
                <span>明細　{pageIdx + 1} ページ</span>
              </Box>
            )}

            {renderNormalTable(items, emptyRows)}

            {isLast && renderFeeSection(tRowsAll, ntRowsAll)}
            {isLast && renderFooterSection()}
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
          <Box key={i} sx={{
            display: "grid", gridTemplateColumns: "1fr 100px",
            minHeight: "22px",
            borderBottom: "none",
            fontSize: "8.5pt",
          }}>
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
function ScheduleSection({ order }: any) {
  const rows = [
    { label: "日付", value: order.schedule?.start_at?.slice(0, 10) || "" },
    { label: "方法", value: order.schedule?.delivery_method || "" },
    { label: "店舗", value: order.schedule?.delivery_shop_name || "" },
    { label: "備考", value: order.schedule?.description || "" },
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
function InsuranceSection({ order }: any) {
  const ins = order.insurance;
  const rows = [
    { label: "会社名",  value: ins?.company_name || "" },
    { label: "対人",    value: ins?.bodily_injury || "" },
    { label: "対物",    value: ins?.property_damage || "" },
    { label: "搭乗者",  value: ins?.passenger || "" },
    { label: "車両",    value: ins?.vehicle || "" },
    { label: "ｵﾌﾟｼｮﾝ", value: ins?.option || "" },
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
function Footer({ order }: any) {
  return (
    <Box>
      <Box sx={{ border: "1px solid #000", display: "flex", minHeight: "90px", mt: 1 }}>
        <Box sx={{ width: "50%", borderRight: "1px solid #000", p: 1.5, whiteSpace: "pre-wrap", fontSize: "8.5pt" }}>
          <Box sx={{ fontWeight: "bold", mb: 0.5 }}>メモ</Box>
          <Box>{order.memo || ""}</Box>
        </Box>
        <Box sx={{ width: "50%", p: 1.5, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <Box sx={{ fontSize: "8.5pt", lineHeight: 1.5, color: "#444" }}>
            <div>{order.shop?.location || ""}</div>
            <div>営業：{order.shop?.opening_hours || ""}</div>
            <div>登録番号：T7370001009807</div>
          </Box>
          <Box
            component="img"
            src="/logo_doc.png"
            alt="早坂サイクル商会"
            sx={{ display: "block" }}
          />
          <Box sx={{ fontSize: "8.5pt", color: "#444", lineHeight: 1.5 }}>
            <div>TEL {order.shop?.phone || ""}　Fax {order.shop?.fax || ""}</div>
            <div>担当：{order.created_by?.display_name || ""}　{order.shop?.name || ""}</div>
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
  borderRight: "1px solid #000", padding: "2px 6px", width: "50%",
};
const cellR: React.CSSProperties = {
  padding: "2px 6px", width: "50%",
};

function VCell({ label, value }: { label: string; value: any }) {
  return (
    <>
      <span style={{ fontWeight: 600 }}>{label}：</span>
      <span style={{ marginLeft: 4 }}>{value || ""}</span>
    </>
  );
}

function CreditSection({ order }: any) {
  const p = order?.payments?.[0];
  const rows = [
    [{ label: "会社名",   value: p?.credit_company       }, { label: "回数",      value: p?.credit_installments  }],
    [{ label: "初回支払", value: p?.credit_first_payment }, { label: "2回目以降", value: p?.credit_second_payment }],
    [{ label: "ボーナス", value: p?.credit_bonus_payment }, { label: "支払開始",  value: p?.credit_start_month   }],
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
