"use client";

import React from "react";
import { Box, Typography, Grid } from "@mui/material";

export function SaleOrderDocument({ order }: { order: any }) {
  const ITEMS_PER_PAGE = 6;

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

  const normalItems = (order.items || []).filter(
    (item: any) => !(item.item_type === "fee" && item.tax_type === "non_taxable")
  );

  const nonTaxFeeItems = (order.items || []).filter(
    (item: any) => item.item_type === "fee" && item.tax_type === "non_taxable"
  );
  const nonTaxEmptyRows = Math.max(0, 5 - nonTaxFeeItems.length);

  const itemChunks = chunkItems(normalItems, ITEMS_PER_PAGE);
  if (itemChunks.length === 0) itemChunks.push([]);

  const summary = (order.items || []).reduce(
    (acc: any, item: any) => {
      const line = calcLine(item);
      const taxType = item.tax_type ?? "taxable";

      if (item.item_type === "vehicle") {
        acc.vehicle += line.total;
      } else if (item.item_type === "accessory") {
        acc.parts += line.total;
      } else if (item.item_type === "fee") {
        if (taxType === "non_taxable") {
          acc.nonTaxableFee += line.total;
        } else {
          acc.taxableFee += line.total;
        }
      }

      if (taxType !== "non_taxable") {
        acc.tax += line.tax;
      }

      acc.total += line.total;
      return acc;
    },
    {
      vehicle: 0,
      parts: 0,
      taxableFee: 0,
      nonTaxableFee: 0,
      tax: 0,
      total: 0,
    }
  );

  const vehicleAmount = summary.vehicle;
  const partsAmount = summary.parts;
  const taxableFeeAmount = summary.taxableFee;
  const nonTaxableFeeAmount = summary.nonTaxableFee;
  const tax = summary.tax;
  const total = summary.total;
  const normalItemsTotal = vehicleAmount + partsAmount + taxableFeeAmount;

  const SETTLEMENT_TYPES = [
    { key: "trade_in", label: "下取車" },
    { key: "cash", label: "現金" },
    { key: "card", label: "カード・クーポン" },
    { key: "credit", label: "クレジット" },
    { key: "advance", label: "前受金" },
  ];  

  const settlementMap = (order.settlements || []).reduce(
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
              padding: "20px 40px",
              pageBreakAfter: "always",
              "&:last-of-type": { pageBreakAfter: "auto" },
            }}
          >
            {pageIndex === 0 && (
              <Grid container sx={{ mt: 2 }}>
                <Grid size={{ xs: 6 }} sx={{ pr: 1 }}>
                  <Box sx={{ mb: 2, mt: 0, pl: 2 }}>
                    <Typography>〒{order.customer?.postal_code}</Typography>
                    <Typography>{order.customer?.address}</Typography>
                    <Typography sx={{ mt: 1, fontSize: "10px" }}>
                      {order.customer?.kana}
                    </Typography>
                    <Typography sx={{ fontSize: "18px", fontWeight: "bold" }}>
                      {order.customer?.name} 様
                    </Typography>
                    <Typography sx={{ mt: 1 }}>
                      TEL：
                      {order.customer?.phone ||
                        order.customer?.mobile_phone}
                    </Typography>
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "stretch", mb: 2 }}>
                    <Box
                      sx={{
                        writingMode: "vertical-rl",
                        textOrientation: "upright",
                        border: "1px solid #000",
                        borderRight: "none",
                        px: "4px",
                        py: 1,
                        fontSize: "10px",
                        fontWeight: "bold",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: "24px",
                      }}
                    >
                      お買い上げ内容
                    </Box>

                    <Box sx={{ flex: 1, border: "1px solid #000" }}>
                      <SummaryRow label="ご商談車両" value={format(vehicleAmount)} />
                      <SummaryRow label="用品＆パーツ" value={format(partsAmount)} />
                      <SummaryRow label="課税費用" value={format(taxableFeeAmount)} />
                      <SummaryRow label="消費税" value={format(tax)} />
                      <SummaryRow label="非課税費用" value={format(nonTaxableFeeAmount)} />

                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "1fr 120px",
                          fontWeight: "bold",
                          fontSize: "11px",
                          
                        }}
                      >
                        <Box sx={{ px: 1, py: "4px", lineHeight: 1.2 }}>
                          お支払合計額
                        </Box>

                        <Box
                          sx={{
                            px: 1,
                            py: "4px",
                            lineHeight: 1.2,
                            textAlign: "right",
                            borderLeft: "1px solid #000",
                          }}
                        >
                          {format(total)}
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "stretch", mt: 2 }}>
                    <Box
                      sx={{
                        writingMode: "vertical-rl",
                        textOrientation: "upright",
                        border: "1px solid #000",
                        borderRight: "none",
                        px: "4px",
                        py: 1,
                        fontSize: "10px",
                        fontWeight: "bold",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: "24px",
                      }}
                    >
                      ご決済内訳
                    </Box>

                    <Box sx={{ flex: 1, border: "1px solid #000" }}>
                      {SETTLEMENT_TYPES.map((t, index) => (
                        <SummaryRow
                          key={t.key}
                          label={t.label}
                          value={format(settlementMap[t.key] || 0)}
                          noBorder={index === SETTLEMENT_TYPES.length - 1}
                        />
                      ))}
                    </Box>
                  </Box>
                </Grid>

                <Grid size={{ xs: 6 }} sx={{ pl: 1 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "flex-end",
                      alignItems: "flex-start",
                      gap: 3,
                      mb: 2,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "20px",
                        fontWeight: "bold",
                        letterSpacing: "6px",
                        lineHeight: 1.4,
                      }}
                    >
                      受注書
                    </Typography>

                    <Box sx={{ textAlign: "right", fontSize: "10px" }}>
                      <Typography sx={{ fontSize: "10px" }}>
                        伝票No：{order.order_no || order.estimate_no}
                      </Typography>
                      <Typography sx={{ fontSize: "10px" }}>
                        受注日：
                        {order.order_date
                          ? order.order_date
                          : order.created_at?.slice(0, 10)}
                      </Typography>
                    </Box>
                  </Box>

                  {order.vehicle_mode !== "none" && (
                    <>
                      {order.vehicle_mode === "sale" && (
                        <>
                          <VerticalSection label="商談車両">
                            <VehicleSection
                              vehicle={order.vehicles?.find((v: any) => !v.is_trade_in)}
                            />
                          </VerticalSection>

                          <VerticalSection label="下取車両">
                            <VehicleSection
                              vehicle={order.vehicles?.find((v: any) => v.is_trade_in)}
                            />
                          </VerticalSection>

                          <VerticalSection label="クレジット">
                            <CreditSection estimate={order} />
                          </VerticalSection>
                        </>
                      )}

                      {order.vehicle_mode === "maintenance" && (
                        <VerticalSection label="対象車両">
                          <VehicleSection
                            vehicle={order.vehicles?.[0]}
                          />
                        </VerticalSection>
                      )}
                    </>
                  )}
                </Grid>
              </Grid>
            )}

            {/* ===== 明細 ===== */}
            <Box >
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

                  <tr>
                    <Td>&nbsp;</Td>
                    <Td>&nbsp;</Td>
                    <Td>&nbsp;</Td>
                    <Td>&nbsp;</Td>
                    <Td align="right" style={{ fontWeight: "bold" }}>
                      合計
                    </Td>
                    <Td align="right" style={{ fontWeight: "bold" }}>
                      {format(normalItemsTotal)}
                    </Td>
                  </tr>
                </tbody>
              </table>
            </Box>

            
            {pageIndex === itemChunks.length - 1 && (
              <Box sx={{  mt: 1 }}>
                <Box
                  sx={{
                    px: 1,
                    py: "3px",
                    fontWeight: "bold",
                    fontSize: "10px",
                  }}
                >
                  非課税費用明細
                </Box>

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
                    {nonTaxFeeItems.map((item: any, i: number) => {
                      const line = calcLine(item);
                      const unitWithTax = Math.round(
                        line.total / Number(item.quantity ?? 1)
                      );

                      return (
                        <tr key={`non-tax-${i}`}>
                          <Td>{item.name}</Td>
                          <Td align="right">{item.quantity}</Td>
                          <Td align="right">{item.unit_detail?.name || ""}</Td>
                          <Td align="right">{format(unitWithTax)}</Td>
                          <Td align="right">{format(item.labor_cost)}</Td>
                          <Td align="right">{format(line.total)}</Td>
                        </tr>
                      );
                    })}

                    {Array.from({ length: nonTaxEmptyRows }).map((_, i) => (
                      <tr key={`non-tax-empty-${i}`}>
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
            )}

            {/* ===== 納車予定 & 任意保険（別BOX） ===== */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 2,
                mt: 2,
                alignItems: "stretch",
              }}
            >
              {/* ===== 納車予定 ===== */}
              <Box sx={{ display: "flex", minWidth: 0 }}>
                <Box
                  sx={{
                    writingMode: "vertical-rl",
                    textOrientation: "upright",
                    border: "1px solid #000",
                    px: "4px",
                    py: 1,
                    fontWeight: "bold",
                    fontSize: "10px",
                    minWidth: "24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  納車予定
                </Box>

                <Box sx={{ flex: 1, border: "1px solid #000", borderLeft: "none" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "10px",
                    }}
                  >
                    <tbody>
                      <tr>
                        <td
                          style={{
                            width: "70px",
                            borderBottom: "1px solid #000",
                            padding: "4px 8px",
                            fontWeight: "bold",
                          }}
                        >
                          日付
                        </td>
                        <td
                          style={{
                            borderBottom: "1px solid #000",
                            padding: "4px 8px",
                          }}
                        >
                          {order.schedule?.start_at?.slice(0, 10) || ""}
                        </td>
                      </tr>
                      <tr>
                        <td
                          style={{
                            width: "70px",
                            borderBottom: "1px solid #000",
                            padding: "4px 8px",
                            fontWeight: "bold",
                          }}
                        >
                          方法
                        </td>
                        <td
                          style={{
                            borderBottom: "1px solid #000",
                            padding: "4px 8px",
                          }}
                        >
                          {order.schedule?.delivery_method || ""}
                        </td>
                      </tr>
                      <tr>
                        <td
                          style={{
                            width: "70px",
                            borderBottom: "1px solid #000",
                            padding: "4px 8px",
                            fontWeight: "bold",
                          }}
                        >
                          店舗
                        </td>
                        <td
                          style={{
                            borderBottom: "1px solid #000",
                            padding: "4px 8px",
                          }}
                        >
                          {order.schedule?.delivery_shop_name || ""}
                        </td>
                      </tr>
                      <tr>
                        <td
                          style={{
                            width: "70px",
                            padding: "4px 8px",
                            fontWeight: "bold",
                          }}
                        >
                          備考
                        </td>
                        <td style={{ padding: "4px 8px" }}>
                          {order.schedule?.description || ""}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </Box>
              </Box>

              {/* ===== 任意保険 ===== */}
              <Box sx={{ display: "flex", minWidth: 0 }}>
                <Box
                  sx={{
                    writingMode: "vertical-rl",
                    textOrientation: "upright",
                    border: "1px solid #000",
                    px: "4px",
                    py: 1,
                    fontWeight: "bold",
                    fontSize: "10px",
                    minWidth: "24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  任意保険
                </Box>

                <Box sx={{ flex: 1, border: "1px solid #000", borderLeft: "none" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "10px",
                    }}
                  >
                    <tbody>
                      <tr>
                        <td
                          style={{
                            width: "70px",
                            borderBottom: "1px solid #000",
                            padding: "4px 8px",
                            fontWeight: "bold",
                          }}
                        >
                          会社名
                        </td>
                        <td
                          style={{
                            borderBottom: "1px solid #000",
                            padding: "4px 8px",
                          }}
                        >
                          {order.insurance?.company_name || ""}
                        </td>
                      </tr>
                      <tr>
                        <td
                          style={{
                            width: "70px",
                            borderBottom: "1px solid #000",
                            padding: "4px 8px",
                            fontWeight: "bold",
                          }}
                        >
                          対人
                        </td>
                        <td
                          style={{
                            borderBottom: "1px solid #000",
                            padding: "4px 8px",
                          }}
                        >
                          {order.insurance?.bodily_injury || ""}
                        </td>
                      </tr>
                      <tr>
                        <td
                          style={{
                            width: "70px",
                            borderBottom: "1px solid #000",
                            padding: "4px 8px",
                            fontWeight: "bold",
                          }}
                        >
                          対物
                        </td>
                        <td
                          style={{
                            borderBottom: "1px solid #000",
                            padding: "4px 8px",
                          }}
                        >
                          {order.insurance?.property_damage || ""}
                        </td>
                      </tr>
                      <tr>
                        <td
                          style={{
                            width: "70px",
                            borderBottom: "1px solid #000",
                            padding: "4px 8px",
                            fontWeight: "bold",
                          }}
                        >
                          搭乗者
                        </td>
                        <td
                          style={{
                            borderBottom: "1px solid #000",
                            padding: "4px 8px",
                          }}
                        >
                          {order.insurance?.passenger || ""}
                        </td>
                      </tr>
                      <tr>
                        <td
                          style={{
                            width: "70px",
                            borderBottom: "1px solid #000",
                            padding: "4px 8px",
                            fontWeight: "bold",
                          }}
                        >
                          車両
                        </td>
                        <td
                          style={{
                            borderBottom: "1px solid #000",
                            padding: "4px 8px",
                          }}
                        >
                          {order.insurance?.vehicle || ""}
                        </td>
                      </tr>
                      <tr>
                        <td
                          style={{
                            width: "70px",
                            padding: "4px 8px",
                            fontWeight: "bold",
                          }}
                        >
                          ｵﾌﾟｼｮﾝ
                        </td>
                        <td style={{ padding: "4px 8px" }}>
                          {order.insurance?.option || ""}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </Box>
              </Box>
            </Box>

            <Footer order={order} />
          </Box>
        );
      })}
    </>
  );
}

/* ===== 既存補助関数 (order版) ===== */

function Footer({ order }: any) {
  return (
    <Box
      sx={{
        border: "1px solid #000",
        mt: 3,
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
        <Box sx={{ fontWeight: "bold", mb: 1 }}>メモ</Box>
        <Box>{order.memo || ""}</Box>
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
          <div>{order.shop?.location || ""}</div>
          <div>営業：{order.shop?.opening_hours || ""}</div>
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
          (株) 早坂サイクル商会 {order.shop?.name}
        </Box>

        <Box sx={{ fontSize: "13px", lineHeight: 1.4 }}>
          <div>
            TEL {order.shop?.phone || ""}　
            Fax {order.shop?.fax || ""}
          </div>
          <div>
            担当：{order.shop?.name || ""}　
            {order.created_by?.display_name || ""}
          </div>
        </Box>
      </Box>
    </Box>
  );
}


function SummaryRow({
  label,
  value,
  noBorder = false,
}: {
  label: string;
  value: any;
  noBorder?: boolean;
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "1fr 120px",
        borderBottom: noBorder ? "none" : "1px solid #000",
        fontSize: "9px",
      }}
    >
      <Box sx={{ px: 1, py: "2px" }}>
        {label}
      </Box>

      <Box
        sx={{
          px: 1,
          py: "2px",
          textAlign: "right",
          borderLeft: "1px solid #000",
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
        padding: "3px",
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
    <td style={{ border: "1px solid #000", padding: "3px", textAlign: align }}>
      {children}
    </td>
  );
}

function VehicleSection({ vehicle }: any) {
  return (
    <Box sx={{ mb: 0 }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "9px",
          borderTop: "1px solid #000",
          borderRight: "1px solid #000",
          borderBottom: "1px solid #000",
        }}
      >
        <tbody>
          {vehicleRows(vehicle).map((row: any, i: number) => (
            <tr key={i}>
              <td style={leftCellStyle}>
                <VehicleCell label={row.left.label} value={row.left.value} />
              </td>
              <td style={rightCellStyle}>
                <VehicleCell label={row.right.label} value={row.right.value} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Box>
  );
}

function vehicleRows(vehicle: any) {
  const saleTypeLabelMap: Record<string, string> = {
    new: "新車",
    used: "中古車",
    rental_up: "レンタルアップ",
    consignment: "委託販売",
  };
  const fields = [
    { label: "車両名", value: vehicle?.vehicle_name },
    { label: "メーカー", value: vehicle?.manufacturer_detail?.name },
    { label: "排気量", value: vehicle?.displacement },  
    { label: "区分", value: saleTypeLabelMap[vehicle?.sale_type || ""] || "" },
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
  padding: "2px 8px",
  width: "50%",
};

const rightCellStyle: React.CSSProperties = {
  borderBottom: "1px solid #000",
  padding: "2px 8px",
  width: "50%",
};

function CreditSection({ estimate }: any) {
  const payment = estimate?.payments?.[0];
  const v = (val: any) => (val ? val : "");

  return (
    <Box sx={{ mb: 0, height: "100%" }}>
      <table
        style={{
          width: "100%",
          fontSize: "9px",
          borderCollapse: "collapse",
          borderTop: "1px solid #000",
          borderRight: "1px solid #000",
          borderBottom: "1px solid #000",
          height: "100%",
        }}
      >
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
const VerticalSection = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <Box sx={{ display: "flex", alignItems: "stretch", mb: 2 }}>
    <Box
      sx={{
        writingMode: "vertical-rl",
        textOrientation: "upright",
        border: "1px solid #000",
        
        px: "4px",
        py: 1,
        fontSize: "10px",
        fontWeight: "bold",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: "24px",
      }}
    >
      {label}
    </Box>

    <Box sx={{ flex: 1 }}>
      {children}
    </Box>
  </Box>
);