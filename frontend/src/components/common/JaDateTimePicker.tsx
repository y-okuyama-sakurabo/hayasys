"use client";

import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import dayjs, { Dayjs } from "dayjs";

type Props = {
  label: string;
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  required?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  error?: boolean;
  helperText?: string;
  sx?: object;
};

export default function JaDateTimePicker({
  label,
  value,
  onChange,
  required,
  disabled,
  fullWidth = true,
  error,
  helperText,
  sx,
}: Props) {
  return (
    <DateTimePicker
      label={label}
      value={value ? dayjs(value) : null}
      onChange={(v: Dayjs | null) =>
        onChange(v && v.isValid() ? v.format("YYYY-MM-DDTHH:mm") : null)
      }
      format="YYYY/MM/DD HH:mm"
      disabled={disabled}
      ampm={false}
      slotProps={{
        textField: {
          size: "small",
          fullWidth,
          required,
          error,
          helperText,
          sx,
        },
      }}
    />
  );
}
