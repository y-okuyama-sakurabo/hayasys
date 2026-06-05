"use client";

import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { Dayjs } from "dayjs";

type Props = {
  label: string;
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  required?: boolean;
  disabled?: boolean;
  minDate?: string;
  maxDate?: string;
  fullWidth?: boolean;
  sx?: object;
};

export default function JaDatePicker({
  label,
  value,
  onChange,
  required,
  disabled,
  minDate,
  maxDate,
  fullWidth = true,
  sx,
}: Props) {
  return (
    <DatePicker
      label={label}
      value={value ? dayjs(value) : null}
      onChange={(v: Dayjs | null) =>
        onChange(v && v.isValid() ? v.format("YYYY-MM-DD") : null)
      }
      format="YYYY/MM/DD"
      disabled={disabled}
      minDate={minDate ? dayjs(minDate) : undefined}
      maxDate={maxDate ? dayjs(maxDate) : undefined}
      slotProps={{
        textField: {
          size: "small",
          fullWidth,
          required,
          sx,
        },
      }}
    />
  );
}
