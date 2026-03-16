"use client";

import EstimateItemsStep from "./EstimateItemsStep";

type Props = {
  items: any[];
  dispatch: React.Dispatch<any>;
};

export default function InsuranceStep({ items, dispatch }: Props) {
  return <EstimateItemsStep type="insurance" items={items} dispatch={dispatch} />;
}