"use client";

import ItemsStep from "./ItemsStep";

type Props = {
  items: any[];
  dispatch: React.Dispatch<any>;
};

export default function TaxableExpenseStep({ items, dispatch }: Props) {
  return (
    <ItemsStep
      type="taxable_fee"
      taxType="taxable"
      items={items}
      dispatch={dispatch}
    />
  );
}
