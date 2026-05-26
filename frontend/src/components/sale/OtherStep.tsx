"use client";

import ItemsStep from "./ItemsStep";

type Props = {
  items: any[];
  dispatch: React.Dispatch<any>;
};

export default function OtherStep({ items, dispatch }: Props) {
  return <ItemsStep type="accessory" items={items} dispatch={dispatch} />;
}
