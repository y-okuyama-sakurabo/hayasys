"use client";

import EstimateItemsStep from "./EstimateItemsStep";

type Props = {
  items: any[];
  dispatch: React.Dispatch<any>;
};

export default function OtherStep({ items, dispatch }: Props) {
  return <EstimateItemsStep type="accessory" items={items} dispatch={dispatch} />;
}