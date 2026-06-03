"use client";

import { useEffect } from "react";
import { TextField, TextFieldProps } from "@mui/material";
import { AsYouType } from "libphonenumber-js";

/**
 * 日本の電話番号を入力しながら自動フォーマットするTextField。
 * 数字を打つと市外局番・携帯・フリーダイヤルに応じたハイフン位置で整形される。
 * DBから読み込んだハイフンなしの値も自動で正規化する。
 *
 * 使い方:
 *   <PhoneField label="電話番号" value={form.phone} onChange={(v) => setForm(p => ({ ...p, phone: v }))} />
 */
type Props = Omit<TextFieldProps, "onChange" | "value"> & {
  value: string | null | undefined;
  onChange: (value: string) => void;
};

function formatJP(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  return new AsYouType("JP").input(digits);
}

export default function PhoneField({ value, onChange, ...rest }: Props) {
  const formatted = formatJP(value ?? "");

  // DBから読み込んだハイフンなしの値を自動で正規化する
  // （例: "09012345678" → "090-1234-5678" にして form state を更新）
  useEffect(() => {
    if (value && formatted && formatted !== value) {
      onChange(formatted);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(formatJP(e.target.value));
  };

  return (
    <TextField
      {...rest}
      value={formatted}
      onChange={handleChange}
      inputProps={{ inputMode: "numeric", ...rest.inputProps }}
    />
  );
}
