"use client";

import {
  Table,
  TableBody,
  TableRow,
  TableCell,
  Typography,
} from "@mui/material";

export default function VehicleWarranty({ warranties }: any) {

  const w = warranties?.[0];

  const row = (label: string, value: any) => (
    <TableRow>
      <TableCell sx={{ width: 200, fontWeight: "bold" }}>
        {label}
      </TableCell>
      <TableCell>{value || "-"}</TableCell>
    </TableRow>
  );

  return (
    <>
      <Typography variant="h6" mb={1}>
        保証情報
      </Typography>

      <Table size="small">
        <TableBody>

          {row("開始日", w?.start_date)}

          {row("終了日", w?.end_date)}

          {row("プラン", w?.plan_name)}

          {row("メモ", w?.note)}

        </TableBody>
      </Table>
    </>
  );
}