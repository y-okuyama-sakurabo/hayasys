"use client";

import { useEffect, useState } from "react";
import { TextField, InputAdornment } from "@mui/material";

type Props = {
  label: string;
  value: number | "";
  onChange: (v: number | "") => void;
  required?: boolean;
  onEnter?: () => void;
};

/**
 * 3桁カンマ区切りの金額入力欄。
 * - フォーカス時に全選択
 * - 入力中もリアルタイムでカンマを挿入
 * - value が "" のとき空欄で表示（未入力状態）
 */
export default function CurrencyField({ label, value, onChange, required, onEnter }: Props) {
  const [editing, setEditing] = useState(false);
  const [raw,     setRaw]     = useState(value === "" ? "" : String(Math.round(Number(value))));

  // 整数文字列に変換（小数点・末尾ゼロを除去）
  const toIntStr = (v: number | "") =>
    v === "" ? "" : String(Math.round(Number(v)));

  useEffect(() => {
    if (!editing) setRaw(toIntStr(value));
  }, [value, editing]);

  const displayValue = editing
    ? raw
    : value === "" || value === 0
    ? value === "" ? "" : "0"
    : Math.round(Number(value)).toLocaleString("ja-JP");

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setEditing(true);
    setRaw(value === "" || value === 0 ? "" : toIntStr(value));
    requestAnimationFrame(() => e.target.select());
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/[^0-9]/g, "");
    setRaw(v);
    onChange(v === "" ? "" : parseInt(v, 10));
  };

  const handleBlur = () => {
    setEditing(false);
    if (raw === "") onChange("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && onEnter) onEnter();
  };

  return (
    <TextField
      fullWidth
      size="small"
      label={label}
      required={required}
      value={displayValue}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      inputProps={{ style: { textAlign: "right" } }}
      InputProps={{
        startAdornment: <InputAdornment position="start">¥</InputAdornment>,
      }}
    />
  );
}
