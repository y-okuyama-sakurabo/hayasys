"use client";

import { useEffect, useState } from "react";
import {
  Paper,
  Typography,
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  TextField,
  Divider,
  CircularProgress,
} from "@mui/material";
import apiClient from "@/lib/apiClient";

type Vehicle = {
  id: number;
  vehicle_name?: string;
  category_name?: string;
  manufacturer_name?: string;
  registrations?: { registration_no?: string }[];
  owners?: {
    id: number;
    owned_from?: string;
    owned_to?: string;
  }[];
};

type Props = {
  customerId: number;
};

export default function CustomerVehicles({ customerId }: Props) {
  const [current, setCurrent] = useState<Vehicle[]>([]);
  const [past, setPast] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);

  // ============================
  // 一覧取得
  // ============================
  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(
        `/customers/${customerId}/vehicles/all/`
      );
      setCurrent(res.data.current || []);
      setPast(res.data.past || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [customerId]);

  // ============================
  // 手放し
  // ============================
  const releaseVehicle = async (ownershipId?: number) => {
    if (!ownershipId) return;
    if (!confirm("この車両を手放しますか？")) return;

    try {
      await apiClient.patch(
        `/customer_vehicles/${ownershipId}/release/`
      );
      fetchVehicles();
    } catch (e) {
      console.error(e);
      alert("手放し処理に失敗しました");
    }
  };

  // ============================
  // 検索
  // ============================
  const handleSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);

    try {
      const res = await apiClient.get(
        `/customers/${customerId}/vehicles/search/`,
        { params: { q: search } }
      );
      setCurrent(res.data || []);
      setPast([]);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setSearch("");
    fetchVehicles();
  };

  const renderTable = (
    title: string,
    rows: Vehicle[],
    isCurrent: boolean
  ) => (
    <Box mb={3}>
      <Typography variant="subtitle1" fontWeight="bold" mb={1}>
        {title}
      </Typography>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{isCurrent ? "購入日" : "所有期間"}</TableCell>
            <TableCell>カテゴリ</TableCell>
            <TableCell>メーカー</TableCell>
            <TableCell>車種</TableCell>
            <TableCell>ナンバー</TableCell>
            <TableCell align="center">操作</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center">
                データがありません
              </TableCell>
            </TableRow>
          ) : (
            rows.map((v) => {
              const owner = v.owners?.[0];
              return (
                <TableRow key={v.id}>
                  <TableCell>
                    {isCurrent
                      ? owner?.owned_from || "-"
                      : `${owner?.owned_from || "-"} 〜 ${
                          owner?.owned_to || "-"
                        }`}
                  </TableCell>
                  <TableCell>{v.category_name || "-"}</TableCell>
                  <TableCell>{v.manufacturer_name || "-"}</TableCell>
                  <TableCell>{v.vehicle_name || "-"}</TableCell>
                  <TableCell>
                    {v.registrations?.[0]?.registration_no || "-"}
                  </TableCell>
                  <TableCell align="center">
                    {isCurrent && (
                      <Button
                        size="small"
                        color="error"
                        onClick={() =>
                          releaseVehicle(owner?.id)
                        }
                      >
                        手放す
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </Box>
  );

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" mb={2}>
        所有車両
      </Typography>

      {/* === 検索 === */}
      <Box display="flex" gap={1} mb={2}>
        <TextField
          size="small"
          placeholder="車台番号で検索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button
          variant="outlined"
          onClick={handleSearch}
          disabled={searching}
        >
          検索
        </Button>
        <Button variant="text" onClick={clearSearch}>
          クリア
        </Button>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {loading ? (
        <CircularProgress />
      ) : (
        <>
          {renderTable("現所有", current, true)}
          {renderTable("過去所有", past, false)}
        </>
      )}
    </Paper>
  );
}
