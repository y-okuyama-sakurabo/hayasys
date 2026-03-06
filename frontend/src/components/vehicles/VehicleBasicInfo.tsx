"use client";

import {
  Table,
  TableBody,
  TableRow,
  TableCell,
  Typography,
  Divider,
} from "@mui/material";

export default function VehicleBasicInfo({
  vehicle,
  ownership,
  editMode,
}: any) {

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
        車両基本情報
      </Typography>

      <Table size="small">
        <TableBody>

          {row("車種", vehicle?.vehicle_name)}

          {row("メーカー", vehicle?.manufacturer?.name)}

          {row("カテゴリ", vehicle?.category?.name)}

          {row("排気量", vehicle?.displacement)}

          {row("年式", vehicle?.model_year)}

          {row("車台番号", vehicle?.chassis_no)}

          {row("カラー", vehicle?.color?.name)}

          {row("カラー名称", vehicle?.color_name)}

          {row("カラーコード", vehicle?.color_code)}

          {row("エンジンタイプ", vehicle?.engine_type)}

          {row("購入日", ownership?.owned_from)}

          {row("手放し日", ownership?.owned_to)}

        </TableBody>
      </Table>

      <Divider sx={{ my: 3 }} />
    </>
  );
}