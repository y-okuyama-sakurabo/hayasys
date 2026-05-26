"use client";

import { Box, Typography, FormControl, Select, MenuItem, Stack } from "@mui/material";

// ── 型 ──────────────────────────────────────────────────────────
export type DateParts = { year: string; month: string; day: string };

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAYS   = Array.from({ length: 31 }, (_, i) => i + 1);

// ── ヘルパー ─────────────────────────────────────────────────────
export const parseDate = (str: string | null | undefined): DateParts => {
  if (!str) return { year: "", month: "", day: "" };
  const [y, m, d] = str.split("-");
  return {
    year:  y || "",
    month: m ? String(Number(m)) : "",
    day:   d ? String(Number(d)) : "",
  };
};

export const buildDate = (y: string, m: string, d: string): string | null => {
  if (!y || !m || !d) return null;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
};

// ── コンポーネント ───────────────────────────────────────────────
type Props = {
  label: string;
  value: DateParts;
  onChange: (next: DateParts) => void;
  years: number[];
  required?: boolean;
};

export default function DatePartsSelector({
  label,
  value,
  onChange,
  years,
  required,
}: Props) {
  return (
    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
        fontWeight={600}
        display="block"
        mb={0.75}
      >
        {label}
        {required && <span style={{ color: "#d32f2f" }}> *</span>}
      </Typography>
      <Stack direction="row" spacing={0.75} alignItems="center">
        <FormControl size="small" sx={{ minWidth: 88 }}>
          <Select
            displayEmpty
            value={value.year}
            onChange={(e) => onChange({ ...value, year: e.target.value })}
          >
            <MenuItem value="">
              <em style={{ color: "#aaa", fontStyle: "normal" }}>年</em>
            </MenuItem>
            {years.map((y) => (
              <MenuItem key={y} value={String(y)}>
                {y}年
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 68 }}>
          <Select
            displayEmpty
            value={value.month}
            onChange={(e) => onChange({ ...value, month: e.target.value })}
          >
            <MenuItem value="">
              <em style={{ color: "#aaa", fontStyle: "normal" }}>月</em>
            </MenuItem>
            {MONTHS.map((m) => (
              <MenuItem key={m} value={String(m)}>
                {m}月
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 68 }}>
          <Select
            displayEmpty
            value={value.day}
            onChange={(e) => onChange({ ...value, day: e.target.value })}
          >
            <MenuItem value="">
              <em style={{ color: "#aaa", fontStyle: "normal" }}>日</em>
            </MenuItem>
            {DAYS.map((d) => (
              <MenuItem key={d} value={String(d)}>
                {d}日
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
    </Box>
  );
}
