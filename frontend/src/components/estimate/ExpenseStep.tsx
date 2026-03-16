"use client";

import EstimateItemsStep from "./EstimateItemsStep";

type Props = {
  items: any[];
  dispatch: React.Dispatch<any>;
};

export default function ExpenseStep({ items, dispatch }: Props) {
  return <EstimateItemsStep type="fee" items={items} dispatch={dispatch} />;
}