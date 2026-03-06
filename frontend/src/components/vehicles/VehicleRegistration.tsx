"use client";

import {
  Table,
  TableBody,
  TableRow,
  TableCell,
  Typography,
  Divider,
} from "@mui/material";

export default function VehicleRegistration({ registrations }: any) {

  const r = registrations?.[0];

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
        登録情報
      </Typography>

      <Table size="small">
        <TableBody>

          {row("登録地域", r?.registration_area)}

          {row("ナンバー", r?.registration_no)}

          {row("認証番号", r?.certification_no)}

          {row("初年度登録", r?.first_registration_date)}

          {row("車検期限", r?.inspection_expiration)}

        </TableBody>
      </Table>

      <Divider sx={{ my: 3 }} />
    </>
  );
}