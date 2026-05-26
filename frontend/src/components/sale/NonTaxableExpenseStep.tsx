"use client";

import ItemsStep from "./ItemsStep";

type Props = {
  items: any[];
  dispatch: React.Dispatch<any>;
};

export default function NonTaxableExpenseStep({ items, dispatch }: Props) {
  return (
    <ItemsStep
      type="non_taxable_fee"
      taxType="non_taxable"
      items={items}
      dispatch={dispatch}
    />
  );
}
