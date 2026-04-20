"use client";

import React from "react";
import { Box, Typography, Grid } from "@mui/material";

export function SaleEstimateDocument({ estimate }: { estimate: any }) {
  const ITEMS_PER_PAGE = 10;
  const vehicle = estimate.vehicles?.[0];

  const format = (v: any) =>
    v == null || isNaN(Number(v)) ? "" : `¥${Number(v).toLocaleString()}`;

  const calcLine = (item: any) => {
    const qty = Number(item.quantity ?? 0);
    const unit = Number(item.unit_price ?? 0);
    const labor = Number(item.labor_cost ?? 0);
    const discount = Number(item.discount ?? 0);

    const subtotal = qty * unit + labor - discount;

    const tax =
      item.tax_type === "taxable"
        ? Math.floor(subtotal * 0.1)
        : 0;

    return {
      subtotal,
      tax,
      total: subtotal + tax,
    };
  };

  function chunkItems(items: any[], size: number) {
    const chunks = [];
    for (let i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size));
    }
    return chunks;
  }

  const itemChunks = chunkItems(estimate.items || [], ITEMS_PER_PAGE);
  if (itemChunks.length === 0) itemChunks.push([]);

  const taxableTotal = estimate.items
    ?.filter((i: any) => i.tax_type === "taxable")
    .reduce((s: number, i: any) => s + calcLine(i).subtotal, 0);

  const nonTaxableTotal = estimate.items
    ?.filter((i: any) => i.tax_type === "non_taxable")
    .reduce((s: number, i: any) => s + calcLine(i).subtotal, 0);

  const tax = Math.floor(taxableTotal * 0.1);
  const total = taxableTotal + nonTaxableTotal + tax;

  const vehicleAmount = estimate.items
    ?.filter((i: any) => i.item_type === "vehicle")
    .reduce((s: number, i: any) => s + calcLine(i).subtotal, 0);

  const otherAmount = estimate.items
    ?.filter((i: any) => i.item_type !== "vehicle")
    .reduce((s: number, i: any) => s + calcLine(i).subtotal, 0);

  const SETTLEMENT_TYPES = [
    { key: "trade_in", label: "下取車" },
    { key: "cash", label: "現金" },
    { key: "card", label: "カード・クーポン" },
    { key: "credit", label: "クレジット" },
    { key: "advance", label: "前受金" },
  ];  

  const settlementMap = (estimate.settlements || []).reduce(
    (acc: any, s: any) => {
      acc[s.settlement_type] = Number(s.amount);
      return acc;
    },
    {}
  );

  return (
    <>
      {itemChunks.map((items, pageIndex) => {
        const emptyRows = ITEMS_PER_PAGE - items.length;

        return (
          <Box
            key={pageIndex}
            sx={{
              width: "210mm",
              minHeight: "297mm",
              boxSizing: "border-box",
              background: "#ffffff",
              fontSize: "10px",
              padding: "30px 40px",
              pageBreakAfter: "always",
              "&:last-of-type": { pageBreakAfter: "auto" },
            }}
          >
            {pageIndex === 0 && (
              <Grid container sx={{ mt: 2 }}>
                <Grid size={{ xs: 6 }} sx={{ pr: 1 }}>
                  <Box sx={{ mb: 2, mt: 4, pl: 2 }}>
                    <Typography>〒{estimate.party?.postal_code}</Typography>
                    <Typography>{estimate.party?.address}</Typography>
                    <Typography sx={{ mt: 1, fontSize: "10px" }}>
                      {estimate.party?.kana}
                    </Typography>
                    <Typography sx={{ fontSize: "18px", fontWeight: "bold" }}>
                      {estimate.party?.name} 様
                    </Typography>
                    <Typography sx={{ mt: 1 }}>
                      TEL：
                      {estimate.party?.phone ||
                        estimate.party?.mobile_phone}
                    </Typography>
                  </Box>

                  <Box sx={{ border: "1px solid #000" }}>
                    {/* お買い上げ内容 */}
                    <Box sx={{ borderBottom: "1px solid #000", px: 1, py: "2px", fontWeight: "bold" }}>
                      お買い上げ内容
                    </Box>

                    <SummaryRow label="ご商談車両" value={format(vehicleAmount)} />
                    <SummaryRow label="用品＆パーツ" value={format(otherAmount)} />
                    <SummaryRow label="課税費用" value={format(taxableTotal)} />
                    <SummaryRow label="消費税" value={format(tax)} />
                    <SummaryRow label="非課税費用" value={format(nonTaxableTotal)} />

                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "1fr 120px",
                        fontWeight: "bold",
                        fontSize: "12px",
                      
                      }}
                    >
                      <Box sx={{ px: 1, py: 1 }}>
                        お支払合計額
                      </Box>

                      <Box
                        sx={{
                          px: 1,
                          py: 1,
                          textAlign: "right",
                          borderLeft: "1px solid #000",
                        }}
                      >
                        {format(total)}
                      </Box>
                    </Box>
                  </Box>
                  <Box sx={{ border: "1px solid #000", mt: 2 }}>
                    {/* タイトル */}
                    <Box sx={{ borderBottom: "1px solid #000", px: 1, py: "3px", fontWeight: "bold" }}>
                      ご決済内訳
                    </Box>

                    {SETTLEMENT_TYPES.map((t) => (
                      <SummaryRow
                        key={t.key}
                        label={t.label}
                        value={format(settlementMap[t.key] || 0)}
                      />
                    ))}
                  </Box>
                </Grid>

                <Grid size={{ xs: 6 }} sx={{ pl: 1 }}>
                  <Box sx={{ textAlign: "right", mb: 2 }}>
                    <Typography
                      sx={{
                        fontSize: "22px",
                        fontWeight: "bold",
                        letterSpacing: "6px",
                      }}
                    >
                      お見積書
                    </Typography>
                    <Typography>
                      伝票No：{estimate.estimate_no}
                    </Typography>
                    <Typography>
                      見積日：
                        {estimate.estimate_date
                          ? estimate.estimate_date
                          : estimate.created_at?.slice(0, 10)}
                    </Typography>
                  </Box>

                  {estimate.vehicle_mode !== "none" && (
                    <>
                      {estimate.vehicle_mode === "sale" && (
                        <>
                          <VehicleSection
                            title="商談車両"
                            vehicle={estimate.vehicles?.find((v:any)=>!v.is_trade_in)}
                          />
                          <VehicleSection
                            title="下取車両"
                            vehicle={estimate.vehicles?.find((v:any)=>v.is_trade_in)}
                          />
                          <CreditSection estimate={estimate} />
                        </>
                      )}

                      {estimate.vehicle_mode === "maintenance" && (
                        <VehicleSection
                          title="対象車両"
                          vehicle={estimate.vehicles?.[0]}
                        />
                      )}
                    </>
                  )}
                </Grid>
              </Grid>
            )}

            {/* ===== 明細 ===== */}
            <Box sx={{ border: "1px solid #000", mt: 3 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <Th>商品名</Th>
                    <Th>数　量</Th>
                    <Th>単　位</Th>
                    <Th>単　価</Th>
                    <Th>工　賃</Th>
                    <Th>金　額</Th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item: any, i: number) => {
                    const line = calcLine(item);
                    const unitWithTax = Math.round(line.total / Number(item.quantity ?? 1));

                    return (
                      <tr key={i}>
                        <Td>{item.name}</Td>
                        <Td align="right">{item.quantity}</Td>
                        <Td align="right">
                          {item.unit_detail?.name || ""}
                        </Td>
                        <Td align="right">{format(unitWithTax)}</Td>
                        <Td align="right">{format(item.labor_cost)}</Td>
                        <Td align="right">{format(line.total)}</Td>
                      </tr>
                    );
                  })}

                  {Array.from({ length: emptyRows }).map((_, i) => (
                    <tr key={`empty-${i}`}>
                      <Td>&nbsp;</Td>
                      <Td>&nbsp;</Td>
                      <Td>&nbsp;</Td>
                      <Td>&nbsp;</Td>
                      <Td>&nbsp;</Td>
                      <Td>&nbsp;</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>

            {/* ===== 納車予定 & 任意保険（別BOX） ===== */}
            <Box sx={{ display: "flex", gap: 2, mt: 2, alignItems: "flex-start" }}>
              
              {/* ===== 納車予定 ===== */}
              <Box sx={{ border: "1px solid #000", width: "50%" }}>
                <Box sx={{ borderBottom: "1px solid #000", px: 1, py: "3px", fontWeight: "bold" }}>
                  納車予定
                </Box>

                <Box sx={{ p: 1, fontSize: "10px", lineHeight: 1.6 }}>
                  <div>日付：{estimate.schedule?.start_at?.slice(0, 10) || ""}</div>
                  <div>方法：{estimate.schedule?.delivery_method || ""}</div>
                  <div>店舗：{estimate.schedule?.delivery_shop_name || ""}</div>
                  <div>備考：{estimate.schedule?.description || ""}</div>
                </Box>
              </Box>

              {/* ===== 任意保険 ===== */}
              <Box sx={{ border: "1px solid #000", width: "50%" }}>
                <Box sx={{ borderBottom: "1px solid #000", px: 1, py: "3px", fontWeight: "bold" }}>
                  任意保険
                </Box>

                <Box sx={{ p: 1, fontSize: "10px", lineHeight: 1.6 }}>
                  <div>会社名：{estimate.insurance?.company_name || ""}</div>
                  <div>対人：{estimate.insurance?.bodily_injury || ""}</div>
                  <div>対物：{estimate.insurance?.property_damage || ""}</div>
                  <div>搭乗者：{estimate.insurance?.passenger || ""}</div>
                  <div>車両：{estimate.insurance?.vehicle || ""}</div>
                  <div>OP：{estimate.insurance?.option || ""}</div>
                </Box>
              </Box>

            </Box>

            <Footer estimate={estimate} />
          </Box>
        );
      })}
    </>
  );
}

/* ===== 既存補助関数 ===== */

function Footer({ estimate }: any) {
  return (
<Box
  sx={{
    border: "1px solid #000",
    mt: 5,
    display: "flex",
    fontSize: "12px",
    minHeight: "110px",
  }}
>
<Box
  sx={{
    width: "50%",
    borderRight: "1px solid #000",
    p: 1.5,
    fontSize: "13px",
    whiteSpace: "pre-wrap",
  }}
>
  <Box sx={{ fontWeight: "bold", mb: 1 }}>
    メモ
  </Box>

  <Box>
    {estimate.memo || ""}
  </Box>
</Box>

  <Box
    sx={{
      width: "50%",
      p: 1,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
    }}
  >
    <Box sx={{ fontSize: "13px", lineHeight: 1.4 }}>
      <div>{estimate.shop?.location || ""}</div>
      <div>営業：{estimate.shop?.opening_hours || ""}</div>
      <div>登録番号：T7370001009807</div>
    </Box>

    <Box
      sx={{
        textAlign: "left",
        fontSize: "18px",
        fontWeight: "bold",
        letterSpacing: "1px",
      }}
    >
      (株) 早坂サイクル商会 {estimate.shop?.name}
    </Box>

    <Box sx={{ fontSize: "13px", lineHeight: 1.4 }}>
      <div>
        TEL {estimate.shop?.phone || ""}　
        Fax {estimate.shop?.fax || ""}
      </div>
      <div>
        担当：{estimate.shop?.name || ""}　
        {estimate.created_by?.display_name || ""}
      </div>
    </Box>
  </Box>
</Box>
  );
}

function SummaryRow({ label, value }: any) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "1fr 120px", // ← 左右固定
        borderBottom: "1px solid #000",
        fontSize: "10px",
      }}
    >
      {/* 左：項目 */}
      <Box sx={{ px: 1, py: "3px" }}>
        {label}
      </Box>

      {/* 右：金額（縦線） */}
      <Box
        sx={{
          px: 1,
          py: "3px",
          textAlign: "right",
          borderLeft: "1px solid #000", // ← これ！！
        }}
      >
        {value}
      </Box>
    </Box>
  );
}

function Th({ children }: any) {
  return (
    <th
      style={{
        border: "1px solid #000",
        padding: "6px",
        background: "#f5f5f5",
        textAlign: "center",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, align }: any) {
  return (
    <td style={{ border: "1px solid #000", padding: "6px", textAlign: align }}>
      {children}
    </td>
  );
}

function VehicleSection({ title, vehicle }: any) {
  return (
    <Box sx={{ border: "1px solid #000", mb: 2 }}>
      <Box
        sx={{
          borderBottom: "1px solid #000",
          px: 1,
          py: "1px",
          fontWeight: "bold",
          fontSize: "10px",
        }}
      >
        {title}
      </Box>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "10px",
        }}
      >
        <tbody>
          {vehicleRows(vehicle).map((row: any, i: number) => (
            <tr key={i}>
              <td style={leftCellStyle}>
                <VehicleCell
                  label={row.left.label}
                  value={row.left.value}
                />
              </td>
              <td style={rightCellStyle}>
                <VehicleCell
                  label={row.right.label}
                  value={row.right.value}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Box>
  );
}

function vehicleRows(vehicle: any) {
  const fields = [
    { label: "車両名", value: vehicle?.vehicle_name },
    { label: "メーカー", value: vehicle?.manufacturer_detail?.name },
    { label: "排気量", value: vehicle?.displacement },
    { label: "新中車", value: vehicle?.new_car_type === "new" ? "新車" : "中古車" },
    { label: "登録地", value: vehicle?.registrations?.[0]?.registration_area ?? "" },
    { label: "色", value: vehicle?.color_name },
    { label: "登録番号", value: vehicle?.registrations?.[0]?.registration_no ?? "" },
    { label: "色記号", value: vehicle?.color_code },
    { label: "型認定", value: vehicle?.registrations?.[0]?.certification_no ?? "" },
    { label: "型式", value: vehicle?.model_code },
    { label: "車検満了", value: vehicle?.registrations?.[0]?.inspection_expiration ?? "" },
    { label: "車台番号", value: vehicle?.chassis_no },
  ];

  const rows = [];
  for (let i = 0; i < fields.length; i += 2) {
    rows.push({
      left: fields[i],
      right: fields[i + 1] || { label: "", value: "" },
    });
  }

  return rows;
}

function VehicleCell({ label, value }: any) {
  return (
    <>
      <span style={{ fontWeight: 500 }}>{label}：</span>
      <span style={{ marginLeft: 6 }}>{value || ""}</span>
    </>
  );
}

const leftCellStyle: React.CSSProperties = {
  borderBottom: "1px solid #000",
  borderRight: "1px solid #000",
  padding: "3px 8px",
  width: "50%",
};

const rightCellStyle: React.CSSProperties = {
  borderBottom: "1px solid #000",
  padding: "3px 8px",
  width: "50%",
};

function CreditSection({ estimate }: any) {
  const hasCredit = estimate?.settlements?.some(
    (s: any) => s.settlement_type === "credit"
  );

  const payment = estimate?.payments?.[0];

  const v = (val: any) => (hasCredit && val ? val : "");

  if (!hasCredit) return null;

  return (
    <Box sx={{ border: "1px solid #000", mb: 2 }}>
      <Box
        sx={{
          borderBottom: "1px solid #000",
          px: 1,
          py: "1px",
          fontWeight: "bold",
          fontSize: "10px",
        }}
      >
        クレジット
      </Box>

      <table style={{ width: "100%", fontSize: "10px" }}>
        <tbody>
          <tr>
            <td style={leftCellStyle}>
              <VehicleCell label="会社名" value={v(payment?.credit_company)} />
            </td>
            <td style={rightCellStyle}>
              <VehicleCell label="回数" value={v(payment?.credit_installments)} />
            </td>
          </tr>

          <tr>
            <td style={leftCellStyle}>
              <VehicleCell label="初回支払額" value={v(payment?.credit_first_payment)} />
            </td>
            <td style={rightCellStyle}>
              <VehicleCell label="2回目以降" value={v(payment?.credit_second_payment)} />
            </td>
          </tr>

          <tr>
            <td style={leftCellStyle}>
              <VehicleCell label="ボーナス支払" value={v(payment?.credit_bonus_payment)} />
            </td>
            <td style={rightCellStyle}>
              <VehicleCell label="支払開始月" value={v(payment?.credit_start_month)} />
            </td>
          </tr>
        </tbody>
      </table>
    </Box>
  );
}

function getSettlementLabel(type: string) {
  switch (type) {
    case "trade_in":
      return "下取車";
    case "cash":
      return "現金";
    case "card":
      return "カード・クーポン";
    case "credit":
      return "クレジット";
    case "advance":
      return "前受金";
    default:
      return type;
  }
}