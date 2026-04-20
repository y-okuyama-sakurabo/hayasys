"use client";

import EstimateItemsStep from "./EstimateItemsStep";

type Props = {
  items: any[];
  dispatch: React.Dispatch<any>;
};

export default function TaxableExpenseStep({ items, dispatch }: Props) {
  return (
    <EstimateItemsStep
      type="taxable_fee"
      taxType="taxable"
      items={items}
      dispatch={dispatch}
    />
  );
}