"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import apiClient from "@/lib/apiClient";

export const fetchStaffList = async () => {
  const res = await apiClient.get("/masters/staffs/");
  return res.data;
};

export default function StaffListPage() {
  const [staffs, setStaffs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStaffList()
      .then(setStaffs)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>読み込み中...</div>;

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        スタッフ一覧
      </Typography>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>氏名</TableCell>
            <TableCell>ログインID</TableCell>
            <TableCell>所属店舗</TableCell>
            <TableCell>ロール</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {staffs.map((staff) => (
            <TableRow key={staff.id}>
              <TableCell>{staff.id}</TableCell>
              <TableCell>{staff.display_name}</TableCell>
              <TableCell>{staff.login_id}</TableCell>
              <TableCell>{staff.shop_name ?? "-"}</TableCell>
              <TableCell>{staff.role}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}
