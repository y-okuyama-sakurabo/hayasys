"use client";

import EstimateItemsStep from "./EstimateItemsStep";

type Props = {
  items: any[];
  dispatch: React.Dispatch<any>;
};

export default function NonTaxableExpenseStep({ items, dispatch }: Props) {
  return (
    <EstimateItemsStep
      type="non_taxable_fee"
      taxType="non_taxable"
      items={items}
      dispatch={dispatch}
    />
  );
}