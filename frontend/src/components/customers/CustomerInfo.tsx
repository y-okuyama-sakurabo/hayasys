import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Box,
  Button,
} from "@mui/material";
import { useRouter } from "next/navigation";

export default function CustomerInfo({ customer }: any) {
  const router = useRouter();

  const row = (label: string, value: any) => (
    <TableRow>
      <TableCell sx={{ width: 200, fontWeight: "bold" }}>
        {label}
      </TableCell>
      <TableCell>{value || "-"}</TableCell>
    </TableRow>
  );

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      {/* ヘッダー行 */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h6">顧客詳細</Typography>

        <Button
          size="small"
          variant="outlined"
          onClick={() =>
            router.push(`/dashboard/customers/${customer.id}/edit`)
          }
        >
          編集
        </Button>
      </Box>

      <Table size="small">
        <TableBody>
          {row("顧客分類", customer.customer_class?.name)}
          {row(
            "氏名 / フリガナ",
            `${customer.name}${customer.kana ? `（${customer.kana}）` : ""}`
          )}
          {row("メール", customer.email)}
          {row("電話", customer.phone)}
          {row("携帯", customer.mobile_phone)}
          {row("郵便番号", customer.postal_code)}
          {row("住所", customer.address)}
          {row("会社名", customer.company)}
          {row("会社電話", customer.company_phone)}
          {row("担当スタッフ", customer.staff?.full_name)}
          {row("地域", customer.region?.name)}
          {row("性別", customer.gender?.name)}
          {row("誕生日", customer.birthdate)}
          {row("初回対応店舗", customer.first_shop?.name)}
          {row("最終対応店舗", customer.last_shop?.name)}
        </TableBody>
      </Table>
    </Paper>
  );
}
