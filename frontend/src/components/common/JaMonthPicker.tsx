"use client";

import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { Dayjs } from "dayjs";

type Props = {
  label: string;
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  required?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  sx?: object;
};

export default function JaMonthPicker({
  label,
  value,
  onChange,
  required,
  disabled,
  fullWidth = true,
  sx,
}: Props) {
  return (
    <DatePicker
      label={label}
      value={value ? dayjs(value) : null}
      onChange={(v: Dayjs | null) =>
        onChange(v && v.isValid() ? v.startOf("month").format("YYYY-MM-DD") : null)
      }
      views={["year", "month"]}
      openTo="year"
      format="YYYY/MM"
      disabled={disabled}
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
