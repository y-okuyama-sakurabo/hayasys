"use client";

import { useState, useEffect } from "react";
import {
  Box, TextField, List, ListItemButton, ListItemText,
  Typography, Grid, MenuItem
} from "@mui/material";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import apiClient from "@/lib/apiClient";
import { debounce } from "lodash";

export default function OrderPartySelector({
  customer,
  onCustomerChange,
  onSelectParty,
}: any) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [classes, setClasses] = useState([]);
  const [regions, setRegions] = useState([]);
  const [genders, setGenders] = useState([]);

  // ===============================
  // 初期ロード（マスター）
  // ===============================
  useEffect(() => {
    Promise.all([
      apiClient.get("/masters/customer_classes/"),
      apiClient.get("/masters/regions/"),
      apiClient.get("/masters/genders/"),
    ])
      .then(([cls, reg, gen]) => {
        setClasses(cls.data);
        setRegions(reg.data);
        setGenders(gen.data);
      })
      .catch(console.error);
  }, []);

  // ===============================
  // 顧客検索
  // ===============================
  const debouncedSearch = debounce(async (value: string) => {
    if (!value.trim()) {
      setResults([]);
      return;
    }

    const res = await apiClient.get(`/customers/?search=${value}`);
    setResults(res.data.results || res.data);
  }, 300);

  useEffect(() => {
    debouncedSearch(search);
    return () => debouncedSearch.cancel();
  }, [search]);

  // ===============================
  // UI
  // ===============================
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>

        {/* 検索 */}
        <TextField
          label="顧客検索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 300, mb: 2 }}
        />

        {/* 検索結果 */}
        {results.length > 0 && (
          <List
            sx={{
              border: "1px solid #ddd",
              maxHeight: 200,
              overflowY: "auto",
              mb: 2,
            }}
          >
            {results.map((c) => (
              <ListItemButton
                key={c.id}
                onClick={() => {
                  onSelectParty(c);
                  setSearch(c.name); // UI のみ更新
                  setResults([]);
                }}
              >
                <ListItemText
                  primary={c.name}
                  secondary={c.phone || c.address}
                />
              </ListItemButton>
            ))}
          </List>
        )}

        {/* 顧客情報フォーム */}
        <Typography variant="subtitle1" fontWeight="bold" mb={1}>
          顧客情報
        </Typography>

        <Grid container spacing={3}>

          {/* 氏名 */}
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="氏名"
              value={customer?.name || ""}
              onChange={(e) => onCustomerChange("name", e.target.value)}
              fullWidth
            />
          </Grid>

          {/* カナ */}
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="カナ"
              value={customer?.kana || ""}
              onChange={(e) => onCustomerChange("kana", e.target.value)}
              fullWidth
            />
          </Grid>

          {/* メール */}
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="メールアドレス"
              type="email"
              value={customer?.email || ""}
              onChange={(e) => onCustomerChange("email", e.target.value)}
              fullWidth
            />
          </Grid>

          {/* 電話 */}
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="電話番号"
              value={customer?.phone || ""}
              onChange={(e) => onCustomerChange("phone", e.target.value)}
              fullWidth
            />
          </Grid>

          {/* 携帯 */}
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="携帯電話"
              value={customer?.mobile_phone || ""}
              onChange={(e) => onCustomerChange("mobile_phone", e.target.value)}
              fullWidth
            />
          </Grid>

          {/* 郵便番号 */}
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="郵便番号"
              value={customer?.postal_code || ""}
              onChange={(e) => onCustomerChange("postal_code", e.target.value)}
              fullWidth
            />
          </Grid>

          {/* 住所 */}
          <Grid item xs={12}>
            <TextField
              label="住所"
              value={customer?.address || ""}
              onChange={(e) => onCustomerChange("address", e.target.value)}
              fullWidth
            />
          </Grid>

          {/* 会社 */}
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="会社名"
              value={customer?.company || ""}
              onChange={(e) => onCustomerChange("company", e.target.value)}
              fullWidth
            />
          </Grid>

          {/* 会社電話 */}
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="会社電話番号"
              value={customer?.company_phone || ""}
              onChange={(e) => onCustomerChange("company_phone", e.target.value)}
              fullWidth
            />
          </Grid>

          {/* 生年月日 */}
          <Grid item xs={12} sm={6} md={4}>
            <DatePicker
              label="生年月日"
              value={customer?.birthdate ? dayjs(customer.birthdate) : null}
              onChange={(d) =>
                onCustomerChange("birthdate", d ? d.format("YYYY-MM-DD") : null)
              }
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>

          {/* 顧客区分 */}
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              select
              label="顧客区分"
              value={customer?.customer_class || ""}
              onChange={(e) =>
                onCustomerChange("customer_class", Number(e.target.value))
              }
              fullWidth
            >
              {classes.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* 地域 */}
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              select
              label="地域"
              value={customer?.region || ""}
              onChange={(e) =>
                onCustomerChange("region", Number(e.target.value))
              }
              fullWidth
            >
              {regions.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* 性別 */}
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              select
              label="性別"
              value={customer?.gender || ""}
              onChange={(e) =>
                onCustomerChange("gender", Number(e.target.value))
              }
              fullWidth
            >
              {genders.map((g) => (
                <MenuItem key={g.id} value={g.id}>
                  {g.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </Box>
    </LocalizationProvider>
  );
}
