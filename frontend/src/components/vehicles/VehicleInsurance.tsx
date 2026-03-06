"use client";

import {
  Table,
  TableBody,
  TableRow,
  TableCell,
  Typography,
  Divider,
} from "@mui/material";

export default function VehicleInsurance({ insurances }: any) {

  const i = insurances?.[0];

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
        保険情報
      </Typography>

      <Table size="small">
        <TableBody>

          {row("種別", i?.type)}

          {row("保険会社", i?.company)}

          {row("開始日", i?.start_date)}

          {row("終了日", i?.end_date)}

          {row("証券番号", i?.policy_no)}

        </TableBody>
      </Table>

      <Divider sx={{ my: 3 }} />
    </>
  );
}