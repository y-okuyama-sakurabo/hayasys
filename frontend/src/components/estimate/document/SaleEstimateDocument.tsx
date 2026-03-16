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
              fontSize: "12px",
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
                    <Box sx={{ borderBottom: "1px solid #000", px: 1, py: "5px", fontWeight: "bold" }}>
                      お買い上げ内容
                    </Box>

                    {estimate.vehicle_mode === "sale" && (
                      <SummaryRow label="商談車両" value={format(vehicleAmount)} />
                    )}

                    <SummaryRow label="その他の項目" value={format(otherAmount)} />
                    <SummaryRow label="課税費用" value={format(taxableTotal)} />
                    <SummaryRow label="非課税費用" value={format(nonTaxableTotal)} />
                    <SummaryRow label="消費税" value={format(tax)} />

                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        px: 1,
                        py: 1,
                        fontWeight: "bold",
                        fontSize: "14px",
                      }}
                    >
                      <span>お支払合計額</span>
                      <span style={{ fontSize: "16px" }}>
                        {format(total)}
                      </span>
                    </Box>
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
                      見積日：{estimate.created_at?.slice(0, 10)}
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
                    <Th>単　価</Th>
                    <Th>工　賃</Th>
                    <Th>金　額</Th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item: any, i: number) => {
                    const line = calcLine(item);

                    return (
                      <tr key={i}>
                        <Td>{item.name}</Td>
                        <Td align="right">{item.quantity}</Td>
                        <Td align="right">{format(item.unit_price)}</Td>
                        <Td align="right">{format(item.labor_cost)}</Td>
                        <Td align="right">{format(line.subtotal)}</Td>
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
                    </tr>
                  ))}
                </tbody>
              </table>
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
    }}
  >
    メモ
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
        display: "flex",
        justifyContent: "space-between",
        borderBottom: "1px solid #000",
        px: 1,
        py: "5px",
        fontSize: "11px",
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
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
          py: "3px",
          fontWeight: "bold",
          fontSize: "12px",
        }}
      >
        {title}
      </Box>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "11px",
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
    { label: "メーカー", value: vehicle?.manufacturer_detail?.name },
    { label: "車両名", value: vehicle?.vehicle_name },
    { label: "年式", value: vehicle?.model_year },
    { label: "区分", value: vehicle?.new_car_type === "new" ? "新車" : "中古車" },
    { label: "排気量", value: vehicle?.displacement },
    { label: "色", value: vehicle?.color_name },
    { label: "型式", value: vehicle?.model_code },
    { label: "車台番号", value: vehicle?.chassis_no },
    { label: "エンジン型式", value: vehicle?.engine_type },
    { label: "カラーコード", value: vehicle?.color_code },
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