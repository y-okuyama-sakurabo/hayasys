"use client";

import { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Button,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  Grid,
  MenuItem,
  InputAdornment,
} from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import apiClient from "@/lib/apiClient";
import { debounce } from "lodash";
import SearchIcon from "@mui/icons-material/Search";

type Customer = {
  id: number;
  name: string;
  kana?: string;
  email?: string;
  postal_code?: string;
  address?: string;
  phone?: string;
  mobile_phone?: string;
  company?: string;
  company_phone?: string;
  customer_class?: number;
  region?: number;
  gender?: number;
  first_shop?: number;
  last_shop?: number;
  birthdate?: string;
};

export default function PartySelector({
  onSelectParty,
  newParty,
  setNewParty,
  estimateData,
  setEstimateData,
  formData,
  setFormData,
  party,
}: {
  onSelectParty: (party: Customer) => void;
  newParty: any;
  setNewParty: (data: any) => void;
  estimateData: any;
  setEstimateData: (data: any) => void;
  formData?: any;
  setFormData?: (data: any) => void;
  party?: Customer;
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [genders, setGenders] = useState<any[]>([]);
  const [shops, setShops] = useState<any[]>([]);
  const [shopName, setShopName] = useState("");
  const [estimateDate, setEstimateDate] = useState(dayjs());

  // ==============================
  // 共通更新関数
  // ==============================
  const handleChange = (field: string, value: any) => {
    let normalizedValue = value;

    if (field === "birthdate") {
      if (dayjs.isDayjs(value)) {
        normalizedValue = value.isValid() ? value.format("YYYY-MM-DD") : null;
      } else if (!value || value === "") {
        normalizedValue = null;
      }
    } else {
      if (value === "" || value === undefined) {
        normalizedValue = null;
      }
    }

    const updated = { ...newParty, [field]: normalizedValue };
    setNewParty(updated);

    if (setFormData) {
      setFormData((prev: any) => ({
        ...prev,
        new_party: updated,
      }));
    }
  };

  // ==============================
  // 初期ロード
  // ==============================
  useEffect(() => {
    Promise.all([
      apiClient.get("/masters/customer_classes/"),
      apiClient.get("/masters/regions/"),
      apiClient.get("/masters/genders/"),
      apiClient.get("/masters/shops/"),
      apiClient.get("/auth/user/"),
    ])
      .then(([cls, reg, gen, shp, user]) => {
        setClasses(cls.data);
        setRegions(reg.data);
        setGenders(gen.data);
        setShops(shp.data);
        setShopName(user.data.shop_name || "");
        setEstimateData({
          ...estimateData,
          shop_id: user.data.shop_id,
          estimate_date: dayjs().format("YYYY-MM-DD"),
        });
      })
      .catch((err) => console.error("初期データ取得失敗:", err));
  }, []);

  // ==============================
  // 編集モード：既存顧客 初期化
  // ==============================
  useEffect(() => {
    if (party && Object.keys(party).length > 0 && !newParty?.id) {
      const initParty = {
        id: party.id,
        name: party.name || "",
        kana: party.kana || "",
        email: party.email || "",
        postal_code: party.postal_code || "",
        address: party.address || "",
        phone: party.phone || "",
        mobile_phone: party.mobile_phone || "",
        company: party.company || "",
        company_phone: party.company_phone || "",
        customer_class:
          party.customer_class && typeof party.customer_class === "object"
            ? party.customer_class.id
            : party.customer_class ?? null,
        region:
          party.region && typeof party.region === "object"
            ? party.region.id
            : party.region ?? null,
        gender:
          party.gender && typeof party.gender === "object"
            ? party.gender.id
            : party.gender ?? null,
        birthdate: party.birthdate ?? null,
      };
      setNewParty(initParty);
      setSearch(party.name || "");
    }
  }, [party]);

  // ==============================
  // リアルタイム検索（インクリメンタルサーチ）
  // ==============================
  const debouncedSearch = debounce(async (value: string) => {
    if (!value || value.trim() === "") {
      setResults([]);
      return;
    }

    try {
      const res = await apiClient.get(`/customers/?search=${value}`);
      setResults(res.data.results || res.data);
    } catch (err) {
      console.error("リアルタイム顧客検索失敗:", err);
    }
  }, 300);

  useEffect(() => {
    debouncedSearch(search);
    return () => debouncedSearch.cancel();
  }, [search]);

  // ==============================
  // 顧客選択
  // ==============================
  const handleSelect = (customer: Customer) => {
    onSelectParty(customer);

    const partyData = {
      ...customer,
      customer_class:
        typeof customer.customer_class === "object"
          ? customer.customer_class.id
          : customer.customer_class ?? null,
      region:
        typeof customer.region === "object"
          ? customer.region.id
          : customer.region ?? null,
      gender:
        typeof customer.gender === "object"
          ? customer.gender.id
          : customer.gender ?? null,
    };

    setNewParty(partyData);
    setResults([]);
    setSearch(customer.name);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        {/* ========================== */}
        {/* 顧客検索 */}
        {/* ========================== */}
        <Box display="flex" gap={2} mb={2}>
          <TextField
            label="顧客検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: 300 }}   // ← 🔹固定幅
          />
          {/* 検索ボタンはあってもなくてもOK */}
          <Button variant="outlined" onClick={() => debouncedSearch(search)}>
            検索
          </Button>
        </Box>

        {/* ========================== */}
        {/* 検索結果一覧 */}
        {/* ========================== */}
        {search && (
          <>
            {results.length > 0 ? (
              <List
                sx={{
                  border: "1px solid #ddd",
                  mb: 2,
                  maxHeight: 200,
                  overflowY: "auto",
                }}
              >
                {results.map((customer) => (
                  <ListItemButton key={customer.id} onClick={() => handleSelect(customer)}>
                    <ListItemText
                      primary={customer.name}
                      secondary={customer.phone || customer.address || ""}
                    />
                  </ListItemButton>
                ))}
              </List>
            ) : (
              <Box
                sx={{
                  border: "1px solid #ddd",
                  p: 2,
                  mb: 2,
                  textAlign: "center",
                  color: "text.secondary",
                  borderRadius: 1,
                  backgroundColor: "#fafafa",
                }}
              >
                該当する顧客が見つかりませんでした
              </Box>
            )}
          </>
        )}

        {/* ========================== */}
        {/* 顧客情報フォーム */}
        {/* ========================== */}
        <Typography variant="subtitle1" fontWeight="bold" mb={1}>
          顧客情報
        </Typography>

        <Grid container spacing={3}>
          {/* 基本情報 */}
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="氏名"
              value={newParty?.name || ""}
              onChange={(e) => handleChange("name", e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="カナ"
              value={newParty?.kana || ""}
              onChange={(e) => handleChange("kana", e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="メールアドレス"
              type="email"
              value={newParty?.email || ""}
              onChange={(e) => handleChange("email", e.target.value)}
              fullWidth
            />
          </Grid>

          {/* 2行目 */}
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="電話番号"
              value={newParty?.phone || ""}
              onChange={(e) => handleChange("phone", e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="携帯電話"
              value={newParty?.mobile_phone || ""}
              onChange={(e) => handleChange("mobile_phone", e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="郵便番号"
              value={newParty?.postal_code || ""}
              onChange={(e) => handleChange("postal_code", e.target.value)}
              fullWidth
            />
          </Grid>

          {/* 3行目 */}
          <Grid item xs={12}>
            <TextField
              label="住所"
              value={newParty?.address || ""}
              onChange={(e) => handleChange("address", e.target.value)}
              fullWidth
            />
          </Grid>

          {/* 4行目 */}
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="会社名"
              value={newParty?.company || ""}
              onChange={(e) => handleChange("company", e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="会社電話番号"
              value={newParty?.company_phone || ""}
              onChange={(e) => handleChange("company_phone", e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <DatePicker
              label="生年月日"
              value={newParty?.birthdate ? dayjs(newParty.birthdate) : null}
              onChange={(newDate: any) => {
                let formatted: string | null = null;

                if (dayjs.isDayjs(newDate)) {
                  formatted = newDate.isValid() ? newDate.format("YYYY-MM-DD") : null;
                } else {
                  formatted = null;
                }

                handleChange("birthdate", formatted);
              }}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>

          {/* マスタ */}
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              select
              label="顧客区分"
              value={newParty?.customer_class || ""}
              onChange={(e) => handleChange("customer_class", Number(e.target.value))}
              fullWidth
            >
              {classes.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <TextField
              select
              label="地域"
              value={newParty?.region || ""}
              onChange={(e) => handleChange("region", Number(e.target.value))}
              fullWidth
            >
              {regions.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <TextField
              select
              label="性別"
              value={newParty?.gender || ""}
              onChange={(e) => handleChange("gender", Number(e.target.value))}
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

        {/* ========================== */}
        {/* 見積情報 */}
        {/* ========================== */}
        <Box mt={5} pt={3} borderTop="1px solid #ddd">
          <Typography variant="subtitle1" fontWeight="bold" mb={2}>
            見積情報
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={4}>
              <DatePicker
                label="見積日"
                value={dayjs(estimateData?.estimate_date) || estimateDate}
                onChange={(newDate) => {
                  const date = newDate || dayjs();
                  setEstimateDate(date);
                  setEstimateData((prev: any) => ({
                    ...prev,
                    estimate_date: date.format("YYYY-MM-DD"),
                  }));
                }}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
          </Grid>
        </Box>
      </Box>
    </LocalizationProvider>
  );
}
