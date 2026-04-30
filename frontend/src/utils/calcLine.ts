// src/utils/calcLine.ts

export const calcLine = (item: any) => {
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