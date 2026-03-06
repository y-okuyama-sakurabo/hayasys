"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";

import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import DescriptionIcon from "@mui/icons-material/Description";

import { useRouter } from "next/navigation";
import apiClient from "@/lib/apiClient";

type Vehicle = {
  id: number;
  owned_from?: string | null;
  owned_to?: string | null;
  vehicle: {
    vehicle_name?: string;
    manufacturer_name?: string;
    registrations?: { registration_no?: string | null }[];
  };
};

type Props = {
  customerId: number;
};

export default function CustomerVehicles({ customerId }: Props) {
  const router = useRouter();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuAnchor, setMenuAnchor] = useState<{ [key: number]: HTMLElement | null }>({});

  // ===============================
  // 車両取得
  // ===============================
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const res = await apiClient.get(`/customers/${customerId}/vehicles/`);
        setVehicles(res.data.results || res.data || []);
      } catch (err) {
        console.error("車両取得失敗:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, [customerId]);

  // ===============================
  // メニュー
  // ===============================
  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>, id: number) => {
    setMenuAnchor((prev) => ({ ...prev, [id]: event.currentTarget }));
  };

  const handleMenuClose = (id: number) => {
    setMenuAnchor((prev) => ({ ...prev, [id]: null }));
  };

  const handleAction = (action: string, id: number) => {
    handleMenuClose(id);

    switch (action) {
      case "detail":
        router.push(`/dashboard/customers/${customerId}/vehicles/${id}`);
        break;

      case "edit":
        router.push(`/dashboard/customers/${customerId}/vehicles/${id}/edit`);
        break;
    }
  };

  if (loading)
    return (
      <Box display="flex" justifyContent="center" mt={6}>
        <CircularProgress />
      </Box>
    );

  return (
    <>
      <Box mb={3}>
        <Typography variant="h6" fontWeight="bold">
          所有車両一覧
        </Typography>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: "#f9f9f9" }}>
            <TableRow>
              <TableCell>購入日</TableCell>
              <TableCell>メーカー</TableCell>
              <TableCell>車種</TableCell>
              <TableCell>ナンバー</TableCell>
              <TableCell align="center">操作</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {vehicles.map((v) => {
              const regNo = v.vehicle?.registrations?.[0]?.registration_no || "-";

              return (
                <TableRow
                  key={v.id}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() =>
                    router.push(`/dashboard/customers/${customerId}/vehicles/${v.id}`)
                  }
                >
                  <TableCell>
                    {v.owned_from
                      ? new Date(v.owned_from).toLocaleDateString("ja-JP")
                      : "-"}
                  </TableCell>

                  <TableCell>{v.vehicle?.manufacturer_name || "-"}</TableCell>

                  <TableCell>{v.vehicle?.vehicle_name || "-"}</TableCell>

                  <TableCell>{regNo}</TableCell>

                  <TableCell
                    align="center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IconButton
                      onClick={(event) => handleMenuOpen(event, v.id)}
                    >
                      <MoreVertIcon />
                    </IconButton>

                    <Menu
                      anchorEl={menuAnchor[v.id]}
                      open={Boolean(menuAnchor[v.id])}
                      onClose={() => handleMenuClose(v.id)}
                    >
                      <MenuItem onClick={() => handleAction("detail", v.id)}>
                        <ListItemIcon>
                          <DescriptionIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="詳細" />
                      </MenuItem>

                      <MenuItem onClick={() => handleAction("edit", v.id)}>
                        <ListItemIcon>
                          <EditIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="編集" />
                      </MenuItem>
                    </Menu>
                  </TableCell>
                </TableRow>
              );
            })}

            {vehicles.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  車両データがありません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}