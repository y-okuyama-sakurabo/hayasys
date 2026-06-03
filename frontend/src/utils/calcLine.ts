// src/utils/calcLine.ts
// unit_price は税込み単価として扱う

export const calcLine = (item: any) => {
  const qty = Number(item.quantity ?? 0);
  const unit = Number(item.unit_price ?? 0);
  const labor = Number(item.labor_cost ?? 0);
  const discount = Number(item.discount ?? 0);
  const taxType = item.tax_type ?? "taxable";

  // 税込合計
  const total = Math.max(0, qty * unit + labor - discount);

  if (taxType === "taxable") {
    // 税抜小計（バックエンドの subtotal と一致させる）
    const subtotal = Math.round(total / 1.1);
    const tax = total - subtotal;
    return { subtotal, tax, total };
  } else {
    return { subtotal: total, tax: 0, total };
  }
};